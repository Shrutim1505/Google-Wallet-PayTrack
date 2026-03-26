import { Request, Response } from 'express';
import { ReceiptService } from '../services/receiptService.js';
import { CategorizationService } from '../services/categorizationService.js';
import { OCRService } from '../services/octService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../utils/constants.js';

const receiptService = new ReceiptService();
const categorizationService = new CategorizationService();
const ocrService = new OCRService();

function parseJsonArray(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

const CATEGORY_MAP: Record<string, string> = {
  food: 'Food', dining: 'Food', groceries: 'Food',
  transport: 'Transport', shopping: 'Shopping',
  utilities: 'Bills', bills: 'Bills',
  entertainment: 'Entertainment',
  healthcare: 'Health', health: 'Health',
  other: 'Other', personal: 'Other',
};

function normalizeCategory(category: unknown): string {
  return CATEGORY_MAP[String(category ?? 'Other').trim().toLowerCase()] || 'Other';
}

function toFrontendReceipt(row: any) {
  return {
    id: String(row.id),
    merchant: String(row.merchant ?? 'Unknown Merchant'),
    amount: Number(row.amount ?? 0),
    date: typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().split('T')[0],
    category: normalizeCategory(row.category),
    items: parseJsonArray(row.items),
    notes: row.notes || '',
    imageUrl: row.imageUrl || '',
    createdAt: row.createdAt,
  };
}

export const createReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { merchant, vendor, amount, date, category, items, notes, imageUrl, tags, isManualEntry } = req.body;

  const finalMerchant = (merchant ?? vendor ?? '').toString().trim();
  const finalAmount = Number(amount);

  if (!finalMerchant || !Number.isFinite(finalAmount)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Merchant and amount are required');
  }

  const receipt = await receiptService.createReceipt(userId, {
    merchant: finalMerchant, amount: finalAmount,
    date: date || new Date().toISOString().split('T')[0],
    category: category || 'Other',
    items: Array.isArray(items) ? items : [],
    notes: notes || '', imageUrl: imageUrl || '',
    tags: Array.isArray(tags) ? tags : [],
    isManualEntry: isManualEntry ?? true,
  });

  logger.info({ message: 'Receipt created', userId, receiptId: receipt.id });

  res.status(HTTP_STATUS.CREATED).json({
    success: true, data: toFrontendReceipt(receipt), message: 'Receipt created successfully',
  });
});

export const uploadReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const file = req.file;
  if (!file) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'File upload is required');

  const extracted = await ocrService.extractReceiptData(file.path);
  const merchant = extracted.vendor;
  const finalCategory = req.body.category || categorizationService.categorizeReceipt(merchant);

  const receipt = await receiptService.createReceipt(userId, {
    merchant, amount: extracted.amount,
    date: extracted.date instanceof Date ? extracted.date.toISOString().split('T')[0] : new Date(extracted.date).toISOString().split('T')[0],
    category: finalCategory, items: extracted.items,
    imageUrl: `/uploads/${file.filename}`, notes: req.body.notes || '',
    isManualEntry: false, tags: [], currency: 'INR',
  });

  logger.info({ message: 'Receipt uploaded', userId, receiptId: receipt.id });

  res.status(HTTP_STATUS.CREATED).json({
    success: true, data: toFrontendReceipt(receipt), message: 'Receipt processed successfully',
  });
});

export const getReceipts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE));

  const result = await receiptService.getReceipts(userId, page, limit);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result.receipts.map(toFrontendReceipt),
    pagination: { page, limit, total: result.total, hasMore: page * limit < result.total },
  });
});

export const getReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const receipt = await receiptService.getReceiptById(userId, req.params.id);
  if (!receipt) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Receipt not found');

  res.status(HTTP_STATUS.OK).json({ success: true, data: toFrontendReceipt(receipt) });
});

export const updateReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const receipt = await receiptService.updateReceipt(userId, req.params.id, req.body);
  if (!receipt) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Receipt not found');

  logger.info({ message: 'Receipt updated', userId, receiptId: req.params.id });

  res.status(HTTP_STATUS.OK).json({ success: true, data: toFrontendReceipt(receipt), message: 'Receipt updated' });
});

export const deleteReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  await receiptService.deleteReceipt(userId, req.params.id);

  logger.info({ message: 'Receipt deleted', userId, receiptId: req.params.id });

  res.status(HTTP_STATUS.OK).json({ success: true, data: null, message: 'Receipt deleted' });
});

/**
 * Export all receipts as CSV
 * GET /api/receipts/export
 */
export const exportReceipts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const result = await receiptService.getReceipts(userId, 1, 10000);

  const header = 'Date,Merchant,Category,Amount,Notes\n';
  const rows = result.receipts.map((r: any) => {
    const merchant = String(r.merchant ?? '').replace(/"/g, '""');
    const notes = String(r.notes ?? '').replace(/"/g, '""');
    const category = normalizeCategory(r.category);
    return `${r.date},"${merchant}","${category}",${r.amount},"${notes}"`;
  }).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=receipts-${new Date().toISOString().split('T')[0]}.csv`);
  res.send(header + rows);
});
