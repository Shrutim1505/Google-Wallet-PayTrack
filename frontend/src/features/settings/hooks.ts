import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient, unwrap } from '@/shared/api/client';

export interface UserSettings {
  name: string;
  email: string;
  monthlyBudget: number;
  notificationsEnabled: boolean;
  darkMode: boolean;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const r = await apiClient.get('/settings');
      return unwrap<{ settings: UserSettings }>(r.data).settings;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const r = await apiClient.put('/settings', updates);
      return unwrap<{ settings: UserSettings }>(r.data).settings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save settings'),
  });
}
