import React from 'react';
import { IConversation, IUser } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { Pin, VolumeX } from 'lucide-react';

interface ConversationItemProps {
  conversation: IConversation;
  isActive: boolean;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const { user: currentUser } = useAuthStore();

  const isGroup = conversation.type === 'group';
  const otherParticipant =
    conversation.type === 'private'
      ? (conversation.participants.find((p) => p._id !== currentUser?._id) as IUser | undefined)
      : null;

  const title = isGroup
    ? conversation.group?.name || 'Group Chat'
    : conversation.source === 'whatsapp_business'
    ? conversation.whatsappMetadata?.customerName || conversation.whatsappMetadata?.customerPhoneNumber || 'Customer'
    : otherParticipant?.name || 'User';

  const avatarSrc = isGroup
    ? conversation.group?.image
    : conversation.source === 'whatsapp_business'
    ? undefined
    : otherParticipant?.profilePicture;

  const isOnline = !isGroup && otherParticipant?.isOnline;

  const lastMsg = conversation.lastMessage as any;
  const lastMsgContent = lastMsg?.isDeleted
    ? 'This message was deleted'
    : lastMsg?.messageType === 'image'
    ? '📷 Photo'
    : lastMsg?.messageType === 'voice'
    ? '🎤 Voice note'
    : lastMsg?.messageType === 'document'
    ? '📄 Document'
    : lastMsg?.messageType === 'location'
    ? '📍 Location'
    : lastMsg?.content || 'Started conversation';

  const timeFormatted = conversation.lastMessageAt
    ? new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const unread = conversation.unreadCount || 0;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-2xl cursor-pointer select-none transition-all ${
        isActive
          ? 'bg-pink-100/90 dark:bg-slate-800/90 shadow-sm border border-pink-200 dark:border-slate-700'
          : 'hover:bg-pink-50/70 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className="relative shrink-0">
        <Avatar
          src={avatarSrc}
          name={title}
          size="md"
          isGroup={isGroup}
          isOnline={isOnline}
          className="ring-2 ring-pink-100 dark:ring-slate-700 shadow-sm"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{title}</h3>
            {conversation.source === 'whatsapp_business' && (
              <Badge variant="whatsapp" />
            )}
          </div>
          <span className="text-[10px] text-pink-500 dark:text-pink-400 font-semibold shrink-0">
            {timeFormatted}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium flex-1">
            {lastMsgContent}
          </p>

          <div className="flex items-center gap-1.5 shrink-0">
            {conversation.isPinned && <Pin className="w-3 h-3 text-pink-400 fill-pink-300" />}
            {conversation.isMuted && <VolumeX className="w-3 h-3 text-slate-400" />}
            {unread > 0 && (
              <span className="px-1.5 py-0.5 min-w-[18px] text-[10px] font-black text-white [background:var(--header-bg)] rounded-full text-center shadow-sm">
                {unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
