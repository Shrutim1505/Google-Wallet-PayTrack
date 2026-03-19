import { Request, Response } from 'express';
import { ReceiptService } from '../services/receiptService.js';
import { CategorizationService } from '../services/categorizationService.js';
import { v4 as uuidv4 } from 'uuid';

const receiptService = new ReceiptService();
const categorizationService = new CategorizationService();

export async function uploadReceipt(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { category, vendor, amount, date, notes } = req.body;

    if (!vendor || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Vendor and amount are required',
      });
    }

    // Auto-categorize if not provided
    const finalCategory = category || categorizationService.categorizeReceipt(vendor);

    const receipt = await receiptService.createReceipt(userId, {
      vendor,
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      category: finalCategory,
      imageUrl: req.file ? `/uploads/${uuidv4()}` : '',
      notes,
      isManualEntry: true,
    });

    res.status(201).json({
      success: true,
      data: receipt,
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

    const result = await receiptService.getReceipts(userId, page, limit);

    res.json({
      success: true,
      data: result,
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
      data: receipt,
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
      data: receipt,
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
      message: 'Receipt deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}