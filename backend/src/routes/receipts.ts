import { Router } from 'express';
import multer from 'multer';
import * as receiptController from '../controllers/receiptController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { uploadLimiter } from '../middleware/rateLimitMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { idempotency } from '../middleware/idempotency.js';
import { schemas } from '../utils/validation.js';
import { environment } from '../config/environment.js';

const router = Router();

const allowedFileTypes = environment.ALLOWED_FILE_TYPES.split(',').map(s => s.trim()).filter(Boolean);

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: environment.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!allowedFileTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed: ${allowedFileTypes.join(', ')}`));
    }
    cb(null, true);
  },
});

router.use(authMiddleware);

router.post('/', requirePermission('receipts:create'), idempotency, validateRequest(schemas.createReceipt, 'body'), receiptController.createReceipt);
router.post('/upload', requirePermission('receipts:create'), uploadLimiter, idempotency, upload.single('file'), receiptController.uploadReceipt);
router.get('/export', requirePermission('receipts:read'), receiptController.exportReceipts);
router.get('/', requirePermission('receipts:read'), receiptController.getReceipts);
router.get('/:id', requirePermission('receipts:read'), receiptController.getReceipt);
router.put('/:id', requirePermission('receipts:update'), validateRequest(schemas.updateReceipt, 'body'), receiptController.updateReceipt);
router.delete('/:id', requirePermission('receipts:delete'), receiptController.deleteReceipt);

export default router;
