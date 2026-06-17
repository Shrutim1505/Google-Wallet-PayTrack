import { getPool } from '../config/database.js';
import { OCRService, ReceiptData } from './ocrService.js';
import { LLMReceiptService, LLMReceiptData } from './llmReceiptService.js';
import { EmbeddingCategorizationService } from './embeddingCategorizationService.js';
import { MLService } from './mlService.js';
import { CategorizationService } from './categorizationService.js';
import { generateEmbedding, isAIEnabled, isLLMEnabled } from './geminiClient.js';
import { logger } from '../utils/logger.js';

/** Confidence threshold below which we fall back to the next model in the chain.
 *  Tuned for all-MiniLM-L6-v2 cosine-similarity scale (related concepts ~0.35-0.7). */
const EMBEDDING_CONFIDENCE_THRESHOLD = 0.35;
const NB_CONFIDENCE_THRESHOLD = 0.4;

export interface AIPipelineResult {
  // Final resolved values
  merchant: string;
  amount: number;
  date: string;
  category: string;
  currency: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  tax: number | null;
  paymentMethod: string | null;

  // AI metadata
  aiCategory: string;
  aiConfidence: number;
  aiModelSource: 'embedding' | 'naive_bayes' | 'rule_based' | 'llm';
  llmExtracted: LLMReceiptData | null;
  ocrExtracted: { vendor: string; amount: number; date: string; items: any[] };
  embeddingScore: number | null;
  fallbackReason: string | null;
  discrepancies: Record<string, any>;
  confidence: number;
}

/**
 * Orchestrates the full receipt-understanding pipeline:
 *   OCR → Gemini LLM → Embedding categorization → Naive Bayes → Rule-based
 * Each stage degrades gracefully to the next on failure or low confidence.
 */
export class AIPipelineService {
  private ocrService = new OCRService();
  private llmService = new LLMReceiptService();
  private embeddingService = new EmbeddingCategorizationService();
  private mlService = new MLService();
  private ruleService = new CategorizationService();

  /** Run the full pipeline on an uploaded receipt image */
  async processReceiptImage(userId: string, imagePath: string, mimetype: string): Promise<AIPipelineResult> {
    // Stage 1: OCR (Google Vision / Tesseract)
    const ocrData: ReceiptData = await this.ocrService.extractReceiptData(imagePath, mimetype);
    const ocrText = ocrData.rawText;

    return this.runPipeline(userId, ocrText, ocrData);
  }

  /** Run the pipeline from already-extracted OCR text/data */
  async runPipeline(userId: string, ocrText: string, ocrData: ReceiptData): Promise<AIPipelineResult> {
    const ocrExtracted = {
      vendor: ocrData.vendor,
      amount: ocrData.amount,
      date: ocrData.date instanceof Date ? ocrData.date.toISOString().split('T')[0] : String(ocrData.date),
      items: ocrData.items,
    };

    // Stage 2: LLM receipt understanding (Gemini)
    let llmData: LLMReceiptData | null = null;
    let discrepancies: Record<string, any> = {};
    if (isLLMEnabled() && ocrText.trim()) {
      llmData = await this.llmService.extractFromOCR(ocrText);
      if (llmData) {
        discrepancies = this.llmService.compareWithOCR(llmData, ocrData);
      }
    }

    // Resolve primary fields — prefer LLM when confident, else OCR
    const useLLM = llmData && llmData.confidence >= 0.5;
    const merchant = useLLM ? llmData!.merchant : (ocrData.vendor || 'Unknown Merchant');
    const amount = useLLM && llmData!.total > 0 ? llmData!.total : ocrData.amount;
    const date = useLLM ? llmData!.date : ocrExtracted.date;
    const currency = useLLM ? llmData!.currency : 'INR';
    const items = useLLM && llmData!.lineItems.length > 0
      ? llmData!.lineItems
      : ocrData.items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity }));
    const tax = useLLM ? llmData!.tax : null;
    const paymentMethod = useLLM ? llmData!.paymentMethod : null;

    // Stage 3-5: Hybrid categorization with fallback chain
    const categorization = await this.categorize(userId, merchant, items.map(i => i.name).join(' '), llmData);

    const result: AIPipelineResult = {
      merchant, amount, date, category: categorization.category, currency, items, tax, paymentMethod,
      aiCategory: categorization.category,
      aiConfidence: categorization.confidence,
      aiModelSource: categorization.modelSource,
      llmExtracted: llmData,
      ocrExtracted,
      embeddingScore: categorization.embeddingScore,
      fallbackReason: categorization.fallbackReason,
      discrepancies,
      confidence: llmData?.confidence ?? categorization.confidence,
    };

    logger.info({
      message: 'AI pipeline complete',
      userId, merchant, category: result.category,
      modelSource: result.aiModelSource, confidence: result.aiConfidence,
      llmUsed: !!llmData, discrepancyCount: Object.keys(discrepancies).length,
    });

    return result;
  }

  /**
   * Hybrid categorization with priority fallback:
   *   1. Embedding similarity (if confidence >= threshold)
   *   2. Naive Bayes (if confidence >= threshold)
   *   3. Rule-based (always succeeds)
   */
  private async categorize(userId: string, merchant: string, description: string, llmData: LLMReceiptData | null) {
    let embeddingScore: number | null = null;
    let fallbackReason: string | null = null;

    // Stage 3: Embedding-based
    if (isAIEnabled()) {
      try {
        const embResult = await this.embeddingService.categorize(userId, merchant, description);
        embeddingScore = embResult.confidence;
        if (embResult.confidence >= EMBEDDING_CONFIDENCE_THRESHOLD) {
          return { category: embResult.category, confidence: embResult.confidence, modelSource: 'embedding' as const, embeddingScore, fallbackReason: null };
        }
        fallbackReason = `embedding confidence ${embResult.confidence} < ${EMBEDDING_CONFIDENCE_THRESHOLD}`;
      } catch (e) {
        fallbackReason = `embedding failed: ${(e as Error).message}`;
      }
    } else {
      fallbackReason = 'AI disabled (no Gemini key)';
    }

    // Stage 4: Naive Bayes
    try {
      const nbResult = await this.mlService.predict(userId, merchant, description ? description.split(' ') : []);
      if (nbResult.confidence >= NB_CONFIDENCE_THRESHOLD) {
        return { category: nbResult.category, confidence: nbResult.confidence, modelSource: 'naive_bayes' as const, embeddingScore, fallbackReason };
      }
      fallbackReason = `${fallbackReason}; NB confidence ${nbResult.confidence} < ${NB_CONFIDENCE_THRESHOLD}`;
    } catch (e) {
      fallbackReason = `${fallbackReason}; NB failed: ${(e as Error).message}`;
    }

    // Stage 5: Rule-based (or LLM category as last structured hint)
    if (llmData?.category && llmData.category !== 'Other') {
      return { category: llmData.category, confidence: llmData.confidence, modelSource: 'llm' as const, embeddingScore, fallbackReason: `${fallbackReason}; used LLM category` };
    }
    const ruleCategory = this.ruleService.categorizeReceipt(merchant, description ? description.split(' ') : []);
    const normalized = this.normalizeCategory(ruleCategory);
    return { category: normalized, confidence: 0.3, modelSource: 'rule_based' as const, embeddingScore, fallbackReason: `${fallbackReason}; used rule-based` };
  }

  /** Persist all AI metadata for a receipt */
  async persistMetadata(receiptId: string, result: AIPipelineResult): Promise<void> {
    const pool = getPool();

    // Generate and store embedding for the receipt
    let embedding: number[] | null = null;
    if (isAIEnabled()) {
      embedding = await generateEmbedding(`${result.merchant} ${result.items.map(i => i.name).join(' ')}`);
    }

    await pool.query(
      `INSERT INTO receipt_ai_metadata
         (receipt_id, llm_extracted, ocr_extracted, discrepancies, embedding,
          predicted_category, category_confidence, category_model_source,
          embedding_score, fallback_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (receipt_id) DO UPDATE SET
         llm_extracted = $2, ocr_extracted = $3, discrepancies = $4, embedding = $5,
         predicted_category = $6, category_confidence = $7, category_model_source = $8,
         embedding_score = $9, fallback_reason = $10`,
      [
        receiptId,
        result.llmExtracted ? JSON.stringify(result.llmExtracted) : null,
        JSON.stringify(result.ocrExtracted),
        JSON.stringify(result.discrepancies),
        embedding,
        result.aiCategory,
        result.aiConfidence,
        result.aiModelSource,
        result.embeddingScore,
        result.fallbackReason,
      ]
    );

    logger.info({ message: 'AI metadata persisted', receiptId, modelSource: result.aiModelSource });
  }

  private normalizeCategory(category: string): string {
    const map: Record<string, string> = {
      food: 'Food', dining: 'Food', groceries: 'Food',
      transport: 'Transport', shopping: 'Shopping',
      utilities: 'Bills', bills: 'Bills', entertainment: 'Entertainment',
      healthcare: 'Health', health: 'Health', personal: 'Health',
      education: 'Education', other: 'Other',
    };
    return map[category.toLowerCase()] || 'Other';
  }
}
