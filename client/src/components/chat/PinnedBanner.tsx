import React from 'react';
import { Pin, X } from 'lucide-react';
import { IMessage } from '../../types';

interface PinnedBannerProps {
  pinnedMessage: IMessage | null;
  onScrollToMessage: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
}

export const PinnedBanner: React.FC<PinnedBannerProps> = ({
  pinnedMessage,
  onScrollToMessage,
  onUnpin,
}) => {
  if (!pinnedMessage) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md z-10 animate-in slide-in-from-top duration-200">
      <div
        onClick={() => onScrollToMessage(pinnedMessage._id)}
        className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
      >
        <Pin className="w-4 h-4 text-amber-400 shrink-0 rotate-45" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Pinned Message</p>
          <p className="text-xs text-slate-300 truncate">
            {pinnedMessage.content || pinnedMessage.fileName || pinnedMessage.messageType}
          </p>
        </div>
      </div>

      {onUnpin && (
        <button
          onClick={() => onUnpin(pinnedMessage._id)}
          className="p-1 text-slate-500 hover:text-slate-300 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
