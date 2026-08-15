import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { User } from '../models/User.js';
import { updateProfileSchema, updatePrivacySchema } from '../validators/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export class UserController {
  /**
   * Search users by email, username, or display name
   */
  static async searchUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;
      const query = (req.query.q as string || '').trim();

      if (!query || query.length < 2) {
        res.status(200).json({ success: true, data: [] });
        return;
      }

      // Safe regex escaping
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      const users = await User.find({
        _id: { $ne: currentUserId },
        $or: [
          { email: searchRegex },
          { username: searchRegex },
          { name: searchRegex },
        ],
      })
        .select('name username email profilePicture about isOnline lastSeen privacySettings')
        .limit(20);

      // Filter fields according to user privacy settings
      const sanitized = users.map((u) => {
        const priv = u.privacySettings || {} as any;
        return {
          _id: u._id,
          name: u.name,
          username: u.username,
          email: u.email,
          profilePicture: priv.profilePicture === 'nobody' ? '' : u.profilePicture,
          about: priv.about === 'nobody' ? '' : u.about,
          isOnline: priv.lastSeen === 'nobody' ? false : u.isOnline,
          lastSeen: priv.lastSeen === 'nobody' ? undefined : u.lastSeen,
        };
      });

      res.status(200).json({
        success: true,
        data: sanitized,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user profile by ID
   */
  static async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestError('Invalid user ID');
      }

      const user = await User.findById(id).select('-googleId -__v');
      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update authenticated user profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;
      const validated = updateProfileSchema.parse(req.body);

      if (validated.username) {
        const exists = await User.findOne({
          username: validated.username,
          _id: { $ne: currentUserId },
        });
        if (exists) {
          throw new BadRequestError('Username is already taken');
        }
      }

      const user = await User.findByIdAndUpdate(
        currentUserId,
        { $set: validated },
        { new: true, runValidators: true }
      ).select('-googleId -__v');

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user privacy settings
   */
  static async updatePrivacy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;
      const validated = updatePrivacySchema.parse(req.body);

      const updateObj: Record<string, any> = {};
      Object.entries(validated).forEach(([key, val]) => {
        updateObj[`privacySettings.${key}`] = val;
      });

      const user = await User.findByIdAndUpdate(
        currentUserId,
        { $set: updateObj },
        { new: true }
      ).select('privacySettings');

      res.status(200).json({
        success: true,
        message: 'Privacy settings updated',
        data: user?.privacySettings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Block a user
   */
  static async blockUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;
      const { userId } = req.params as { userId: string };

      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestError('Invalid user ID');
      }

      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { blockedUsers: new Types.ObjectId(userId) },
      });

      res.status(200).json({
        success: true,
        message: 'User blocked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unblock a user
   */
  static async unblockUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;
      const { userId } = req.params as { userId: string };

      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestError('Invalid user ID');
      }

      await User.findByIdAndUpdate(currentUserId, {
        $pull: { blockedUsers: new Types.ObjectId(userId) },
      });

      res.status(200).json({
        success: true,
        message: 'User unblocked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List blocked users
   */
  static async getBlockedUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;
      const user = await User.findById(currentUserId).populate('blockedUsers', 'name username profilePicture email');

      res.status(200).json({
        success: true,
        data: user?.blockedUsers || [],
      });
    } catch (error) {
      next(error);
    }
  }
}
