import { useState, useEffect } from 'react';
import { authService, User, AuthResponse, LoginCredentials, RegisterCredentials } from '../lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await authService.login(credentials);
      if (response.success && response.user) {
        setUser(response.user);
      }
      return response;
    } catch (error) {
      console.error('Login hook error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
      const response = await authService.register(credentials);
      if (response.success && response.user) {
        setUser(response.user);
      }
      return response;
    } catch (error) {
      console.error('Registration hook error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const isAuthenticated = (): boolean => {
    return authService.isAuthenticated();
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated
  };
};
