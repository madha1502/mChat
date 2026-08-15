import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Trash2, Send } from 'lucide-react';
import { useStatusStore } from '../../stores/statusStore';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { Avatar } from '../common/Avatar';
import { formatDistanceToNowStrict } from 'date-fns';

export const StatusViewerModal: React.FC = () => {
  const {
    isViewerOpen,
    activeStatusGroup,
    activeStatusIndex,
    closeViewer,
    nextStatus,
    prevStatus,
    deleteStatus,
  } = useStatusStore();
  const { user: currentUser } = useAuthStore();
  const { sendTextMessage, setActiveConversation, conversations } = useChatStore();

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showViewersList, setShowViewersList] = useState(false);

  const duration = 5000; // 5 seconds per status item

  useEffect(() => {
    if (!isViewerOpen || !activeStatusGroup) return;

    setProgress(0);
    const interval = 50; // update progress every 50ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev >= 100) {
            nextStatus();
            return 0;
          }
          return prev + step;
        });
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isViewerOpen, activeStatusGroup, activeStatusIndex, isPaused]);

  if (!isViewerOpen || !activeStatusGroup) return null;

  const currentStatus = activeStatusGroup.statuses[activeStatusIndex];
  if (!currentStatus) return null;

  const isMyStatus = activeStatusGroup.user._id === currentUser?._id;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    // Find conversation with this contact
    const targetConv = conversations.find(
      (c) => c.type === 'private' && c.participants.some((p) => p._id === activeStatusGroup.user._id)
    );

    if (targetConv) {
      await setActiveConversation(targetConv);
      await sendTextMessage(`Replied to story: ${replyText}`);
      setReplyText('');
      closeViewer();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 select-none animate-in fade-in"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Story Container Card */}
      <div className="relative w-full max-w-md h-[90vh] max-h-[800px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between bg-slate-950 border border-slate-800">
        {/* Top Progress Segment Bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
          {activeStatusGroup.statuses.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75"
                style={{
                  width:
                    idx < activeStatusIndex
                      ? '100%'
                      : idx === activeStatusIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top User Header */}
        <div className="relative z-30 flex items-center justify-between px-4 pt-6 pb-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <Avatar
              src={activeStatusGroup.user.profilePicture}
              name={activeStatusGroup.user.name}
              size="sm"
            />
            <div>
              <p className="text-sm font-bold text-white leading-none">{activeStatusGroup.user.name}</p>
              <p className="text-[10px] text-slate-300 mt-1 opacity-80">
                {formatDistanceToNowStrict(new Date(currentStatus.createdAt))} ago
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMyStatus && (
              <button
                onClick={() => deleteStatus(currentStatus._id)}
                className="p-1.5 rounded-full bg-black/40 text-rose-400 hover:bg-rose-500/20"
                title="Delete Status"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={closeViewer}
              className="p-1.5 rounded-full bg-black/40 text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Story Media / Content Body */}
        <div
          className="relative flex-1 flex items-center justify-center p-6"
          style={{ backgroundColor: currentStatus.backgroundColor || '#0F172A' }}
        >
          {/* Navigation Click Targets */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              prevStatus();
            }}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
          />
          <div
            onClick={(e) => {
              e.stopPropagation();
              nextStatus();
            }}
            className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
          />

          {/* Text Story */}
          {currentStatus.type === 'text' && (
            <p className="text-xl md:text-2xl font-bold text-center text-white break-words max-w-sm px-4">
              {currentStatus.content}
            </p>
          )}

          {/* Image Story */}
          {currentStatus.type === 'image' && currentStatus.mediaUrl && (
            <img
              src={currentStatus.mediaUrl}
              alt="Story"
              className="w-full h-full object-contain"
            />
          )}

          {/* Video Story */}
          {currentStatus.type === 'video' && currentStatus.mediaUrl && (
            <video
              src={currentStatus.mediaUrl}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Bottom Bar: Caption / Reply / Viewer list */}
        <div className="relative z-30 p-4 bg-gradient-to-t from-black/90 to-transparent space-y-3">
          {currentStatus.caption && (
            <p className="text-xs text-center text-white bg-black/50 px-3 py-1.5 rounded-xl backdrop-blur-md">
              {currentStatus.caption}
            </p>
          )}

          {isMyStatus ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300">
              <Eye className="w-4 h-4 text-sky-400" />
              <span>{currentStatus.viewers?.length || 0} views</span>
            </div>
          ) : (
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to story..."
                className="flex-1 px-4 py-2 bg-slate-900/90 text-xs text-white placeholder-slate-400 rounded-full border border-slate-700 focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                className="p-2 rounded-full bg-sky-500 text-white hover:bg-sky-400 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
