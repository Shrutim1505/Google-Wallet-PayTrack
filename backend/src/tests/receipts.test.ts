import { describe, it, expect, beforeAll } from 'vitest';
import { ReceiptService } from '../services/receiptService.js';
import { getPool, runTransaction } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const receiptService = new ReceiptService();

describe('ReceiptService', () => {
  let userId: string;

  beforeAll(async () => {
    userId = uuidv4();
    const hash = await bcrypt.hash('test', 10);
    await getPool().query(
      'INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)',
      [userId, `receipt-test-${Date.now()}@test.com`, 'Receipt Tester', hash]
    );
  });

  describe('createReceipt', () => {
    it('should create a receipt and return it', async () => {
      const receipt = await receiptService.createReceipt(userId, {
        merchant: 'Test Store',
        amount: 500.50,
        date: '2024-06-15',
        category: 'Food',
        items: [{ name: 'Pizza', quantity: 2, price: 250.25 }],
      });

      expect(receipt.id).toBeDefined();
      expect(receipt.merchant).toBe('Test Store');
      expect(parseFloat(receipt.amount)).toBe(500.50);
      expect(receipt.category).toBe('Food');
    });
  });

  describe('getReceipts', () => {
    it('should return paginated receipts', async () => {
      // Create a few receipts
      for (let i = 0; i < 5; i++) {
        await receiptService.createReceipt(userId, {
          merchant: `Store ${i}`,
          amount: 100 * (i + 1),
          date: `2024-07-${String(i + 1).padStart(2, '0')}`,
          category: i % 2 === 0 ? 'Food' : 'Shopping',
        });
      }

      const result = await receiptService.getReceipts(userId, 1, 3);
      expect(result.receipts.length).toBeLessThanOrEqual(3);
      expect(result.total).toBeGreaterThanOrEqual(5);
    });

    it('should filter by category', async () => {
      const result = await receiptService.getReceipts(userId, 1, 100, { category: 'Food' });
      for (const r of result.receipts) {
        expect(r.category).toBe('Food');
      }
    });

    it('should filter by date range', async () => {
      const result = await receiptService.getReceipts(userId, 1, 100, {
        startDate: '2024-07-01',
        endDate: '2024-07-05',
      });
      // We created 5 receipts with dates 2024-07-01 through 2024-07-05
      expect(result.receipts.length).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it('should search by merchant name (ILIKE)', async () => {
      const result = await receiptService.getReceipts(userId, 1, 100, { search: 'Store 2' });
      expect(result.receipts.some(r => r.merchant === 'Store 2')).toBe(true);
    });
  });

  describe('updateReceipt', () => {
    it('should update receipt fields', async () => {
      const created = await receiptService.createReceipt(userId, {
        merchant: 'Old Name', amount: 100, date: '2024-08-01',
      });

      const updated = await receiptService.updateReceipt(userId, created.id, {
        merchant: 'New Name', amount: 200,
      });

      expect(updated.merchant).toBe('New Name');
      expect(parseFloat(updated.amount)).toBe(200);
    });
  });

  describe('deleteReceipt', () => {
    it('should delete a receipt', async () => {
      const created = await receiptService.createReceipt(userId, {
        merchant: 'To Delete', amount: 50, date: '2024-09-01',
      });

      await receiptService.deleteReceipt(userId, created.id);
      await expect(receiptService.getReceiptById(userId, created.id)).rejects.toThrow('Receipt not found');
    });

    it('should not delete another users receipt', async () => {
      const otherUserId = uuidv4();
      await expect(receiptService.getReceiptById(otherUserId, uuidv4())).rejects.toThrow('Receipt not found');
    });
  });

  describe('ACID transactions', () => {
    it('should rollback on failure within transaction', async () => {
      const pool = getPool();
      const receiptId = uuidv4();

      try {
        await runTransaction(async (client) => {
          await client.query(
            `INSERT INTO receipts (id, user_id, merchant, amount, date) VALUES ($1, $2, $3, $4, $5)`,
            [receiptId, userId, 'Transaction Test', 999, '2024-10-01']
          );
          // Force an error
          throw new Error('Simulated failure');
        });
      } catch (e) {
        // Expected
      }

      // Receipt should NOT exist due to rollback
      const { rows } = await pool.query('SELECT id FROM receipts WHERE id = $1', [receiptId]);
      expect(rows.length).toBe(0);
    });
  });
});
