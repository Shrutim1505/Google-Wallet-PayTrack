import { Request, Response } from 'express';
import { ReceiptService, ReceiptFilters } from '../services/receiptService.js';
import { CategorizationService } from '../services/categorizationService.js';
import { OCRService } from '../services/ocrService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../utils/constants.js';

const receiptService = new ReceiptService();
const categorizationService = new CategorizationService();
const ocrService = new OCRService();

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
    date: typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().split('T')[0],
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

  logger.info({ msg: 'Receipt created', userId, receiptId: receipt.id });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: toFrontendReceipt(receipt),
    message: 'Receipt created successfully',
  });
});

/** POST /api/receipts/upload */
export const uploadReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const file = req.file;

  if (!file) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'File upload is required');

  const extracted = await ocrService.extractReceiptData(file.path);
  const merchant = extracted.vendor;
  const finalCategory = req.body.category || categorizationService.categorizeReceipt(merchant);

  const receipt = await receiptService.createReceipt(userId, {
    merchant,
    amount: extracted.amount,
    date: extracted.date instanceof Date
      ? extracted.date.toISOString().split('T')[0]
      : new Date(extracted.date).toISOString().split('T')[0],
    category: finalCategory,
    items: extracted.items,
    imageUrl: `/uploads/${file.filename}`,
    notes: req.body.notes || '',
    isManualEntry: false,
    tags: [],
    currency: 'INR',
  });

  logger.info({ msg: 'Receipt uploaded', userId, receiptId: receipt.id });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: toFrontendReceipt(receipt),
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

/** PUT /api/receipts/:id */
export const updateReceipt = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await receiptService.updateReceipt(req.userId!, req.params.id, req.body);

  logger.info({ msg: 'Receipt updated', userId: req.userId, receiptId: req.params.id });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: toFrontendReceipt(receipt),
    message: 'Receipt updated successfully',
  });
});

/** DELETE /api/receipts/:id */
export const deleteReceipt = asyncHandler(async (req: Request, res: Response) => {
  await receiptService.deleteReceipt(req.userId!, req.params.id);

  logger.info({ msg: 'Receipt deleted', userId: req.userId, receiptId: req.params.id });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: null,
    message: 'Receipt deleted successfully',
  });
});
