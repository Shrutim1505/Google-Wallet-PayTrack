import React from 'react';
import { SpendingInsight } from '../types/receipt';
import { formatCurrency, formatIndianCurrency } from '../utils/currency';
import { TrendingUp, DollarSign, Receipt, Target } from 'lucide-react';

interface DashboardProps {
  insights: SpendingInsight[];
  totalSpent: number;
  totalReceipts: number;
  monthlyBudget: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  insights, 
  totalSpent, 
  totalReceipts, 
  monthlyBudget 
}) => {
  const budgetUsed = (totalSpent / monthlyBudget) * 100;
  const averageSpent = totalSpent / totalReceipts;

  const stats = [
    {
      title: 'Total Spent',
      value: formatIndianCurrency(totalSpent),
      icon: DollarSign,
      color: 'bg-blue-500',
      change: '+12.5%'
    },
    {
      title: 'Total Receipts',
      value: totalReceipts.toString(),
      icon: Receipt,
      color: 'bg-green-500',
      change: '+8.2%'
    },
    {
      title: 'Average Purchase',
      value: formatIndianCurrency(averageSpent),
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: '+3.7%'
    },
    {
      title: 'Budget Used',
      value: `${budgetUsed.toFixed(1)}%`,
      icon: Target,
      color: 'bg-purple-500',
      change: `${formatIndianCurrency(monthlyBudget - totalSpent)} left`
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-100 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-4 rounded-2xl ${stat.color} shadow-lg`}>
                <stat.icon className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Monthly Budget Progress</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 font-medium">Spent: {formatCurrency(totalSpent)}</span>
            <span className="text-gray-700 font-medium">Budget: {formatCurrency(monthlyBudget)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
            <div 
              className={`h-4 rounded-full transition-all duration-500 shadow-sm ${
                budgetUsed > 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                budgetUsed > 75 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                'bg-gradient-to-r from-green-500 to-emerald-500'
              }`}
              style={{ width: `${Math.min(budgetUsed, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm">
            <span className={`font-medium ${
              budgetUsed > 90 ? 'text-red-600' : budgetUsed > 75 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {budgetUsed.toFixed(1)}% used
            </span>
            <span className="text-gray-700 font-medium">
              {formatCurrency(monthlyBudget - totalSpent)} remaining
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};