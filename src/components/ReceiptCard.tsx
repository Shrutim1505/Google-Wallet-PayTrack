import React from 'react';
import { Receipt } from '../types/receipt';
import { formatCurrency } from '../utils/currency';
import { Calendar, MapPin, CreditCard, CheckCircle, Tag } from 'lucide-react';

interface ReceiptCardProps {
  receipt: Receipt;
  onClick: (receipt: Receipt) => void;
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({ receipt, onClick }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Groceries': 'bg-green-100 text-green-800',
      'Food & Dining': 'bg-orange-100 text-orange-800',
      'Transportation': 'bg-blue-100 text-blue-800',
      'Shopping': 'bg-purple-100 text-purple-800',
      'Health & Medical': 'bg-red-100 text-red-800',
      'Entertainment': 'bg-pink-100 text-pink-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div 
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 overflow-hidden transform hover:-translate-y-2 hover:scale-105 group"
      onClick={() => onClick(receipt)}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{receipt.merchant}</span>
          </div>
          {receipt.verified && (
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 font-medium">{formatDate(receipt.date)}</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{formatCurrency(receipt.amount)}</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getCategoryColor(receipt.category)}`}>
            {receipt.category}
          </span>
          <div className="flex items-center space-x-1">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 font-medium">{receipt.paymentMethod}</span>
          </div>
        </div>

        {receipt.tags.length > 0 && (
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <div className="flex flex-wrap gap-1">
              {receipt.tags.map((tag) => (
                <span key={tag} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};