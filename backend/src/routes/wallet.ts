import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as walletController from '../controllers/walletController.js';

const router = Router();

// Webhook — no auth required
router.post('/webhook', walletController.handleWebhook);

// Auth-protected routes
router.post('/sync/:receiptId', authMiddleware, walletController.syncReceipt);
router.get('/status', authMiddleware, walletController.getStatus);

export default router;
