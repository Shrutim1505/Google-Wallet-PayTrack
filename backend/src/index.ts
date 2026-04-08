import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

import app from './app.js';
import { initializeDatabase, closeDatabase } from './config/database.js';
import { initializeWebSocket } from './config/websocket.js';
import { environment } from './config/environment.js';
import { logger } from './utils/logger.js';

async function start() {
  try {
    fs.mkdirSync(path.resolve(process.cwd(), 'uploads'), { recursive: true });

    logger.info('Initializing database...');
    await initializeDatabase();
    logger.info('Database ready');

    const server = http.createServer(app);
    initializeWebSocket(server);

    server.listen(environment.PORT, () => {
      logger.info(`Server running on http://localhost:${environment.PORT}`);
      logger.info(`Frontend: ${environment.FRONTEND_URL}`);
    });

    // ── Graceful shutdown ──
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);

      server.close(async () => {
        await closeDatabase();
        logger.info('Server closed');
        process.exit(0);
      });

      // Force exit after 10s if connections hang
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ msg: 'Startup failed', error });
    process.exit(1);
  }
}

start();
