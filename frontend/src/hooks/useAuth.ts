import { useState, useEffect } from 'react';
import { isTokenExpired, removeTokenFromStorage } from '../lib/jwt';

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
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        removeTokenFromStorage();
      }
    } else if (token) {
      // Token expired — clean up
      removeTokenFromStorage();
    }
    setLoading(false);
  }, []);

  const isAuthenticated = () => {
    const token = localStorage.getItem('auth_token');
    if (!token || isTokenExpired(token)) {
      return false;
    }
    return !!user || !!localStorage.getItem('user');
  };

  const logout = () => {
    removeTokenFromStorage();
    setUser(null);
    window.location.reload();
  };

  return { user, loading, isAuthenticated, logout };
}
