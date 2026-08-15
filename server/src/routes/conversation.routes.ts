import { Router } from 'express';
import { ConversationController } from '../controllers/conversation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', ConversationController.getConversations);
router.post('/', ConversationController.createConversation);
router.get('/join/:token', ConversationController.joinByInviteToken);
router.get('/:id', ConversationController.getConversationById);
router.patch('/:id/group', ConversationController.updateGroup);
router.post('/:id/members', ConversationController.addMembers);
router.delete('/:id/members/:userId', ConversationController.removeMember);
router.post('/:id/leave', ConversationController.leaveGroup);
router.post('/:id/pin', ConversationController.togglePin);
router.post('/:id/archive', ConversationController.toggleArchive);
router.post('/:id/disappearing', ConversationController.setDisappearingTimer);

export default router;
