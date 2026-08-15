import axios from 'axios';
import { Types } from 'mongoose';
import { WhatsAppIntegration, IWhatsAppIntegration } from '../../models/WhatsAppIntegration.js';
import { Conversation, IConversation } from '../../models/Conversation.js';
import { Message, IMessage } from '../../models/Message.js';
import { encrypt, decrypt } from '../../utils/crypto.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { getIO } from '../../sockets/index.js';

export interface ISendWhatsAppMessageParams {
  userId: string;
  recipientPhone: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document';
  content?: string;
  mediaUrl?: string;
  caption?: string;
  fileName?: string;
  clientMessageId: string;
}

export class WhatsAppService {
  /**
   * Connects / registers a WhatsApp Business account integration for a user
   */
  static async connectAccount(
    userId: string,
    params: {
      businessAccountId?: string;
      phoneNumberId?: string;
      displayPhoneNumber: string;
      accessToken?: string;
      webhookSecret?: string;
    }
  ): Promise<IWhatsAppIntegration> {
    const rawToken = params.accessToken || `wa_gmail_managed_${userId}_${Date.now()}`;
    const encryptedToken = encrypt(rawToken);
    const cleanPhone = params.displayPhoneNumber.replace(/[^0-9]/g, '');

    const bAccountId = params.businessAccountId || `waba_${userId}`;
    const pNumberId = params.phoneNumberId || `phone_${cleanPhone || userId}`;

    let integration = await WhatsAppIntegration.findOne({ userId: new Types.ObjectId(userId) });
    if (integration) {
      integration.businessAccountId = bAccountId;
      integration.phoneNumberId = pNumberId;
      integration.displayPhoneNumber = params.displayPhoneNumber;
      integration.accessTokenEncrypted = encryptedToken;
      integration.webhookSecret = params.webhookSecret || '';
      integration.status = 'active';
      integration.errorMessage = undefined;
      await integration.save();
    } else {
      integration = await WhatsAppIntegration.create({
        userId: new Types.ObjectId(userId),
        businessAccountId: bAccountId,
        phoneNumberId: pNumberId,
        displayPhoneNumber: params.displayPhoneNumber,
        accessTokenEncrypted: encryptedToken,
        webhookSecret: params.webhookSecret || '',
        status: 'active',
      });
    }

    return integration;
  }

  /**
   * Disconnects WhatsApp integration
   */
  static async disconnectAccount(userId: string): Promise<void> {
    const integration = await WhatsAppIntegration.findOne({ userId: new Types.ObjectId(userId) });
    if (!integration) {
      throw new NotFoundError('No active WhatsApp integration found');
    }
    integration.status = 'disconnected';
    await integration.save();
  }

  /**
   * Gets integration status for a user
   */
  static async getIntegration(userId: string): Promise<IWhatsAppIntegration | null> {
    return WhatsAppIntegration.findOne({ userId: new Types.ObjectId(userId) });
  }

  /**
   * Sends an outbound message through Meta's Official WhatsApp Cloud API
   */
  static async sendOutboundMessage(params: ISendWhatsAppMessageParams): Promise<IMessage> {
    const integration = await WhatsAppIntegration.findOne({
      userId: new Types.ObjectId(params.userId),
      status: 'active',
    });

    if (!integration) {
      throw new BadRequestError('No active WhatsApp Business integration found. Please connect your account in Settings.');
    }

    const accessToken = decrypt(integration.accessTokenEncrypted);
    const cleanRecipientPhone = params.recipientPhone.replace(/[^0-9]/g, '');

    // 1. Find or create unified conversation for this WhatsApp customer
    let conversation = await Conversation.findOne({
      source: 'whatsapp_business',
      'whatsappMetadata.customerPhoneNumber': cleanRecipientPhone,
      'whatsappMetadata.businessPhoneNumberId': integration.phoneNumberId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'private',
        source: 'whatsapp_business',
        participants: [new Types.ObjectId(params.userId)],
        whatsappMetadata: {
          customerPhoneNumber: cleanRecipientPhone,
          businessPhoneNumberId: integration.phoneNumberId,
        },
      });
    }

    // 2. Format Meta Graph API Payload
    const metaPayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanRecipientPhone,
    };

    if (params.messageType === 'text') {
      metaPayload.type = 'text';
      metaPayload.text = { body: params.content || '' };
    } else if (params.messageType === 'image') {
      metaPayload.type = 'image';
      metaPayload.image = { link: params.mediaUrl, caption: params.caption || params.content };
    } else if (params.messageType === 'document') {
      metaPayload.type = 'document';
      metaPayload.document = { link: params.mediaUrl, caption: params.caption || params.content, filename: params.fileName };
    } else if (params.messageType === 'audio') {
      metaPayload.type = 'audio';
      metaPayload.audio = { link: params.mediaUrl };
    } else if (params.messageType === 'video') {
      metaPayload.type = 'video';
      metaPayload.video = { link: params.mediaUrl, caption: params.caption || params.content };
    }

    let metaMessageId = `wa_msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Call Meta API if real token provided (skip if running in offline sandbox mode)
    if (accessToken && !accessToken.startsWith('sandbox_')) {
      try {
        const response = await axios.post(
          `https://graph.facebook.com/v20.0/${integration.phoneNumberId}/messages`,
          metaPayload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        if (response.data && response.data.messages && response.data.messages[0]) {
          metaMessageId = response.data.messages[0].id;
        }
      } catch (error: any) {
        console.error('[Meta WhatsApp API Error]', error?.response?.data || error.message);
        throw new BadRequestError(
          `Failed to send message via Meta WhatsApp API: ${error?.response?.data?.error?.message || error.message}`
        );
      }
    }

    // 3. Persist normalized message in MongoDB
    const message = await Message.create({
      clientMessageId: params.clientMessageId,
      conversationId: conversation._id,
      senderId: new Types.ObjectId(params.userId),
      source: 'whatsapp_business',
      messageType: params.messageType,
      content: params.content || '',
      mediaUrl: params.mediaUrl,
      fileName: params.fileName,
      sentAt: new Date(),
      whatsappMessageId: metaMessageId,
      whatsappStatus: 'sent',
    });

    // Update conversation last message
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Broadcast through Socket.IO
    try {
      const io = getIO();
      io.to(`conversation:${conversation._id.toString()}`).emit('new_message', {
        message,
        conversationId: conversation._id.toString(),
      });
    } catch (e) {
      // Socket not initialized yet or worker context
    }

    return message;
  }

  /**
   * Processes incoming Meta WhatsApp Webhook events
   */
  static async handleWebhookEvent(payload: any): Promise<void> {
    if (!payload || payload.object !== 'whatsapp_business_account') {
      return;
    }

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        const businessPhoneNumberId = value.metadata?.phone_number_id;
        const contacts = value.contacts || [];
        const messages = value.messages || [];
        const statuses = value.statuses || [];

        // Find which user owns this WhatsApp Business integration
        const integration = await WhatsAppIntegration.findOne({
          phoneNumberId: businessPhoneNumberId,
          status: 'active',
        });

        if (!integration) {
          console.warn(`[WhatsApp Webhook] Received event for unlinked phoneNumberId: ${businessPhoneNumberId}`);
          continue;
        }

        // 1. Process Status Updates (sent, delivered, read, failed)
        for (const statusObj of statuses) {
          const waMsgId = statusObj.id;
          const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'

          const updateFields: any = { whatsappStatus: status };
          if (status === 'delivered') updateFields.deliveredAt = new Date();
          if (status === 'read') updateFields.readAt = new Date();

          const updatedMessage = await Message.findOneAndUpdate(
            { whatsappMessageId: waMsgId },
            { $set: updateFields },
            { new: true }
          );

          if (updatedMessage) {
            try {
              const io = getIO();
              io.to(`conversation:${updatedMessage.conversationId.toString()}`).emit(
                status === 'read' ? 'message_read' : 'message_delivered',
                {
                  messageId: updatedMessage._id.toString(),
                  conversationId: updatedMessage.conversationId.toString(),
                  status,
                  timestamp: new Date(),
                }
              );
            } catch (e) {}
          }
        }

        // 2. Process Inbound Messages from WhatsApp Customer
        for (const msgObj of messages) {
          const customerPhone = msgObj.from;
          const waMessageId = msgObj.id;

          // Check if already processed (idempotency)
          const existing = await Message.findOne({ whatsappMessageId: waMessageId });
          if (existing) continue;

          // Extract contact profile name if available
          const contactInfo = contacts.find((c: any) => c.wa_id === customerPhone);
          const customerName = contactInfo?.profile?.name || customerPhone;

          // Find or create unified conversation
          let conversation = await Conversation.findOne({
            source: 'whatsapp_business',
            'whatsappMetadata.customerPhoneNumber': customerPhone,
            'whatsappMetadata.businessPhoneNumberId': businessPhoneNumberId,
          });

          if (!conversation) {
            conversation = await Conversation.create({
              type: 'private',
              source: 'whatsapp_business',
              participants: [integration.userId],
              whatsappMetadata: {
                customerPhoneNumber: customerPhone,
                customerName,
                businessPhoneNumberId,
              },
            });
          } else if (customerName && !conversation.whatsappMetadata?.customerName) {
            conversation.whatsappMetadata!.customerName = customerName;
            await conversation.save();
          }

          // Parse message content according to type
          let messageType: any = 'text';
          let content = '';
          let mediaUrl: string | undefined;

          if (msgObj.type === 'text') {
            messageType = 'text';
            content = msgObj.text?.body || '';
          } else if (msgObj.type === 'image') {
            messageType = 'image';
            content = msgObj.image?.caption || '';
            mediaUrl = msgObj.image?.link || '';
          } else if (msgObj.type === 'video') {
            messageType = 'video';
            content = msgObj.video?.caption || '';
            mediaUrl = msgObj.video?.link || '';
          } else if (msgObj.type === 'audio') {
            messageType = 'audio';
            mediaUrl = msgObj.audio?.link || '';
          } else if (msgObj.type === 'document') {
            messageType = 'document';
            content = msgObj.document?.caption || '';
            mediaUrl = msgObj.document?.link || '';
          } else if (msgObj.type === 'location') {
            messageType = 'location';
            content = `${msgObj.location?.latitude}, ${msgObj.location?.longitude}`;
          }

          // Create normalized message (senderId is undefined for external customer)
          const clientMsgId = `wa_in_${waMessageId}`;
          const message = await Message.create({
            clientMessageId: clientMsgId,
            conversationId: conversation._id,
            source: 'whatsapp_business',
            messageType,
            content,
            mediaUrl,
            sentAt: new Date(parseInt(msgObj.timestamp, 10) * 1000 || Date.now()),
            deliveredAt: new Date(),
            whatsappMessageId: waMessageId,
            whatsappStatus: 'delivered',
          });

          // Increment unread count for the agent user
          const unreadKey = integration.userId.toString();
          const currentCount = conversation.unreadCounts.get(unreadKey) || 0;
          conversation.unreadCounts.set(unreadKey, currentCount + 1);
          conversation.lastMessage = message._id;
          conversation.lastMessageAt = new Date();
          await conversation.save();

          // Broadcast through Socket.IO
          try {
            const io = getIO();
            // Emit to conversation room
            io.to(`conversation:${conversation._id.toString()}`).emit('new_message', {
              message,
              conversationId: conversation._id.toString(),
            });
            // Emit to user personal room for notification badge
            io.to(`user:${integration.userId.toString()}`).emit('conversation_updated', {
              conversationId: conversation._id.toString(),
              lastMessage: message,
              unreadCount: currentCount + 1,
            });
          } catch (e) {}
        }
      }
    }
  }

  /**
   * Sandbox simulation tool: creates a simulated inbound customer message for testing
   */
  static async simulateInboundMessage(
    userId: string,
    customerPhone: string,
    customerName: string,
    content: string,
    messageType = 'text'
  ): Promise<IMessage> {
    const integration = await WhatsAppIntegration.findOne({
      userId: new Types.ObjectId(userId),
    });

    const phoneId = integration ? integration.phoneNumberId : '100000000000001';

    const fakeWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_1001',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: integration?.displayPhoneNumber || '+1 555-0199',
                  phone_number_id: phoneId,
                },
                contacts: [
                  {
                    profile: { name: customerName || 'Customer ' + customerPhone.slice(-4) },
                    wa_id: customerPhone,
                  },
                ],
                messages: [
                  {
                    from: customerPhone,
                    id: `wamid_sim_${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: messageType,
                    text: messageType === 'text' ? { body: content } : undefined,
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    // If integration didn't exist, create a sandbox integration automatically for seamless testing
    if (!integration) {
      await this.connectAccount(userId, {
        businessAccountId: 'WABA_SANDBOX_DEMO',
        phoneNumberId: phoneId,
        displayPhoneNumber: '+1 555-0199',
        accessToken: 'sandbox_token_demo',
      });
    }

    await this.handleWebhookEvent(fakeWebhookPayload);

    // Return the created message
    const conversation = await Conversation.findOne({
      source: 'whatsapp_business',
      'whatsappMetadata.customerPhoneNumber': customerPhone,
    }).populate('lastMessage');

    return conversation?.lastMessage as any;
  }
}
