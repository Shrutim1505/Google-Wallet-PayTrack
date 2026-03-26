import React from 'react';
import { TrendingUp, Wallet, Receipt, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../../utils/currency';

interface DashboardStatsProps {
  totalSpent: number;
  totalReceipts: number;
  monthlyBudget: number;
  budgetUsed: number;
}

export function DashboardStats({ totalSpent, totalReceipts, monthlyBudget, budgetUsed }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<Wallet className="w-6 h-6 text-blue-600" />} iconBg="bg-blue-100" />
      <StatCard label="Total Receipts" value={String(totalReceipts)} icon={<Receipt className="w-6 h-6 text-green-600" />} iconBg="bg-green-100" />
      <StatCard label="Monthly Budget" value={formatCurrency(monthlyBudget)} icon={<TrendingUp className="w-6 h-6 text-purple-600" />} iconBg="bg-purple-100" />
      <div className={`bg-white rounded-xl shadow-sm p-6 border ${budgetUsed > 80 ? 'border-red-200' : 'border-gray-100'} hover:shadow-md transition-shadow`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Budget Used</p>
            <p className={`text-3xl font-bold mt-2 ${budgetUsed > 80 ? 'text-red-600' : 'text-gray-900'}`}>{budgetUsed}%</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${budgetUsed > 80 ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <AlertCircle className={`w-6 h-6 ${budgetUsed > 80 ? 'text-red-600' : 'text-yellow-600'}`} />
          </div>
        </div>
        {budgetUsed > 80 && <p className="text-xs text-red-600 mt-3">⚠️ Budget limit approaching</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, iconBg }: { label: string; value: string; icon: React.ReactNode; iconBg: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center`}>{icon}</div>
      </div>
    </div>
  );
}
