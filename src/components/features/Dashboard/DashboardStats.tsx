import React from 'react';
import { TrendingUp, Wallet, Receipt, AlertCircle } from 'lucide-react';

interface DashboardStatsProps {
  totalSpent: number;
  totalReceipts: number;
  monthlyBudget: number;
  budgetUsed: number;
}

export function DashboardStats({
  totalSpent,
  totalReceipts,
  monthlyBudget,
  budgetUsed,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Spent Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Spent</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">₹{totalSpent.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Wallet className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Total Receipts Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Receipts</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{totalReceipts}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Receipt className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Monthly Budget Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Monthly Budget</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">₹{monthlyBudget.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Budget Used Card */}
      <div className={`bg-white rounded-xl shadow-sm p-6 border ${
        budgetUsed > 80 ? 'border-red-200' : 'border-gray-100'
      } hover:shadow-md transition-shadow`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Budget Used</p>
            <p className={`text-3xl font-bold mt-2 ${
              budgetUsed > 80 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {budgetUsed}%
            </p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            budgetUsed > 80 ? 'bg-red-100' : 'bg-yellow-100'
          }`}>
            <AlertCircle className={`w-6 h-6 ${
              budgetUsed > 80 ? 'text-red-600' : 'text-yellow-600'
            }`} />
          </div>
        </div>
        {budgetUsed > 80 && (
          <p className="text-xs text-red-600 mt-3">⚠️ Budget limit approaching</p>
        )}
      </div>
    </div>
  );
}