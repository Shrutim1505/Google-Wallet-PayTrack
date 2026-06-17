import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../config/database.js';
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

export class SmartAlertService {
  /** Generate alerts after a new receipt is added */
  async analyzeNewReceipt(userId: string, merchant: string, amount: number, category: string) {
    const pool = getPool();
    const alerts: Omit<SmartAlert, 'id' | 'createdAt'>[] = [];

    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const prevWeekStart = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];

    const thisWeek = await pool.query(
      'SELECT SUM(amount)::numeric as total FROM receipts WHERE user_id = $1 AND category = $2 AND date >= $3',
      [userId, category, weekStart]
    );
    const lastWeek = await pool.query(
      'SELECT SUM(amount)::numeric as total FROM receipts WHERE user_id = $1 AND category = $2 AND date >= $3 AND date < $4',
      [userId, category, prevWeekStart, weekStart]
    );

    const thisWeekTotal = parseFloat(thisWeek.rows[0]?.total || '0');
    const lastWeekTotal = parseFloat(lastWeek.rows[0]?.total || '0');

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

    const merchantCount = await pool.query(
      'SELECT COUNT(*)::int as count FROM receipts WHERE user_id = $1 AND LOWER(merchant) = LOWER($2)',
      [userId, merchant]
    );
    if ((merchantCount.rows[0]?.count || 0) <= 1) {
      const avgReceipt = await pool.query('SELECT AVG(amount)::numeric as avg FROM receipts WHERE user_id = $1', [userId]);
      const avg = parseFloat(avgReceipt.rows[0]?.avg || '0');
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

    const settings = await pool.query('SELECT monthly_budget FROM user_settings WHERE user_id = $1', [userId]);
    const monthlyBudget = parseFloat(settings.rows[0]?.monthly_budget || '0');
    if (monthlyBudget > 0) {
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const monthTotal = await pool.query(
        'SELECT SUM(amount)::numeric as total FROM receipts WHERE user_id = $1 AND date >= $2',
        [userId, monthStart]
      );
      const spent = parseFloat(monthTotal.rows[0]?.total || '0');
      const pct = Math.round((spent / monthlyBudget) * 100);

      if (pct >= 90 && pct < 100) {
        alerts.push({
          type: 'budget_warning',
          message: `You've used ${pct}% of your monthly budget (₹${Math.round(spent)} / ₹${monthlyBudget}). Only ₹${Math.round(monthlyBudget - spent)} remaining.`,
          severity: 'critical',
          data: { spent, budget: monthlyBudget, pct },
          isRead: false,
        });
      } else if (pct >= 75 && pct < 90) {
        alerts.push({
          type: 'budget_warning',
          message: `Budget alert: ${pct}% used this month. ₹${Math.round(monthlyBudget - spent)} remaining.`,
          severity: 'warning',
          data: { spent, budget: monthlyBudget, pct },
          isRead: false,
        });
      }
    }

    for (const alert of alerts) {
      await pool.query(
        'INSERT INTO smart_alerts (id, user_id, type, message, severity, data) VALUES ($1, $2, $3, $4, $5, $6)',
        [uuidv4(), userId, alert.type, alert.message, alert.severity, JSON.stringify(alert.data)]
      );
    }

    if (alerts.length) logger.info({ message: 'Smart alerts generated', userId, count: alerts.length });
    return alerts;
  }

  async getAlerts(userId: string, limit = 20): Promise<SmartAlert[]> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM smart_alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return rows.map((r: any) => ({ ...r, data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data, isRead: r.is_read }));
  }

  async markRead(userId: string, alertIds?: string[]) {
    const pool = getPool();
    if (alertIds?.length) {
      await pool.query(
        `UPDATE smart_alerts SET is_read = TRUE WHERE user_id = $1 AND id = ANY($2)`,
        [userId, alertIds]
      );
    } else {
      await pool.query('UPDATE smart_alerts SET is_read = TRUE WHERE user_id = $1', [userId]);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT COUNT(*)::int as count FROM smart_alerts WHERE user_id = $1 AND is_read = FALSE', [userId]);
    return rows[0]?.count || 0;
  }

  async generateWeeklyDigest(userId: string): Promise<SmartAlert | null> {
    const pool = getPool();
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const { rows: weekData } = await pool.query(
      'SELECT category, SUM(amount)::numeric as total, COUNT(*)::int as count FROM receipts WHERE user_id = $1 AND date >= $2 GROUP BY category',
      [userId, weekStart]
    );

    if (!weekData.length) return null;

    const totalSpent = weekData.reduce((s: number, r: any) => s + parseFloat(r.total), 0);
    const topCategory = weekData.sort((a: any, b: any) => parseFloat(b.total) - parseFloat(a.total))[0];

    const message = `Weekly digest: You spent ₹${Math.round(totalSpent)} across ${weekData.length} categories. Top: ${topCategory.category} (₹${Math.round(parseFloat(topCategory.total))}).`;

    const id = uuidv4();
    await pool.query(
      'INSERT INTO smart_alerts (id, user_id, type, message, severity, data) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, userId, 'weekly_digest', message, 'info', JSON.stringify({ totalSpent, categories: weekData })]
    );

    return { id, type: 'weekly_digest', message, severity: 'info', data: { totalSpent, categories: weekData }, isRead: false, createdAt: new Date().toISOString() };
  }
}
