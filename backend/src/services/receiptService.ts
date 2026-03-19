import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database.js';

export class ReceiptService {
  async createReceipt(userId: string, receiptData: any) {
    const db = getDatabase();
    const id = uuidv4();

    const merchant = (receiptData.merchant ?? receiptData.vendor ?? '').toString().trim() || 'Unknown Merchant';
    const amount = Number(receiptData.amount ?? 0) || 0;
    const date =
      typeof receiptData.date === 'string'
        ? receiptData.date
        : new Date(receiptData.date ?? new Date()).toISOString().split('T')[0];

    const category = (receiptData.category ?? 'Other').toString();
    const items = Array.isArray(receiptData.items) ? receiptData.items : [];
    const tags = Array.isArray(receiptData.tags) ? receiptData.tags : [];

    await db.run(
      `INSERT INTO receipts
        (id, userId, merchant, amount, currency, date, category, items, imageUrl, notes, tags, isManualEntry)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        merchant,
        amount,
        receiptData.currency || 'INR',
        date,
        category,
        JSON.stringify(items),
        receiptData.imageUrl || '',
        receiptData.notes || '',
        JSON.stringify(tags),
        receiptData.isManualEntry ? 1 : 0,
      ]
    );

    const created = await db.get('SELECT * FROM receipts WHERE id = ? AND userId = ?', [id, userId]);
    if (!created) throw new Error('Failed to create receipt');
    return created;
  }

  async getReceipts(userId: string, page = 1, limit = 20) {
    const db = getDatabase();
    const offset = (page - 1) * limit;

    const receipts = await db.all(
      `SELECT * FROM receipts
       WHERE userId = ?
       ORDER BY date DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return receipts;
  }

  async getReceiptById(userId: string, receiptId: string) {
    const db = getDatabase();
    const receipt = await db.get('SELECT * FROM receipts WHERE id = ? AND userId = ?', [receiptId, userId]);

    if (!receipt) {
      throw new Error('Receipt not found');
    }

    return receipt;
  }

  async updateReceipt(userId: string, receiptId: string, updates: any) {
    const db = getDatabase();

    // First check if receipt exists and belongs to user
    await this.getReceiptById(userId, receiptId);

    const allowedFields = ['merchant', 'amount', 'category', 'notes', 'date', 'items', 'imageUrl', 'tags', 'isManualEntry'];
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;

      if (key === 'items') {
        setClauses.push('items = ?');
        values.push(JSON.stringify(Array.isArray(value) ? value : []));
        continue;
      }
      if (key === 'tags') {
        setClauses.push('tags = ?');
        values.push(JSON.stringify(Array.isArray(value) ? value : []));
        continue;
      }
      if (key === 'isManualEntry') {
        setClauses.push('isManualEntry = ?');
        values.push(value ? 1 : 0);
        continue;
      }
      setClauses.push(`${key} = ?`);
      values.push(value);
    }

    if (setClauses.length === 0) return await this.getReceiptById(userId, receiptId);

    values.push(receiptId, userId);
    await db.run(`UPDATE receipts SET ${setClauses.join(', ')} WHERE id = ? AND userId = ?`, values);

    return await this.getReceiptById(userId, receiptId);
  }

  async deleteReceipt(userId: string, receiptId: string) {
    const db = getDatabase();
    await this.getReceiptById(userId, receiptId);
    await db.run('DELETE FROM receipts WHERE id = ? AND userId = ?', [receiptId, userId]);
  }

  async getMonthlyStats(userId: string, year: number, month: number) {
    const db = getDatabase();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const rows = await db.all(
      `SELECT
        SUM(amount) as totalAmount,
        category,
        COUNT(*) as count
       FROM receipts
       WHERE userId = ? AND date BETWEEN ? AND ?
       GROUP BY category`,
      [userId, startDate, endDate]
    );

    return rows.reduce((acc: any, row: any) => {
      const totalAmount = parseFloat(row.totalAmount || 0);
      acc.totalAmount = (acc.totalAmount || 0) + totalAmount;
      acc.categoryBreakdown = acc.categoryBreakdown || {};
      acc.categoryBreakdown[row.category] = totalAmount;
      acc.itemCount = (acc.itemCount || 0) + parseInt(row.count || '0');
      return acc;
    }, {});
  }
}