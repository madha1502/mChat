import mongoose, { Document, Schema, Types } from 'mongoose';

export type ConversationType = 'private' | 'group';
export type ConversationSource = 'internal' | 'whatsapp_business';

export interface IGroupMetadata {
  name: string;
  description?: string;
  image?: string;
  admins: Types.ObjectId[];
  createdBy: Types.ObjectId;
  inviteToken?: string;
}

export interface IWhatsAppMetadata {
  customerPhoneNumber: string;
  customerName?: string;
  businessPhoneNumberId: string;
  waConversationId?: string;
}

export interface IConversation extends Document {
  _id: Types.ObjectId;
  type: ConversationType;
  source: ConversationSource;
  participants: Types.ObjectId[];
  group?: IGroupMetadata;
  whatsappMetadata?: IWhatsAppMetadata;
  lastMessage?: Types.ObjectId;
  lastMessageAt?: Date;
  unreadCounts: Map<string, number>;
  pinnedBy: Types.ObjectId[];
  archivedBy: Types.ObjectId[];
  mutedBy: Types.ObjectId[];
  disappearingTimer: number;
  createdAt: Date;
  updatedAt: Date;
}

const GroupMetadataSchema = new Schema<IGroupMetadata>({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  inviteToken: { type: String },
}, { _id: false });

const WhatsAppMetadataSchema = new Schema<IWhatsAppMetadata>({
  customerPhoneNumber: { type: String, required: true },
  customerName: { type: String, default: '' },
  businessPhoneNumberId: { type: String, required: true },
  waConversationId: { type: String },
}, { _id: false });

const ConversationSchema = new Schema<IConversation>({
  type: { type: String, enum: ['private', 'group'], required: true, default: 'private' },
  source: { type: String, enum: ['internal', 'whatsapp_business'], required: true, default: 'internal' },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  group: { type: GroupMetadataSchema },
  whatsappMetadata: { type: WhatsAppMetadataSchema },
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  lastMessageAt: { type: Date, default: Date.now },
  unreadCounts: { type: Map, of: Number, default: () => new Map() },
  pinnedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  mutedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  disappearingTimer: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Indexes for high performance querying
ConversationSchema.index({ participants: 1, updatedAt: -1 });
ConversationSchema.index({ 'whatsappMetadata.customerPhoneNumber': 1, 'whatsappMetadata.businessPhoneNumberId': 1 });
ConversationSchema.index({ 'group.inviteToken': 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
