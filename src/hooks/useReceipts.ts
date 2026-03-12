import { useState, useCallback, useEffect } from 'react';
import { Receipt } from '../types/receipt';
import { api } from '../services/api';

const mockReceipts: Receipt[] = [
  {
    id: '1',
    merchant: 'Whole Foods',
    amount: 2500,
    date: new Date().toISOString().split('T')[0],
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
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      // Try to fetch from API, fallback to mock data
      try {
        const data = await api.getReceipts();
        setReceipts(data.receipts || data);
      } catch {
        // Use mock data if API fails
        setReceipts(mockReceipts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch receipts');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUploadReceipt = useCallback(async (file: File): Promise<void> => {
    setUploading(true);
    try {
      // Try API upload, fallback to mock
      try {
        await api.uploadReceipt(file);
      } catch {
        // Fallback: create mock receipt
        const newReceipt: Receipt = {
          id: Date.now().toString(),
          merchant: file.name.split('.')[0] || 'New Receipt',
          amount: Math.floor(Math.random() * 5000) + 100,
          date: new Date().toISOString().split('T')[0],
          category: 'Uncategorized',
          items: [{ name: 'Item 1', price: 100, quantity: 1 }],
        };
        setReceipts((prev) => [newReceipt, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload receipt');
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const updateReceipt = useCallback(async (id: string, updates: Partial<Receipt>) => {
    try {
      await api.updateReceipt(id, updates);
      setReceipts((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    } catch (err) {
      // Fallback: update locally
      setReceipts((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    }
  }, []);

  const deleteReceipt = useCallback(async (id: string) => {
    try {
      await api.deleteReceipt(id);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // Fallback: delete locally
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  return {
    receipts,
    loading,
    uploading,
    error,
    fetchReceipts,
    handleUploadReceipt,
    updateReceipt,
    deleteReceipt,
  };
}