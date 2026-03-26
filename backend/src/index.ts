import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';

import app from './app.js';
import { initializeDatabase } from './config/database.js';
import { environment } from './config/environment.js';

async function start() {
  try {
    fs.mkdirSync(path.resolve(process.cwd(), 'uploads'), { recursive: true });

    console.log('🚀 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database ready');

    const server = app.listen(environment.PORT, () => {
      console.log(`🎉 Server running on http://localhost:${environment.PORT}`);
      console.log(`📱 Frontend: ${environment.FRONTEND_URL}`);
      console.log(`🔒 Environment: ${environment.NODE_ENV}`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      console.log(`\n⏳ ${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
      // Force exit after 10s
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
