import { Request, Response } from 'express';
import { ReceiptService } from '../services/receiptService.js';
import { CategorizationService } from '../services/categorizationService.js';
import { OCRService } from '../services/octService.js';

const receiptService = new ReceiptService();
const categorizationService = new CategorizationService();
const ocrService = new OCRService();

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
  const normalized = raw.toLowerCase();

  // If already in frontend format, keep it.
  if (['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'other'].includes(normalized)) {
    return raw[0].toUpperCase() + raw.slice(1);
  }

  // Map backend classifier outputs to UI categories.
  if (['food', 'dining', 'groceries'].includes(normalized)) return 'Food';
  if (['transport'].includes(normalized)) return 'Transport';
  if (['shopping'].includes(normalized)) return 'Shopping';
  if (['utilities', 'bills'].includes(normalized)) return 'Bills';
  if (['entertainment'].includes(normalized)) return 'Entertainment';
  if (['healthcare', 'health', 'personal'].includes(normalized)) return normalized === 'personal' ? 'Other' : 'Health';

  return 'Other';
}

export async function createReceipt(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const {
      merchant,
      vendor,
      amount,
      date,
      category,
      items,
      notes,
      imageUrl,
      tags,
      isManualEntry,
    } = req.body;

    const finalMerchant = (merchant ?? vendor ?? '').toString().trim();
    const finalAmount = Number(amount);

    if (!finalMerchant || !Number.isFinite(finalAmount)) {
      return res.status(400).json({ success: false, error: 'merchant and amount are required' });
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

    res.status(201).json({ success: true, data: toFrontendReceipt(receipt) });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function uploadReceipt(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'File upload is required',
      });
    }

    // OCR (mock for now) - extract merchant/amount/date/items from the receipt file.
    const extracted = await ocrService.extractReceiptData(file.path);
    const merchant = extracted.vendor;
    const finalCategory = req.body.category || categorizationService.categorizeReceipt(merchant);

    const receipt = await receiptService.createReceipt(userId, {
      merchant,
      amount: extracted.amount,
      date: extracted.date instanceof Date ? extracted.date.toISOString().split('T')[0] : new Date(extracted.date).toISOString().split('T')[0],
      category: finalCategory,
      items: extracted.items,
      imageUrl: `/uploads/${file.filename}`,
      notes: req.body.notes || '',
      isManualEntry: false,
      tags: [],
      currency: 'INR',
      ocrData: { rawText: extracted.rawText, confidence: extracted.confidence },
    });

    res.status(201).json({
      success: true,
      data: toFrontendReceipt(receipt),
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function getReceipts(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const receipts = await receiptService.getReceipts(userId, page, limit);

    res.json({
      success: true,
      data: receipts.map(toFrontendReceipt),
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function getReceipt(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const receiptId = req.params.id;

    const receipt = await receiptService.getReceiptById(userId, receiptId);

    res.json({
      success: true,
      data: toFrontendReceipt(receipt),
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: error.message,
    });
  }
}

export async function updateReceipt(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const receiptId = req.params.id;

    const receipt = await receiptService.updateReceipt(userId, receiptId, req.body);

    res.json({
      success: true,
      data: toFrontendReceipt(receipt),
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function deleteReceipt(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const receiptId = req.params.id;

    await receiptService.deleteReceipt(userId, receiptId);

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}