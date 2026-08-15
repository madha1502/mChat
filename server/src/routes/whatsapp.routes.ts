import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// 1. Public Meta Webhook Verification and Event Receiver
router.get('/webhook', WhatsAppController.verifyWebhook);
router.post('/webhook', WhatsAppController.receiveWebhook);

// 2. Authenticated Endpoints for App Users
router.get('/', authenticate, WhatsAppController.getIntegration);
router.post('/connect', authenticate, WhatsAppController.connect);
router.post('/disconnect', authenticate, WhatsAppController.disconnect);
router.post('/send', authenticate, WhatsAppController.send);
router.post('/simulate', authenticate, WhatsAppController.simulateInbound);

export default router;
