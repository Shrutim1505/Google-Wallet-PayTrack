import { Router } from 'express';
import multer from 'multer';
import * as receiptController from '../controllers/receiptController.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimitMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { schemas } from '../utils/validation.js';
import { environment } from '../config/environment.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: environment.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = environment.ALLOWED_FILE_TYPES.includes(file.mimetype);
    if (!allowed) {
      return cb(new Error(`Invalid file type. Allowed: ${environment.ALLOWED_FILE_TYPES.join(', ')}`));
    }
    cb(null, true);
  },
});

// Apply auth middleware to all receipt routes
router.use(authMiddleware, requireAuth);

// Create receipt (manual entry) with validation
router.post(
  '/',
  validateRequest(schemas.createReceipt, 'body'),
  receiptController.createReceipt
);

// Upload receipt with OCR (with rate limiting)
router.post(
  '/upload',
  uploadLimiter,
  upload.single('file'),
  receiptController.uploadReceipt
);

// Get receipts (paginated)
router.get('/', receiptController.getReceipts);

// Get single receipt
router.get('/:id', receiptController.getReceipt);

// Update receipt with validation
router.put(
  '/:id',
  validateRequest(schemas.updateReceipt, 'body'),
  receiptController.updateReceipt
);

// Delete receipt
router.delete('/:id', receiptController.deleteReceipt);

export default router;