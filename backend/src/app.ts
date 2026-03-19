import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { environment } from './config/environment.js';
import authRoutes from './routes/auth.js';
import receiptRoutes from './routes/receipts.js';

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: environment.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 404
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

export default app;