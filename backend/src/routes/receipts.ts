import { Router } from 'express';
import * as receiptController from '../controllers/receiptController.js';
import { authMiddleware } from '../middleware/auth.js';
import { environment } from '../config/environment.js';
import multer from 'multer';

const router = Router();
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: environment.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = environment.ALLOWED_FILE_TYPES.includes(file.mimetype);
    if (!allowed) return cb(new Error('Invalid file type'));
    cb(null, true);
  },
});

router.use(authMiddleware);

router.post('/', receiptController.createReceipt);
router.post('/upload', upload.single('file'), receiptController.uploadReceipt);
router.get('/', receiptController.getReceipts);
router.get('/:id', receiptController.getReceipt);
router.put('/:id', receiptController.updateReceipt);
router.delete('/:id', receiptController.deleteReceipt);

export default router;