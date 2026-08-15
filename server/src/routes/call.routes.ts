import { Router } from 'express';
import { CallController } from '../controllers/call.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/history', CallController.getCallHistory);
router.get('/ice-servers', CallController.getIceServers);

export default router;
