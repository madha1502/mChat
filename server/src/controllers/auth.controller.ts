import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import {
  registerSchema,
  loginSchema,
  loginOtpSchema,
  sendOtpSchema,
  verifyOtpSchema,
  googleAuthSchema,
} from '../validators/index.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { config } from '../config/env.js';

export class AuthController {
  /**
   * Request OTP code to be sent to user's Gmail (for registration or login)
   */
  static async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, purpose, name } = sendOtpSchema.parse(req.body);
      const result = await AuthService.sendOtp(email, purpose, name);

      res.status(200).json({
        success: true,
        message: `6-digit verification code sent to ${result.email}`,
        data: { email: result.email },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify an OTP code standalone
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp, purpose } = verifyOtpSchema.parse(req.body);
      await AuthService.verifyOtp(email, otp, purpose);

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User Registration (Sign Up) with OTP verification
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const { user, token } = await AuthService.register(validated);

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        message: 'Account registered successfully 💖',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User Login Step 1: Validates credentials and sends 6-digit OTP to user's Gmail
   */
  static async initiateLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password } = loginSchema.parse(req.body);
      const result = await AuthService.initiateLogin(identifier, password);

      res.status(200).json({
        success: true,
        message: `Verification code sent to your Gmail (${result.email})`,
        data: { email: result.email, name: result.name, requireOtp: true },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User Login Step 2: Complete Login after verifying 6-digit OTP
   */
  static async completeLoginWithOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp } = loginOtpSchema.parse(req.body);
      const { user, token } = await AuthService.completeLoginWithOtp(email, otp);

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: 'Signed in successfully 💖',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Direct password login (supports fallback)
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password } = loginSchema.parse(req.body);
      const { user, token } = await AuthService.login(identifier, password);

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: 'Signed in successfully',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Google ID token authentication
   */
  static async googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken } = googleAuthSchema.parse(req.body);
      const { user, token } = await AuthService.verifyGoogleIdToken(idToken);

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: 'Authenticated successfully with Google',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user session
   */
  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: { user: req.user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user and clear session cookie
   */
  static async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie('token');
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
