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
      color: 'from-blue-500 to-blue-600',
      bgGlow: 'shadow-blue-500/25',
      textColor: 'text-blue-700',
      change: '+12.5%'
    },
    {
      title: 'Total Receipts',
      value: totalReceipts.toString(),
      icon: Receipt,
      color: 'from-emerald-500 to-emerald-600',
      bgGlow: 'shadow-emerald-500/25',
      textColor: 'text-emerald-700',
      change: '+8.2%'
    },
    {
      title: 'Average Purchase',
      value: formatIndianCurrency(averageSpent),
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      bgGlow: 'shadow-orange-500/25',
      textColor: 'text-orange-700',
      change: '+3.7%'
    },
    {
      title: 'Budget Used',
      value: `${budgetUsed.toFixed(1)}%`,
      icon: Target,
      color: 'from-purple-500 to-purple-600',
      bgGlow: 'shadow-purple-500/25',
      textColor: 'text-purple-700',
      change: `${formatIndianCurrency(monthlyBudget - totalSpent)} left`
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">
            Financial Dashboard
          </h1>
          <p className="text-gray-600 text-lg">Track your spending and stay within budget</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div 
              key={stat.title} 
              className="group relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-2xl border border-white/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden animate-fade-in-up"
              style={{
                animationDelay: `${index * 150}ms`
              }}
            >
              {/* Gradient Background Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Glowing Border Effect */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 blur-sm transition-all duration-500"></div>
              
              <div className="relative p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 opacity-80">{stat.title}</p>
                    <p className="text-3xl font-black text-gray-900 leading-none mb-1">{stat.value}</p>
                  </div>
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} ${stat.bgGlow} shadow-xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <stat.icon className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                </div>
                
                {/* Change Indicator */}
                <div className="flex items-center justify-between">
                  <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-bold ${stat.textColor} bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-sm border border-white/30`}>
                    <span>{stat.change}</span>
                  </div>
                  
                  {/* Pulse Animation Dot */}
                  <div className="relative">
                    <div className={`w-3 h-3 bg-gradient-to-r ${stat.color} rounded-full animate-pulse`}></div>
                    <div className={`absolute inset-0 w-3 h-3 bg-gradient-to-r ${stat.color} rounded-full animate-ping opacity-20`}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Budget Progress Section */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>
          
          <div className="relative p-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Monthly Budget Progress
              </h3>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg"></div>
                <span className="text-sm font-medium text-gray-600">On Track</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Budget Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-600 mb-1">Amount Spent</p>
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalSpent)}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-600 mb-1">Monthly Budget</p>
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(monthlyBudget)}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`text-lg font-bold ${
                    budgetUsed > 90 ? 'text-red-600' : budgetUsed > 75 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {budgetUsed.toFixed(1)}% of budget used
                  </span>
                  <span className="text-lg font-bold text-gray-700">
                    {formatCurrency(monthlyBudget - totalSpent)} remaining
                  </span>
                </div>
                
                {/* Enhanced Progress Bar */}
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-2xl h-6 shadow-inner overflow-hidden">
                    <div 
                      className={`h-full rounded-2xl transition-all duration-1000 ease-out shadow-lg relative overflow-hidden ${
                        budgetUsed > 90 ? 'bg-gradient-to-r from-red-500 via-red-500 to-red-600' : 
                        budgetUsed > 75 ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500' : 
                        'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600'
                      }`}
                      style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                    >
                      {/* Animated Shimmer Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                      
                      {/* Progress Indicator */}
                      {budgetUsed > 10 && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="w-2 h-2 bg-white rounded-full shadow-lg animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Budget Milestones */}
                  <div className="absolute -top-8 left-0 right-0 flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span className="text-amber-600">75%</span>
                    <span className="text-red-600">90%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Budget Status Message */}
                <div className={`text-center p-4 rounded-2xl ${
                  budgetUsed > 90 ? 'bg-red-50 border border-red-200' : 
                  budgetUsed > 75 ? 'bg-amber-50 border border-amber-200' : 
                  'bg-emerald-50 border border-emerald-200'
                }`}>
                  <p className={`font-medium ${
                    budgetUsed > 90 ? 'text-red-800' : 
                    budgetUsed > 75 ? 'text-amber-800' : 
                    'text-emerald-800'
                  }`}>
                    {budgetUsed > 90 ? '⚠️ Budget limit exceeded! Consider reviewing your expenses.' :
                     budgetUsed > 75 ? '⚡ Approaching budget limit. Monitor your spending carefully.' :
                     '✨ Great job! You\'re staying within your budget.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom CSS for animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.6s ease-out forwards;
          }
        `
      }} />
    </div>
  );
};