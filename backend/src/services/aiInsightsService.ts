import { getPool } from '../config/database.js';
import { generateText, isLLMEnabled } from './geminiClient.js';
import { logger } from '../utils/logger.js';

export interface AIInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  data: Record<string, any>;
  generatedAt: string;
}

export class AIInsightsService {
  async generateInsights(userId: string): Promise<AIInsight[]> {
    const pool = getPool();

    // Gather spending data
    const { rows: receipts } = await pool.query(
      `SELECT merchant, amount::numeric, category, date FROM receipts
       WHERE user_id = $1 AND date >= NOW() - INTERVAL '90 days' ORDER BY date DESC`,
      [userId]
    );

    if (receipts.length < 3) return [];

    const parsed = receipts.map(r => ({ ...r, amount: parseFloat(r.amount) }));
    const insights: AIInsight[] = [];

    // 1. Anomaly detection (Z-score)
    insights.push(...this.detectAnomalies(parsed));

    // 2. Category growth
    insights.push(...this.detectCategoryGrowth(parsed));

    // 3. Budget risk
    insights.push(...this.detectBudgetRisk(userId, parsed));

    // 4. Generate LLM natural language summary
    if (isLLMEnabled() && parsed.length >= 5) {
      const nlInsight = await this.generateNLSummary(parsed);
      if (nlInsight) insights.push(nlInsight);
    }

    // Persist
    for (const insight of insights) {
      await pool.query(
        `INSERT INTO ai_insights (user_id, insight_type, title, description, severity, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, insight.type, insight.title, insight.description, insight.severity, JSON.stringify(insight.data)]
      );
    }

    logger.info({ message: 'AI insights generated', userId, count: insights.length });
    return insights;
  }

  async getRecentInsights(userId: string, limit = 10): Promise<AIInsight[]> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT id, insight_type, title, description, severity, data, generated_at
       FROM ai_insights WHERE user_id = $1 ORDER BY generated_at DESC LIMIT $2`,
      [userId, limit]
    );
    return rows.map(r => ({
      id: r.id, type: r.insight_type, title: r.title, description: r.description,
      severity: r.severity, data: r.data || {}, generatedAt: r.generated_at,
    }));
  }

  private detectAnomalies(receipts: any[]): AIInsight[] {
    const amounts = receipts.map(r => r.amount);
    const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const std = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length);

    if (std === 0) return [];

    const anomalies = receipts.filter(r => (r.amount - mean) / std > 2);
    if (anomalies.length === 0) return [];

    return [{
      id: '', type: 'anomaly', title: 'Unusual Spending Detected',
      description: `${anomalies.length} transaction${anomalies.length > 1 ? 's' : ''} significantly above your average of ₹${Math.round(mean)}. Highest: ₹${Math.round(Math.max(...anomalies.map((a: any) => a.amount)))} at ${anomalies[0].merchant}.`,
      severity: anomalies.some((a: any) => (a.amount - mean) / std > 3) ? 'critical' : 'warning',
      data: { anomalies: anomalies.slice(0, 5).map((a: any) => ({ merchant: a.merchant, amount: a.amount, date: a.date })), mean: Math.round(mean), std: Math.round(std) },
      generatedAt: new Date().toISOString(),
    }];
  }

  private detectCategoryGrowth(receipts: any[]): AIInsight[] {
    const now = new Date();
    const mid = new Date(now.getTime() - 45 * 86400000);

    const recent = receipts.filter(r => new Date(r.date) >= mid);
    const older = receipts.filter(r => new Date(r.date) < mid);

    const recentByCategory: Record<string, number> = {};
    const olderByCategory: Record<string, number> = {};

    recent.forEach(r => { recentByCategory[r.category] = (recentByCategory[r.category] || 0) + r.amount; });
    older.forEach(r => { olderByCategory[r.category] = (olderByCategory[r.category] || 0) + r.amount; });

    const insights: AIInsight[] = [];
    for (const [cat, recentTotal] of Object.entries(recentByCategory)) {
      const olderTotal = olderByCategory[cat] || 0;
      if (olderTotal > 0 && recentTotal > olderTotal * 1.5) {
        const growth = Math.round(((recentTotal - olderTotal) / olderTotal) * 100);
        insights.push({
          id: '', type: 'category_growth', title: `${cat} spending up ${growth}%`,
          description: `Your ${cat} spending grew from ₹${Math.round(olderTotal)} to ₹${Math.round(recentTotal)} compared to the prior period.`,
          severity: growth > 100 ? 'warning' : 'info',
          data: { category: cat, recentTotal: Math.round(recentTotal), olderTotal: Math.round(olderTotal), growth },
          generatedAt: new Date().toISOString(),
        });
      }
    }
    return insights;
  }

  private detectBudgetRisk(userId: string, receipts: any[]): AIInsight[] {
    const thisMonth = receipts.filter(r => {
      const d = new Date(r.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const monthlyTotal = thisMonth.reduce((s, r) => s + r.amount, 0);
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const projectedMonthly = (monthlyTotal / dayOfMonth) * daysInMonth;

    // Compare with last month
    const lastMonth = receipts.filter(r => {
      const d = new Date(r.date);
      const now = new Date();
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });
    const lastMonthTotal = lastMonth.reduce((s, r) => s + r.amount, 0);

    if (lastMonthTotal > 0 && projectedMonthly > lastMonthTotal * 1.3) {
      return [{
        id: '', type: 'budget_risk', title: 'On track to overspend this month',
        description: `At current pace, you'll spend ₹${Math.round(projectedMonthly)} this month — ${Math.round(((projectedMonthly - lastMonthTotal) / lastMonthTotal) * 100)}% more than last month (₹${Math.round(lastMonthTotal)}).`,
        severity: projectedMonthly > lastMonthTotal * 1.5 ? 'critical' : 'warning',
        data: { projectedMonthly: Math.round(projectedMonthly), lastMonthTotal: Math.round(lastMonthTotal), currentTotal: Math.round(monthlyTotal), dayOfMonth },
        generatedAt: new Date().toISOString(),
      }];
    }
    return [];
  }

  private async generateNLSummary(receipts: any[]): Promise<AIInsight | null> {
    const totalSpent = receipts.reduce((s, r) => s + r.amount, 0);
    const categories = receipts.reduce((acc: Record<string, number>, r) => {
      acc[r.category] = (acc[r.category] || 0) + r.amount; return acc;
    }, {});
    const topMerchants = receipts.reduce((acc: Record<string, number>, r) => {
      acc[r.merchant] = (acc[r.merchant] || 0) + 1; return acc;
    }, {});

    const prompt = `You are a personal finance assistant. Analyze this spending data and provide a brief, actionable insight (2-3 sentences max).

Data (last 90 days):
- Total: ₹${Math.round(totalSpent)}
- Categories: ${JSON.stringify(categories)}
- Top merchants by frequency: ${JSON.stringify(Object.entries(topMerchants).sort((a, b) => b[1] - a[1]).slice(0, 5))}
- Receipt count: ${receipts.length}

Be specific with numbers. Focus on one actionable recommendation.`;

    const text = await generateText(prompt);
    if (!text) return null;

    return {
      id: '', type: 'ai_summary', title: 'AI Spending Summary',
      description: text.trim(),
      severity: 'info',
      data: { totalSpent: Math.round(totalSpent), receiptCount: receipts.length },
      generatedAt: new Date().toISOString(),
    };
  }
}
