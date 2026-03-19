import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';

import app from './app.js';
import { initializeDatabase } from './config/database.js';
import { environment } from './config/environment.js';

async function start() {
  try {
    // Ensure uploads directory exists for multer + static serving.
    fs.mkdirSync(path.resolve(process.cwd(), 'uploads'), { recursive: true });

    console.log('🚀 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database ready');

    app.listen(environment.PORT, () => {
      console.log(`🎉 Server running on http://localhost:${environment.PORT}`);
      console.log(`📱 Frontend: ${environment.FRONTEND_URL}`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

start();