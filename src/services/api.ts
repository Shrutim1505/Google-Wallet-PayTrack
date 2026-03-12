import axios from 'axios';
import { Receipt } from '../types/receipt';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Methods
export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email: string, password: string, name: string) => {
    const response = await apiClient.post('/auth/register', { email, password, name });
    return response.data;
  },

  // Receipts
  getReceipts: async () => {
    const response = await apiClient.get('/receipts');
    return response.data;
  },

  getReceipt: async (id: string) => {
    const response = await apiClient.get(`/receipts/${id}`);
    return response.data;
  },

  createReceipt: async (receipt: Receipt) => {
    const response = await apiClient.post('/receipts', receipt);
    return response.data;
  },

  updateReceipt: async (id: string, receipt: Partial<Receipt>) => {
    const response = await apiClient.put(`/receipts/${id}`, receipt);
    return response.data;
  },

  deleteReceipt: async (id: string) => {
    const response = await apiClient.delete(`/receipts/${id}`);
    return response.data;
  },

  uploadReceipt: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/receipts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Analytics
  getAnalytics: async () => {
    const response = await apiClient.get('/analytics');
    return response.data;
  },

  // Settings
  getSettings: async () => {
    const response = await apiClient.get('/settings');
    return response.data;
  },

  updateSettings: async (settings: any) => {
    const response = await apiClient.put('/settings', settings);
    return response.data;
  },
};

export default apiClient;