import { Card, CardTitle, EmptyState } from '@/shared/ui';
import { useReceipts } from '@/features/receipts/hooks';
import { formatCurrency } from '@/utils/currency';
import { BarChart3 } from 'lucide-react';
import { useMemo } from 'react';

export function AnalyticsPage() {
  const { data: receipts = [], isLoading } = useReceipts();

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    receipts.forEach((r) => map.set(r.category, (map.get(r.category) || 0) + r.amount));
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [receipts]);

  const total = receipts.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Spending insights across categories</p>
      </header>

      {!isLoading && receipts.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-6 h-6" />}
          title="Not enough data yet"
          description="Add receipts to see spending analytics"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardTitle className="mb-4">By Category</CardTitle>
            <div className="space-y-3">
              {categoryTotals.map(({ category, amount }) => (
                <div key={category}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{category}</span>
                    <span className="text-sm text-gray-600">
                      {formatCurrency(amount)} ({Math.round((amount / total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full"
                      style={{ width: `${total > 0 ? (amount / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle className="mb-4">Summary</CardTitle>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Total spent</dt>
                <dd className="text-sm font-semibold text-gray-900">{formatCurrency(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Total receipts</dt>
                <dd className="text-sm font-semibold text-gray-900">{receipts.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Average receipt</dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {formatCurrency(receipts.length ? total / receipts.length : 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Categories tracked</dt>
                <dd className="text-sm font-semibold text-gray-900">{categoryTotals.length}</dd>
              </div>
            </dl>
          </Card>
        </div>
      )}
    </div>
  );
}
