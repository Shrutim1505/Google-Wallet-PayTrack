import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as fc from '../controllers/featuresController.js';

const router = Router();

// Public: view shared split (no auth needed)
router.get('/splits/shared/:token', fc.getSplitByToken);
router.post('/splits/shared/:token/pay', fc.markSplitPaid);

// All other routes require auth
router.use(authMiddleware);

// Recurring expenses
router.get('/recurring', fc.getRecurring);

// Split expenses
router.post('/splits', fc.createSplit);
router.get('/splits', fc.getUserSplits);

// Duplicate detection
router.post('/duplicates/check', fc.checkDuplicate);

// Smart alerts
router.get('/alerts', fc.getAlerts);
router.post('/alerts/read', fc.markAlertsRead);
router.post('/alerts/digest', fc.generateDigest);

// Currency
router.post('/currency/convert', fc.convertCurrency);
router.get('/currency/rates', fc.getRates);
router.get('/currency/supported', fc.getSupportedCurrencies);

// ML
router.post('/ml/predict', fc.mlPredict);
router.post('/ml/train', fc.mlTrain);
router.get('/ml/stats', fc.mlStats);

export default router;
