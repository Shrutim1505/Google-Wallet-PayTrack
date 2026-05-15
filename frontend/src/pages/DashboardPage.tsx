import { Link } from 'react-router-dom';
import { Receipt as ReceiptIcon, TrendingUp, Target, Activity } from 'lucide-react';
import { Card, CardTitle, EmptyState, ReceiptListRowSkeleton, DashboardStatsSkeleton, Button } from '@/shared/ui';
import { useReceipts } from '@/features/receipts/hooks';
import { formatCurrency } from '@/utils/currency';
import { useMemo } from 'react';

export function DashboardPage() {
  const { data: receipts = [], isLoading } = useReceipts();

  const stats = useMemo(() => {
    const totalSpent = receipts.reduce((sum, r) => sum + r.amount, 0);
    const avgReceipt = receipts.length > 0 ? totalSpent / receipts.length : 0;
    const monthlyBudget = 50000;
    const budgetUsed = monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : 0;
    return { totalSpent, avgReceipt, monthlyBudget, budgetUsed };
  }, [receipts]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    receipts.forEach((r) => map.set(r.category, (map.get(r.category) || 0) + r.amount));
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [receipts]);

  const recentReceipts = receipts.slice(0, 5);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Here's your spending overview</p>
      </header>

      {isLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ReceiptIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Receipts</p>
                <p className="text-2xl font-bold text-gray-900">{receipts.length}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSpent)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Receipt</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avgReceipt)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Budget Used</p>
                <p className="text-2xl font-bold text-gray-900">{stats.budgetUsed}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Recent Receipts</CardTitle>
            <Link to="/receipts" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <ReceiptListRowSkeleton key={i} />)}
            </div>
          ) : recentReceipts.length === 0 ? (
            <EmptyState
              icon={<ReceiptIcon className="w-6 h-6" />}
              title="No receipts yet"
              description="Add your first receipt to start tracking your spending"
              action={
                <Link to="/receipts">
                  <Button variant="primary">Add Receipt</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {recentReceipts.map((r) => (
                <Link
                  key={r.id}
                  to={`/receipts/${r.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium text-gray-900">{r.merchant}</p>
                    <p className="text-sm text-gray-500">
                      {r.category} · {r.date}
                    </p>
                  </div>
                  <p className="font-semibold text-blue-600">{formatCurrency(r.amount)}</p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4">Category Breakdown</CardTitle>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
                    <span className="h-3 bg-gray-200 rounded w-12 animate-pulse" />
                  </div>
                  <div className="h-2 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : categoryBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet</p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map(({ category, amount }) => (
                <div key={category}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{category}</span>
                    <span className="text-sm text-gray-600">{formatCurrency(amount)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${stats.totalSpent > 0 ? (amount / stats.totalSpent) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
