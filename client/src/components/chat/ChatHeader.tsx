import React, { useState } from 'react';
import { IConversation, IUser } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useCallStore } from '../../stores/callStore';
import { useChatStore } from '../../stores/chatStore';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import {
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  Pin,
  Archive,
  Clock,
  Info,
  Heart,
  Sparkles,
} from 'lucide-react';

interface ChatHeaderProps {
  conversation: IConversation;
  onBack?: () => void;
  onOpenGroupInfo?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onBack,
  onOpenGroupInfo,
}) => {
  const { user: currentUser } = useAuthStore();
  const { startCall } = useCallStore();
  const { togglePinConversation, toggleArchiveConversation, setDisappearingTimer, typingUsers } = useChatStore();

  const [showMenu, setShowMenu] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);

  // Recipient resolution for 1-to-1 chats
  const otherParticipant =
    conversation.type === 'private'
      ? (conversation.participants.find((p) => p._id !== currentUser?._id) as IUser | undefined)
      : null;

  const isGroup = conversation.type === 'group';
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

  // Typing status
  const currentTyping = typingUsers[conversation._id] || [];
  const isTyping = currentTyping.length > 0;

  const subtitle = isTyping
    ? 'typing something cute... 💖'
    : isOnline
    ? 'online · missing you ✨'
    : isGroup
    ? `${conversation.participants.length} sweet members 💕`
    : otherParticipant?.lastSeen
    ? `last seen today at ${new Date(otherParticipant.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'offline · sweet dreams 🌙';

  const handleStartAudioCall = () => {
    if (otherParticipant) {
      startCall(otherParticipant, 'audio', conversation._id);
    }
  };

  const handleStartVideoCall = () => {
    if (otherParticipant) {
      startCall(otherParticipant, 'video', conversation._id);
    }
  };

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-4 [background:var(--header-bg)] text-white shadow-md select-none rounded-t-none md:rounded-t-[28px] transition-all">
      {/* Left: Back button + Avatar + Details */}
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-2 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div
          className="relative cursor-pointer group shrink-0"
          onClick={() => isGroup && onOpenGroupInfo?.()}
        >
          <Avatar
            src={avatarSrc}
            name={title}
            size="md"
            isGroup={isGroup}
            isOnline={isOnline}
            className="ring-2 ring-white/90 shadow-sm group-hover:scale-105 transition-transform"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2
              onClick={() => isGroup && onOpenGroupInfo?.()}
              className="text-base font-black text-white tracking-wide truncate hover:underline cursor-pointer flex items-center gap-1.5"
            >
              {title}
              <Heart className="w-3.5 h-3.5 fill-white/80 text-white/90 inline-block shrink-0 animate-pulse" />
            </h2>
            {conversation.source === 'whatsapp_business' && (
              <Badge variant="whatsapp" />
            )}
          </div>
          <p className="text-xs text-white/90 font-medium truncate flex items-center gap-1">
            {isOnline && <span className="w-2 h-2 rounded-full bg-emerald-300 ring-2 ring-white/50 animate-pulse" />}
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Audio Call, Video Call, Menu Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {!isGroup && conversation.source === 'internal' && (
          <>
            <button
              onClick={handleStartAudioCall}
              className="p-2.5 rounded-full hover:bg-white/20 active:scale-90 text-white transition-all shadow-sm"
              title="Voice Call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={handleStartVideoCall}
              className="p-2.5 rounded-full hover:bg-white/20 active:scale-90 text-white transition-all shadow-sm"
              title="Video Call"
            >
              <Video className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Options Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-pink-100 dark:border-slate-700 p-1.5 z-40 text-xs font-semibold text-slate-700 dark:text-slate-200 space-y-1 animate-in fade-in zoom-in-95">
                {isGroup && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenGroupInfo?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-pink-50 dark:hover:bg-slate-700 hover:text-pink-600 dark:hover:text-pink-400 rounded-xl transition-colors"
                  >
                    <Info className="w-4 h-4 text-pink-500" />
                    Group Info
                  </button>
                )}

                <button
                  onClick={() => {
                    togglePinConversation(conversation._id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-pink-50 dark:hover:bg-slate-700 hover:text-pink-600 dark:hover:text-pink-400 rounded-xl transition-colors"
                >
                  <Pin className="w-4 h-4 text-pink-500" />
                  {conversation.isPinned ? 'Unpin Conversation' : 'Pin Conversation'}
                </button>

                <button
                  onClick={() => {
                    toggleArchiveConversation(conversation._id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-pink-50 dark:hover:bg-slate-700 hover:text-pink-600 dark:hover:text-pink-400 rounded-xl transition-colors"
                >
                  <Archive className="w-4 h-4 text-pink-500" />
                  {conversation.isArchived ? 'Unarchive' : 'Archive Chat'}
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowTimerModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-pink-50 dark:hover:bg-slate-700 hover:text-pink-600 dark:hover:text-pink-400 rounded-xl transition-colors"
                >
                  <Clock className="w-4 h-4 text-pink-500" />
                  Disappearing Messages
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Disappearing Timer Modal */}
      {showTimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-pink-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 text-center">Disappearing Messages</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              New messages in this chat will disappear after the selected duration.
            </p>
            <div className="space-y-1.5">
              {[
                { label: 'Off', seconds: 0 },
                { label: '24 Hours', seconds: 86400 },
                { label: '7 Days', seconds: 604800 },
                { label: '90 Days', seconds: 7776000 },
              ].map((opt) => (
                <button
                  key={opt.seconds}
                  onClick={() => {
                    setDisappearingTimer(conversation._id, opt.seconds);
                    setShowTimerModal(false);
                  }}
                  className={`w-full py-2.5 text-xs font-bold rounded-xl transition-colors ${
                    conversation.disappearingTimer === opt.seconds
                      ? '[background:var(--header-bg)] text-white'
                      : 'bg-pink-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-pink-100 dark:hover:bg-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTimerModal(false)}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
