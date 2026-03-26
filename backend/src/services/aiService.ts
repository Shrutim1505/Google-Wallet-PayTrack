import { logger } from '../utils/logger.js';

export interface SpendingInsight {
  summary: string;
  tips: string[];
  anomalies: string[];
  forecast: { nextMonthEstimate: number; trend: 'increasing' | 'decreasing' | 'stable' };
}

interface ReceiptRecord {
  merchant: string;
  amount: number;
  category: string;
  date: string;
  items?: string;
}

/** Merchant-to-category fuzzy mapping with weighted keywords */
const CATEGORY_RULES: Array<{ category: string; patterns: RegExp[] }> = [
  { category: 'Food', patterns: [/restaurant|cafe|diner|bistro|pizza|burger|sushi|taco|grill|kitchen|eatery|dhaba|food\s*court/i] },
  { category: 'Food', patterns: [/swiggy|zomato|uber\s*eats|doordash|grubhub/i] },
  { category: 'Food', patterns: [/grocery|supermarket|market|fresh\s*mart|daily\s*needs|big\s*bazaar|dmart|reliance\s*fresh/i] },
  { category: 'Transport', patterns: [/uber|ola|lyft|cab|taxi|metro|bus|auto|rapido|fuel|petrol|diesel|parking|toll/i] },
  { category: 'Shopping', patterns: [/amazon|flipkart|myntra|mall|shop|store|clothing|apparel|brand|retail|ikea/i] },
  { category: 'Bills', patterns: [/electric|water|gas|internet|broadband|phone|mobile|recharge|airtel|jio|vodafone|bill|rent/i] },
  { category: 'Entertainment', patterns: [/cinema|movie|netflix|spotify|game|sport|theater|concert|event|bookmyshow/i] },
  { category: 'Health', patterns: [/hospital|doctor|pharmacy|medicine|clinic|lab|diagnostic|apollo|medplus|gym|fitness/i] },
  { category: 'Education', patterns: [/school|college|university|course|udemy|coursera|book|tuition/i] },
];

/**
 * AI-powered analytics service using rule-based heuristics.
 * Provides spending insights, anomaly detection, and smart categorization.
 */
export class AIService {
  /** Analyze receipts and generate spending insights. */
  generateSpendingInsights(receipts: ReceiptRecord[]): SpendingInsight {
    if (!receipts.length) {
      return { summary: 'No receipts to analyze.', tips: [], anomalies: [], forecast: { nextMonthEstimate: 0, trend: 'stable' } };
    }

    const totalSpent = receipts.reduce((s, r) => s + Number(r.amount), 0);
    const categoryTotals = this.groupBy(receipts, 'category');
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const merchantFreq = this.merchantFrequency(receipts);
    const topMerchant = Object.entries(merchantFreq).sort((a, b) => b[1] - a[1])[0];

    const tips = this.generateTips(categoryTotals, totalSpent, merchantFreq);
    const anomalies = this.detectAnomalies(receipts, totalSpent);
    const forecast = this.buildForecast(receipts);

    const summary = `Total spending: ₹${totalSpent.toFixed(0)} across ${receipts.length} receipts. ` +
      `Top category: ${topCategory[0]} (₹${topCategory[1].toFixed(0)}). ` +
      `Most visited: ${topMerchant[0]} (${topMerchant[1]} times).`;

    logger.info({ message: 'Spending insights generated', receiptCount: receipts.length });
    return { summary, tips, anomalies, forecast };
  }

  /** Smart categorization using fuzzy matching and NLP-like heuristics. */
  smartCategorize(merchant: string, items?: string[]): string {
    const text = `${merchant} ${items?.join(' ') || ''}`.toLowerCase();

    for (const rule of CATEGORY_RULES) {
      if (rule.patterns.some(p => p.test(text))) return rule.category;
    }

    // Fuzzy fallback: check for partial keyword overlap
    const tokens = text.split(/\s+/);
    for (const rule of CATEGORY_RULES) {
      for (const pattern of rule.patterns) {
        const keywords = pattern.source.split('|').map(k => k.replace(/\\s\*|[()]/g, '').toLowerCase());
        if (tokens.some(t => keywords.some(k => k.length >= 3 && (t.includes(k) || k.includes(t))))) {
          return rule.category;
        }
      }
    }

    return 'Other';
  }

  private groupBy(receipts: ReceiptRecord[], key: 'category'): Record<string, number> {
    return receipts.reduce<Record<string, number>>((acc, r) => {
      const k = r[key] || 'Other';
      acc[k] = (acc[k] || 0) + Number(r.amount);
      return acc;
    }, {});
  }

  private merchantFrequency(receipts: ReceiptRecord[]): Record<string, number> {
    return receipts.reduce<Record<string, number>>((acc, r) => {
      const m = r.merchant || 'Unknown';
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {});
  }

  private generateTips(categoryTotals: Record<string, number>, total: number, merchantFreq: Record<string, number>): string[] {
    const tips: string[] = [];
    const foodSpend = (categoryTotals['Food'] || 0) + (categoryTotals['dining'] || 0);
    if (foodSpend > total * 0.4) tips.push('Food spending exceeds 40% of total — consider meal prepping to save.');
    if ((categoryTotals['Entertainment'] || 0) > total * 0.2) tips.push('Entertainment is over 20% of spending — look for free alternatives.');
    if ((categoryTotals['Transport'] || 0) > total * 0.15) tips.push('Transport costs are high — consider carpooling or public transit.');

    const frequentMerchants = Object.entries(merchantFreq).filter(([, c]) => c >= 3);
    if (frequentMerchants.length) {
      tips.push(`You visit ${frequentMerchants[0][0]} frequently — check if they offer a loyalty program.`);
    }
    if (!tips.length) tips.push('Your spending looks balanced. Keep it up!');
    return tips;
  }

  private detectAnomalies(receipts: ReceiptRecord[], total: number): string[] {
    const anomalies: string[] = [];
    const avg = total / receipts.length;

    for (const r of receipts) {
      if (Number(r.amount) > avg * 3) {
        anomalies.push(`Unusually high spend of ₹${Number(r.amount).toFixed(0)} at ${r.merchant} on ${r.date}.`);
      }
    }

    // Weekend vs weekday pattern
    const weekend = receipts.filter(r => { const d = new Date(r.date).getDay(); return d === 0 || d === 6; });
    const weekday = receipts.filter(r => { const d = new Date(r.date).getDay(); return d >= 1 && d <= 5; });
    if (weekend.length && weekday.length) {
      const avgWeekend = weekend.reduce((s, r) => s + Number(r.amount), 0) / weekend.length;
      const avgWeekday = weekday.reduce((s, r) => s + Number(r.amount), 0) / weekday.length;
      if (avgWeekend > avgWeekday * 1.5) anomalies.push('Weekend spending is significantly higher than weekdays.');
    }

    return anomalies;
  }

  private buildForecast(receipts: ReceiptRecord[]): SpendingInsight['forecast'] {
    const sorted = [...receipts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid).reduce((s, r) => s + Number(r.amount), 0);
    const secondHalf = sorted.slice(mid).reduce((s, r) => s + Number(r.amount), 0);

    const total = firstHalf + secondHalf;
    const trend: SpendingInsight['forecast']['trend'] =
      secondHalf > firstHalf * 1.15 ? 'increasing' : secondHalf < firstHalf * 0.85 ? 'decreasing' : 'stable';

    // Simple projection: scale current total to 30-day estimate
    const daySpan = Math.max(1, (new Date(sorted[sorted.length - 1].date).getTime() - new Date(sorted[0].date).getTime()) / 86400000);
    const nextMonthEstimate = Math.round((total / daySpan) * 30);

    return { nextMonthEstimate, trend };
  }
}
