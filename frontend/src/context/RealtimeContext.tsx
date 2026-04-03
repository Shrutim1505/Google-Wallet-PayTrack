import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useSocket, RTEventHandler } from '../hooks/useSocket';
import toast from 'react-hot-toast';

interface RealtimeContextType {
  connected: boolean;
  subscribe: (event: string, handler: RTEventHandler) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({ connected: false, subscribe: () => () => {} });

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { connected, subscribe } = useSocket();

  // Global toast notifications for real-time events
  useEffect(() => {
    const unsubs = [
      subscribe('receipt:created', (data) => {
        const merchant = data?.receipt?.merchant || 'New receipt';
        toast.success(`📄 ${merchant} added in real-time`, { id: `rt-${data?.receipt?.id}` });
      }),
      subscribe('alert:new', (data) => {
        const alerts = data?.alerts || [];
        for (const alert of alerts) {
          const icon = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
          toast(alert.message, {
            icon,
            duration: 6000,
            style: alert.severity === 'critical' ? { border: '1px solid #ef4444' } : undefined,
          });
        }
      }),
      subscribe('settings:updated', () => {
        toast.success('⚙️ Settings synced across devices', { id: 'rt-settings' });
      }),
      subscribe('connected', () => {
        // Silent — just confirms connection
      }),
    ];

    return () => unsubs.forEach(fn => fn());
  }, [subscribe]);

  return (
    <RealtimeContext.Provider value={{ connected, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
