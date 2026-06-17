import { apiClient, unwrap } from '@/shared/api/client';
import { toApiError } from '@/shared/api/ApiError';
import type { Receipt, ReceiptFilters, CreateReceiptInput } from './types';

async function handle<T>(promise: Promise<{ data: unknown }>): Promise<T> {
  try {
    const response = await promise;
    return unwrap<T>(response.data);
  } catch (err) {
    throw toApiError(err);
  }
}

export const receiptsApi = {
  list: (filters: ReceiptFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 0) params.set(k, String(v));
    });
    const qs = params.toString();
    return handle<Receipt[]>(apiClient.get(`/receipts${qs ? `?${qs}` : ''}`));
  },

  get: (id: string) => handle<Receipt>(apiClient.get(`/receipts/${id}`)),

  getAIMetadata: (id: string) =>
    handle<import('./types').ReceiptAIMetadata | null>(apiClient.get(`/receipts/${id}/ai`)),

  correctCategory: (id: string, category: string) =>
    handle<Receipt>(apiClient.post(`/receipts/${id}/correct-category`, { category })),

  create: (input: CreateReceiptInput) =>
    handle<Receipt>(
      apiClient.post('/receipts', input, {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })
    ),

  update: (id: string, updates: Partial<CreateReceiptInput>) =>
    handle<Receipt>(apiClient.put(`/receipts/${id}`, updates)),

  delete: (id: string) =>
    handle<void>(apiClient.delete(`/receipts/${id}`)),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return handle<Receipt>(
      apiClient.post('/receipts/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Idempotency-Key': crypto.randomUUID(),
        },
      })
    );
  },

  exportCsv: async (): Promise<Blob> => {
    const response = await apiClient.get('/receipts/export?format=csv', {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
