import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { Card, EmptyState } from '@/shared/ui';
import { apiClient, unwrap } from '@/shared/api/client';
import { formatCurrency } from '@/utils/currency';

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

function useRecurring() {
  return useQuery({
    queryKey: ['recurring'],
    queryFn: async () => {
      const res = await apiClient.get('/features/recurring');
      return unwrap<RecurringPattern[]>(res.data);
    },
  });
}

const freqLabel: Record<string, string> = { weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', quarterly: 'Quarterly' };

export function RecurringPage() {
  const { data: patterns = [], isLoading } = useRecurring();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Recurring</h1>
        <p className="text-gray-600 mt-1">Auto-detected spending patterns from your receipts</p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : patterns.length === 0 ? (
        <Card>
          <EmptyState
            icon={<RefreshCw className="w-6 h-6" />}
            title="No recurring patterns yet"
            description="Add more receipts from the same merchants to detect subscriptions and recurring expenses"
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {patterns.map((p) => (
            <Card key={p.merchant} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.merchant}</h3>
                    <p className="text-sm text-gray-500">{p.category} · {freqLabel[p.frequency] || p.frequency}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(p.avgAmount)}</p>
                  <p className="text-xs text-gray-500">avg per occurrence</p>
                </div>
              </div>
              <div className="mt-4 flex gap-6 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> {p.occurrences} times · {formatCurrency(p.totalSpent)} total
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Next: {p.nextExpectedDate}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${p.confidence * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-400">{Math.round(p.confidence * 100)}% confidence</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
