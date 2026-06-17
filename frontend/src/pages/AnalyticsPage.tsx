import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardTitle, EmptyState } from '@/shared/ui';
import { useReceipts } from '@/features/receipts/hooks';
import { apiClient, unwrap } from '@/shared/api/client';
import { formatCurrency } from '@/utils/currency';

interface ChartData {
  topMerchants: Array<{ merchant: string; total: number; count: number }>;
  topCategories: Array<{ category: string; total: number; count: number }>;
  monthlyTrend: Array<{ month: string; total: number; count: number }>;
  confidenceDistribution: Array<{ bucket: string; count: number }>;
}

function useChartData() {
  return useQuery({
    queryKey: ['analytics-charts'],
    queryFn: async () => { const r = await apiClient.get('/analytics/charts'); return unwrap<ChartData>(r.data); },
  });
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export function AnalyticsPage() {
  const { data: receipts = [], isLoading } = useReceipts();
  const { data: charts } = useChartData();

  const total = useMemo(() => receipts.reduce((s, r) => s + r.amount, 0), [receipts]);

  if (!isLoading && receipts.length === 0) {
    return (
      <div className="space-y-8">
        <header><h1 className="text-3xl font-bold text-gray-900">Analytics</h1><p className="text-gray-600 mt-1">Spending insights across categories</p></header>
        <EmptyState icon={<BarChart3 className="w-6 h-6" />} title="Not enough data yet" description="Add receipts to see spending analytics" />
      </div>
    );
  }

  const pieData = charts?.topCategories.map(c => ({ name: c.category, value: c.total })) || [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Visual spending insights powered by your data</p>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><p className="text-xs text-gray-500 uppercase">Total Spent</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p></Card>
        <Card><p className="text-xs text-gray-500 uppercase">Receipts</p><p className="text-2xl font-bold text-gray-900">{receipts.length}</p></Card>
        <Card><p className="text-xs text-gray-500 uppercase">Avg Receipt</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(receipts.length ? total / receipts.length : 0)}</p></Card>
        <Card><p className="text-xs text-gray-500 uppercase">Categories</p><p className="text-2xl font-bold text-gray-900">{charts?.topCategories.length || 0}</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution Pie */}
        <Card>
          <CardTitle className="mb-4">Category Distribution</CardTitle>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => e.name}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-500">No data</p>}
        </Card>

        {/* Monthly Trend Line */}
        <Card>
          <CardTitle className="mb-4">Monthly Spending Trend</CardTitle>
          {charts?.monthlyTrend && charts.monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={charts.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} name="Spending" />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-500">Not enough monthly data</p>}
        </Card>

        {/* Top Merchants Bar */}
        <Card>
          <CardTitle className="mb-4">Top Merchants</CardTitle>
          {charts?.topMerchants && charts.topMerchants.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts.topMerchants} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="merchant" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="total" fill="#10b981" name="Total" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-500">No data</p>}
        </Card>

        {/* AI Confidence Distribution */}
        <Card>
          <CardTitle className="mb-4">AI Confidence Distribution</CardTitle>
          {charts?.confidenceDistribution && charts.confidenceDistribution.some(b => b.count > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts.confidenceDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" name="Receipts" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-500">Upload receipts to see AI confidence data</p>}
        </Card>
      </div>
    </div>
  );
}
