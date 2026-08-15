import mongoose, { Document, Schema, Types } from 'mongoose';

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'document'
  | 'location'
  | 'contact'
  | 'system';

export interface IReaction {
  user: Types.ObjectId;
  emoji: string;
  createdAt: Date;
}

export interface IReadReceipt {
  user: Types.ObjectId;
  readAt: Date;
}

export interface ILocationData {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface IContactData {
  name: string;
  email?: string;
  username?: string;
  userId?: Types.ObjectId;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  clientMessageId: string;
  conversationId: Types.ObjectId;
  senderId?: Types.ObjectId;
  receiverId?: Types.ObjectId;
  source: 'internal' | 'whatsapp_business';
  messageType: MessageType;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  location?: ILocationData;
  contact?: IContactData;
  replyTo?: Types.ObjectId;
  forwardedFrom?: Types.ObjectId;
  reactions: IReaction[];
  isEdited: boolean;
  isDeleted: boolean;
  deletedFor: Types.ObjectId[];
  pinned: boolean;
  starredBy: Types.ObjectId[];
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  readBy: IReadReceipt[];
  expiresAt?: Date;
  whatsappMessageId?: string;
  whatsappStatus?: 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema<IReaction>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const ReadReceiptSchema = new Schema<IReadReceipt>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  readAt: { type: Date, default: Date.now },
}, { _id: false });

const LocationSchema = new Schema<ILocationData>({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  name: { type: String },
  address: { type: String },
}, { _id: false });

const ContactSchema = new Schema<IContactData>({
  name: { type: String, required: true },
  email: { type: String },
  username: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const MessageSchema = new Schema<IMessage>({
  clientMessageId: { type: String, required: true, index: true },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User' },
  source: { type: String, enum: ['internal', 'whatsapp_business'], default: 'internal' },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'voice', 'document', 'location', 'contact', 'system'],
    default: 'text',
  },
  content: { type: String, default: '' },
  mediaUrl: { type: String },
  mediaType: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  location: { type: LocationSchema },
  contact: { type: ContactSchema },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  forwardedFrom: { type: Schema.Types.ObjectId, ref: 'User' },
  reactions: [ReactionSchema],
  isEdited: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  pinned: { type: Boolean, default: false },
  starredBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  sentAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date },
  readAt: { type: Date },
  readBy: [ReadReceiptSchema],
  expiresAt: { type: Date },
  whatsappMessageId: { type: String, index: true },
  whatsappStatus: { type: String, enum: ['sent', 'delivered', 'read', 'failed'] },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Index for conversation pagination by createdAt descending
MessageSchema.index({ conversationId: 1, createdAt: -1 });
// TTL index for automatic deletion of disappearing messages
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Compound index for clientMessageId deduplication per conversation
MessageSchema.index({ conversationId: 1, clientMessageId: 1 }, { unique: true, sparse: true });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
