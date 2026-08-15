export interface IPrivacySettings {
  lastSeen?: 'everyone' | 'contacts' | 'nobody';
  profilePicture?: 'everyone' | 'contacts' | 'nobody';
  about?: 'everyone' | 'contacts' | 'nobody';
  status?: 'everyone' | 'contacts' | 'nobody';
  readReceipts?: boolean;
  typingIndicator?: boolean;
}

export interface IUser {
  _id: string;
  googleId?: string;
  email: string;
  name: string;
  username: string;
  profilePicture?: string;
  about?: string;
  isOnline?: boolean;
  lastSeen?: string;
  privacySettings?: IPrivacySettings;
  blockedUsers?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IGroupMetadata {
  name: string;
  description?: string;
  image?: string;
  admins: (string | IUser)[];
  createdBy: string | IUser;
  inviteToken?: string;
}

export interface IWhatsAppMetadata {
  customerPhoneNumber: string;
  customerName?: string;
  businessPhoneNumberId: string;
  waConversationId?: string;
}

export interface IConversation {
  _id: string;
  type: 'private' | 'group';
  source: 'internal' | 'whatsapp_business';
  participants: IUser[];
  group?: IGroupMetadata;
  whatsappMetadata?: IWhatsAppMetadata;
  lastMessage?: IMessage;
  lastMessageAt?: string;
  unreadCount?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  disappearingTimer?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IReaction {
  user: string | IUser;
  emoji: string;
  createdAt: string;
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
  userId?: string;
}

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

export interface IMessage {
  _id: string;
  clientMessageId: string;
  conversationId: string;
  senderId?: IUser | string;
  receiverId?: string;
  source?: 'internal' | 'whatsapp_business';
  messageType: MessageType;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  location?: ILocationData;
  contact?: IContactData;
  replyTo?: IMessage;
  forwardedFrom?: IUser | string;
  reactions?: IReaction[];
  isEdited?: boolean;
  isDeleted?: boolean;
  pinned?: boolean;
  starredBy?: string[];
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  expiresAt?: string;
  whatsappMessageId?: string;
  whatsappStatus?: 'sent' | 'delivered' | 'read' | 'failed';
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt?: string;
  updatedAt?: string;
}

export interface IStatusViewer {
  user: IUser;
  viewedAt: string;
}

export interface IStatus {
  _id: string;
  userId: IUser;
  type: 'text' | 'image' | 'video';
  content?: string;
  mediaUrl?: string;
  caption?: string;
  backgroundColor?: string;
  privacy: 'everyone' | 'contacts' | 'selected';
  viewers: IStatusViewer[];
  expiresAt: string;
  createdAt: string;
}

export interface IStatusUserGroup {
  user: IUser;
  statuses: IStatus[];
  allViewed: boolean;
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

export interface ICallLog {
  _id: string;
  callerId: IUser;
  receiverId: IUser;
  type: CallType;
  status: 'ringing' | 'connected' | 'rejected' | 'missed' | 'ended';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
}

export interface IWhatsAppIntegration {
  _id: string;
  userId: string;
  businessAccountId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  status: 'active' | 'disconnected' | 'error';
  webhookSecret?: string;
  createdAt: string;
}
