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

/**
 * Helper: Parse JSON string or array
 */
function parseJsonArray(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Helper: Transform database receipt to frontend format
 */
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

/**
 * Helper: Normalize category to standard values
 */
function normalizeCategory(category: unknown): string {
  const raw = String(category ?? 'Other').trim();
  const normalized = raw.toLowerCase();

  if (['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'other'].includes(normalized)) {
    return raw[0].toUpperCase() + raw.slice(1);
  }

  if (['food', 'dining', 'groceries'].includes(normalized)) return 'Food';
  if (['transport'].includes(normalized)) return 'Transport';
  if (['shopping'].includes(normalized)) return 'Shopping';
  if (['utilities', 'bills'].includes(normalized)) return 'Bills';
  if (['entertainment'].includes(normalized)) return 'Entertainment';
  if (['healthcare', 'health', 'personal'].includes(normalized)) return normalized === 'personal' ? 'Other' : 'Health';

  return 'Other';
}

/**
 * Create a new receipt (manual entry)
 * POST /api/receipts
 */
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

  logger.info({
    message: 'Receipt created',
    userId,
    receiptId: receipt.id,
    merchant: finalMerchant,
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: toFrontendReceipt(receipt),
    message: 'Receipt created successfully',
  });
});

/**
 * Upload and process receipt with OCR
 * POST /api/receipts/upload
 */
export const uploadReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const file = req.file;

  if (!file) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'File upload is required');
  }

  try {
    // Extract data from receipt image via OCR
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

    logger.info({
      message: 'Receipt uploaded and processed',
      userId,
      receiptId: receipt.id,
      merchant,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: toFrontendReceipt(receipt),
      message: 'Receipt processed successfully',
    });
  } catch (error: any) {
    logger.error({
      message: 'OCR processing failed',
      error: error.message,
      userId,
    });
    throw new AppError(HTTP_STATUS.BAD_REQUEST, `OCR processing failed: ${error.message}`);
  }
});

/**
 * Get paginated list of receipts
 * GET /api/receipts
 */
export const getReceipts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE));

  const result = await receiptService.getReceipts(userId, page, limit);

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

/**
 * Get a single receipt by ID
 * GET /api/receipts/:id
 */
export const getReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const receiptId = req.params.id;

  const receipt = await receiptService.getReceiptById(userId, receiptId);

  if (!receipt) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Receipt not found');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: toFrontendReceipt(receipt),
    message: 'Receipt retrieved successfully',
  });
});

/**
 * Update a receipt
 * PUT /api/receipts/:id
 */
export const updateReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const receiptId = req.params.id;

  const receipt = await receiptService.updateReceipt(userId, receiptId, req.body);

  if (!receipt) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Receipt not found');
  }

  logger.info({
    message: 'Receipt updated',
    userId,
    receiptId,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: toFrontendReceipt(receipt),
    message: 'Receipt updated successfully',
  });
});

/**
 * Delete a receipt
 * DELETE /api/receipts/:id
 */
export const deleteReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const receiptId = req.params.id;

  await receiptService.deleteReceipt(userId, receiptId);

  logger.info({
    message: 'Receipt deleted',
    userId,
    receiptId,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: null,
    message: 'Receipt deleted successfully',
  });
});