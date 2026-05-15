import { getPool } from '../config/database.js';
import { topK, topKGroupedBy } from '../algorithms/MinHeap.js';

export class AnalyticsService {
  async getAnalytics(userId: string, year: number = new Date().getFullYear(), month: number = new Date().getMonth() + 1) {
    const pool = getPool();

    // All time statistics
    const { rows: allTimeRows } = await pool.query(
      `SELECT category, SUM(amount)::numeric as total, COUNT(*)::int as count
       FROM receipts WHERE user_id = $1 GROUP BY category`,
      [userId]
    );

    const totalSpent = allTimeRows.reduce((sum, r) => sum + parseFloat(r.total), 0);
    const receiptsCount = allTimeRows.reduce((sum, r) => sum + r.count, 0);
    const categories = allTimeRows.map(r => ({ category: r.category, amount: parseFloat(r.total) }));

    // Monthly statistics
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { rows: monthlyRows } = await pool.query(
      `SELECT category, SUM(amount)::numeric as total, COUNT(*)::int as count
       FROM receipts WHERE user_id = $1 AND date BETWEEN $2 AND $3
       GROUP BY category`,
      [userId, startDate, endDate]
    );

    const monthlySpent = monthlyRows.reduce((sum, r) => sum + parseFloat(r.total), 0);
    const monthlyCount = monthlyRows.reduce((sum, r) => sum + r.count, 0);
    const monthlyCategories = monthlyRows.map(r => ({ category: r.category, amount: parseFloat(r.total) }));

    return {
      allTime: { totalSpent, receiptsCount, categories },
      monthly: { year, month, totalSpent: monthlySpent, receiptsCount: monthlyCount, categories: monthlyCategories },
    };
  }

  /**
   * Top-K merchants by spending — uses min-heap algorithm.
   *
   * For N receipts and K results:
   *   • Naive (sort all, take first K): O(N log N) time, O(N) space
   *   • Top-K with min-heap:             O(N log K) time, O(K) space
   *
   * For K=10 and N=10000, this is ~4× faster.
   */
  async getTopMerchants(userId: string, k = 10): Promise<Array<{ merchant: string; total: number; count: number }>> {
    const { rows } = await getPool().query(
      `SELECT merchant, amount FROM receipts WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    const merchants = topKGroupedBy(
      rows,
      k,
      (r) => r.merchant,
      (r) => parseFloat(r.amount)
    );

    return merchants.map(m => ({
      merchant: m.key,
      total: m.total,
      count: m.count,
    }));
  }

  /**
   * Top-K spending categories using the same Top-K algorithm.
   */
  async getTopCategories(userId: string, k = 5): Promise<Array<{ category: string; total: number; count: number }>> {
    const { rows } = await getPool().query(
      `SELECT category, amount FROM receipts WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    const categories = topKGroupedBy(
      rows,
      k,
      (r) => r.category || 'Uncategorized',
      (r) => parseFloat(r.amount)
    );

    return categories.map(c => ({ category: c.key, total: c.total, count: c.count }));
  }

  /**
   * Top-K most expensive single receipts using Top-K directly (no grouping).
   */
  async getTopReceipts(userId: string, k = 10): Promise<Array<{ id: string; merchant: string; amount: number; date: string }>> {
    const { rows } = await getPool().query(
      `SELECT id, merchant, amount, date FROM receipts WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    const top = topK(rows, k, (r) => parseFloat(r.amount));
    return top.map(r => ({
      id: r.id,
      merchant: r.merchant,
      amount: parseFloat(r.amount),
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
    }));
  }
}
