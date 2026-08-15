import mongoose, { Document, Schema } from 'mongoose';

export interface IOtp extends Document {
  email: string;
  otp: string;
  purpose: 'register' | 'login';
  createdAt: Date;
  expiresAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['register', 'login'],
      default: 'register',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      index: { expires: 0 }, // MongoDB TTL index automatically removes expired OTPs
    },
  },
  {
    timestamps: true,
  }
);

export const Otp = mongoose.model<IOtp>('Otp', otpSchema);
