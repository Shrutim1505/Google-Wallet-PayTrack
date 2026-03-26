import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

export type RTEventHandler = (data: any) => void;

interface UseSocketReturn {
  connected: boolean;
  subscribe: (event: string, handler: RTEventHandler) => () => void;
  connectionCount: number;
}

/**
 * Real-time WebSocket hook using Socket.IO.
 * Auto-connects when auth token exists, auto-reconnects on disconnect,
 * and provides a subscribe API for components to listen to server events.
 */
export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const handlersRef = useRef<Map<string, Set<RTEventHandler>>>(new Map());

  // Dispatch incoming events to all registered handlers
  const dispatch = useCallback((event: string, data: any) => {
    const handlers = handlersRef.current.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try { handler(data); } catch (e) { console.error(`[WS] Handler error for ${event}:`, e); }
      });
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setConnectionCount(prev => prev + 1);
      console.log('[WS] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      console.log('[WS] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server kicked us — likely token expired
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
      if (err.message === 'Invalid token') {
        // Token expired, try refreshing
        socket.disconnect();
      }
    });

    // ── Listen for all real-time events and dispatch ──
    const events = [
      'receipt:created', 'receipt:updated', 'receipt:deleted',
      'alert:new', 'budget:warning',
      'settings:updated',
      'split:created', 'split:paid',
      'sync:status', 'connected',
    ];

    for (const event of events) {
      socket.on(event, (data: any) => dispatch(event, data));
    }

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [dispatch]);

  // Subscribe to a specific event — returns an unsubscribe function
  const subscribe = useCallback((event: string, handler: RTEventHandler): (() => void) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    return () => {
      const handlers = handlersRef.current.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) handlersRef.current.delete(event);
      }
    };
  }, []);

  return { connected, subscribe, connectionCount };
}
