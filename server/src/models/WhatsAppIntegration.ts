import mongoose, { Document, Schema, Types } from 'mongoose';

export type WhatsAppIntegrationStatus = 'active' | 'disconnected' | 'error';

export interface IWhatsAppIntegration extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  businessAccountId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessTokenEncrypted: string;
  webhookSecret: string;
  status: WhatsAppIntegrationStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppIntegrationSchema = new Schema<IWhatsAppIntegration>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  businessAccountId: { type: String, required: true },
  phoneNumberId: { type: String, required: true, index: true },
  displayPhoneNumber: { type: String, required: true },
  accessTokenEncrypted: { type: String, required: true },
  webhookSecret: { type: String, default: '' },
  status: { type: String, enum: ['active', 'disconnected', 'error'], default: 'active' },
  errorMessage: { type: String },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete (ret as any).__v;
      delete (ret as any).accessTokenEncrypted; // Never expose encrypted tokens directly
      return ret;
    }
  }
});

export const WhatsAppIntegration = mongoose.model<IWhatsAppIntegration>('WhatsAppIntegration', WhatsAppIntegrationSchema);
