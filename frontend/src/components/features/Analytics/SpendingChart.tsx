import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Receipt } from '../../../types/receipt';
import { formatCurrency } from '../../../utils/currency';

interface SpendingChartProps {
  receipts: Receipt[];
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function SpendingChart({ receipts }: SpendingChartProps) {
  const categoryData = Array.from(
    receipts.reduce((acc, r) => {
      acc.set(r.category, (acc.get(r.category) || 0) + r.amount);
      return acc;
    }, new Map<string, number>())
  ).map(([name, value]) => ({ name, value }));

  const dailyData = Array.from(
    receipts.reduce((acc, r) => {
      acc.set(r.date, (acc.get(r.date) || 0) + r.amount);
      return acc;
    }, new Map<string, number>())
  ).map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalSpent = receipts.reduce((sum, r) => sum + r.amount, 0);
  const avgAmount = receipts.length > 0 ? Math.round(totalSpent / receipts.length) : 0;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Spending Trend</h3>
        {dailyData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No data available. Add receipts to see trends.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(l) => `Date: ${l}`} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
        {categoryData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No data available</p>
        ) : (
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80} dataKey="value">
                  {categoryData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm text-gray-700">{item.name}: {formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600">Total Spending</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600">Total Receipts</p>
          <p className="text-2xl font-bold text-green-600">{receipts.length}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-600">Average Amount</p>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(avgAmount)}</p>
        </div>
      </div>
    </div>
  );
}
