import axios, { AxiosError } from 'axios';
import { Receipt } from '../types/receipt';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ApiError {
  message: string;
  status?: number;
}

type Envelope<T> = T | { data: T } | { receipt: T } | { receipts: T } | { result: T };

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ──
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: auto-refresh on 401 ──
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token');

      // No refresh token or this is already a refresh attempt — logout
      if (!refreshToken || originalRequest.url?.includes('/auth/refresh')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.reload();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const newToken = data?.data?.token;
        const newRefresh = data?.data?.refreshToken;

        if (newToken) {
          localStorage.setItem('auth_token', newToken);
          if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
          if (data?.data?.user) localStorage.setItem('user', JSON.stringify(data.data.user));

          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.reload();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function extractPayload<T>(responseData: Envelope<T>): T {
  if (Array.isArray(responseData)) return responseData as T;
  if (responseData && typeof responseData === 'object') {
    const obj = responseData as Record<string, unknown>;
    if ('data' in obj) return obj.data as T;
    if ('receipt' in obj) return obj.receipt as T;
    if ('receipts' in obj) return obj.receipts as T;
    if ('result' in obj) return obj.result as T;
  }
  return responseData as T;
}

function handleApiError(error: unknown): never {
  const axiosError = error as AxiosError<{ message?: string; error?: string }>;
  throw {
    message: axiosError.response?.data?.message || axiosError.response?.data?.error || axiosError.message || 'Unexpected API error',
    status: axiosError.response?.status,
  } as ApiError;
}

export const api = {
  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      const response = await apiClient.post('/auth/register', { email, password, name });
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      await apiClient.post('/auth/logout', { refreshToken });
    } catch { /* best effort */ }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  getReceipts: async (): Promise<Receipt[]> => {
    try {
      const response = await apiClient.get<Envelope<Receipt[]>>('/receipts');
      return extractPayload<Receipt[]>(response.data);
    } catch (error) { handleApiError(error); }
  },

  getReceipt: async (id: string): Promise<Receipt> => {
    try {
      const response = await apiClient.get<Envelope<Receipt>>(`/receipts/${id}`);
      return extractPayload<Receipt>(response.data);
    } catch (error) { handleApiError(error); }
  },

  createReceipt: async (receipt: Receipt): Promise<Receipt> => {
    try {
      const response = await apiClient.post<Envelope<Receipt>>('/receipts', receipt);
      return extractPayload<Receipt>(response.data);
    } catch (error) { handleApiError(error); }
  },

  updateReceipt: async (id: string, receipt: Partial<Receipt>): Promise<Receipt> => {
    try {
      const response = await apiClient.put<Envelope<Receipt>>(`/receipts/${id}`, receipt);
      return extractPayload<Receipt>(response.data);
    } catch (error) { handleApiError(error); }
  },

  deleteReceipt: async (id: string) => {
    try {
      const response = await apiClient.delete(`/receipts/${id}`);
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  uploadReceipt: async (file: File): Promise<Receipt> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post<Envelope<Receipt>>('/receipts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return extractPayload<Receipt>(response.data);
    } catch (error) { handleApiError(error); }
  },

  exportReceiptsCSV: async (): Promise<Blob> => {
    const response = await apiClient.get('/receipts/export', { responseType: 'blob' });
    return response.data;
  },

  getAnalytics: async () => {
    try {
      const response = await apiClient.get('/analytics');
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  getSettings: async () => {
    try {
      const response = await apiClient.get('/settings');
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  updateSettings: async (settings: unknown) => {
    try {
      const response = await apiClient.put('/settings', settings);
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  getAIInsights: async () => {
    try {
      const response = await apiClient.get('/ai/insights');
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  getAICategorize: async (merchant: string, items: string[]) => {
    try {
      const response = await apiClient.post('/ai/categorize', { merchant, items });
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  syncToWallet: async (receiptId: string) => {
    try {
      const response = await apiClient.post(`/wallet/sync/${receiptId}`);
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  getWalletStatus: async () => {
    try {
      const response = await apiClient.get('/wallet/status');
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  // ── Recurring Expenses ──
  getRecurring: async () => {
    try {
      const response = await apiClient.get('/features/recurring');
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  // ── Split Expenses ──
  createSplit: async (receiptId: string, participants: Array<{ name: string; amount: number; paid: boolean }>, splitType = 'equal') => {
    try {
      const response = await apiClient.post('/features/splits', { receiptId, participants, splitType });
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  getUserSplits: async () => {
    try {
      const response = await apiClient.get('/features/splits');
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  getSplitByToken: async (token: string) => {
    try {
      const response = await apiClient.get(`/features/splits/shared/${token}`);
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  markSplitPaid: async (token: string, participantName: string) => {
    try {
      const response = await apiClient.post(`/features/splits/shared/${token}/pay`, { participantName });
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  // ── Duplicate Detection ──
  checkDuplicate: async (merchant: string, amount: number, date: string) => {
    try {
      const response = await apiClient.post('/features/duplicates/check', { merchant, amount, date });
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  // ── Smart Alerts ──
  getSmartAlerts: async () => {
    try {
      const response = await apiClient.get('/features/alerts');
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  markAlertsRead: async (alertIds?: string[]) => {
    try {
      const response = await apiClient.post('/features/alerts/read', { alertIds });
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  generateDigest: async () => {
    try {
      const response = await apiClient.post('/features/alerts/digest');
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  // ── Currency ──
  convertCurrency: async (amount: number, from: string, to: string) => {
    try {
      const response = await apiClient.post('/features/currency/convert', { amount, from, to });
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  getExchangeRates: async (base = 'INR') => {
    try {
      const response = await apiClient.get(`/features/currency/rates?base=${base}`);
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  // ── ML ──
  mlPredict: async (merchant: string, items: string[] = []) => {
    try {
      const response = await apiClient.post('/features/ml/predict', { merchant, items });
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  mlTrain: async (merchant: string, items: string[], category: string) => {
    try {
      const response = await apiClient.post('/features/ml/train', { merchant, items, category });
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },

  mlStats: async () => {
    try {
      const response = await apiClient.get('/features/ml/stats');
      return extractPayload(response.data);
    } catch (error) { handleApiError(error); }
  },
};

export default apiClient;
