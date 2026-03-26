import { useState, useCallback, useEffect } from 'react';
import { Receipt } from '../types/receipt';
import { api, ApiError } from '../services/api';
import { useRealtime } from '../context/RealtimeContext';

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

  let subscribe: ((event: string, handler: (data: any) => void) => () => void) | undefined;
  try {
    const rt = useRealtime();
    subscribe = rt.subscribe;
  } catch {
    // RealtimeContext not available (e.g. not authenticated yet)
  }

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReceipts();
      setReceipts(Array.isArray(data) ? data.map(normalizeReceipt) : []);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch receipts');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUploadReceipt = useCallback(async (file: File): Promise<void> => {
    setUploading(true);
    setError(null);
    try {
      const uploadedReceipt = await api.uploadReceipt(file);
      // Don't add locally — the WebSocket event will handle it
      // But if WS is not connected, add it directly
      setReceipts((prev) => {
        if (prev.some(r => r.id === uploadedReceipt.id)) return prev;
        return [normalizeReceipt(uploadedReceipt), ...prev];
      });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to upload receipt');
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
    }
  }, []);

  const deleteReceipt = useCallback(async (id: string) => {
    try {
      await api.deleteReceipt(id);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to delete receipt');
    }
  }, []);

  // Initial fetch
  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  // ── Real-time event listeners ──
  useEffect(() => {
    if (!subscribe) return;

    const unsubs = [
      subscribe('receipt:created', (data: any) => {
        if (data?.receipt) {
          setReceipts((prev) => {
            const normalized = normalizeReceipt(data.receipt);
            // Deduplicate — might already be added by the HTTP response
            if (prev.some(r => r.id === normalized.id)) return prev;
            return [normalized, ...prev];
          });
        }
      }),

      subscribe('receipt:updated', (data: any) => {
        if (data?.receipt) {
          const normalized = normalizeReceipt(data.receipt);
          setReceipts((prev) => prev.map(r => r.id === normalized.id ? normalized : r));
        }
      }),

      subscribe('receipt:deleted', (data: any) => {
        if (data?.receiptId) {
          setReceipts((prev) => prev.filter(r => r.id !== data.receiptId));
        }
      }),
    ];

    return () => unsubs.forEach(fn => fn());
  }, [subscribe]);

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
