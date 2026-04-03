import { Request, Response } from 'express';
import { RecurringService } from '../services/recurringService.js';
import { SplitService } from '../services/splitService.js';
import { DuplicateService } from '../services/duplicateService.js';
import { SmartAlertService } from '../services/smartAlertService.js';
import { CurrencyService } from '../services/currencyService.js';
import { MLService } from '../services/mlService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { emitToUser } from '../config/websocket.js';

const recurringService = new RecurringService();
const splitService = new SplitService();
const duplicateService = new DuplicateService();
const smartAlertService = new SmartAlertService();
const currencyService = new CurrencyService();
const mlService = new MLService();

// ── Recurring Expenses ──
export const getRecurring = asyncHandler(async (req: Request, res: Response) => {
  const patterns = await recurringService.detectRecurring(req.userId!);
  res.json({ success: true, data: patterns });
});

// ── Split Expenses ──
export const createSplit = asyncHandler(async (req: Request, res: Response) => {
  const { receiptId, participants, splitType } = req.body;
  if (!receiptId || !participants?.length) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'receiptId and participants required');
  const split = await splitService.createSplit(req.userId!, receiptId, participants, splitType);
  emitToUser(req.userId!, 'split:created', { split });
  res.status(HTTP_STATUS.CREATED).json({ success: true, data: split });
});

export const getSplitByToken = asyncHandler(async (req: Request, res: Response) => {
  const split = await splitService.getSplitByToken(req.params.token);
  res.json({ success: true, data: split });
});

export const getUserSplits = asyncHandler(async (req: Request, res: Response) => {
  const splits = await splitService.getUserSplits(req.userId!);
  res.json({ success: true, data: splits });
});

export const markSplitPaid = asyncHandler(async (req: Request, res: Response) => {
  const { participantName } = req.body;
  if (!participantName) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'participantName required');
  const split = await splitService.markPaid(req.params.token, participantName);
  res.json({ success: true, data: split });
});

// ── Duplicate Detection ──
export const checkDuplicate = asyncHandler(async (req: Request, res: Response) => {
  const { merchant, amount, date } = req.body;
  if (!merchant || !amount) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'merchant and amount required');
  const duplicates = await duplicateService.checkDuplicate(req.userId!, merchant, amount, date || new Date().toISOString().split('T')[0]);
  res.json({ success: true, data: duplicates });
});

// ── Smart Alerts ──
export const getAlerts = asyncHandler(async (req: Request, res: Response) => {
  const alerts = await smartAlertService.getAlerts(req.userId!);
  const unreadCount = await smartAlertService.getUnreadCount(req.userId!);
  res.json({ success: true, data: { alerts, unreadCount } });
});

export const markAlertsRead = asyncHandler(async (req: Request, res: Response) => {
  await smartAlertService.markRead(req.userId!, req.body.alertIds);
  res.json({ success: true, message: 'Alerts marked as read' });
});

export const generateDigest = asyncHandler(async (req: Request, res: Response) => {
  const digest = await smartAlertService.generateWeeklyDigest(req.userId!);
  res.json({ success: true, data: digest });
});

// ── Currency ──
export const convertCurrency = asyncHandler(async (req: Request, res: Response) => {
  const { amount, from, to } = req.body;
  if (!amount || !from || !to) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'amount, from, and to required');
  const result = await currencyService.convert(Number(amount), from, to);
  res.json({ success: true, data: result });
});

export const getRates = asyncHandler(async (req: Request, res: Response) => {
  const base = (req.query.base as string) || 'INR';
  const rates = await currencyService.getRates(base);
  res.json({ success: true, data: { base, rates } });
});

export const getSupportedCurrencies = asyncHandler(async (_req: Request, res: Response) => {
  const currencies = await currencyService.getSupportedCurrencies();
  res.json({ success: true, data: currencies });
});

// ── ML ──
export const mlPredict = asyncHandler(async (req: Request, res: Response) => {
  const { merchant, items } = req.body;
  if (!merchant) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'merchant required');
  const prediction = await mlService.predict(req.userId!, merchant, items);
  res.json({ success: true, data: prediction });
});

export const mlTrain = asyncHandler(async (req: Request, res: Response) => {
  const { merchant, items, category } = req.body;
  if (!merchant || !category) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'merchant and category required');
  await mlService.train(req.userId!, merchant, Array.isArray(items) ? items : [], category);
  res.json({ success: true, message: 'Model updated' });
});

export const mlStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await mlService.getModelStats(req.userId!);
  res.json({ success: true, data: stats });
});
