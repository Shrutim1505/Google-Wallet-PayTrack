import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

// Initialize Sentry before any other imports (for error capture during startup)
import { initializeSentry } from './config/sentry.js';
initializeSentry();

import app from './app.js';
import { initializeDatabase, closeDatabase } from './config/database.js';
import { initializeCache, closeCache } from './config/cache.js';
import { initializeWebSocket } from './config/websocket.js';
import { environment } from './config/environment.js';
import { logger } from './utils/logger.js';

async function start() {
  try {
    fs.mkdirSync(path.resolve(process.cwd(), 'uploads'), { recursive: true });

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

    // ── Graceful shutdown ──
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);

      // Stop accepting new connections
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

      // Force exit after 15s if connections hang
      setTimeout(() => {
        logger.error('Forced shutdown after 15s timeout');
        process.exit(1);
      }, 15_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Catch unhandled errors to prevent silent failures
    process.on('uncaughtException', (err) => {
      logger.fatal({ msg: 'Uncaught exception', err: err.message, stack: err.stack });
      process.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
      logger.fatal({ msg: 'Unhandled promise rejection', reason });
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ msg: 'Startup failed', error });
    process.exit(1);
  }
}

start();
