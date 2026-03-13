import axios, { AxiosError } from 'axios';
import { Receipt } from '../types/receipt';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ApiError {
  message: string;
  status?: number;
}

type Envelope<T> =
  | T
  | { data: T }
  | { receipt: T }
  | { receipts: T }
  | { result: T };

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function extractPayload<T>(responseData: Envelope<T>): T {
  if (Array.isArray(responseData)) {
    return responseData as T;
  }

  if (responseData && typeof responseData === 'object') {
    const objectData = responseData as Record<string, unknown>;

    if ('data' in objectData) return objectData.data as T;
    if ('receipt' in objectData) return objectData.receipt as T;
    if ('receipts' in objectData) return objectData.receipts as T;
    if ('result' in objectData) return objectData.result as T;
  }

  return responseData as T;
}

function handleApiError(error: unknown): never {
  const axiosError = error as AxiosError<{ message?: string; error?: string }>;
  const message =
    axiosError.response?.data?.message ||
    axiosError.response?.data?.error ||
    axiosError.message ||
    'Unexpected API error';

  const formattedError: ApiError = {
    message,
    status: axiosError.response?.status,
  };

  throw formattedError;
}

export const api = {
  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      return extractPayload(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      const response = await apiClient.post('/auth/register', { email, password, name });
      return extractPayload(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },

  getReceipts: async (): Promise<Receipt[]> => {
    try {
      const response = await apiClient.get<Envelope<Receipt[]>>('/receipts');
      return extractPayload<Receipt[]>(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },

  getReceipt: async (id: string): Promise<Receipt> => {
    try {
      const response = await apiClient.get<Envelope<Receipt>>(`/receipts/${id}`);
      return extractPayload<Receipt>(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },

  createReceipt: async (receipt: Receipt): Promise<Receipt> => {
    try {
      const response = await apiClient.post<Envelope<Receipt>>('/receipts', receipt);
      return extractPayload<Receipt>(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },

  updateReceipt: async (id: string, receipt: Partial<Receipt>): Promise<Receipt> => {
    try {
      const response = await apiClient.put<Envelope<Receipt>>(`/receipts/${id}`, receipt);
      return extractPayload<Receipt>(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },

  deleteReceipt: async (id: string) => {
    try {
      const response = await apiClient.delete(`/receipts/${id}`);
      return extractPayload(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },

  uploadReceipt: async (file: File): Promise<Receipt> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<Envelope<Receipt>>('/receipts/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return extractPayload<Receipt>(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },

  getAnalytics: async () => {
    try {
      const response = await apiClient.get('/analytics');
      return extractPayload(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },

  getSettings: async () => {
    try {
      const response = await apiClient.get('/settings');
      return extractPayload(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },

  updateSettings: async (settings: unknown) => {
    try {
      const response = await apiClient.put('/settings', settings);
      return extractPayload(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },
};

export default apiClient;
