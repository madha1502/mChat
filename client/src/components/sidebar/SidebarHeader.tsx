import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useStatusStore } from '../../stores/statusStore';
import { useWhatsAppStore } from '../../stores/whatsappStore';
import { Avatar } from '../common/Avatar';
import {
  MessageSquarePlus,
  Users,
  Settings,
  CircleDashed,
  Heart,
  MessageSquareCode,
  Sparkles,
} from 'lucide-react';

interface SidebarHeaderProps {
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenSettings: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  onOpenNewChat,
  onOpenNewGroup,
  onOpenSettings,
}) => {
  const { user } = useAuthStore();
  const { openCreate, statusGroups } = useStatusStore();
  const { openSimulator } = useWhatsAppStore();

  const hasStories = (statusGroups || []).length > 0;

  return (
    <div className="flex items-center justify-between px-5 py-4 bg-white/90 backdrop-blur-md border-b border-pink-100 select-none">
      {/* User Profile & Stories trigger */}
      <div className="flex items-center gap-3">
        <div
          onClick={openCreate}
          className="relative cursor-pointer group"
          title="Post a 24h Story"
        >
          <Avatar
            src={user?.profilePicture}
            name={user?.name || 'You'}
            size="md"
            isOnline={user?.isOnline}
            className={`ring-2 ${hasStories ? 'ring-pink-500' : 'ring-pink-200'} group-hover:scale-105 transition-transform`}
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white flex items-center justify-center shadow-md">
            <Heart className="w-2.5 h-2.5 fill-white" />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-black text-slate-800 tracking-tight truncate flex items-center gap-1">
              mChat
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            </h1>
          </div>
          <p className="text-xs text-pink-400 font-semibold truncate">
            {user?.name || 'Welcome!'}
          </p>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="flex items-center gap-1">
        {/* Post Story */}
        <button
          onClick={openCreate}
          className="p-2 text-pink-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors"
          title="Share Story"
        >
          <CircleDashed className="w-4 h-4" />
        </button>

        {/* WhatsApp Simulator */}
        <button
          onClick={openSimulator}
          className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
          title="WhatsApp Simulator"
        >
          <MessageSquareCode className="w-4 h-4" />
        </button>

        {/* New Group */}
        <button
          onClick={onOpenNewGroup}
          className="p-2 text-pink-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors"
          title="New Group Chat"
        >
          <Users className="w-4 h-4" />
        </button>

        {/* New Chat */}
        <button
          onClick={onOpenNewChat}
          className="p-2 text-pink-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors"
          title="Start New Chat"
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-pink-50 rounded-full transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
