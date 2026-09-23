import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useStatusStore } from '../../stores/statusStore';
import { useWhatsAppStore } from '../../stores/whatsappStore';
import { useChatStore } from '../../stores/chatStore';
import { useThemeStore, ThemeType } from '../../stores/themeStore';
import { Avatar } from '../common/Avatar';
import {
  MessageSquarePlus,
  Users,
  Settings,
  CircleDashed,
  Heart,
  MessageSquareCode,
  Sparkles,
  Palette,
  Check,
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
  const { onlineUsersCount } = useChatStore();
  const { openSimulator } = useWhatsAppStore();
  const { theme, setTheme } = useThemeStore();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const hasStories = (statusGroups || []).length > 0;

  const themeOptions: { id: ThemeType; name: string; color: string; badgeBg: string }[] = [
    { id: 'pastel', name: 'Sweet Pastel', color: '#ff758c', badgeBg: 'bg-pink-500' },
    { id: 'dark', name: 'Midnight Dark', color: '#6366f1', badgeBg: 'bg-indigo-500' },
    { id: 'cyberpunk', name: 'Cyberpunk', color: '#ec4899', badgeBg: 'bg-fuchsia-500' },
    { id: 'emerald', name: 'Emerald Forest', color: '#10b981', badgeBg: 'bg-emerald-500' },
  ];

  return (
    <header className="p-4 bg-white/90 dark:bg-slate-900/90 border-b border-pink-100/90 dark:border-slate-800 flex items-center justify-between gap-3 select-none transition-colors">
      {/* Current User Profile Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative group cursor-pointer" onClick={onOpenSettings}>
          <Avatar
            src={user?.profilePicture}
            name={user?.name || 'User'}
            size="md"
            isOnline={user?.isOnline}
            className={`ring-2 ${hasStories ? 'ring-pink-500' : 'ring-pink-200 dark:ring-slate-700'} group-hover:scale-105 transition-transform`}
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white flex items-center justify-center shadow-md">
            <Heart className="w-2.5 h-2.5 fill-white" />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight truncate flex items-center gap-1">
              mChat
              <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shadow-sm" title="Real-time online users count">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {onlineUsersCount} online
            </span>
          </div>
          <p className="text-xs text-pink-500 dark:text-pink-400 font-semibold truncate">
            {user?.name || 'Welcome!'}
          </p>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="flex items-center gap-1 relative">
        {/* Theme Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 text-pink-500 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 rounded-full transition-all hover:scale-105 active:scale-95"
            title="Change UI Theme"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Theme Dropdown Menu */}
          {showThemeMenu && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-pink-100 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              onMouseLeave={() => setShowThemeMenu(false)}
            >
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Theme
              </div>
              {themeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTheme(opt.id);
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors hover:bg-pink-50 dark:hover:bg-slate-700/60 ${
                    theme === opt.id
                      ? 'text-pink-600 dark:text-pink-400 bg-pink-50/70 dark:bg-slate-700/40'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${opt.badgeBg}`} />
                    <span>{opt.name}</span>
                  </div>
                  {theme === opt.id && <Check className="w-3.5 h-3.5 text-pink-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Post Story */}
        <button
          onClick={openCreate}
          className="p-2 text-pink-500 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 rounded-full transition-all hover:scale-105 active:scale-95"
          title="Share Story"
        >
          <CircleDashed className="w-4 h-4" />
        </button>

        {/* WhatsApp Simulation */}
        <button
          onClick={openSimulator}
          className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition-all hover:scale-105 active:scale-95"
          title="WhatsApp Cloud Simulator"
        >
          <MessageSquareCode className="w-4 h-4" />
        </button>

        {/* New Group */}
        <button
          onClick={onOpenNewGroup}
          className="p-2 text-pink-500 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 rounded-full transition-all hover:scale-105 active:scale-95"
          title="New Group Chat"
        >
          <Users className="w-4 h-4" />
        </button>

        {/* New Chat */}
        <button
          onClick={onOpenNewChat}
          className="p-2 text-pink-500 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 rounded-full transition-all hover:scale-105 active:scale-95"
          title="Start New Chat"
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-400 dark:text-slate-400 hover:bg-pink-50 dark:hover:bg-slate-800 rounded-full transition-all hover:scale-105 active:scale-95"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
