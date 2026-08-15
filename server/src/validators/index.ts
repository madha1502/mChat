import { z } from 'zod';

export const sendOtpSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  purpose: z.enum(['register', 'login']).default('register'),
  name: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  purpose: z.enum(['register', 'login']).default('register'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  otp: z.string().length(6, 'Verification OTP must be 6 digits').optional(),
  profilePicture: z.string().optional(),
  about: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const loginOtpSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(50).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  about: z.string().max(200).optional(),
  profilePicture: z.string().optional(),
});

export const updatePrivacySchema = z.object({
  lastSeen: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  profilePicture: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  about: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  status: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  readReceipts: z.boolean().optional(),
  typingIndicator: z.boolean().optional(),
});

export const createConversationSchema = z.object({
  type: z.enum(['private', 'group']).default('private'),
  recipientId: z.string().optional(),
  participants: z.array(z.string()).optional(),
  groupName: z.string().min(1).max(50).optional(),
  groupDescription: z.string().max(250).optional(),
  groupImage: z.string().optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(250).optional(),
  image: z.string().optional(),
});

export const sendMessageSchema = z.object({
  clientMessageId: z.string().min(1, 'clientMessageId is required'),
  conversationId: z.string().min(1, 'conversationId is required'),
  messageType: z.enum(['text', 'image', 'video', 'audio', 'voice', 'document', 'location', 'contact']).default('text'),
  content: z.string().optional().default(''),
  mediaUrl: z.string().optional(),
  mediaType: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    name: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  contact: z.object({
    name: z.string(),
    email: z.string().optional(),
    username: z.string().optional(),
    userId: z.string().optional(),
  }).optional(),
  replyTo: z.string().optional(),
  forwardedFrom: z.string().optional(),
});

export const editMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
});

export const addReactionSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required'),
});

export const createStatusSchema = z.object({
  type: z.enum(['text', 'image', 'video']).default('text'),
  content: z.string().optional().default(''),
  mediaUrl: z.string().optional(),
  caption: z.string().max(300).optional(),
  backgroundColor: z.string().optional(),
  privacy: z.enum(['everyone', 'contacts', 'selected']).default('everyone'),
  allowedUsers: z.array(z.string()).optional(),
});

export const connectWhatsAppSchema = z.object({
  businessAccountId: z.string().optional(),
  phoneNumberId: z.string().optional(),
  displayPhoneNumber: z.string().min(1, 'Display phone number is required'),
  accessToken: z.string().optional(),
  webhookSecret: z.string().optional(),
});
