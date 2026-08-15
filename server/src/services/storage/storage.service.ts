import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/env.js';
import { BadRequestError } from '../../utils/errors.js';

// Ensure upload directories exist
const uploadRoot = path.resolve(process.cwd(), config.storage.uploadDir);
const mediaTypes = ['images', 'videos', 'audio', 'documents', 'avatars'];

mediaTypes.forEach((dir) => {
  const fullPath = path.join(uploadRoot, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Configure disk storage
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let subfolder = 'documents';
    if (file.mimetype.startsWith('image/')) {
      subfolder = 'images';
    } else if (file.mimetype.startsWith('video/')) {
      subfolder = 'videos';
    } else if (file.mimetype.startsWith('audio/')) {
      subfolder = 'audio';
    }
    cb(null, path.join(uploadRoot, subfolder));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Videos
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
    // Audio & Voice
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac', 'audio/mp4', 'audio/x-m4a',
    // Documents
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-rar-compressed', 'text/plain', 'text/csv'
  ];

  if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new BadRequestError(`Unsupported file type: ${file.mimetype}`));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max limit
  },
});

export class StorageService {
  /**
   * Generates public URL for an uploaded local file
   */
  static getPublicUrl(file: Express.Multer.File): string {
    const relativePath = path.relative(uploadRoot, file.path).replace(/\\/g, '/');
    return `/uploads/${relativePath}`;
  }
}
