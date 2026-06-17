import { getPool } from '../config/database.js';
import { generateJSON, isLLMEnabled } from './geminiClient.js';
import { logger } from '../utils/logger.js';

export interface LLMReceiptData {
  merchant: string;
  category: string;
  total: number;
  subtotal: number | null;
  tax: number | null;
  currency: string;
  paymentMethod: string | null;
  date: string;
  lineItems: Array<{ name: string; quantity: number; price: number }>;
  purchaseIntent: string | null;
  confidence: number;
}

const EXTRACTION_PROMPT = `You are a receipt parser. Extract structured data from this OCR text.
Return JSON with exactly these fields:
- merchant: string (store/vendor name)
- category: one of [Food, Transport, Shopping, Bills, Entertainment, Health, Education, Other]
- total: number (final amount paid)
- subtotal: number or null
- tax: number or null
- currency: string (INR, USD, etc.)
- paymentMethod: string or null (cash, card, UPI, etc.)
- date: string (YYYY-MM-DD format)
- lineItems: array of {name: string, quantity: number, price: number}
- purchaseIntent: string or null (brief description of purchase purpose)
- confidence: number 0-1 (how confident you are in the extraction)

If a field cannot be determined, use null or reasonable defaults.
OCR Text:
`;

export class LLMReceiptService {
  /** Extract structured receipt data using Gemini */
  async extractFromOCR(ocrText: string): Promise<LLMReceiptData | null> {
    if (!isLLMEnabled() || !ocrText.trim()) return null;

    const result = await generateJSON<LLMReceiptData>(EXTRACTION_PROMPT + ocrText);
    if (!result) return null;

    // Validate and sanitize
    return {
      merchant: String(result.merchant || 'Unknown'),
      category: this.validateCategory(result.category),
      total: Number(result.total) || 0,
      subtotal: result.subtotal != null ? Number(result.subtotal) : null,
      tax: result.tax != null ? Number(result.tax) : null,
      currency: String(result.currency || 'INR'),
      paymentMethod: result.paymentMethod || null,
      date: this.validateDate(result.date),
      lineItems: Array.isArray(result.lineItems) ? result.lineItems.map(i => ({
        name: String(i.name || ''),
        quantity: Number(i.quantity) || 1,
        price: Number(i.price) || 0,
      })) : [],
      purchaseIntent: result.purchaseIntent || null,
      confidence: Math.min(1, Math.max(0, Number(result.confidence) || 0.5)),
    };
  }

  /** Compare LLM output with OCR regex parser output and log discrepancies */
  compareWithOCR(llmData: LLMReceiptData, ocrData: { vendor: string; amount: number; date: Date; items: any[] }): Record<string, any> {
    const discrepancies: Record<string, any> = {};

    if (llmData.merchant.toLowerCase() !== ocrData.vendor.toLowerCase()) {
      discrepancies.merchant = { llm: llmData.merchant, ocr: ocrData.vendor };
    }
    if (Math.abs(llmData.total - ocrData.amount) > 1) {
      discrepancies.amount = { llm: llmData.total, ocr: ocrData.amount };
    }
    const ocrDate = ocrData.date instanceof Date ? ocrData.date.toISOString().split('T')[0] : '';
    if (llmData.date !== ocrDate) {
      discrepancies.date = { llm: llmData.date, ocr: ocrDate };
    }
    if (llmData.lineItems.length !== ocrData.items.length) {
      discrepancies.itemCount = { llm: llmData.lineItems.length, ocr: ocrData.items.length };
    }

    return discrepancies;
  }

  /** Store LLM extraction metadata */
  async storeMetadata(receiptId: string, llmData: LLMReceiptData, ocrData: any, discrepancies: Record<string, any>): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO receipt_ai_metadata (receipt_id, llm_extracted, ocr_extracted, discrepancies)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (receipt_id) DO UPDATE SET llm_extracted = $2, ocr_extracted = $3, discrepancies = $4`,
      [receiptId, JSON.stringify(llmData), JSON.stringify(ocrData), JSON.stringify(discrepancies)]
    );
    logger.info({ message: 'LLM metadata stored', receiptId, confidence: llmData.confidence, discrepancyCount: Object.keys(discrepancies).length });
  }

  private validateCategory(cat: string): string {
    const valid = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Other'];
    return valid.includes(cat) ? cat : 'Other';
  }

  private validateDate(date: string): string {
    const d = new Date(date);
    return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : date;
  }
}
