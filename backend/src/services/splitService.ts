import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';
import { getPool } from '../config/database.js';
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
    const pool = getPool();

    const { rows } = await pool.query('SELECT * FROM receipts WHERE id = $1 AND user_id = $2', [receiptId, userId]);
    if (rows.length === 0) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Receipt not found');
    const receipt = rows[0];

    let finalParticipants = participants;
    if (splitType === 'equal' && participants.length > 0) {
      const share = Math.round((parseFloat(receipt.amount) / participants.length) * 100) / 100;
      finalParticipants = participants.map(p => ({ ...p, amount: share }));
    }

    const id = uuidv4();
    const shareToken = crypto.randomBytes(16).toString('hex');

    await pool.query(
      'INSERT INTO splits (id, receipt_id, user_id, share_token, participants, split_type) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, receiptId, userId, shareToken, JSON.stringify(finalParticipants), splitType]
    );

    logger.info({ message: 'Split created', userId, receiptId, participants: finalParticipants.length });

    return {
      id, receiptId, userId, shareToken, participants: finalParticipants, splitType: splitType as any,
      createdAt: new Date().toISOString(),
      receipt: { merchant: receipt.merchant, amount: parseFloat(receipt.amount), date: receipt.date, category: receipt.category },
    };
  }

  async getSplitByToken(shareToken: string): Promise<SplitExpense> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM splits WHERE share_token = $1', [shareToken]);
    if (rows.length === 0) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Split not found');
    const split = rows[0];

    const { rows: receiptRows } = await pool.query('SELECT merchant, amount, date, category FROM receipts WHERE id = $1', [split.receipt_id]);

    return {
      ...split, receiptId: split.receipt_id, userId: split.user_id, shareToken: split.share_token,
      participants: typeof split.participants === 'string' ? JSON.parse(split.participants) : split.participants,
      splitType: split.split_type,
      receipt: receiptRows[0] || undefined,
    };
  }

  async getUserSplits(userId: string): Promise<SplitExpense[]> {
    const pool = getPool();
    const { rows: splits } = await pool.query('SELECT * FROM splits WHERE user_id = $1 ORDER BY created_at DESC', [userId]);

    const results: SplitExpense[] = [];
    for (const split of splits) {
      const { rows: receiptRows } = await pool.query('SELECT merchant, amount, date, category FROM receipts WHERE id = $1', [split.receipt_id]);
      results.push({
        ...split, receiptId: split.receipt_id, userId: split.user_id, shareToken: split.share_token,
        participants: typeof split.participants === 'string' ? JSON.parse(split.participants) : split.participants,
        splitType: split.split_type,
        receipt: receiptRows[0] || undefined,
      });
    }
    return results;
  }

  async markPaid(shareToken: string, participantName: string): Promise<SplitExpense> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM splits WHERE share_token = $1', [shareToken]);
    if (rows.length === 0) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Split not found');
    const split = rows[0];

    const participants: Participant[] = typeof split.participants === 'string' ? JSON.parse(split.participants) : split.participants;
    const participant = participants.find(p => p.name.toLowerCase() === participantName.toLowerCase());
    if (!participant) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Participant not found');

    participant.paid = true;

    await pool.query('UPDATE splits SET participants = $1 WHERE id = $2', [JSON.stringify(participants), split.id]);

    const { rows: receiptRows } = await pool.query('SELECT merchant, amount, date, category FROM receipts WHERE id = $1', [split.receipt_id]);
    return {
      ...split, receiptId: split.receipt_id, userId: split.user_id, shareToken: split.share_token,
      participants, splitType: split.split_type,
      receipt: receiptRows[0] || undefined,
    };
  }
}
