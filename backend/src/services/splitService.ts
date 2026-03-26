import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';
import { getDatabase } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

export interface Participant {
  name: string;
  amount: number;
  paid: boolean;
}

export interface SplitExpense {
  id: string;
  receiptId: string;
  userId: string;
  shareToken: string;
  participants: Participant[];
  splitType: 'equal' | 'custom' | 'percentage';
  createdAt: string;
  receipt?: { merchant: string; amount: number; date: string; category: string };
}

export class SplitService {
  async createSplit(userId: string, receiptId: string, participants: Participant[], splitType: string = 'equal'): Promise<SplitExpense> {
    const db = getDatabase();

    const receipt = await db.get('SELECT * FROM receipts WHERE id = ? AND userId = ?', [receiptId, userId]);
    if (!receipt) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Receipt not found');

    // Auto-calculate equal splits if type is equal
    let finalParticipants = participants;
    if (splitType === 'equal' && participants.length > 0) {
      const share = Math.round((receipt.amount / participants.length) * 100) / 100;
      finalParticipants = participants.map(p => ({ ...p, amount: share }));
    }

    const id = uuidv4();
    const shareToken = crypto.randomBytes(16).toString('hex');

    await db.run(
      'INSERT INTO splits (id, receiptId, userId, shareToken, participants, splitType) VALUES (?, ?, ?, ?, ?, ?)',
      [id, receiptId, userId, shareToken, JSON.stringify(finalParticipants), splitType]
    );

    logger.info({ message: 'Split created', userId, receiptId, participants: finalParticipants.length });

    return {
      id, receiptId, userId, shareToken, participants: finalParticipants, splitType: splitType as any,
      createdAt: new Date().toISOString(),
      receipt: { merchant: receipt.merchant, amount: receipt.amount, date: receipt.date, category: receipt.category },
    };
  }

  async getSplitByToken(shareToken: string): Promise<SplitExpense> {
    const db = getDatabase();
    const split = await db.get('SELECT * FROM splits WHERE shareToken = ?', [shareToken]);
    if (!split) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Split not found');

    const receipt = await db.get('SELECT merchant, amount, date, category FROM receipts WHERE id = ?', [split.receiptId]);

    return {
      ...split,
      participants: JSON.parse(split.participants),
      receipt: receipt || undefined,
    };
  }

  async getUserSplits(userId: string): Promise<SplitExpense[]> {
    const db = getDatabase();
    const splits = await db.all('SELECT * FROM splits WHERE userId = ? ORDER BY createdAt DESC', [userId]);

    const results: SplitExpense[] = [];
    for (const split of splits) {
      const receipt = await db.get('SELECT merchant, amount, date, category FROM receipts WHERE id = ?', [split.receiptId]);
      results.push({ ...split, participants: JSON.parse(split.participants), receipt: receipt || undefined });
    }
    return results;
  }

  async markPaid(shareToken: string, participantName: string): Promise<SplitExpense> {
    const db = getDatabase();
    const split = await db.get('SELECT * FROM splits WHERE shareToken = ?', [shareToken]);
    if (!split) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Split not found');

    const participants: Participant[] = JSON.parse(split.participants);
    const participant = participants.find(p => p.name.toLowerCase() === participantName.toLowerCase());
    if (!participant) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Participant not found');

    participant.paid = true;

    await db.run('UPDATE splits SET participants = ? WHERE id = ?', [JSON.stringify(participants), split.id]);

    const receipt = await db.get('SELECT merchant, amount, date, category FROM receipts WHERE id = ?', [split.receiptId]);
    return { ...split, participants, receipt: receipt || undefined };
  }
}
