import React from 'react';
import { AlertCircle, TrendingUp, Target } from 'lucide-react';

interface BudgetAlertsProps {
  totalSpent: number;
  monthlyBudget: number;
  budgetUsed: number;
}

export function BudgetAlerts({ totalSpent, monthlyBudget, budgetUsed }: BudgetAlertsProps) {
  const remaining = monthlyBudget - totalSpent;
  const isOverBudget = remaining < 0;

  // Alert levels
  const getAlertLevel = () => {
    if (budgetUsed >= 100) return 'critical';
    if (budgetUsed >= 80) return 'warning';
    if (budgetUsed >= 50) return 'info';
    return 'safe';
  };

  const alertLevel = getAlertLevel();

  const getAlertConfig = () => {
    switch (alertLevel) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          title: 'Budget Exceeded',
          color: 'text-red-600',
          message: `You have exceeded your budget by ₹${Math.abs(remaining)}`,
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          title: 'Budget Alert',
          color: 'text-yellow-600',
          message: `Only ₹${remaining} remaining in your monthly budget`,
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          title: 'Halfway There',
          color: 'text-blue-600',
          message: `You've spent ₹${totalSpent} out of ₹${monthlyBudget}`,
        };
      default:
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          title: 'On Track',
          color: 'text-green-600',
          message: `Great! You have ₹${remaining} left in your budget`,
        };
    }
  };

  const config = getAlertConfig();

  return (
    <div className="space-y-6">
      {/* Main Alert */}
      <div className={`${config.bg} ${config.border} border rounded-xl p-6`}>
        <div className="flex items-start gap-4">
          <AlertCircle className={`w-6 h-6 ${config.icon} flex-shrink-0 mt-1`} />
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${config.color} mb-2`}>
              {config.title}
            </h3>
            <p className="text-gray-700">{config.message}</p>
          </div>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Progress</h3>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Spent</span>
            <span className={`text-sm font-semibold ${config.color}`}>{budgetUsed}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                alertLevel === 'critical'
                  ? 'bg-red-600'
                  : alertLevel === 'warning'
                  ? 'bg-yellow-600'
                  : alertLevel === 'info'
                  ? 'bg-blue-600'
                  : 'bg-green-600'
              }`}
              style={{ width: `${Math.min(budgetUsed, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Budget Details */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">Spent</p>
            <p className="text-lg font-bold text-gray-900">₹{totalSpent}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Budget</p>
            <p className="text-lg font-bold text-gray-900">₹{monthlyBudget}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Remaining</p>
            <p className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              ₹{remaining}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
        <div className="space-y-3">
          {budgetUsed >= 100 && (
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Reduce Spending</p>
                <p className="text-sm text-gray-600">You've exceeded your budget. Consider reducing expenses.</p>
              </div>
            </div>
          )}
          {budgetUsed >= 80 && budgetUsed < 100 && (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Budget Limit Approaching</p>
                <p className="text-sm text-gray-600">You're close to your limit. Monitor your spending carefully.</p>
              </div>
            </div>
          )}
          {budgetUsed < 50 && (
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Good Progress</p>
                <p className="text-sm text-gray-600">You're managing your budget well. Keep it up!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}