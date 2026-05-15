import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from './api';
import { useAuthStore } from './authStore';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      setAuth({ user: data.user, token: data.token, refreshToken: data.refreshToken });
      navigate('/', { replace: true });
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      authApi.register(email, password, name),
    onSuccess: (data) => {
      setAuth({ user: data.user, token: data.token, refreshToken: data.refreshToken });
      navigate('/', { replace: true });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const { clearAuth, refreshToken } = useAuthStore.getState();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => authApi.logout(refreshToken),
    onSettled: () => {
      clearAuth();
      qc.clear();
      navigate('/login', { replace: true });
    },
  });
}

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return { user, isAuthenticated };
}

export function useHasPermission(permission: string) {
  return useAuthStore((s) => s.hasPermission(permission));
}
