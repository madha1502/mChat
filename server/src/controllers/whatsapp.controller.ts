import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { WhatsAppService } from '../services/whatsapp/whatsapp.service.js';
import { connectWhatsAppSchema } from '../validators/index.js';
import { config } from '../config/env.js';
import { BadRequestError } from '../utils/errors.js';

export class WhatsAppController {
  /**
   * Get current user WhatsApp Business integration info
   */
  static async getIntegration(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id.toString();
      const integration = await WhatsAppService.getIntegration(currentUserId);

      res.status(200).json({
        success: true,
        data: integration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Connect / Save official Meta WhatsApp Business account credentials
   */
  static async connect(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id.toString();
      const validated = connectWhatsAppSchema.parse(req.body);

      const integration = await WhatsAppService.connectAccount(currentUserId, validated);

      res.status(200).json({
        success: true,
        message: 'WhatsApp Business account linked successfully',
        data: integration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disconnect WhatsApp Business integration
   */
  static async disconnect(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id.toString();
      await WhatsAppService.disconnectAccount(currentUserId);

      res.status(200).json({
        success: true,
        message: 'WhatsApp Business account disconnected',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send outbound WhatsApp message via Meta Cloud API
   */
  static async send(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id.toString();
      const { recipientPhone, messageType, content, mediaUrl, caption, fileName, clientMessageId } = req.body;

      if (!recipientPhone || !clientMessageId) {
        throw new BadRequestError('recipientPhone and clientMessageId are required');
      }

      const message = await WhatsAppService.sendOutboundMessage({
        userId: currentUserId,
        recipientPhone,
        messageType: messageType || 'text',
        content,
        mediaUrl,
        caption,
        fileName,
        clientMessageId,
      });

      res.status(201).json({
        success: true,
        message: 'WhatsApp message sent successfully',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Meta WhatsApp Webhook verification (GET)
   */
  static async verifyWebhook(req: Request, res: Response): Promise<void> {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
        console.log('[Meta Webhook Verified] Successfully subscribed to WhatsApp webhook');
        res.status(200).send(challenge);
      } else {
        console.warn('[Meta Webhook Rejected] Verification token mismatch');
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  }

  /**
   * Meta WhatsApp Webhook event receiver (POST)
   */
  static async receiveWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Respond to Meta with 200 OK immediately as required by Meta's webhook guidelines
      res.status(200).send('EVENT_RECEIVED');

      // Process asynchronous event in background
      await WhatsAppService.handleWebhookEvent(req.body);
    } catch (error) {
      console.error('[WhatsApp Webhook Processing Error]', error);
      // Even if background processing encountered an error, Meta has already received 200 OK
    }
  }

  /**
   * Sandbox simulation tool to test WhatsApp customer incoming messages in real-time
   */
  static async simulateInbound(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id.toString();
      const { customerPhone = '+1 555-0199', customerName = 'Alex Customer', content = 'Hello from WhatsApp!', messageType = 'text' } = req.body;

      const message = await WhatsAppService.simulateInboundMessage(
        currentUserId,
        customerPhone,
        customerName,
        content,
        messageType
      );

      res.status(200).json({
        success: true,
        message: 'Simulated WhatsApp inbound message processed and emitted via WebSockets',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }
}
