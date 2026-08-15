import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/search', UserController.searchUsers);
router.get('/blocked', UserController.getBlockedUsers);
router.get('/:id', UserController.getUserById);
router.patch('/me', UserController.updateProfile);
router.patch('/me/privacy', UserController.updatePrivacy);
router.post('/block/:userId', UserController.blockUser);
router.post('/unblock/:userId', UserController.unblockUser);

export default router;
