import React from 'react';
import { useChatStore } from '../../stores/chatStore';
import { ConversationItem } from './ConversationItem';
import { SkeletonConversation } from '../common/Skeleton';
import { MessageSquarePlus, Heart, Sparkles } from 'lucide-react';
import { IUser } from '../../types';

interface ConversationListProps {
  onOpenNewChat: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ onOpenNewChat }) => {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    isLoadingConversations,
    filter,
    searchQuery,
  } = useChatStore();

  if (isLoadingConversations) {
    return (
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonConversation key={i} />
        ))}
      </div>
    );
  }

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    // 1. Tab filter
    if (filter === 'unread' && (!c.unreadCount || c.unreadCount === 0)) return false;
    if (filter === 'groups' && c.type !== 'group') return false;
    if (filter === 'whatsapp' && c.source !== 'whatsapp_business') return false;

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title =
        c.type === 'group'
          ? c.group?.name || ''
          : c.source === 'whatsapp_business'
          ? c.whatsappMetadata?.customerName || c.whatsappMetadata?.customerPhoneNumber || ''
          : (c.participants as IUser[]).map((p) => p.name).join(' ');

      return title.toLowerCase().includes(q);
    }

    return true;
  });

  if (filteredConversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-pink-100/80 flex items-center justify-center text-pink-500 shadow-sm animate-gentle-bounce">
          <Heart className="w-7 h-7 fill-pink-300 text-pink-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-700">No sweet chats yet</h3>
          <p className="text-xs text-slate-400 max-w-[200px]">
            Start a new conversation with someone special!
          </p>
        </div>
        <button
          onClick={onOpenNewChat}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white text-xs font-bold rounded-full shadow-md shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Start New Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
      {filteredConversations.map((conversation) => (
        <ConversationItem
          key={conversation._id}
          conversation={conversation}
          isActive={activeConversation?._id === conversation._id}
          onClick={() => setActiveConversation(conversation)}
        />
      ))}
    </div>
  );
};
