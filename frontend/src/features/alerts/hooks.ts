import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrap } from '@/shared/api/client';

export interface SmartAlert {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  data: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

interface AlertsResponse {
  alerts: SmartAlert[];
  unreadCount: number;
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const r = await apiClient.get('/features/alerts');
      return unwrap<AlertsResponse>(r.data);
    },
    refetchInterval: 30_000, // poll every 30s
  });
}

export function useMarkAlertsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertIds?: string[]) => {
      await apiClient.post('/features/alerts/read', { alertIds });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
