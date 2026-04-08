import { useState, useEffect } from 'react';
import { RefreshCw, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../utils/currency';

interface RecurringPattern {
  merchant: string;
  category: string;
  avgAmount: number;
  frequency: string;
  occurrences: number;
  lastDate: string;
  nextExpectedDate: string;
  confidence: number;
  totalSpent: number;
}

const FREQ_LABELS: Record<string, string> = { weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', quarterly: 'Quarterly' };
const FREQ_COLORS: Record<string, string> = { weekly: 'bg-blue-100 text-blue-700', biweekly: 'bg-purple-100 text-purple-700', monthly: 'bg-green-100 text-green-700', quarterly: 'bg-amber-100 text-amber-700' };

export function RecurringPanel() {
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRecurring()
      .then((data: any) => setPatterns(Array.isArray(data) ? data : []))
      .catch(() => setPatterns([]))
      .finally(() => setLoading(false));
  }, []);

  const monthlyTotal = patterns
    .filter(p => p.frequency === 'monthly')
    .reduce((s, p) => s + p.avgAmount, 0);

  if (loading) {
    return <div className="animate-pulse space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Recurring Expenses</h2>
        <p className="text-gray-600 mt-1">Auto-detected subscriptions and recurring payments</p>
      </div>

      {patterns.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No recurring patterns detected yet.</p>
          <p className="text-sm text-gray-400 mt-1">Add more receipts to detect subscriptions automatically.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-sm text-gray-600">Detected Subscriptions</p>
              <p className="text-2xl font-bold text-blue-600">{patterns.length}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-sm text-gray-600">Est. Monthly Cost</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyTotal)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-sm text-gray-600">Total Spent (All Time)</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(patterns.reduce((s, p) => s + p.totalSpent, 0))}</p>
            </div>
          </div>

          <div className="space-y-3">
            {patterns.map((p, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{p.merchant}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${FREQ_COLORS[p.frequency] || 'bg-gray-100 text-gray-700'}`}>
                          {FREQ_LABELS[p.frequency] || p.frequency}
                        </span>
                        <span className="text-xs text-gray-500">{p.category}</span>
                        <span className="text-xs text-gray-400">• {p.occurrences} payments</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(p.avgAmount)}</p>
                    <p className="text-xs text-gray-500">per cycle</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    Next expected: <span className="font-medium text-gray-700">{p.nextExpectedDate}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-gray-500">Confidence:</span>
                    <span className={`font-medium ${p.confidence > 0.7 ? 'text-green-600' : p.confidence > 0.4 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {Math.round(p.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
