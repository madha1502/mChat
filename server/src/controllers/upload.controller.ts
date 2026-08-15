import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { StorageService } from '../services/storage/storage.service.js';
import { BadRequestError } from '../utils/errors.js';

export class UploadController {
  /**
   * Upload a single media file (Image, Video, Audio, Voice message, or Document)
   */
  static async uploadFile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new BadRequestError('No file provided for upload');
      }

      const file = req.file;
      const fileUrl = StorageService.getPublicUrl(file);

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: fileUrl,
          fileName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
