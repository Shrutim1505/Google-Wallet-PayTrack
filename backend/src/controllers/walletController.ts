import { Request, Response } from 'express';
import { WalletService } from '../services/walletService.js';
import { ReceiptService } from '../services/receiptService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

const walletService = new WalletService();
const receiptService = new ReceiptService();

/** POST /api/wallet/sync/:receiptId — Sync a receipt to Google Wallet */
export const syncReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { receiptId } = req.params;

  const receipt = await receiptService.getReceiptById(userId, receiptId);
  if (!receipt) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Receipt not found');

  let items: Array<{ name: string; price: number; quantity: number }> = [];
  try { items = typeof receipt.items === 'string' ? JSON.parse(receipt.items) : receipt.items || []; } catch { /* empty */ }

  const result = await walletService.syncReceiptToWallet({
    receiptId: receipt.id,
    merchant: receipt.merchant,
    amount: receipt.amount,
    currency: receipt.currency || 'INR',
    date: receipt.date,
    items,
  });

  logger.info({ message: 'Wallet sync attempted', userId, receiptId, success: result.success });
  res.status(HTTP_STATUS.OK).json({ success: true, data: result });
});

/** POST /api/wallet/webhook — Handle Google Wallet payment webhook (no auth) */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const event = req.body;

  if (!event?.eventType) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid webhook payload: eventType required');
  }

  const result = await walletService.processWebhookEvent(event);
  logger.info({ message: 'Wallet webhook processed', eventType: event.eventType, action: result.action });

  res.status(HTTP_STATUS.OK).json({ success: true, data: result });
});

/** GET /api/wallet/status — Get wallet sync status for authenticated user */
export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const status = await walletService.getWalletSyncStatus(userId);

  res.status(HTTP_STATUS.OK).json({ success: true, data: status });
});
