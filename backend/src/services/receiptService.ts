import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../utils/constants.js';

export interface CreateReceiptDTO {
  merchant: string;
  amount: number;
  date: string;
  category?: string;
  currency?: string;
  items?: Array<{ name: string; quantity?: number; price?: number }>;
  notes?: string;
  imageUrl?: string;
  tags?: string[];
  isManualEntry?: boolean;
}

export interface ReceiptFilters {
  category?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export class ReceiptService {
  async createReceipt(userId: string, data: CreateReceiptDTO) {
    const db = getDatabase();
    const id = uuidv4();

    await db.run(
      `INSERT INTO receipts
        (id, userId, merchant, amount, currency, date, category, items, imageUrl, notes, tags, isManualEntry)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, userId,
        data.merchant,
        data.amount,
        data.currency || 'INR',
        data.date,
        data.category || 'Other',
        JSON.stringify(data.items || []),
        data.imageUrl || '',
        data.notes || '',
        JSON.stringify(data.tags || []),
        data.isManualEntry ? 1 : 0,
      ]
    );

    return this.getReceiptById(userId, id);
  }

  async getReceipts(userId: string, page = 1, limit = 20, filters?: ReceiptFilters) {
    const db = getDatabase();
    const offset = (page - 1) * limit;

    const conditions = ['userId = ?'];
    const params: any[] = [userId];

    if (filters?.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }
    if (filters?.startDate) {
      conditions.push('date >= ?');
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      conditions.push('date <= ?');
      params.push(filters.endDate);
    }
    if (filters?.minAmount != null) {
      conditions.push('amount >= ?');
      params.push(filters.minAmount);
    }
    if (filters?.maxAmount != null) {
      conditions.push('amount <= ?');
      params.push(filters.maxAmount);
    }
    if (filters?.search) {
      conditions.push('(merchant LIKE ? OR notes LIKE ?)');
      const term = `%${filters.search}%`;
      params.push(term, term);
    }

    const where = conditions.join(' AND ');

    const [receipts, countResult] = await Promise.all([
      db.all(
        `SELECT * FROM receipts WHERE ${where} ORDER BY date DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      db.get(`SELECT COUNT(*) as total FROM receipts WHERE ${where}`, params),
    ]);

    return { receipts: receipts || [], total: countResult?.total || 0, page, limit };
  }

  async getReceiptById(userId: string, receiptId: string) {
    const db = getDatabase();
    const receipt = await db.get(
      'SELECT * FROM receipts WHERE id = ? AND userId = ?',
      [receiptId, userId]
    );
    if (!receipt) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Receipt not found');
    return receipt;
  }

  async updateReceipt(userId: string, receiptId: string, updates: Partial<CreateReceiptDTO>) {
    const db = getDatabase();
    await this.getReceiptById(userId, receiptId); // ownership check

    const allowedFields = ['merchant', 'amount', 'category', 'notes', 'date', 'items', 'imageUrl', 'tags', 'isManualEntry'];
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;
      if (key === 'items' || key === 'tags') {
        setClauses.push(`${key} = ?`);
        values.push(JSON.stringify(Array.isArray(value) ? value : []));
      } else if (key === 'isManualEntry') {
        setClauses.push('isManualEntry = ?');
        values.push(value ? 1 : 0);
      } else {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) return this.getReceiptById(userId, receiptId);

    setClauses.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(receiptId, userId);

    await db.run(
      `UPDATE receipts SET ${setClauses.join(', ')} WHERE id = ? AND userId = ?`,
      values
    );

    return this.getReceiptById(userId, receiptId);
  }

  async deleteReceipt(userId: string, receiptId: string) {
    await this.getReceiptById(userId, receiptId); // ownership check
    const db = getDatabase();
    await db.run('DELETE FROM receipts WHERE id = ? AND userId = ?', [receiptId, userId]);
  }

  async getMonthlyStats(userId: string, year: number, month: number) {
    const db = getDatabase();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const rows = await db.all(
      `SELECT category, SUM(amount) as totalAmount, COUNT(*) as count
       FROM receipts WHERE userId = ? AND date BETWEEN ? AND ?
       GROUP BY category`,
      [userId, startDate, endDate]
    );

    return rows.reduce(
      (acc: any, row: any) => {
        const total = parseFloat(row.totalAmount || 0);
        acc.totalAmount = (acc.totalAmount || 0) + total;
        acc.categoryBreakdown = acc.categoryBreakdown || {};
        acc.categoryBreakdown[row.category] = total;
        acc.itemCount = (acc.itemCount || 0) + parseInt(row.count || '0');
        return acc;
      },
      {}
    );
  }
}
