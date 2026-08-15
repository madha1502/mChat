import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Call } from '../models/Call.js';

export class CallController {
  /**
   * Get call logs for authenticated user
   */
  static async getCallHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!._id;

      const calls = await Call.find({
        $or: [{ callerId: currentUserId }, { receiverId: currentUserId }],
      })
        .populate('callerId', 'name username profilePicture')
        .populate('receiverId', 'name username profilePicture')
        .sort({ createdAt: -1 })
        .limit(50);

      res.status(200).json({
        success: true,
        data: calls,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get STUN/TURN ICE server credentials
   */
  static async getIceServers(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Standard public STUN servers for WebRTC peer-to-peer audio/video connection
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ];

      res.status(200).json({
        success: true,
        data: { iceServers },
      });
    } catch (error) {
      next(error);
    }
  }
}
