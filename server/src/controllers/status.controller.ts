import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Status } from '../models/Status.js';
import { User } from '../models/User.js';
import { createStatusSchema } from '../validators/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export class StatusController {
  /**
   * Create a new 24h status / story
   */
  static async createStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;
      const validated = createStatusSchema.parse(req.body);

      const status = await Status.create({
        ...validated,
        userId: currentUserId,
        allowedUsers: (validated.allowedUsers || []).map((id) => new Types.ObjectId(id)),
      });

      const populated = await status.populate('userId', 'name username profilePicture');

      res.status(201).json({
        success: true,
        message: 'Status published',
        data: populated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active statuses feed for current user and their contacts
   */
  static async getStatusesFeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;
      const now = new Date();

      // Find statuses that have not expired
      const statuses = await Status.find({
        expiresAt: { $gt: now },
        $or: [
          { userId: currentUserId },
          { privacy: 'everyone' },
          { privacy: 'selected', allowedUsers: currentUserId },
        ],
      })
        .populate('userId', 'name username profilePicture')
        .populate('viewers.user', 'name username profilePicture')
        .sort({ createdAt: 1 });

      // Group statuses by user
      const groupedByUser: Record<string, { user: any; statuses: any[]; allViewed: boolean }> = {};

      statuses.forEach((st) => {
        const uid = (st.userId as any)._id.toString();
        if (!groupedByUser[uid]) {
          groupedByUser[uid] = {
            user: st.userId,
            statuses: [],
            allViewed: true,
          };
        }

        const isViewed = st.viewers.some((v) => v.user && (v.user as any)._id?.toString() === currentUserId.toString());
        if (!isViewed && uid !== currentUserId.toString()) {
          groupedByUser[uid].allViewed = false;
        }

        groupedByUser[uid].statuses.push(st);
      });

      res.status(200).json({
        success: true,
        data: Object.values(groupedByUser),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark a status as viewed
   */
  static async viewStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user!._id;

      const status = await Status.findById(id);
      if (!status) throw new NotFoundError('Status not found or expired');

      const alreadyViewed = status.viewers.some((v) => v.user.toString() === currentUserId.toString());
      if (!alreadyViewed && status.userId.toString() !== currentUserId.toString()) {
        status.viewers.push({
          user: currentUserId,
          viewedAt: new Date(),
        });
        await status.save();
      }

      res.status(200).json({
        success: true,
        data: status.viewers,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete my status
   */
  static async deleteStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user!._id;

      const status = await Status.findOneAndDelete({
        _id: id,
        userId: currentUserId,
      });

      if (!status) throw new NotFoundError('Status not found or unauthorized');

      res.status(200).json({
        success: true,
        message: 'Status deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
