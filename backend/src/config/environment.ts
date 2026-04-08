import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

export const environment = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-key-min-32-chars',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  SQLITE_FILENAME: process.env.SQLITE_FILENAME || 'paytrack.sqlite',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  ALLOWED_FILE_TYPES: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Google Wallet (optional)
  GOOGLE_WALLET_ISSUER_ID: process.env.GOOGLE_WALLET_ISSUER_ID || '',

  // Google Cloud Vision OCR (optional)
  GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  GOOGLE_CLOUD_KEY_FILE: process.env.GOOGLE_CLOUD_KEY_FILE || '',

  // Currency exchange API (optional)
  EXCHANGE_RATE_API_URL: process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest',
};
