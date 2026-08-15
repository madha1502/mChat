import { Router } from 'express';
import { MessageController } from '../controllers/message.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/starred', MessageController.getStarredMessages);
router.get('/search', MessageController.searchMessages);
router.get('/:conversationId', MessageController.getMessages);
router.post('/', MessageController.sendMessage);
router.post('/:id/star', MessageController.toggleStar);

export default router;
