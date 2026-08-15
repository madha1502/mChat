import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User, IUser } from '../models/User.js';
import { UnauthorizedError } from '../utils/errors.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication token required');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Invalid or expired authentication token'));
    } else {
      next(error);
    }
  }
};
