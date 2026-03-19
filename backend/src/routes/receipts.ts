import { Router } from 'express';
import * as receiptController from '../controllers/receiptController.js';
import { authMiddleware } from '../middleware/auth.js';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.use(authMiddleware);

router.post('/upload', upload.single('file'), receiptController.uploadReceipt);
router.get('/', receiptController.getReceipts);
router.get('/:id', receiptController.getReceipt);
router.put('/:id', receiptController.updateReceipt);
router.delete('/:id', receiptController.deleteReceipt);

export default router;