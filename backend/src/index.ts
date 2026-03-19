import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { initializeDatabase } from './config/database.js';
import { environment } from './config/environment.js';

async function start() {
  try {
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