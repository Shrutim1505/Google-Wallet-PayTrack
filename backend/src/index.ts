import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

import app from './app.js';
import { initializeDatabase } from './config/database.js';
import { initializeWebSocket, getTotalConnections } from './config/websocket.js';
import { environment } from './config/environment.js';

async function start() {
  try {
    fs.mkdirSync(path.resolve(process.cwd(), 'uploads'), { recursive: true });

    console.log('🚀 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database ready');

    // Create HTTP server and attach Socket.IO
    const httpServer = http.createServer(app);
    initializeWebSocket(httpServer);
    console.log('⚡ WebSocket server attached');

    httpServer.listen(environment.PORT, () => {
      console.log(`🎉 Server running on http://localhost:${environment.PORT}`);
      console.log(`📱 Frontend: ${environment.FRONTEND_URL}`);
      console.log(`🔒 Environment: ${environment.NODE_ENV}`);
      console.log(`⚡ Real-time: WebSocket enabled`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      console.log(`\n⏳ ${signal} received. Shutting down gracefully...`);
      console.log(`📊 Active WS connections: ${getTotalConnections()}`);
      httpServer.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
      setTimeout(() => { console.error('❌ Forced shutdown'); process.exit(1); }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

start();
