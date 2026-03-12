import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Receipt } from '../../../types/receipt';

interface SpendingChartProps {
  receipts: Receipt[];
}

export function SpendingChart({ receipts }: SpendingChartProps) {
  // Category breakdown for pie chart
  const categoryData = Array.from(
    receipts.reduce((acc, receipt) => {
      const existing = acc.get(receipt.category) || 0;
      acc.set(receipt.category, existing + receipt.amount);
      return acc;
    }, new Map<string, number>())
  ).map(([name, value]) => ({ name, value }));

  // Daily spending for bar chart
  const dailyData = Array.from(
    receipts.reduce((acc, receipt) => {
      const existing = acc.get(receipt.date) || 0;
      acc.set(receipt.date, existing + receipt.amount);
      return acc;
    }, new Map<string, number>())
  )
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8">
      {/* Bar Chart - Daily Spending */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Spending Trend</h3>
        {dailyData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `₹${value}`}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie Chart - Category Breakdown */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
        {categoryData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No data available</p>
        ) : (
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value}`} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="space-y-2">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-sm text-gray-700">
                    {item.name}: ₹{item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600">Total Spending</p>
          <p className="text-2xl font-bold text-blue-600">₹{receipts.reduce((sum, r) => sum + r.amount, 0)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600">Total Receipts</p>
          <p className="text-2xl font-bold text-green-600">{receipts.length}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-600">Average Amount</p>
          <p className="text-2xl font-bold text-purple-600">
            ₹{receipts.length > 0 ? Math.round(receipts.reduce((sum, r) => sum + r.amount, 0) / receipts.length) : 0}
          </p>
        </div>
      </div>
    </div>
  );
}