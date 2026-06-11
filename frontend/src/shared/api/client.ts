import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { getAuthToken, getRefreshToken, clearAuth, useAuthStore } from '@/features/auth/authStore';
import { toApiError } from './ApiError';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ── Request: attach Bearer token ──
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: auto-refresh on 401 ──
interface QueuedRequest {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

function flushQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else if (token) p.resolve(token);
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Only handle 401s that aren't themselves refresh attempts
    const is401 = error.response?.status === 401;
    const isRefreshCall = originalRequest.url?.includes('/auth/refresh');

    if (!is401 || originalRequest._retry || isRefreshCall) {
      return Promise.reject(toApiError(error));
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuth();
      return Promise.reject(toApiError(error));
    }

    // If refresh is in flight, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newToken}` };
        return apiClient(originalRequest);
      }).catch((err) => Promise.reject(toApiError(err)));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const payload = data?.data ?? data;
      const newToken: string = payload.token;
      const newRefresh: string = payload.refreshToken;
      const newUser = payload.user;

      useAuthStore.getState().setAuth({
        user: newUser,
        token: newToken,
        refreshToken: newRefresh,
      });

      flushQueue(null, newToken);
      originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newToken}` };
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      clearAuth();
      return Promise.reject(toApiError(refreshError));
    } finally {
      isRefreshing = false;
    }
  }
);

/**
 * Unwrap the backend's { success, data, message } envelope.
 */
export function unwrap<T>(responseData: unknown): T {
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return (responseData as { data: T }).data;
  }
  return responseData as T;
}
