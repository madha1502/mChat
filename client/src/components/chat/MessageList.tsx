import React, { useEffect, useRef } from 'react';
import { IMessage, IConversation } from '../../types';
import { MessageBubble } from './MessageBubble';
import { SkeletonMessage } from '../common/Skeleton';
import { useChatStore } from '../../stores/chatStore';
import { Heart } from 'lucide-react';

interface MessageListProps {
  conversation: IConversation;
  messages: IMessage[];
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  conversation,
  messages,
  isLoading,
}) => {
  const { setReplyingTo } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-[#FFF8FA]">
        <SkeletonMessage isSelf={false} />
        <SkeletonMessage isSelf={true} />
        <SkeletonMessage isSelf={false} />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-[#FFF8FA]/90 space-y-1">
      {/* Date Separator */}
      <div className="flex items-center justify-center my-3">
        <span className="px-3.5 py-1 text-[11px] font-bold text-pink-600 bg-pink-100/80 backdrop-blur-sm rounded-full shadow-sm select-none flex items-center gap-1">
          <Heart className="w-3 h-3 fill-pink-400 text-pink-500" />
          Today
        </span>
      </div>

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 select-none">
          <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-xl">
            🧸
          </div>
          <p className="text-xs text-pink-400 font-bold">
            Say hi to start the conversation! 💖
          </p>
        </div>
      )}

      {/* Messages Stream */}
      {messages.map((message, index) => {
        const previousMessage = index > 0 ? messages[index - 1] : undefined;
        return (
          <MessageBubble
            key={message._id || message.clientMessageId}
            message={message}
            previousMessage={previousMessage}
            onReply={(msg) => setReplyingTo(msg)}
          />
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
};
