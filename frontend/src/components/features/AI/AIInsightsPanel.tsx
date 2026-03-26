import { useState, useEffect } from 'react';
import { Sparkles, Lightbulb, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../utils/currency';

interface Insight {
  summary?: string;
  tips?: string[];
  anomalies?: { message: string; severity: string }[];
  forecast?: { month: string; predicted: number };
}

export function AIInsightsPanel() {
  const [insights, setInsights] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.getAIInsights() as Insight;
      setInsights(data);
    } catch {
      setInsights({
        summary: 'AI insights are currently unavailable. Connect your backend AI service to get personalized spending analysis.',
        tips: ['Track all your receipts consistently for better insights', 'Set monthly budgets to control spending'],
        anomalies: [],
        forecast: { month: 'Next Month', predicted: 0 },
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchInsights(); }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100 space-y-4 animate-pulse">
        <div className="h-6 bg-purple-200 rounded w-48" />
        <div className="h-20 bg-purple-100 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-24 bg-purple-100 rounded-lg" />
          <div className="h-24 bg-purple-100 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 rounded-xl p-6 border border-purple-200 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-bold text-purple-900">AI Insights</h3>
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {insights?.summary && (
        <div className="bg-white/70 rounded-lg p-4 border border-purple-100">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
            <p className="text-gray-700 text-sm">{insights.summary}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights?.tips && insights.tips.length > 0 && (
          <div className="bg-white/70 rounded-lg p-4 border border-amber-100 space-y-2">
            <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" /> Spending Tips
            </h4>
            {insights.tips.map((tip, i) => (
              <p key={i} className="text-xs text-gray-600 pl-5">• {tip}</p>
            ))}
          </div>
        )}

        {insights?.anomalies && insights.anomalies.length > 0 && (
          <div className="bg-white/70 rounded-lg p-4 border border-red-100 space-y-2">
            <h4 className="text-sm font-semibold text-red-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Anomaly Alerts
            </h4>
            {insights.anomalies.map((a, i) => (
              <p key={i} className="text-xs text-gray-600 pl-5">⚠️ {a.message}</p>
            ))}
          </div>
        )}
      </div>

      {insights?.forecast && insights.forecast.predicted > 0 && (
        <div className="bg-white/70 rounded-lg p-4 border border-indigo-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-800">Monthly Forecast</span>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-indigo-600">{formatCurrency(insights.forecast.predicted)}</p>
              <p className="text-xs text-gray-500">{insights.forecast.month}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
