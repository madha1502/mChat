import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller.js';
import { uploadMiddleware } from '../services/storage/storage.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', uploadMiddleware.single('file'), UploadController.uploadFile);

export default router;
