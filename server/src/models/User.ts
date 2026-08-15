import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IPrivacySettings {
  lastSeen: 'everyone' | 'contacts' | 'nobody';
  profilePicture: 'everyone' | 'contacts' | 'nobody';
  about: 'everyone' | 'contacts' | 'nobody';
  status: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
  typingIndicator: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  googleId?: string;
  email: string;
  password?: string;
  name: string;
  username: string;
  profilePicture: string;
  about: string;
  isOnline: boolean;
  lastSeen: Date;
  privacySettings: IPrivacySettings;
  blockedUsers: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const PrivacySettingsSchema = new Schema<IPrivacySettings>({
  lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
  profilePicture: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
  about: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
  status: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
  readReceipts: { type: Boolean, default: true },
  typingIndicator: { type: Boolean, default: true },
}, { _id: false });

const UserSchema = new Schema<IUser>({
  googleId: { type: String, sparse: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, select: false },
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  profilePicture: { type: String, default: '' },
  about: { type: String, default: 'Hey there! I am using Aether Messenger.' },
  isOnline: { type: Boolean, default: false, index: true },
  lastSeen: { type: Date, default: Date.now },
  privacySettings: { type: PrivacySettingsSchema, default: () => ({}) },
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete (ret as any).password;
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Compound text search index
UserSchema.index({ name: 'text', username: 'text', email: 'text' });

export const User = mongoose.model<IUser>('User', UserSchema);
