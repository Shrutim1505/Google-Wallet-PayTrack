import { apiClient, unwrap } from '@/shared/api/client';
import { toApiError } from '@/shared/api/ApiError';
import type { AuthUser } from './authStore';

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

async function handle<T>(promise: Promise<{ data: unknown }>): Promise<T> {
  try {
    const response = await promise;
    return unwrap<T>(response.data);
  } catch (err) {
    throw toApiError(err);
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    handle<AuthResponse>(apiClient.post('/auth/login', { email, password })),

  register: (email: string, password: string, name: string) =>
    handle<AuthResponse>(apiClient.post('/auth/register', { email, password, name })),

  logout: async (refreshToken?: string | null) => {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // Best effort — client-side state is cleared regardless
    }
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    handle<void>(apiClient.post('/auth/change-password', { currentPassword, newPassword })),

  requestPasswordReset: (email: string) =>
    handle<{ success: boolean; message: string; _dev_token?: string }>(
      apiClient.post('/auth/password-reset/request', { email })
    ),

  confirmPasswordReset: (token: string, newPassword: string) =>
    handle<{ success: boolean }>(apiClient.post('/auth/password-reset/confirm', { token, newPassword })),
};
