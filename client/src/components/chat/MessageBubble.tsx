import React, { useState, useRef, useEffect } from 'react';
import { IMessage, IUser } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { Avatar } from '../common/Avatar';
import {
  Check,
  CheckCheck,
  Clock,
  Play,
  Pause,
  FileText,
  Download,
  MapPin,
  Smile,
  Reply,
  Edit2,
  Trash2,
} from 'lucide-react';

interface MessageBubbleProps {
  message: IMessage;
  previousMessage?: IMessage;
  onReply?: (message: IMessage) => void;
}

const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥', '👏', '🌸', '🧸'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onReply,
}) => {
  const { user: currentUser } = useAuthStore();
  const { editMessage, deleteMessage, toggleReaction } = useChatStore();

  const [showPicker, setShowPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');

  // Audio waveform player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isSelf =
    typeof message.senderId === 'string'
      ? message.senderId === currentUser?._id
      : (message.senderId as IUser)?._id === currentUser?._id;

  const sender = typeof message.senderId === 'object' ? (message.senderId as IUser) : null;
  const isDeleted = message.isDeleted;

  // Format message time
  const timeFormatted = message.sentAt
    ? new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  // Audio Playback handling
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const updateProgress = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setAudioProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    await editMessage(message._id, editContent);
    setIsEditing(false);
  };

  return (
    <div
      id={`msg-${message._id}`}
      className={`group relative flex items-end gap-2 my-2 transition-all ${
        isSelf ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Avatar on Left for Incoming Messages */}
      {!isSelf && (
        <Avatar
          src={sender?.profilePicture}
          name={sender?.name || 'User'}
          size="sm"
          className="mb-1 shrink-0 ring-2 ring-white/80 dark:ring-slate-700 shadow-sm"
        />
      )}

      {/* Bubble Container */}
      <div className={`relative max-w-[82%] sm:max-w-[70%] md:max-w-[62%] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
        
        {/* Reply Quote preview */}
        {message.replyTo && typeof message.replyTo === 'object' && (
          <div
            className={`mb-1 p-2 rounded-xl text-xs max-w-full truncate border-l-4 ${
              isSelf
                ? 'bg-white/20 border-white text-white'
                : 'bg-slate-100 dark:bg-slate-800 border-pink-400 dark:border-pink-500 text-slate-700 dark:text-slate-200'
            }`}
          >
            <span className="font-bold block text-[10px] text-pink-500 dark:text-pink-400">
              {(message.replyTo.senderId as any)?.name || 'Reply to message'}
            </span>
            <span className="truncate block opacity-90">{message.replyTo.content || 'Media message'}</span>
          </div>
        )}

        {/* The Love Bubble Card with Dynamic Theme Gradients */}
        <div
          className={`relative px-4 py-2.5 rounded-[22px] transition-all ${
            isDeleted
              ? 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-400 italic text-xs border border-dashed border-slate-200 dark:border-slate-700'
              : isSelf
              ? '[background:var(--bubble-out)] text-white shadow-md rounded-br-sm'
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm border border-pink-100/80 dark:border-slate-700/80 rounded-bl-sm'
          }`}
        >
          {/* Incoming Sender Name in Group chats */}
          {!isSelf && sender && (
            <span className="block text-[11px] font-bold text-pink-500 dark:text-pink-400 mb-0.5">
              {sender.name}
            </span>
          )}

          {/* 1. TEXT MESSAGE / EDIT INLINE */}
          {message.messageType === 'text' && !isDeleted && (
            isEditing ? (
              <form onSubmit={handleSaveEdit} className="space-y-1.5 min-w-[200px]">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={2}
                  className="w-full bg-white/20 text-white rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-white resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-0.5 text-[10px] text-white/80 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-0.5 bg-white text-pink-600 rounded-md text-[10px] font-bold shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
                {message.isEdited && (
                  <span className="text-[10px] ml-1 opacity-70 italic">(edited)</span>
                )}
              </p>
            )
          )}

          {/* 2. PHOTO / IMAGE ATTACHMENT */}
          {message.messageType === 'image' && message.mediaUrl && !isDeleted && (
            <div className="space-y-1.5 -mx-1 -mt-1">
              <img
                src={message.mediaUrl}
                alt="Attachment"
                className="rounded-2xl max-h-72 w-full object-cover shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => window.open(message.mediaUrl, '_blank')}
              />
              {message.content && (
                <p className="px-1 text-sm font-medium leading-relaxed">{message.content}</p>
              )}
            </div>
          )}

          {/* 3. VOICE / AUDIO MESSAGE */}
          {(message.messageType === 'voice' || message.messageType === 'audio') && message.mediaUrl && !isDeleted && (
            <div className="flex items-center gap-3 py-1 min-w-[220px]">
              <audio ref={audioRef} src={message.mediaUrl} preload="metadata" />
              <button
                type="button"
                onClick={toggleAudio}
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all ${
                  isSelf ? 'bg-white text-pink-500' : 'bg-pink-500 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* Waveform Scrubber */}
              <div className="flex-1 space-y-1">
                <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden relative">
                  <div
                    className={`h-full transition-all ${isSelf ? 'bg-white' : 'bg-pink-500'}`}
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] opacity-75 font-semibold">
                  <span>Voice Note</span>
                  <button
                    type="button"
                    onClick={cyclePlaybackRate}
                    className="hover:opacity-100 font-bold px-1 rounded bg-black/10 dark:bg-white/10"
                  >
                    {playbackRate}x
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. DOCUMENT ATTACHMENT */}
          {message.messageType === 'document' && message.mediaUrl && !isDeleted && (
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-2 bg-black/10 dark:bg-white/10 rounded-xl hover:bg-black/15 transition-colors"
            >
              <FileText className="w-7 h-7 shrink-0" />
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-bold truncate">{message.fileName || 'Document'}</p>
                {message.fileSize && (
                  <p className="text-[10px] opacity-75">{(message.fileSize / 1024).toFixed(1)} KB</p>
                )}
              </div>
              <Download className="w-4 h-4 opacity-75 shrink-0" />
            </a>
          )}

          {/* 5. LOCATION CARD */}
          {message.messageType === 'location' && message.location && !isDeleted && (
            <a
              href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="block p-2 bg-black/10 dark:bg-white/10 rounded-xl hover:bg-black/15 text-xs space-y-1"
            >
              <div className="flex items-center gap-1.5 font-bold">
                <MapPin className="w-4 h-4 text-rose-300" />
                <span>{message.location.name || 'Shared Location'}</span>
              </div>
              {message.location.address && (
                <p className="text-[10px] opacity-80">{message.location.address}</p>
              )}
            </a>
          )}

          {/* Timestamp & Status Delivery Ticks */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-semibold select-none ${
              isSelf ? 'text-white/85' : 'text-slate-400 dark:text-slate-400'
            }`}
          >
            <span>{timeFormatted}</span>
            {isSelf && (
              <span>
                {message.status === 'sending' ? (
                  <Clock className="w-3 h-3 animate-spin" />
                ) : message.readAt ? (
                  <CheckCheck className="w-3.5 h-3.5 text-sky-200 inline" />
                ) : message.deliveredAt ? (
                  <CheckCheck className="w-3.5 h-3.5 text-white/90 inline" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-white/80 inline" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reaction Badges Pill */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-sm border border-pink-100 dark:border-slate-700 text-xs ${
              isSelf ? 'mr-1' : 'ml-1'
            }`}
          >
            {Array.from(new Set(message.reactions.map((r) => r.emoji))).map((emoji) => (
              <span key={emoji} className="cursor-pointer hover:scale-125 transition-transform" onClick={() => toggleReaction(message._id, emoji)}>
                {emoji}
              </span>
            ))}
            <span className="text-[10px] text-pink-500 font-bold">{message.reactions.length}</span>
          </div>
        )}

        {/* Action Toolbar on Hover */}
        <div
          className={`absolute top-0 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 p-1 bg-white/95 dark:bg-slate-800/95 rounded-full shadow-md border border-pink-100 dark:border-slate-700 transition-all z-20 ${
            isSelf ? '-left-20' : '-right-20'
          }`}
        >
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="p-1 text-slate-400 hover:text-pink-500 rounded-full hover:bg-pink-50 dark:hover:bg-slate-700"
            title="React with Emoji"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onReply?.(message)}
            className="p-1 text-slate-400 hover:text-pink-500 rounded-full hover:bg-pink-50 dark:hover:bg-slate-700"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          {isSelf && !isDeleted && message.messageType === 'text' && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-slate-400 hover:text-pink-500 rounded-full hover:bg-pink-50 dark:hover:bg-slate-700"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {isSelf && !isDeleted && (
            <button
              onClick={() => deleteMessage(message._id, true)}
              className="p-1 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40"
              title="Delete for Everyone"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Emoji Picker Popup */}
        {showPicker && (
          <div
            className={`absolute -top-10 flex items-center gap-1.5 p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-xl border border-pink-100 dark:border-slate-700 z-30 animate-in zoom-in-95 ${
              isSelf ? 'right-0' : 'left-0'
            }`}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  toggleReaction(message._id, emoji);
                  setShowPicker(false);
                }}
                className="text-base hover:scale-130 transition-transform p-0.5"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Avatar on Right for Outgoing Messages */}
      {isSelf && (
        <Avatar
          src={currentUser?.profilePicture}
          name={currentUser?.name || 'You'}
          size="sm"
          className="mb-1 shrink-0 ring-2 ring-pink-200 dark:ring-pink-900 shadow-sm"
        />
      )}
    </div>
  );
};
