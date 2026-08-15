import mongoose, { Document, Schema, Types } from 'mongoose';

export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'connected' | 'rejected' | 'missed' | 'ended';

export interface ICall extends Document {
  _id: Types.ObjectId;
  callerId: Types.ObjectId;
  receiverId?: Types.ObjectId;
  conversationId?: Types.ObjectId;
  type: CallType;
  status: CallStatus;
  startedAt?: Date;
  endedAt?: Date;
  duration: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<ICall>({
  callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  type: { type: String, enum: ['audio', 'video'], default: 'audio' },
  status: { type: String, enum: ['ringing', 'connected', 'rejected', 'missed', 'ended'], default: 'ringing' },
  startedAt: { type: Date },
  endedAt: { type: Date },
  duration: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

CallSchema.index({ callerId: 1, createdAt: -1 });
CallSchema.index({ receiverId: 1, createdAt: -1 });

export const Call = mongoose.model<ICall>('Call', CallSchema);
