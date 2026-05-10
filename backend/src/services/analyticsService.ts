import { getPool } from '../config/database.js';

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
}
