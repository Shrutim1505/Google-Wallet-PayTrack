import { Request, Response } from 'express';
import { ReceiptService, ReceiptFilters } from '../services/receiptService.js';
import { CategorizationService } from '../services/categorizationService.js';
import { OCRService } from '../services/ocrService.js';
import { AIPipelineService } from '../services/aiPipelineService.js';
import { MLService } from '../services/mlService.js';
import { EmbeddingCategorizationService } from '../services/embeddingCategorizationService.js';
import { SmartAlertService } from '../services/smartAlertService.js';
import { isAIEnabled } from '../services/geminiClient.js';
import { merchantAutocomplete as merchantAutocompleteService } from '../services/merchantAutocompleteService.js';
import { duplicateBloomFilter } from '../services/duplicateBloomService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { emitToUser } from '../config/websocket.js';
import { HTTP_STATUS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../utils/constants.js';

const receiptService = new ReceiptService();
const categorizationService = new CategorizationService();
const ocrService = new OCRService();
const aiPipeline = new AIPipelineService();
const mlService = new MLService();
const embeddingService = new EmbeddingCategorizationService();
const smartAlertService = new SmartAlertService();
const isAIEnabledForController = () => isAIEnabled();

function parseJsonArray(value: unknown): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

function toFrontendReceipt(row: any) {
  return {
    id: String(row.id),
    merchant: String(row.merchant ?? 'Unknown Merchant'),
    amount: Number(row.amount ?? 0),
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date ?? ''),
    category: normalizeCategory(row.category),
    items: parseJsonArray(row.items),
  };
}

function normalizeCategory(category: unknown): string {
  const raw = String(category ?? 'Other').trim();
  const n = raw.toLowerCase();
  const map: Record<string, string> = {
    food: 'Food', dining: 'Food', groceries: 'Food',
    transport: 'Transport', shopping: 'Shopping',
    utilities: 'Bills', bills: 'Bills',
    entertainment: 'Entertainment',
    healthcare: 'Health', health: 'Health',
  };
  return map[n] || (n === 'other' ? 'Other' : 'Other');
}

/** POST /api/receipts */
export const createReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { merchant, vendor, amount, date, category, items, notes, imageUrl, tags, isManualEntry } = req.body;

  const finalMerchant = (merchant ?? vendor ?? '').toString().trim();
  const finalAmount = Number(amount);

  if (!finalMerchant || !Number.isFinite(finalAmount)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Merchant and amount are required');
  }

  const receipt = await receiptService.createReceipt(userId, {
    merchant: finalMerchant,
    amount: finalAmount,
    date: date || new Date().toISOString().split('T')[0],
    category: category || 'Other',
    items: Array.isArray(items) ? items : [],
    notes: notes || '',
    imageUrl: imageUrl || '',
    tags: Array.isArray(tags) ? tags : [],
    isManualEntry: isManualEntry ?? true,
  });

  // Update in-memory data structures (Trie for autocomplete, Bloom for dedup)
  merchantAutocompleteService.recordMerchant(userId, finalMerchant);
  duplicateBloomFilter.add(userId, finalMerchant, finalAmount, receipt.date);

  // Trigger smart alert analysis (spending spikes, budget warnings) — non-blocking
  smartAlertService.analyzeNewReceipt(userId, finalMerchant, finalAmount, receipt.category)
    .catch((e) => logger.warn({ msg: 'Smart alert analysis failed', error: e.message }));

  logger.info({ msg: 'Receipt created', userId, receiptId: receipt.id });
  emitToUser(userId, 'receipt:created', { receipt: toFrontendReceipt(receipt) });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: toFrontendReceipt(receipt),
    message: 'Receipt created successfully',
  });
});

/** POST /api/receipts/upload — OCR → LLM → Embedding → NB → Rule pipeline */
export const uploadReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const file = req.file;

  if (!file) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'File upload is required');

  // Run the full AI pipeline: OCR → Gemini LLM → Embedding → Naive Bayes → Rule-based
  const pipeline = await aiPipeline.processReceiptImage(userId, file.path, file.mimetype);

  // Allow explicit category override from the request body
  const finalCategory = req.body.category || pipeline.category;

  const receipt = await receiptService.createReceipt(userId, {
    merchant: pipeline.merchant,
    amount: pipeline.amount,
    date: pipeline.date,
    category: finalCategory,
    items: pipeline.items,
    imageUrl: `/uploads/${file.filename}`,
    notes: req.body.notes || '',
    isManualEntry: false,
    tags: [],
    currency: pipeline.currency,
  });

  // Persist AI metadata (LLM extraction, OCR comparison, embedding, confidence, fallback reason)
  await aiPipeline.persistMetadata(receipt.id, pipeline);

  // Update in-memory data structures
  merchantAutocompleteService.recordMerchant(userId, pipeline.merchant);
  duplicateBloomFilter.add(userId, pipeline.merchant, pipeline.amount, receipt.date);

  // Trigger smart alert analysis — non-blocking
  smartAlertService.analyzeNewReceipt(userId, pipeline.merchant, pipeline.amount, finalCategory)
    .catch((e) => logger.warn({ msg: 'Smart alert analysis failed', error: e.message }));

  logger.info({ msg: 'Receipt uploaded with AI pipeline', userId, receiptId: receipt.id, modelSource: pipeline.aiModelSource });
  emitToUser(userId, 'receipt:created', { receipt: toFrontendReceipt(receipt) });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: {
      ...toFrontendReceipt(receipt),
      ai: {
        category: pipeline.aiCategory,
        confidence: pipeline.aiConfidence,
        modelSource: pipeline.aiModelSource,
        embeddingScore: pipeline.embeddingScore,
        fallbackReason: pipeline.fallbackReason,
        discrepancies: pipeline.discrepancies,
        llmExtracted: pipeline.llmExtracted,
        ocrExtracted: pipeline.ocrExtracted,
      },
    },
    message: 'Receipt processed successfully',
  });
});

/** GET /api/receipts — supports ?category, ?startDate, ?endDate, ?minAmount, ?maxAmount, ?search */
export const getReceipts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE));

  const filters: ReceiptFilters = {};
  if (req.query.category) filters.category = req.query.category as string;
  if (req.query.startDate) filters.startDate = req.query.startDate as string;
  if (req.query.endDate) filters.endDate = req.query.endDate as string;
  if (req.query.minAmount) filters.minAmount = Number(req.query.minAmount);
  if (req.query.maxAmount) filters.maxAmount = Number(req.query.maxAmount);
  if (req.query.search) filters.search = req.query.search as string;

  const result = await receiptService.getReceipts(userId, page, limit, filters);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result.receipts.map(toFrontendReceipt),
    pagination: {
      page,
      limit,
      total: result.total,
      hasMore: page * limit < result.total,
    },
    message: 'Receipts retrieved successfully',
  });
});

/** GET /api/receipts/export — export all receipts as JSON */
export const exportReceipts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const result = await receiptService.getReceipts(userId, 1, 10000);

  const format = (req.query.format as string) || 'json';

  if (format === 'csv') {
    const header = 'id,merchant,amount,date,category\n';
    const rows = result.receipts.map((r: any) =>
      `"${r.id}","${r.merchant}",${r.amount},"${r.date}","${r.category}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=receipts.csv');
    return res.send(header + rows);
  }

  res.setHeader('Content-Disposition', 'attachment; filename=receipts.json');
  res.status(HTTP_STATUS.OK).json({ success: true, data: result.receipts.map(toFrontendReceipt) });
});

/** GET /api/receipts/:id */
export const getReceipt = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await receiptService.getReceiptById(req.userId!, req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: toFrontendReceipt(receipt),
    message: 'Receipt retrieved successfully',
  });
});

/** GET /api/receipts/:id/ai — AI metadata (LLM extraction, OCR comparison, confidence, model source) */
export const getReceiptAIMetadata = asyncHandler(async (req: Request, res: Response) => {
  const { getPool } = await import('../config/database.js');
  const { rows } = await getPool().query(
    `SELECT llm_extracted, ocr_extracted, discrepancies, predicted_category,
            category_confidence, category_model_source, embedding_score, fallback_reason, created_at
     FROM receipt_ai_metadata WHERE receipt_id = $1`,
    [req.params.id]
  );

  if (rows.length === 0) {
    return res.status(HTTP_STATUS.OK).json({ success: true, data: null, message: 'No AI metadata' });
  }

  const m = rows[0];
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      llmExtracted: m.llm_extracted,
      ocrExtracted: m.ocr_extracted,
      discrepancies: m.discrepancies || {},
      predictedCategory: m.predicted_category,
      confidence: m.category_confidence != null ? parseFloat(m.category_confidence) : null,
      modelSource: m.category_model_source,
      embeddingScore: m.embedding_score != null ? parseFloat(m.embedding_score) : null,
      fallbackReason: m.fallback_reason,
      createdAt: m.created_at,
    },
  });
});

/** PUT /api/receipts/:id */
export const updateReceipt = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await receiptService.updateReceipt(req.userId!, req.params.id, req.body);

  logger.info({ msg: 'Receipt updated', userId: req.userId, receiptId: req.params.id });
  emitToUser(req.userId!, 'receipt:updated', { receipt: toFrontendReceipt(receipt) });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: toFrontendReceipt(receipt),
    message: 'Receipt updated successfully',
  });
});

/** POST /api/receipts/:id/correct-category — correct category and retrain the model */
export const correctCategory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const receiptId = req.params.id;
  const { category } = req.body;

  if (!category) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'category is required');

  const receipt = await receiptService.getReceiptById(userId, receiptId);
  const originalCategory = receipt.category;

  // Update the receipt category
  const updated = await receiptService.updateReceipt(userId, receiptId, { category });

  const { getPool } = await import('../config/database.js');
  const pool = getPool();

  // Record the original prediction vs correction
  await pool.query(
    `UPDATE receipt_ai_metadata SET discrepancies = jsonb_set(
       COALESCE(discrepancies, '{}'::jsonb), '{correction}',
       $2::jsonb, true)
     WHERE receipt_id = $1`,
    [receiptId, JSON.stringify({ originalPrediction: originalCategory, correctedCategory: category, correctionTimestamp: new Date().toISOString() })]
  );

  // Feed correction into Naive Bayes training pipeline
  const items = parseJsonArray(receipt.items);
  await mlService.train(userId, receipt.merchant, items.map((i: any) => i.name || ''), category);

  // Also teach the embedding model
  if (isAIEnabledForController()) {
    await embeddingService.learnExample(userId, `${receipt.merchant} ${items.map((i: any) => i.name).join(' ')}`, category);
  }

  logger.info({ msg: 'Category corrected & model retrained', userId, receiptId, from: originalCategory, to: category });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: toFrontendReceipt(updated),
    message: 'Category corrected and model retrained',
  });
});

/** DELETE /api/receipts/:id */
export const deleteReceipt = asyncHandler(async (req: Request, res: Response) => {
  await receiptService.deleteReceipt(req.userId!, req.params.id);

  logger.info({ msg: 'Receipt deleted', userId: req.userId, receiptId: req.params.id });
  emitToUser(req.userId!, 'receipt:deleted', { receiptId: req.params.id });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: null,
    message: 'Receipt deleted successfully',
  });
});

/**
 * GET /api/receipts/autocomplete?q=prefix
 * Trie-backed merchant autocomplete — O(L) prefix lookup, no DB hit
 * after the initial trie build (cached for 10 minutes).
 */
export const merchantAutocomplete = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const prefix = String(req.query.q || '').trim();
  const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit || '10'), 10)));

  if (!prefix) {
    return res.status(HTTP_STATUS.OK).json({ success: true, data: [] });
  }

  const suggestions = await merchantAutocompleteService.search(userId, prefix, limit);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: suggestions,
    message: 'Suggestions retrieved',
  });
});
