import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Download } from 'lucide-react';
import { Receipt } from '../../../types/receipt';
import { formatCurrency } from '../../../utils/currency';

interface ReceiptModalProps {
  receipt: Receipt;
  onClose: () => void;
  onUpdate?: (receipt: Receipt) => void;
  onDelete?: (id: string) => void;
}

export function ReceiptModal({ receipt, onClose, onUpdate, onDelete }: ReceiptModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReceipt, setEditedReceipt] = useState<Receipt>(receipt);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedReceipt);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this receipt?')) {
      onDelete(receipt.id);
      onClose();
    }
  };

  const handleExport = () => {
    const receiptText = `
Receipt Details
===============

Merchant: ${editedReceipt.merchant}
Category: ${editedReceipt.category}
Amount: ${formatCurrency(editedReceipt.amount)}
Date: ${editedReceipt.date}

Items:
${editedReceipt.items.map((item) => `- ${item.name}: ${formatCurrency(item.price)}`).join('\n')}

Total: ${formatCurrency(editedReceipt.amount)}
    `.trim();

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(receiptText));
    element.setAttribute('download', `receipt-${receipt.id}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-100 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Receipt' : 'Receipt Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Merchant Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Merchant</label>
            {isEditing ? (
              <input
                type="text"
                value={editedReceipt.merchant}
                onChange={(e) =>
                  setEditedReceipt({ ...editedReceipt, merchant: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">{editedReceipt.merchant}</p>
            )}
          </div>

          {/* Amount Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              {isEditing ? (
                <input
                  type="number"
                  value={editedReceipt.amount}
                  onChange={(e) =>
                    setEditedReceipt({ ...editedReceipt, amount: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(editedReceipt.amount)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              {isEditing ? (
                <select
                  value={editedReceipt.category}
                  onChange={(e) =>
                    setEditedReceipt({ ...editedReceipt, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-lg text-gray-900">{editedReceipt.category}</p>
              )}
            </div>
          </div>

          {/* Date Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            {isEditing ? (
              <input
                type="date"
                value={editedReceipt.date}
                onChange={(e) =>
                  setEditedReceipt({ ...editedReceipt, date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{editedReceipt.date}</p>
            )}
          </div>

          {/* Items Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Items</label>
            <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
              {editedReceipt.items.length === 0 ? (
                <p className="text-gray-500 text-sm">No items added</p>
              ) : (
                editedReceipt.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.quantity && (
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900">{formatCurrency(item.price)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-gray-900">Total Amount:</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(editedReceipt.amount)}</p>
            </div>
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="sticky bottom-0 flex gap-3 p-6 border-t border-gray-100 bg-white">
          {!isEditing ? (
            <>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedReceipt(receipt);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Save Changes
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}