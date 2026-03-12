import { useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is in localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const isAuthenticated = () => {
    // Check current state AND localStorage
    const storedUser = localStorage.getItem('user');
    return !!user || !!storedUser;
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.reload();
  };

  return { user, loading, isAuthenticated, logout };
}