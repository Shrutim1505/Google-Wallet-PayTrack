import { useState, useEffect } from 'react';
import { isTokenExpired, removeTokenFromStorage } from '../lib/jwt';
import { api } from '../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser && !isTokenExpired(token)) {
      try { setUser(JSON.parse(storedUser)); } catch { removeTokenFromStorage(); }
    } else if (token && isTokenExpired(token) && localStorage.getItem('refresh_token')) {
      // Token expired but refresh token exists — the API interceptor will handle refresh
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)); } catch { removeTokenFromStorage(); }
      }
    } else if (token) {
      removeTokenFromStorage();
    }
    setLoading(false);
  }, []);

  const isAuthenticated = () => {
    const token = localStorage.getItem('auth_token');
    const refresh = localStorage.getItem('refresh_token');
    if (!token) return false;
    // If access token expired but refresh exists, still authenticated (interceptor will refresh)
    if (isTokenExpired(token) && !refresh) return false;
    return !!user || !!localStorage.getItem('user');
  };

  const logout = async () => {
    await api.logout();
    removeTokenFromStorage();
    setUser(null);
    window.location.reload();
  };

  return { user, loading, isAuthenticated, logout };
}
