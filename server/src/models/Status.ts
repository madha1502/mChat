import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStatusViewer {
  user: Types.ObjectId;
  viewedAt: Date;
}

export interface IStatus extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'text' | 'image' | 'video';
  content: string;
  mediaUrl?: string;
  caption?: string;
  backgroundColor?: string;
  privacy: 'everyone' | 'contacts' | 'selected';
  allowedUsers?: Types.ObjectId[];
  viewers: IStatusViewer[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StatusViewerSchema = new Schema<IStatusViewer>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  viewedAt: { type: Date, default: Date.now },
}, { _id: false });

const StatusSchema = new Schema<IStatus>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
  content: { type: String, default: '' },
  mediaUrl: { type: String },
  caption: { type: String, default: '' },
  backgroundColor: { type: String, default: '#0F172A' },
  privacy: { type: String, enum: ['everyone', 'contacts', 'selected'], default: 'everyone' },
  allowedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  viewers: [StatusViewerSchema],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// TTL index to automatically remove expired statuses
StatusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Status = mongoose.model<IStatus>('Status', StatusSchema);
