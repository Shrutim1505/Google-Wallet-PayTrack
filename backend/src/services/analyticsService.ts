import { getDatabase } from '../config/database.js';

export class AnalyticsService {
  async getAnalytics(userId: string) {
    const db = getDatabase();

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

    return { totalSpent, receiptsCount, categories };
  }
}

