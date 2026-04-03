import { Router } from 'express';
import multer from 'multer';
import * as receiptController from '../controllers/receiptController.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimitMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { schemas } from '../utils/validation.js';
import { environment } from '../config/environment.js';

const router = Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: environment.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!environment.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed: ${environment.ALLOWED_FILE_TYPES.join(', ')}`));
    }
    cb(null, true);
  },
});

router.use(authMiddleware);

router.post('/', validateRequest(schemas.createReceipt, 'body'), receiptController.createReceipt);
router.post('/upload', uploadLimiter, upload.single('file'), receiptController.uploadReceipt);
router.get('/export', receiptController.exportReceipts);
router.get('/', receiptController.getReceipts);
router.get('/:id', receiptController.getReceipt);
router.put('/:id', validateRequest(schemas.updateReceipt, 'body'), receiptController.updateReceipt);
router.delete('/:id', receiptController.deleteReceipt);

export default router;
