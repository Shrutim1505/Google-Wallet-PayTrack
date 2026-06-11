import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../config/database.js';
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
    const pool = getPool();
    const id = uuidv4();

    await pool.query(
      `INSERT INTO receipts (id, user_id, merchant, amount, currency, date, category, items, image_url, notes, tags, is_manual_entry)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id, userId, data.merchant, data.amount, data.currency || 'INR',
        data.date, data.category || 'Other',
        JSON.stringify(data.items || []), data.imageUrl || '',
        data.notes || '', JSON.stringify(data.tags || []),
        data.isManualEntry ?? false,
      ]
    );

    return this.getReceiptById(userId, id);
  }

  async getReceipts(userId: string, page = 1, limit = 20, filters?: ReceiptFilters) {
    const pool = getPool();
    const offset = (page - 1) * limit;

    const conditions = ['user_id = $1'];
    const params: any[] = [userId];
    let paramIdx = 2;

    if (filters?.category) {
      conditions.push(`category = $${paramIdx++}`);
      params.push(filters.category);
    }
    if (filters?.startDate) {
      conditions.push(`date >= $${paramIdx++}`);
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      conditions.push(`date <= $${paramIdx++}`);
      params.push(filters.endDate);
    }
    if (filters?.minAmount != null) {
      conditions.push(`amount >= $${paramIdx++}`);
      params.push(filters.minAmount);
    }
    if (filters?.maxAmount != null) {
      conditions.push(`amount <= $${paramIdx++}`);
      params.push(filters.maxAmount);
    }
    if (filters?.search) {
      conditions.push(`(merchant ILIKE $${paramIdx} OR notes ILIKE $${paramIdx})`);
      params.push(`%${filters.search}%`);
      paramIdx++;
    }

    const where = conditions.join(' AND ');

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM receipts WHERE ${where} ORDER BY date DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*)::int as total FROM receipts WHERE ${where}`, params),
    ]);

    return { receipts: dataResult.rows, total: countResult.rows[0]?.total || 0, page, limit };
  }

  async getReceiptById(userId: string, receiptId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM receipts WHERE id = $1 AND user_id = $2',
      [receiptId, userId]
    );
    if (rows.length === 0) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Receipt not found');
    return rows[0];
  }

  async updateReceipt(userId: string, receiptId: string, updates: Partial<CreateReceiptDTO>) {
    await this.getReceiptById(userId, receiptId);
    const pool = getPool();

    const allowedFields: Record<string, string> = {
      merchant: 'merchant', amount: 'amount', category: 'category',
      notes: 'notes', date: 'date', imageUrl: 'image_url',
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'items' || key === 'tags') {
        setClauses.push(`${key} = $${paramIdx++}`);
        values.push(JSON.stringify(Array.isArray(value) ? value : []));
      } else if (key === 'isManualEntry') {
        setClauses.push(`is_manual_entry = $${paramIdx++}`);
        values.push(!!value);
      } else if (allowedFields[key]) {
        setClauses.push(`${allowedFields[key]} = $${paramIdx++}`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) return this.getReceiptById(userId, receiptId);

    setClauses.push('updated_at = NOW()');
    values.push(receiptId, userId);

    await pool.query(
      `UPDATE receipts SET ${setClauses.join(', ')} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1}`,
      values
    );

    return this.getReceiptById(userId, receiptId);
  }

  async deleteReceipt(userId: string, receiptId: string) {
    await this.getReceiptById(userId, receiptId);
    const pool = getPool();
    await pool.query('DELETE FROM receipts WHERE id = $1 AND user_id = $2', [receiptId, userId]);
  }

  async getMonthlyStats(userId: string, year: number, month: number) {
    const pool = getPool();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { rows } = await pool.query(
      `SELECT category, SUM(amount)::numeric as total_amount, COUNT(*)::int as count
       FROM receipts WHERE user_id = $1 AND date BETWEEN $2 AND $3
       GROUP BY category`,
      [userId, startDate, endDate]
    );

    return rows.reduce(
      (acc: any, row: any) => {
        const total = parseFloat(row.total_amount || 0);
        acc.totalAmount = (acc.totalAmount || 0) + total;
        acc.categoryBreakdown = acc.categoryBreakdown || {};
        acc.categoryBreakdown[row.category] = total;
        acc.itemCount = (acc.itemCount || 0) + row.count;
        return acc;
      },
      {}
    );
  }
}
