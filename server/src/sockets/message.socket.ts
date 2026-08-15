import { Server } from 'socket.io';
import { Types } from 'mongoose';
import { AuthenticatedSocket } from './index.js';
import { Message, IMessage } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';

export const registerMessageHandlers = (io: Server, socket: AuthenticatedSocket): void => {
  const currentUser = socket.user;
  const currentUserId = currentUser._id.toString();

  // Send Message Event with Optimistic Acknowledgement
  socket.on('send_message', async (data: any, ackCallback?: (response: { success: boolean; message?: any; error?: string }) => void) => {
    try {
      const {
        clientMessageId,
        conversationId,
        messageType = 'text',
        content = '',
        mediaUrl,
        mediaType,
        fileName,
        fileSize,
        location,
        contact,
        replyTo,
        forwardedFrom,
      } = data;

      if (!clientMessageId || !conversationId) {
        if (ackCallback) ackCallback({ success: false, error: 'Missing clientMessageId or conversationId' });
        return;
      }

      // Check conversation existence and participant authorization
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        if (ackCallback) ackCallback({ success: false, error: 'Conversation not found' });
        return;
      }

      const isParticipant = conversation.participants.some((p) => p.toString() === currentUserId);
      if (!isParticipant && conversation.source === 'internal') {
        if (ackCallback) ackCallback({ success: false, error: 'Not authorized for this conversation' });
        return;
      }

      // Idempotency: Check if message with clientMessageId already exists in this conversation
      let message = await Message.findOne({
        conversationId: new Types.ObjectId(conversationId),
        clientMessageId,
      }).populate('senderId', 'name username profilePicture')
        .populate('replyTo');

      if (!message) {
        // Calculate disappearing message expiration if enabled
        let expiresAt: Date | undefined;
        if (conversation.disappearingTimer && conversation.disappearingTimer > 0) {
          expiresAt = new Date(Date.now() + conversation.disappearingTimer * 1000);
        }

        // Determine receiverId for private 1-to-1 chats
        let receiverId: Types.ObjectId | undefined;
        if (conversation.type === 'private') {
          const otherParticipant = conversation.participants.find((p) => p.toString() !== currentUserId);
          if (otherParticipant) receiverId = otherParticipant;
        }

        message = await Message.create({
          clientMessageId,
          conversationId: conversation._id,
          senderId: currentUser._id,
          receiverId,
          messageType,
          content,
          mediaUrl,
          mediaType,
          fileName,
          fileSize,
          location,
          contact,
          replyTo: replyTo ? new Types.ObjectId(replyTo) : undefined,
          forwardedFrom: forwardedFrom ? new Types.ObjectId(forwardedFrom) : undefined,
          sentAt: new Date(),
          expiresAt,
        });

        message = await message.populate('senderId', 'name username profilePicture');
        if (replyTo) {
          message = await message.populate('replyTo');
        }

        // Update conversation's last message & increment unread count for other participants
        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();

        conversation.participants.forEach((p) => {
          const pid = p.toString();
          if (pid !== currentUserId) {
            const cur = conversation.unreadCounts.get(pid) || 0;
            conversation.unreadCounts.set(pid, cur + 1);
          }
        });
        await conversation.save();
      }

      // Send ACK back to sender immediately
      if (ackCallback) {
        ackCallback({ success: true, message });
      }

      // Broadcast to conversation room AND each participant's personal room
      io.to(`conversation:${conversationId}`).emit('new_message', {
        message,
        conversationId,
      });

      // Broadcast to every participant's personal user room so it delivers even if conversation is not active
      conversation.participants.forEach((participantId) => {
        const pid = participantId.toString();
        io.to(`user:${pid}`).emit('new_message', {
          message,
          conversationId,
        });
        io.to(`user:${pid}`).emit('conversation_updated', {
          conversationId,
          lastMessage: message,
          unreadCount: conversation.unreadCounts.get(pid) || 0,
        });
      });
    } catch (error: any) {
      console.error('[Socket send_message error]', error);
      if (ackCallback) ackCallback({ success: false, error: error.message });
    }
  });

  // Mark Message as Delivered
  socket.on('message_delivered', async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && !message.deliveredAt) {
        message.deliveredAt = new Date();
        await message.save();

        io.to(`conversation:${conversationId}`).emit('message_delivered', {
          messageId,
          conversationId,
          deliveredAt: message.deliveredAt,
        });
      }
    } catch (e) {
      console.error('[message_delivered error]', e);
    }
  });

  // Mark Message as Read
  socket.on('message_read', async ({ conversationId, messageIds }: { conversationId: string; messageIds?: string[] }) => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      const now = new Date();

      // Reset unread count for reader
      conversation.unreadCounts.set(currentUserId, 0);
      await conversation.save();

      // Update messages read status
      const query: any = {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: currentUser._id },
        readAt: { $exists: false },
      };
      if (messageIds && messageIds.length > 0) {
        query._id = { $in: messageIds.map((id) => new Types.ObjectId(id)) };
      }

      await Message.updateMany(query, {
        $set: { readAt: now },
        $addToSet: { readBy: { user: currentUser._id, readAt: now } },
      });

      io.to(`conversation:${conversationId}`).emit('message_read', {
        conversationId,
        readerId: currentUserId,
        readAt: now,
      });

      // Update reader's personal badge count
      io.to(`user:${currentUserId}`).emit('conversation_updated', {
        conversationId,
        unreadCount: 0,
      });
    } catch (e) {
      console.error('[message_read error]', e);
    }
  });

  // Edit Message
  socket.on('edit_message', async ({ messageId, content }: { messageId: string; content: string }, ack?: (res: any) => void) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        if (ack) ack({ success: false, error: 'Message not found' });
        return;
      }

      if (message.senderId?.toString() !== currentUserId) {
        if (ack) ack({ success: false, error: 'Cannot edit another user message' });
        return;
      }

      if (message.isDeleted) {
        if (ack) ack({ success: false, error: 'Cannot edit deleted message' });
        return;
      }

      message.content = content;
      message.isEdited = true;
      await message.save();

      io.to(`conversation:${message.conversationId.toString()}`).emit('message_edited', {
        messageId: message._id.toString(),
        conversationId: message.conversationId.toString(),
        content,
        isEdited: true,
        updatedAt: message.updatedAt,
      });

      if (ack) ack({ success: true, message });
    } catch (e: any) {
      if (ack) ack({ success: false, error: e.message });
    }
  });

  // Delete Message (for everyone or for me)
  socket.on('delete_message', async ({ messageId, forEveryone }: { messageId: string; forEveryone: boolean }, ack?: (res: any) => void) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        if (ack) ack({ success: false, error: 'Message not found' });
        return;
      }

      if (forEveryone) {
        // Must be sender to delete for everyone
        if (message.senderId?.toString() !== currentUserId) {
          if (ack) ack({ success: false, error: 'Only sender can delete for everyone' });
          return;
        }

        message.isDeleted = true;
        message.content = 'This message was deleted';
        message.mediaUrl = undefined;
        await message.save();

        io.to(`conversation:${message.conversationId.toString()}`).emit('message_deleted', {
          messageId: message._id.toString(),
          conversationId: message.conversationId.toString(),
          forEveryone: true,
        });
      } else {
        // Delete for me
        if (!message.deletedFor.includes(currentUser._id)) {
          message.deletedFor.push(currentUser._id);
          await message.save();
        }

        socket.emit('message_deleted', {
          messageId: message._id.toString(),
          conversationId: message.conversationId.toString(),
          forEveryone: false,
        });
      }

      if (ack) ack({ success: true });
    } catch (e: any) {
      if (ack) ack({ success: false, error: e.message });
    }
  });

  // Add / Remove Emoji Reaction
  socket.on('toggle_reaction', async ({ messageId, emoji }: { messageId: string; emoji: string }, ack?: (res: any) => void) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        if (ack) ack({ success: false, error: 'Message not found' });
        return;
      }

      const existingIndex = message.reactions.findIndex(
        (r) => r.user.toString() === currentUserId && r.emoji === emoji
      );

      if (existingIndex > -1) {
        // Remove reaction
        message.reactions.splice(existingIndex, 1);
      } else {
        // Remove any previous emoji by this user if single-reaction mode or add
        const userPrevReaction = message.reactions.findIndex((r) => r.user.toString() === currentUserId);
        if (userPrevReaction > -1) {
          message.reactions[userPrevReaction].emoji = emoji;
          message.reactions[userPrevReaction].createdAt = new Date();
        } else {
          message.reactions.push({
            user: currentUser._id,
            emoji,
            createdAt: new Date(),
          });
        }
      }

      await message.save();

      io.to(`conversation:${message.conversationId.toString()}`).emit('reaction_updated', {
        messageId: message._id.toString(),
        conversationId: message.conversationId.toString(),
        reactions: message.reactions,
      });

      if (ack) ack({ success: true, reactions: message.reactions });
    } catch (e: any) {
      if (ack) ack({ success: false, error: e.message });
    }
  });
};
