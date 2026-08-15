import { Router } from 'express';
import { StatusController } from '../controllers/status.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/feed', StatusController.getStatusesFeed);
router.post('/', StatusController.createStatus);
router.post('/:id/view', StatusController.viewStatus);
router.delete('/:id', StatusController.deleteStatus);

export default router;
