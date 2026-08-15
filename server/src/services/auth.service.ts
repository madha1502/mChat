import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { User, IUser } from '../models/User.js';
import { Otp } from '../models/Otp.js';
import { EmailService } from './email.service.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors.js';

const googleClient = new OAuth2Client(config.google.clientId);

export interface IRegisterData {
  name: string;
  username: string;
  email: string;
  password: string;
  otp?: string;
  profilePicture?: string;
  about?: string;
}

export class AuthService {
  /**
   * Generates a signed JWT for a given user
   */
  static generateToken(user: IUser): string {
    return jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );
  }

  /**
   * Generates and sends a 6-digit OTP to the user's Gmail
   */
  static async sendOtp(
    email: string,
    purpose: 'register' | 'login' = 'register',
    name?: string
  ): Promise<{ success: boolean; email: string }> {
    const cleanEmail = email.toLowerCase().trim();

    if (purpose === 'register') {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        throw new BadRequestError('An account with this email address already exists.');
      }
    } else if (purpose === 'login') {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (!existingUser) {
        throw new NotFoundError('No user account found with this email address.');
      }
      name = name || existingUser.name;
    }

    // Generate random 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidate any previous active OTPs for this email and purpose
    await Otp.deleteMany({ email: cleanEmail, purpose });

    // Store new OTP with 10-minute expiration
    await Otp.create({
      email: cleanEmail,
      otp: otpCode,
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send formatted HTML email to user's Gmail
    await EmailService.sendOtpEmail({
      email: cleanEmail,
      otp: otpCode,
      name,
      purpose,
    });

    return { success: true, email: cleanEmail, otp: otpCode };
  }

  /**
   * Verifies an OTP code
   */
  static async verifyOtp(
    email: string,
    otp: string,
    purpose: 'register' | 'login' = 'register'
  ): Promise<boolean> {
    const cleanEmail = email.toLowerCase().trim();

    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      otp: otp.trim(),
      purpose,
    });

    if (!otpRecord) {
      throw new BadRequestError('Invalid or expired 6-digit verification code.');
    }

    // Consume OTP so it cannot be reused
    await Otp.deleteOne({ _id: otpRecord._id });
    return true;
  }

  /**
   * User Registration with Email, Password & OTP verification
   */
  static async register(data: IRegisterData): Promise<{ user: IUser; token: string }> {
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanUsername = data.username.toLowerCase().trim();

    // Check if email already registered
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      throw new BadRequestError('An account with this email address already exists.');
    }

    // Check if username already taken
    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) {
      throw new BadRequestError('This username is already taken. Please choose another.');
    }

    // Verify OTP if provided or required
    if (data.otp) {
      await this.verifyOtp(cleanEmail, data.otp, 'register');
    }

    // Hash password with bcrypt (12 salt rounds)
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await User.create({
      name: data.name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      profilePicture: data.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`,
      about: data.about || 'Hey there! I am using Love Bubble 💖',
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * Step 1: User Login initiation - verifies credentials and emails 6-digit OTP
   */
  static async initiateLogin(
    identifier: string,
    password: string
  ): Promise<{ requireOtp: boolean; email: string; name: string }> {
    const cleanIdentifier = identifier.toLowerCase().trim();

    // Find user by email or username, explicitly selecting password
    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
    }).select('+password');

    if (!user || !user.password) {
      throw new UnauthorizedError('Invalid email/username or password.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email/username or password.');
    }

    // Send 6-digit OTP to user's registered Gmail
    const otpResult = await this.sendOtp(user.email, 'login', user.name);

    return {
      requireOtp: true,
      email: user.email,
      name: user.name,
      otp: otpResult.otp,
    };
  }

  /**
   * Step 2: Complete Login after verifying 6-digit OTP
   */
  static async completeLoginWithOtp(
    email: string,
    otp: string
  ): Promise<{ user: IUser; token: string }> {
    const cleanEmail = email.toLowerCase().trim();

    // Verify OTP
    await this.verifyOtp(cleanEmail, otp, 'login');

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      throw new NotFoundError('User account not found.');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * Direct login (for backwards compatibility / dev tests)
   */
  static async login(
    identifier: string,
    password: string
  ): Promise<{ user: IUser; token: string }> {
    const cleanIdentifier = identifier.toLowerCase().trim();

    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
    }).select('+password');

    if (!user || !user.password) {
      throw new UnauthorizedError('Invalid email/username or password.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email/username or password.');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * Validates Google ID token and returns or creates user
   */
  static async verifyGoogleIdToken(idToken: string): Promise<{ user: IUser; token: string }> {
    try {
      let googleId = '';
      let email = '';
      let name = '';
      let picture = '';

      if (config.google.clientId && !idToken.startsWith('mock_')) {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: config.google.clientId,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new UnauthorizedError('Invalid Google ID token');
        }
        googleId = payload.sub;
        email = payload.email.toLowerCase().trim();
        name = payload.name || payload.email.split('@')[0];
        picture = payload.picture || '';
      } else {
        throw new BadRequestError('Google OAuth is not configured with a valid GOOGLE_CLIENT_ID in server/.env.');
      }

      let user = await User.findOne({ $or: [{ googleId }, { email }] });
      if (!user) {
        let username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (username.length < 3) username = `user_${username}`;
        let counter = 1;
        while (await User.exists({ username })) {
          username = `${username}_${counter}`;
          counter++;
        }

        user = await User.create({
          googleId,
          email,
          name,
          username,
          profilePicture: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        });
      } else if (!user.googleId) {
        user.googleId = googleId;
        if (!user.profilePicture && picture) user.profilePicture = picture;
        await user.save();
      }

      const token = this.generateToken(user);
      return { user, token };
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof UnauthorizedError) throw error;
      throw new UnauthorizedError(`Google authentication failed: ${error.message}`);
    }
  }
}
