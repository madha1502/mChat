import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { createConversationSchema, updateGroupSchema } from '../validators/index.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { generateRandomToken } from '../utils/crypto.js';
import { getIO } from '../sockets/index.js';

export class ConversationController {
  /**
   * Get all conversations for current user (Unified Inbox)
   */
  static async getConversations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;

      const conversations = await Conversation.find({
        participants: currentUserId,
      })
        .populate('participants', 'name username profilePicture isOnline lastSeen')
        .populate({
          path: 'lastMessage',
          populate: { path: 'senderId', select: 'name username' },
        })
        .populate('group.admins', 'name username profilePicture')
        .sort({ lastMessageAt: -1 });

      // Transform conversations for client: include isPinned, isArchived, isMuted, unreadCount
      const formatted = conversations.map((conv) => {
        const doc = conv.toJSON();
        const pid = currentUserId.toString();
        const unreadCount = conv.unreadCounts?.get(pid) || 0;
        const isPinned = conv.pinnedBy.some((id) => id.toString() === pid);
        const isArchived = conv.archivedBy.some((id) => id.toString() === pid);
        const isMuted = conv.mutedBy.some((id) => id.toString() === pid);

        return {
          ...doc,
          unreadCount,
          isPinned,
          isArchived,
          isMuted,
        };
      });

      // Sort: pinned first, then by lastMessageAt descending
      formatted.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime();
      });

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new private or group conversation
   */
  static async createConversation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;
      const validated = createConversationSchema.parse(req.body);

      if (validated.type === 'private') {
        if (!validated.recipientId) {
          throw new BadRequestError('recipientId is required for private conversations');
        }

        const recipientId = new Types.ObjectId(validated.recipientId);

        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
          throw new NotFoundError('Recipient user not found');
        }

        // Prevent duplicate private conversations
        let existing = await Conversation.findOne({
          type: 'private',
          source: 'internal',
          participants: { $all: [currentUserId, recipientId], $size: 2 },
        })
          .populate('participants', 'name username profilePicture isOnline lastSeen')
          .populate('lastMessage');

        if (existing) {
          res.status(200).json({
            success: true,
            message: 'Conversation already exists',
            data: existing,
          });
          return;
        }

        // Create new private conversation
        const conversation = await Conversation.create({
          type: 'private',
          source: 'internal',
          participants: [currentUserId, recipientId],
        });

        const populated = await conversation.populate('participants', 'name username profilePicture isOnline lastSeen');

        // Notify recipient via Socket.IO
        try {
          const io = getIO();
          io.to(`user:${recipientId.toString()}`).emit('conversation_created', { conversation: populated });
        } catch (e) {}

        res.status(201).json({
          success: true,
          message: 'Private conversation created',
          data: populated,
        });
      } else {
        // Group Conversation
        if (!validated.groupName) {
          throw new BadRequestError('Group name is required');
        }

        const memberIds = (validated.participants || []).map((id) => new Types.ObjectId(id));
        const allParticipants = Array.from(new Set([currentUserId.toString(), ...memberIds.map((id) => id.toString())]))
          .map((id) => new Types.ObjectId(id));

        const inviteToken = generateRandomToken(16);

        const conversation = await Conversation.create({
          type: 'group',
          source: 'internal',
          participants: allParticipants,
          group: {
            name: validated.groupName,
            description: validated.groupDescription || '',
            image: validated.groupImage || '',
            admins: [currentUserId],
            createdBy: currentUserId,
            inviteToken,
          },
        });

        const populated = await conversation.populate([
          { path: 'participants', select: 'name username profilePicture isOnline lastSeen' },
          { path: 'group.admins', select: 'name username profilePicture' },
        ]);

        // Notify added members via Socket.IO
        try {
          const io = getIO();
          allParticipants.forEach((pid) => {
            io.to(`user:${pid.toString()}`).emit('conversation_created', { conversation: populated });
            io.to(`user:${pid.toString()}`).emit('group_added', { conversation: populated });
          });
        } catch (e) {}

        res.status(201).json({
          success: true,
          message: 'Group created successfully',
          data: populated,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single conversation by ID
   */
  static async getConversationById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const currentUserId = req.user!._id;

      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestError('Invalid conversation ID');
      }

      const conversation = await Conversation.findOne({
        _id: new Types.ObjectId(id),
        participants: currentUserId,
      })
        .populate('participants', 'name username profilePicture isOnline lastSeen')
        .populate('group.admins', 'name username profilePicture')
        .populate('lastMessage');

      if (!conversation) {
        throw new NotFoundError('Conversation not found or unauthorized');
      }

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update group details (Admin only)
   */
  static async updateGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const currentUserId = req.user!._id;
      const validated = updateGroupSchema.parse(req.body);

      const conversation = await Conversation.findById(id);
      if (!conversation || conversation.type !== 'group' || !conversation.group) {
        throw new NotFoundError('Group not found');
      }

      const isAdmin = conversation.group.admins.some((a) => a.toString() === currentUserId.toString());
      if (!isAdmin) {
        throw new ForbiddenError('Only group admins can modify group details');
      }

      if (validated.name) conversation.group.name = validated.name;
      if (validated.description !== undefined) conversation.group.description = validated.description;
      if (validated.image !== undefined) conversation.group.image = validated.image;

      await conversation.save();

      res.status(200).json({
        success: true,
        message: 'Group updated successfully',
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add members to group (Admin only)
   */
  static async addMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const currentUserId = req.user!._id;
      const { memberIds } = req.body;

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        throw new BadRequestError('memberIds array is required');
      }

      const conversation = await Conversation.findById(id);
      if (!conversation || conversation.type !== 'group' || !conversation.group) {
        throw new NotFoundError('Group not found');
      }

      const isAdmin = conversation.group.admins.some((a) => a.toString() === currentUserId.toString());
      if (!isAdmin) {
        throw new ForbiddenError('Only group admins can add members');
      }

      conversation.participants = Array.from(
        new Set([...conversation.participants.map((p) => p.toString()), ...memberIds])
      ).map((pid) => new Types.ObjectId(pid));

      await conversation.save();

      res.status(200).json({
        success: true,
        message: 'Members added successfully',
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member from group (Admin only)
   */
  static async removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, userId } = req.params as { id: string; userId: string };
      const currentUserId = req.user!._id;

      const conversation = await Conversation.findById(id);
      if (!conversation || conversation.type !== 'group' || !conversation.group) {
        throw new NotFoundError('Group not found');
      }

      const isAdmin = conversation.group.admins.some((a) => a.toString() === currentUserId.toString());
      if (!isAdmin) {
        throw new ForbiddenError('Only group admins can remove members');
      }

      conversation.participants = conversation.participants.filter((p) => p.toString() !== userId);
      conversation.group.admins = conversation.group.admins.filter((a) => a.toString() !== userId);

      await conversation.save();

      res.status(200).json({
        success: true,
        message: 'Member removed from group',
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Leave a group
   */
  static async leaveGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const currentUserId = req.user!._id;

      const conversation = await Conversation.findById(id);
      if (!conversation || conversation.type !== 'group' || !conversation.group) {
        throw new NotFoundError('Group not found');
      }

      conversation.participants = conversation.participants.filter((p) => p.toString() !== currentUserId.toString());
      conversation.group.admins = conversation.group.admins.filter((a) => a.toString() !== currentUserId.toString());

      // If no admins left but members exist, promote the next member
      if (conversation.group.admins.length === 0 && conversation.participants.length > 0) {
        conversation.group.admins.push(conversation.participants[0]);
      }

      await conversation.save();

      res.status(200).json({
        success: true,
        message: 'Left group successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Join group via invite token
   */
  static async joinByInviteToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params as { token: string };
      const currentUserId = req.user!._id;

      const conversation = await Conversation.findOne({ 'group.inviteToken': token });
      if (!conversation || !conversation.group) {
        throw new NotFoundError('Invalid or expired group invite link');
      }

      if (!conversation.participants.some((p) => p.toString() === currentUserId.toString())) {
        conversation.participants.push(currentUserId);
        await conversation.save();
      }

      const populated = await conversation.populate('participants', 'name username profilePicture isOnline lastSeen');

      res.status(200).json({
        success: true,
        message: 'Joined group successfully',
        data: populated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle Pin conversation for current user
   */
  static async togglePin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const currentUserId = req.user!._id;

      const conversation = await Conversation.findById(id);
      if (!conversation) throw new NotFoundError('Conversation not found');

      const isPinned = conversation.pinnedBy.some((p) => p.toString() === currentUserId.toString());
      if (isPinned) {
        conversation.pinnedBy = conversation.pinnedBy.filter((p) => p.toString() !== currentUserId.toString());
      } else {
        conversation.pinnedBy.push(currentUserId);
      }
      await conversation.save();

      res.status(200).json({
        success: true,
        data: { isPinned: !isPinned },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle Archive conversation for current user
   */
  static async toggleArchive(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const currentUserId = req.user!._id;

      const conversation = await Conversation.findById(id);
      if (!conversation) throw new NotFoundError('Conversation not found');

      const isArchived = conversation.archivedBy.some((p) => p.toString() === currentUserId.toString());
      if (isArchived) {
        conversation.archivedBy = conversation.archivedBy.filter((p) => p.toString() !== currentUserId.toString());
      } else {
        conversation.archivedBy.push(currentUserId);
      }
      await conversation.save();

      res.status(200).json({
        success: true,
        data: { isArchived: !isArchived },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set disappearing message timer
   */
  static async setDisappearingTimer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { seconds } = req.body;

      const validDurations = [0, 86400, 604800, 7776000]; // Off, 24h, 7d, 90d
      if (!validDurations.includes(Number(seconds))) {
        throw new BadRequestError('Invalid disappearing duration. Must be 0, 86400, 604800, or 7776000 seconds');
      }

      const conversation = await Conversation.findByIdAndUpdate(
        id,
        { disappearingTimer: Number(seconds) },
        { new: true }
      );

      res.status(200).json({
        success: true,
        message: 'Disappearing messages duration updated',
        data: { disappearingTimer: conversation?.disappearingTimer },
      });
    } catch (error) {
      next(error);
    }
  }
}
