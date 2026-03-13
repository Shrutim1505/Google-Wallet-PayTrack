import { useState, useCallback, useEffect } from 'react';
import { Receipt } from '../types/receipt';
import { api, ApiError } from '../services/api';

const fallbackReceipts: Receipt[] = [
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

const enableMockFallback = import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true';

const parseAmount = (value: unknown): number => {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeReceipt = (receipt: Partial<Receipt>): Receipt => ({
  id: String(receipt.id || Date.now()),
  merchant: receipt.merchant?.trim() || 'Unknown Merchant',
  amount: parseAmount(receipt.amount),
  date: receipt.date || new Date().toISOString().split('T')[0],
  category: receipt.category || 'Uncategorized',
  items:
    receipt.items?.map((item, index) => ({
      id: item.id || `${receipt.id || 'item'}-${index}`,
      name: item.name || `Item ${index + 1}`,
      price: parseAmount(item.price),
      quantity: item.quantity || 1,
    })) || [],
});

export function useReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getReceipts();
      setReceipts(Array.isArray(data) ? data.map(normalizeReceipt) : []);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch receipts');

      if (enableMockFallback) {
        setReceipts(fallbackReceipts);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUploadReceipt = useCallback(async (file: File): Promise<void> => {
    setUploading(true);
    setError(null);

    try {
      const uploadedReceipt = await api.uploadReceipt(file);
      setReceipts((prev) => [normalizeReceipt(uploadedReceipt), ...prev]);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to upload receipt');

      if (enableMockFallback) {
        const fallbackReceipt: Receipt = {
          id: Date.now().toString(),
          merchant: file.name.split('.')[0] || 'New Receipt',
          amount: Math.floor(Math.random() * 5000) + 100,
          date: new Date().toISOString().split('T')[0],
          category: 'Uncategorized',
          items: [{ name: 'Item 1', price: 100, quantity: 1 }],
        };

        setReceipts((prev) => [fallbackReceipt, ...prev]);
        return;
      }

      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const updateReceipt = useCallback(async (id: string, updates: Partial<Receipt>) => {
    try {
      const updated = await api.updateReceipt(id, updates);
      const normalized = normalizeReceipt(updated);
      setReceipts((prev) => prev.map((r) => (r.id === id ? normalized : r)));
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to update receipt');

      if (enableMockFallback) {
        setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
      }
    }
  }, []);

  const deleteReceipt = useCallback(async (id: string) => {
    try {
      await api.deleteReceipt(id);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to delete receipt');

      if (enableMockFallback) {
        setReceipts((prev) => prev.filter((r) => r.id !== id));
      }
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
