import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

interface RecurringPattern {
  merchant: string;
  category: string;
  avgAmount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  occurrences: number;
  lastDate: string;
  nextExpectedDate: string;
  confidence: number;
  totalSpent: number;
}

/**
 * Detects recurring expenses using interval analysis.
 * Groups receipts by merchant, computes inter-payment intervals,
 * and uses coefficient of variation to determine regularity.
 */
export class RecurringService {
  async detectRecurring(userId: string): Promise<RecurringPattern[]> {
    const db = getDatabase();
    const receipts = await db.all(
      `SELECT merchant, amount, category, date FROM receipts
       WHERE userId = ? ORDER BY merchant, date`,
      [userId]
    );

    // Group by normalized merchant name
    const groups = new Map<string, Array<{ merchant: string; amount: number; category: string; date: string }>>();
    for (const r of receipts) {
      const key = r.merchant.toLowerCase().trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ merchant: r.merchant, amount: r.amount, category: r.category, date: r.date });
    }

    const patterns: RecurringPattern[] = [];

    for (const [, entries] of groups) {
      if (entries.length < 2) continue;

      // Sort by date and compute intervals in days
      const sorted = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const diff = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86400000;
        if (diff > 0) intervals.push(diff);
      }

      if (intervals.length < 1) continue;

      const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const stdDev = Math.sqrt(intervals.reduce((s, v) => s + (v - avgInterval) ** 2, 0) / intervals.length);
      const cv = avgInterval > 0 ? stdDev / avgInterval : Infinity; // coefficient of variation

      // Only consider patterns with CV < 0.4 (reasonably regular)
      if (cv > 0.4) continue;

      const frequency = this.classifyFrequency(avgInterval);
      if (!frequency) continue;

      const amounts = sorted.map(e => e.amount);
      const avgAmount = amounts.reduce((s, v) => s + v, 0) / amounts.length;
      const totalSpent = amounts.reduce((s, v) => s + v, 0);
      const lastDate = sorted[sorted.length - 1].date;
      const nextExpected = new Date(new Date(lastDate).getTime() + avgInterval * 86400000);

      // Confidence: based on number of occurrences and regularity
      const confidence = Math.min(1, (sorted.length / 6) * (1 - cv));

      patterns.push({
        merchant: sorted[0].merchant || entries[0].category,
        category: sorted[sorted.length - 1].category,
        avgAmount: Math.round(avgAmount),
        frequency,
        occurrences: sorted.length,
        lastDate,
        nextExpectedDate: nextExpected.toISOString().split('T')[0],
        confidence: Math.round(confidence * 100) / 100,
        totalSpent: Math.round(totalSpent),
      });
    }

    // Sort by confidence descending
    patterns.sort((a, b) => b.confidence - a.confidence);
    logger.info({ message: 'Recurring patterns detected', userId, count: patterns.length });
    return patterns;
  }

  private classifyFrequency(avgDays: number): RecurringPattern['frequency'] | null {
    if (avgDays >= 5 && avgDays <= 10) return 'weekly';
    if (avgDays >= 11 && avgDays <= 20) return 'biweekly';
    if (avgDays >= 21 && avgDays <= 45) return 'monthly';
    if (avgDays >= 75 && avgDays <= 120) return 'quarterly';
    return null;
  }
}
