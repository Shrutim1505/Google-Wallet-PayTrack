import React from 'react';
import { AlertCircle, TrendingUp, Target } from 'lucide-react';
import { formatCurrency } from '../../../utils/currency';

interface BudgetAlertsProps {
  totalSpent: number;
  monthlyBudget: number;
  budgetUsed: number;
}

type AlertLevel = 'critical' | 'warning' | 'info' | 'safe';

const ALERT_CONFIG: Record<AlertLevel, { bg: string; border: string; icon: string; title: string; color: string; barColor: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', title: 'Budget Exceeded', color: 'text-red-600', barColor: 'bg-red-600' },
  warning:  { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', title: 'Budget Alert', color: 'text-yellow-600', barColor: 'bg-yellow-600' },
  info:     { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', title: 'Halfway There', color: 'text-blue-600', barColor: 'bg-blue-600' },
  safe:     { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', title: 'On Track', color: 'text-green-600', barColor: 'bg-green-600' },
};

export function BudgetAlerts({ totalSpent, monthlyBudget, budgetUsed }: BudgetAlertsProps) {
  const remaining = monthlyBudget - totalSpent;
  const isOverBudget = remaining < 0;

  const alertLevel: AlertLevel =
    budgetUsed >= 100 ? 'critical' :
    budgetUsed >= 80 ? 'warning' :
    budgetUsed >= 50 ? 'info' : 'safe';

  const config = ALERT_CONFIG[alertLevel];

  const messages: Record<AlertLevel, string> = {
    critical: `You have exceeded your budget by ${formatCurrency(Math.abs(remaining))}`,
    warning: `Only ${formatCurrency(remaining)} remaining in your monthly budget`,
    info: `You've spent ${formatCurrency(totalSpent)} out of ${formatCurrency(monthlyBudget)}`,
    safe: `Great! You have ${formatCurrency(remaining)} left in your budget`,
  };

  return (
    <div className="space-y-6">
      <div className={`${config.bg} ${config.border} border rounded-xl p-6`}>
        <div className="flex items-start gap-4">
          <AlertCircle className={`w-6 h-6 ${config.icon} flex-shrink-0 mt-1`} />
          <div>
            <h3 className={`text-lg font-semibold ${config.color} mb-2`}>{config.title}</h3>
            <p className="text-gray-700">{messages[alertLevel]}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Progress</h3>
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Spent</span>
            <span className={`text-sm font-semibold ${config.color}`}>{budgetUsed}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${config.barColor}`}
              style={{ width: `${Math.min(budgetUsed, 100)}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">Spent</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Budget</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(monthlyBudget)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Remaining</p>
            <p className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
        <div className="space-y-3">
          {budgetUsed >= 100 && (
            <Recommendation icon={<TrendingUp className="w-5 h-5 text-red-600" />}
              title="Reduce Spending" desc="You've exceeded your budget. Consider reducing expenses." />
          )}
          {budgetUsed >= 80 && budgetUsed < 100 && (
            <Recommendation icon={<AlertCircle className="w-5 h-5 text-yellow-600" />}
              title="Budget Limit Approaching" desc="You're close to your limit. Monitor your spending carefully." />
          )}
          {budgetUsed < 50 && (
            <Recommendation icon={<Target className="w-5 h-5 text-green-600" />}
              title="Good Progress" desc="You're managing your budget well. Keep it up!" />
          )}
        </div>
      </div>
    </div>
  );
}

function Recommendation({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 flex-shrink-0">{icon}</div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
    </div>
  );
}
