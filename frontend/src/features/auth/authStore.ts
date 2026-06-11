import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  setAuth: (auth: { user: AuthUser; token: string; refreshToken: string }) => void;
  updateTokens: (tokens: { token: string; refreshToken: string }) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  isAuthenticated: () => boolean;
}

/**
 * Auth store backed by localStorage.
 *
 * SECURITY NOTE: Access tokens in localStorage are vulnerable to XSS.
 * In production, migrate to httpOnly cookies. For now, we minimize
 * the attack surface by:
 *   - Keeping the user object in state (not localStorage) where possible
 *   - Using the store as the single read/write point (easier to migrate)
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,

      setAuth: ({ user, token, refreshToken }) =>
        set({ user, token, refreshToken }),

      updateTokens: ({ token, refreshToken }) =>
        set({ token, refreshToken }),

      clearAuth: () =>
        set({ user: null, token: null, refreshToken: null }),

      hasPermission: (permission) =>
        get().user?.permissions.includes(permission) ?? false,

      hasRole: (role) =>
        get().user?.roles.includes(role) ?? false,

      isAuthenticated: () => !!get().token && !!get().user,
    }),
    {
      name: 'paytrack-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Non-hook access for the axios client (avoids circular dep)
export const getAuthToken = () => useAuthStore.getState().token;
export const getRefreshToken = () => useAuthStore.getState().refreshToken;
export const clearAuth = () => useAuthStore.getState().clearAuth();
