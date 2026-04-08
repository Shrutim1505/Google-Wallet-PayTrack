import { getDatabase } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../utils/constants.js';

export class AnalyticsService {
  async getAnalytics(userId: string, year: number = new Date().getFullYear(), month: number = new Date().getMonth() + 1) {
    const db = getDatabase();

    try {
      // All time statistics
      const receipts = await db.all(
        `SELECT category, amount FROM receipts WHERE userId = ?`,
        [userId]
      );

      const totalSpent = receipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
      const receiptsCount = receipts.length;

      const byCategoryMap = new Map<string, number>();
      for (const r of receipts) {
        const cat = String(r.category || 'Uncategorized');
        byCategoryMap.set(cat, (byCategoryMap.get(cat) || 0) + Number(r.amount || 0));
      }

      const categories = Array.from(byCategoryMap.entries()).map(([category, amount]) => ({
        category,
        amount,
      }));

      // Monthly statistics
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const monthlyReceipts = await db.all(
        `SELECT category, amount FROM receipts
         WHERE userId = ? AND date BETWEEN ? AND ?`,
        [userId, startDate, endDate]
      );

      const monthlySpent = monthlyReceipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
      const monthlyCount = monthlyReceipts.length;

      const monthlyByCategoryMap = new Map<string, number>();
      for (const r of monthlyReceipts) {
        const cat = String(r.category || 'Uncategorized');
        monthlyByCategoryMap.set(cat, (monthlyByCategoryMap.get(cat) || 0) + Number(r.amount || 0));
      }

      const monthlyCategories = Array.from(monthlyByCategoryMap.entries()).map(([category, amount]) => ({
        category,
        amount,
      }));

      return {
        allTime: {
          totalSpent,
          receiptsCount,
          categories,
        },
        monthly: {
          year,
          month,
          totalSpent: monthlySpent,
          receiptsCount: monthlyCount,
          categories: monthlyCategories,
        },
      };
    } catch (error: any) {
      throw new AppError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch analytics', {
        error: error.message,
      });
    }
  }
}

