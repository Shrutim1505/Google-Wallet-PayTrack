import { Request, Response } from 'express';
import { ReceiptService } from '../services/receiptService.js';
import { CategorizationService } from '../services/categorizationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

const receiptService = new ReceiptService();
const categorizationService = new CategorizationService();

/** GET /api/ai/insights — rule-based spending insights */
export const getInsights = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const result = await receiptService.getReceipts(userId, 1, 10000);

  if (!result.receipts.length) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'No receipts found to analyze');
  }

  const receipts = result.receipts;
  const totalSpent = receipts.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const avgPerReceipt = totalSpent / receipts.length;

  // Category breakdown
  const catMap = new Map<string, number>();
  for (const r of receipts) {
    const cat = String(r.category || 'Other');
    catMap.set(cat, (catMap.get(cat) || 0) + Number(r.amount || 0));
  }
  const topCategory = [...catMap.entries()].sort((a, b) => b[1] - a[1])[0];

  const insights = [
    `You've spent a total of ₹${totalSpent.toFixed(0)} across ${receipts.length} receipts.`,
    `Average spend per receipt: ₹${avgPerReceipt.toFixed(0)}.`,
    topCategory ? `Your highest spending category is ${topCategory[0]} at ₹${topCategory[1].toFixed(0)}.` : null,
  ].filter(Boolean);

  logger.info({ msg: 'Insights generated', userId });

  res.status(HTTP_STATUS.OK).json({ success: true, data: { insights, summary: { totalSpent, avgPerReceipt, topCategory: topCategory?.[0] } } });
});

/** POST /api/ai/categorize — rule-based categorization */
export const categorize = asyncHandler(async (req: Request, res: Response) => {
  const { merchant, items } = req.body;

  if (!merchant || typeof merchant !== 'string') {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'merchant is required');
  }

  const category = categorizationService.categorizeReceipt(merchant, Array.isArray(items) ? items : []);

  logger.info({ msg: 'Categorization', merchant, category });

  res.status(HTTP_STATUS.OK).json({ success: true, data: { category, method: 'rules' } });
});
