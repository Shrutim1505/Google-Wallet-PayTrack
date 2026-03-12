import { useState, useCallback } from 'react';
import { Receipt } from '../types/receipt';

// Mock data
const mockReceipts: Receipt[] = [
  {
    id: '1',
    merchant: 'Whole Foods',
    amount: 2500,
    date: new Date().toISOString().split('T')[0], // Convert to string
    category: 'Food',
    items: [{ name: 'Groceries', price: 2500, quantity: 1 }],
  },
  {
    id: '2',
    merchant: 'Uber',
    amount: 450,
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    category: 'Transport',
    items: [{ name: 'Ride', price: 450, quantity: 1 }],
  },
];

export function useReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>(mockReceipts);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      // In real app, fetch from backend
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUploadReceipt = useCallback(async (file: File): Promise<void> => {
    setUploading(true);
    try {
      // Simulate API call and OCR processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create mock receipt from uploaded file
      const newReceipt: Receipt = {
        id: Date.now().toString(),
        merchant: file.name.split('.')[0] || 'New Receipt',
        amount: Math.floor(Math.random() * 5000) + 100,
        date: new Date().toISOString().split('T')[0],
        category: 'Uncategorized',
        items: [{ name: 'Item 1', price: 100, quantity: 1 }],
      };

      setReceipts((prev) => [newReceipt, ...prev]);
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    receipts,
    loading,
    uploading,
    fetchReceipts,
    handleUploadReceipt,
  };
}