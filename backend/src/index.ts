import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

import { initializeSentry } from './config/sentry.js';
initializeSentry();

import app from './app.js';
import { initializeDatabase, closeDatabase } from './config/database.js';
import { initializeCache, closeCache } from './config/cache.js';
import { initializeWebSocket } from './config/websocket.js';
import { environment } from './config/environment.js';
import { logger } from './utils/logger.js';

const SHUTDOWN_TIMEOUT_MS = 15_000;
const UPLOADS_DIR = 'uploads';

async function start() {
  try {
    fs.mkdirSync(path.resolve(process.cwd(), UPLOADS_DIR), { recursive: true });

    logger.info('Initializing cache...');
    initializeCache();

    logger.info('Initializing database...');
    await initializeDatabase();
    logger.info('Database ready');

    const server = http.createServer(app);
    initializeWebSocket(server);

    server.listen(environment.PORT, () => {
      logger.info({
        msg: 'Server started',
        port: environment.PORT,
        env: environment.NODE_ENV,
        url: `http://localhost:${environment.PORT}`,
        docs: `http://localhost:${environment.PORT}/api/docs`,
        metrics: `http://localhost:${environment.PORT}/metrics`,
      });
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);

      server.close(async () => {
        try {
          await closeCache();
          await closeDatabase();
          logger.info('Clean shutdown complete');
          process.exit(0);
        } catch (err) {
          logger.error({ msg: 'Error during shutdown', err });
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', err => {
      logger.fatal({ msg: 'Uncaught exception', err: err.message, stack: err.stack });
      process.exit(1);
    });
    process.on('unhandledRejection', reason => {
      logger.fatal({ msg: 'Unhandled promise rejection', reason });
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ msg: 'Startup failed', error });
    process.exit(1);
  }
}

start();
