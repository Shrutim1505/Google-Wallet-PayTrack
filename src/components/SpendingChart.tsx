import React from 'react';
import { SpendingInsight } from '../types/receipt';
import { formatCurrency } from '../utils/currency';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SpendingChartProps {
  insights: SpendingInsight[];
}

export const SpendingChart: React.FC<SpendingChartProps> = ({ insights }) => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-red-600';
      case 'down':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Groceries': 'bg-green-500',
      'Food & Dining': 'bg-orange-500',
      'Transportation': 'bg-blue-500',
      'Shopping': 'bg-purple-500',
      'Health & Medical': 'bg-red-500',
      'Entertainment': 'bg-pink-500'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-8">Spending by Category</h3>
      
      <div className="space-y-6">
        {insights.map((insight) => (
          <div key={insight.category} className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className={`w-5 h-5 rounded-full ${getCategoryColor(insight.category)} shadow-lg`}></div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900">{insight.category}</span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(insight.amount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                  <div 
                    className={`h-3 rounded-full ${getCategoryColor(insight.category)} shadow-sm transition-all duration-500`}
                    style={{ width: `${insight.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="ml-6 flex items-center space-x-2">
              {getTrendIcon(insight.trend)}
              <span className={`text-sm font-semibold ${getTrendColor(insight.trend)}`}>
                {insight.change > 0 ? '+' : ''}{insight.change.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};