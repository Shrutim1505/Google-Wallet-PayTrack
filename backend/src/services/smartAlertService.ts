import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface SmartAlert {
  id: string;
  type: 'spending_spike' | 'unusual_merchant' | 'budget_warning' | 'weekly_digest' | 'recurring_due';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

/**
 * Smart notification engine that generates alerts based on spending patterns.
 * Runs analysis on receipt creation and can generate periodic digests.
 */
export class SmartAlertService {
  /** Generate alerts after a new receipt is added */
  async analyzeNewReceipt(userId: string, merchant: string, amount: number, category: string) {
    const db = getDatabase();
    const alerts: Omit<SmartAlert, 'id' | 'createdAt'>[] = [];

    // 1. Check for spending spike: compare this week vs last week for same category
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const prevWeekStart = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];

    const thisWeek = await db.get(
      'SELECT SUM(amount) as total FROM receipts WHERE userId = ? AND category = ? AND date >= ?',
      [userId, category, weekStart]
    );
    const lastWeek = await db.get(
      'SELECT SUM(amount) as total FROM receipts WHERE userId = ? AND category = ? AND date >= ? AND date < ?',
      [userId, category, prevWeekStart, weekStart]
    );

    const thisWeekTotal = thisWeek?.total || 0;
    const lastWeekTotal = lastWeek?.total || 0;

    if (lastWeekTotal > 0 && thisWeekTotal > lastWeekTotal * 1.4) {
      const pctIncrease = Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
      alerts.push({
        type: 'spending_spike',
        message: `You've spent ₹${Math.round(thisWeekTotal)} on ${category} this week — ${pctIncrease}% more than last week.`,
        severity: pctIncrease > 80 ? 'critical' : 'warning',
        data: { category, thisWeekTotal, lastWeekTotal, pctIncrease },
        isRead: false,
      });
    }

    // 2. Check for unusual merchant (first time + high amount)
    const merchantCount = await db.get(
      'SELECT COUNT(*) as count FROM receipts WHERE userId = ? AND LOWER(merchant) = LOWER(?)',
      [userId, merchant]
    );
    if ((merchantCount?.count || 0) <= 1) {
      const avgReceipt = await db.get('SELECT AVG(amount) as avg FROM receipts WHERE userId = ?', [userId]);
      const avg = avgReceipt?.avg || 0;
      if (amount > avg * 2 && avg > 0) {
        alerts.push({
          type: 'unusual_merchant',
          message: `First-time purchase at ${merchant} for ₹${Math.round(amount)} — this is ${Math.round(amount / avg)}x your average receipt.`,
          severity: 'warning',
          data: { merchant, amount, avgAmount: Math.round(avg) },
          isRead: false,
        });
      }
    }

    // 3. Budget warning
    const settings = await db.get('SELECT monthlyBudget FROM user_settings WHERE userId = ?', [userId]);
    if (settings?.monthlyBudget) {
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const monthTotal = await db.get(
        'SELECT SUM(amount) as total FROM receipts WHERE userId = ? AND date >= ?',
        [userId, monthStart]
      );
      const spent = monthTotal?.total || 0;
      const pct = Math.round((spent / settings.monthlyBudget) * 100);

      if (pct >= 90 && pct < 100) {
        alerts.push({
          type: 'budget_warning',
          message: `You've used ${pct}% of your monthly budget (₹${Math.round(spent)} / ₹${settings.monthlyBudget}). Only ₹${Math.round(settings.monthlyBudget - spent)} remaining.`,
          severity: 'critical',
          data: { spent, budget: settings.monthlyBudget, pct },
          isRead: false,
        });
      } else if (pct >= 75 && pct < 90) {
        alerts.push({
          type: 'budget_warning',
          message: `Budget alert: ${pct}% used this month. ₹${Math.round(settings.monthlyBudget - spent)} remaining.`,
          severity: 'warning',
          data: { spent, budget: settings.monthlyBudget, pct },
          isRead: false,
        });
      }
    }

    // Save alerts
    for (const alert of alerts) {
      await db.run(
        'INSERT INTO smart_alerts (id, userId, type, message, severity, data) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), userId, alert.type, alert.message, alert.severity, JSON.stringify(alert.data)]
      );
    }

    if (alerts.length) logger.info({ message: 'Smart alerts generated', userId, count: alerts.length });
    return alerts;
  }

  /** Get unread alerts for a user */
  async getAlerts(userId: string, limit = 20): Promise<SmartAlert[]> {
    const db = getDatabase();
    const rows = await db.all(
      'SELECT * FROM smart_alerts WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
      [userId, limit]
    );
    return rows.map(r => ({ ...r, data: JSON.parse(r.data || '{}'), isRead: !!r.isRead }));
  }

  /** Mark alerts as read */
  async markRead(userId: string, alertIds?: string[]) {
    const db = getDatabase();
    if (alertIds?.length) {
      const placeholders = alertIds.map(() => '?').join(',');
      await db.run(`UPDATE smart_alerts SET isRead = 1 WHERE userId = ? AND id IN (${placeholders})`, [userId, ...alertIds]);
    } else {
      await db.run('UPDATE smart_alerts SET isRead = 1 WHERE userId = ?', [userId]);
    }
  }

  /** Get unread count */
  async getUnreadCount(userId: string): Promise<number> {
    const db = getDatabase();
    const row = await db.get('SELECT COUNT(*) as count FROM smart_alerts WHERE userId = ? AND isRead = 0', [userId]);
    return row?.count || 0;
  }

  /** Generate weekly spending digest */
  async generateWeeklyDigest(userId: string): Promise<SmartAlert | null> {
    const db = getDatabase();
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const weekData = await db.all(
      'SELECT category, SUM(amount) as total, COUNT(*) as count FROM receipts WHERE userId = ? AND date >= ? GROUP BY category',
      [userId, weekStart]
    );

    if (!weekData.length) return null;

    const totalSpent = weekData.reduce((s: number, r: any) => s + r.total, 0);
    const topCategory = weekData.sort((a: any, b: any) => b.total - a.total)[0];

    const message = `Weekly digest: You spent ₹${Math.round(totalSpent)} across ${weekData.length} categories. Top: ${topCategory.category} (₹${Math.round(topCategory.total)}).`;

    const id = uuidv4();
    await db.run(
      'INSERT INTO smart_alerts (id, userId, type, message, severity, data) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, 'weekly_digest', message, 'info', JSON.stringify({ totalSpent, categories: weekData })]
    );

    return { id, type: 'weekly_digest', message, severity: 'info', data: { totalSpent, categories: weekData }, isRead: false, createdAt: new Date().toISOString() };
  }
}
