import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// OTP Endpoints
router.post('/send-otp', authLimiter, AuthController.sendOtp);
router.post('/verify-otp', authLimiter, AuthController.verifyOtp);

// Registration & Login with OTP
router.post('/register', authLimiter, AuthController.register);
router.post('/login-init', authLimiter, AuthController.initiateLogin);
router.post('/login-otp', authLimiter, AuthController.completeLoginWithOtp);
router.post('/login', authLimiter, AuthController.login);

// Google OAuth & Session Management
router.post('/google', authLimiter, AuthController.googleLogin);
router.get('/me', authenticate, AuthController.getMe);
router.post('/logout', AuthController.logout);

export default router;
