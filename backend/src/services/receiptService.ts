import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database.js';

export class ReceiptService {
  async createReceipt(userId: string, receiptData: any) {
    const db = getDatabase();
    const id = uuidv4();

    const result = await db.query(
      `INSERT INTO receipts 
       (id, userId, vendor, amount, currency, date, category, imageUrl, notes, isManualEntry) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        userId,
        receiptData.vendor,
        receiptData.amount,
        receiptData.currency || 'INR',
        receiptData.date || new Date(),
        receiptData.category || 'other',
        receiptData.imageUrl || '',
        receiptData.notes || '',
        receiptData.isManualEntry || false,
      ]
    );

    return result.rows[0];
  }

  async getReceipts(userId: string, page = 1, limit = 20) {
    const db = getDatabase();
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT * FROM receipts WHERE userId = $1 
       ORDER BY date DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM receipts WHERE userId = $1',
      [userId]
    );

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    };
  }

  async getReceiptById(userId: string, receiptId: string) {
    const db = getDatabase();

    const result = await db.query(
      'SELECT * FROM receipts WHERE id = $1 AND userId = $2',
      [receiptId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Receipt not found');
    }

    return result.rows[0];
  }

  async updateReceipt(userId: string, receiptId: string, updates: any) {
    const db = getDatabase();

    // First check if receipt exists and belongs to user
    await this.getReceiptById(userId, receiptId);

    const allowedFields = ['vendor', 'amount', 'category', 'notes'];
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return await this.getReceiptById(userId, receiptId);
    }

    updateValues.push(receiptId, userId);

    const result = await db.query(
      `UPDATE receipts SET ${updateFields.join(', ')} 
       WHERE id = $${paramIndex} AND userId = $${paramIndex + 1}
       RETURNING *`,
      updateValues
    );

    return result.rows[0];
  }

  async deleteReceipt(userId: string, receiptId: string) {
    const db = getDatabase();

    await this.getReceiptById(userId, receiptId);

    await db.query(
      'DELETE FROM receipts WHERE id = $1 AND userId = $2',
      [receiptId, userId]
    );
  }

  async getMonthlyStats(userId: string, year: number, month: number) {
    const db = getDatabase();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const result = await db.query(
      `SELECT 
        SUM(amount) as totalAmount,
        category,
        COUNT(*) as count
       FROM receipts 
       WHERE userId = $1 AND date BETWEEN $2 AND $3
       GROUP BY category`,
      [userId, startDate, endDate]
    );

    return result.rows.reduce((acc: any, row: any) => {
      acc.totalAmount = (acc.totalAmount || 0) + parseFloat(row.totalamount);
      acc.categoryBreakdown = acc.categoryBreakdown || {};
      acc.categoryBreakdown[row.category] = parseFloat(row.totalamount);
      acc.itemCount = (acc.itemCount || 0) + parseInt(row.count);
      return acc;
    }, {});
  }
}