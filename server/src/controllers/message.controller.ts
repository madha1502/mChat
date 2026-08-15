import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { sendMessageSchema } from '../validators/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { getIO } from '../sockets/index.js';

export class MessageController {
  /**
   * Get cursor-paginated messages for a conversation
   * Query params: ?before=<iso_date_or_message_id>&limit=50
   */
  static async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params as { conversationId: string };
      const currentUserId = req.user!._id;
      const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
      const before = req.query.before as string;

      if (!Types.ObjectId.isValid(conversationId)) {
        throw new BadRequestError('Invalid conversation ID');
      }

      // Check access permission
      const conversation = await Conversation.findOne({
        _id: new Types.ObjectId(conversationId),
        participants: currentUserId,
      });

      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      const query: any = {
        conversationId: new Types.ObjectId(conversationId),
        deletedFor: { $ne: currentUserId },
      };

      if (before) {
        if (Types.ObjectId.isValid(before)) {
          const beforeMsg = await Message.findById(before);
          if (beforeMsg) {
            query.createdAt = { $lt: beforeMsg.createdAt };
          }
        } else {
          query.createdAt = { $lt: new Date(before) };
        }
      }

      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('senderId', 'name username profilePicture')
        .populate({
          path: 'replyTo',
          populate: { path: 'senderId', select: 'name username' },
        })
        .populate('reactions.user', 'name username');

      // Reverse so they are in chronological order for the client
      messages.reverse();

      res.status(200).json({
        success: true,
        data: messages,
        hasMore: messages.length === limit,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a message via REST
   */
  static async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;
      const validated = sendMessageSchema.parse(req.body);

      const conversation = await Conversation.findById(validated.conversationId);
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      // Idempotent check
      let message = await Message.findOne({
        conversationId: new Types.ObjectId(validated.conversationId),
        clientMessageId: validated.clientMessageId,
      });

      if (!message) {
        let expiresAt: Date | undefined;
        if (conversation.disappearingTimer && conversation.disappearingTimer > 0) {
          expiresAt = new Date(Date.now() + conversation.disappearingTimer * 1000);
        }

        message = await Message.create({
          ...validated,
          conversationId: conversation._id,
          senderId: currentUserId,
          replyTo: validated.replyTo ? new Types.ObjectId(validated.replyTo) : undefined,
          sentAt: new Date(),
          expiresAt,
        });

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Broadcast via Socket.IO
        try {
          const io = getIO();
          io.to(`conversation:${validated.conversationId}`).emit('new_message', {
            message,
            conversationId: validated.conversationId,
          });
        } catch (e) {}
      }

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Star / Unstar message for current user
   */
  static async toggleStar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const currentUserId = req.user!._id;

      const message = await Message.findById(id);
      if (!message) throw new NotFoundError('Message not found');

      const isStarred = message.starredBy.some((uid) => uid.toString() === currentUserId.toString());
      if (isStarred) {
        message.starredBy = message.starredBy.filter((uid) => uid.toString() !== currentUserId.toString());
      } else {
        message.starredBy.push(currentUserId);
      }
      await message.save();

      res.status(200).json({
        success: true,
        data: { isStarred: !isStarred },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all starred messages for current user
   */
  static async getStarredMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;

      const messages = await Message.find({
        starredBy: currentUserId,
        deletedFor: { $ne: currentUserId },
        isDeleted: false,
      })
        .populate('senderId', 'name username profilePicture')
        .populate('conversationId')
        .sort({ createdAt: -1 })
        .limit(100);

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search messages across all chats or inside a specific conversation
   */
  static async searchMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;
      const query = (req.query.q as string || '').trim();
      const conversationId = req.query.conversationId as string;

      if (!query) {
        res.status(200).json({ success: true, data: [] });
        return;
      }

      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      const matchQuery: any = {
        content: searchRegex,
        isDeleted: false,
        deletedFor: { $ne: currentUserId },
      };

      if (conversationId && Types.ObjectId.isValid(conversationId)) {
        matchQuery.conversationId = new Types.ObjectId(conversationId);
      } else {
        // Only search inside conversations where user is a participant
        const userConversations = await Conversation.find({ participants: currentUserId }).select('_id');
        matchQuery.conversationId = { $in: userConversations.map((c) => c._id) };
      }

      const messages = await Message.find(matchQuery)
        .populate('senderId', 'name username profilePicture')
        .populate('conversationId', 'group type source participants')
        .sort({ createdAt: -1 })
        .limit(30);

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }
}
