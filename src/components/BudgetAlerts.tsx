import React from 'react';
import { BudgetAlert } from '../types/receipt';
import { formatCurrency } from '../utils/currency';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface BudgetAlertsProps {
  alerts: BudgetAlert[];
}

export const BudgetAlerts: React.FC<BudgetAlertsProps> = ({ alerts }) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'exceeded':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'exceeded':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Budget Alerts</h3>
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold">✓</span>
            </div>
          </div>
          <p className="text-gray-600 font-medium text-lg">You're on track with your budget!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Budget Alerts</h3>
      <div className="space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className={`p-5 rounded-xl border-2 ${getAlertColor(alert.type)} shadow-sm`}>
            <div className="flex items-start space-x-3">
              {getAlertIcon(alert.type)}
              <div className="flex-1">
                <p className="font-bold text-lg">{alert.category}</p>
                <p className="text-sm mt-2 font-medium">{alert.message}</p>
                <div className="mt-3 bg-white bg-opacity-60 rounded-full h-3 shadow-inner">
                  <div 
                    className={`h-3 rounded-full shadow-sm ${alert.type === 'exceeded' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-yellow-500 to-orange-500'}`}
                    style={{ width: `${Math.min((alert.current / alert.limit) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs mt-2 font-medium">
                  {formatCurrency(alert.current)} of {formatCurrency(alert.limit)} used
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};