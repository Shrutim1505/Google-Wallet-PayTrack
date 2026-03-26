import { Request, Response } from 'express';
import { AIService } from '../services/aiService.js';
import { ReceiptService } from '../services/receiptService.js';
import { MLService } from '../services/mlService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

const aiService = new AIService();
const receiptService = new ReceiptService();
const mlService = new MLService();

/** GET /api/ai/insights — AI-generated spending insights for the authenticated user */
export const getInsights = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const result = await receiptService.getReceipts(userId, 1, 10000);

  if (!result.receipts.length) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'No receipts found to analyze');
  }

  const insights = aiService.generateSpendingInsights(result.receipts);
  logger.info({ message: 'AI insights generated', userId });

  res.status(HTTP_STATUS.OK).json({ success: true, data: insights });
});

/** POST /api/ai/categorize — ML-powered category prediction with rule-based fallback */
export const categorize = asyncHandler(async (req: Request, res: Response) => {
  const { merchant, items } = req.body;

  if (!merchant || typeof merchant !== 'string') {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'merchant is required');
  }

  const itemList = Array.isArray(items) ? items : [];

  // Try ML first
  const mlResult = await mlService.predict(req.userId!, merchant, itemList);
  const category = mlResult.confidence > 0.25 ? mlResult.category : aiService.smartCategorize(merchant, itemList);

  logger.info({ message: 'AI categorization', merchant, category, mlConfidence: mlResult.confidence, usedML: mlResult.confidence > 0.25 });

  res.status(HTTP_STATUS.OK).json({ success: true, data: { category, confidence: mlResult.confidence, method: mlResult.confidence > 0.25 ? 'ml' : 'rules' } });
});
