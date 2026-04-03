import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { environment } from '../config/environment.js';
import { logger } from '../utils/logger.js';

export type RTEvent =
  | 'receipt:created'
  | 'receipt:updated'
  | 'receipt:deleted'
  | 'alert:new'
  | 'budget:warning'
  | 'settings:updated'
  | 'split:created'
  | 'split:paid'
  | 'sync:status';

let io: Server | null = null;

// Map userId → Set of socket IDs
const userSockets = new Map<string, Set<string>>();

/**
 * Initialize Socket.IO on the existing HTTP server.
 * Authenticates connections via JWT sent in the handshake auth payload.
 */
export function initializeWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: environment.FRONTEND_URL,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // ── Auth middleware ──
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, environment.JWT_SECRET) as { userId: string; email: string };
      (socket as any).userId = decoded.userId;
      (socket as any).email = decoded.email;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;

    // Track socket
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(socket.id);

    // Join user-specific room
    socket.join(`user:${userId}`);

    logger.info({ message: 'WS connected', userId, socketId: socket.id, total: userSockets.get(userId)!.size });

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Real-time connection established',
      timestamp: new Date().toISOString(),
    });

    socket.on('disconnect', (reason) => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
      logger.info({ message: 'WS disconnected', userId, socketId: socket.id, reason });
    });

    // Client can request a ping to verify connection
    socket.on('ping:check', () => {
      socket.emit('pong:check', { timestamp: new Date().toISOString() });
    });
  });

  logger.info({ message: 'WebSocket server initialized' });
  return io;
}

/**
 * Emit a real-time event to a specific user (all their connected devices/tabs).
 */
export function emitToUser(userId: string, event: RTEvent, data: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, {
    ...((typeof data === 'object' && data !== null) ? data : { data }),
    _ts: new Date().toISOString(),
  });
}

/**
 * Emit to all connected clients (e.g. system-wide announcements).
 */
export function emitToAll(event: string, data: unknown): void {
  if (!io) return;
  io.emit(event, data);
}

/**
 * Get count of connected sockets for a user.
 */
export function getUserConnectionCount(userId: string): number {
  return userSockets.get(userId)?.size || 0;
}

/**
 * Get total connected clients.
 */
export function getTotalConnections(): number {
  let total = 0;
  for (const sockets of userSockets.values()) total += sockets.size;
  return total;
}
