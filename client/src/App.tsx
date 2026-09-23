import React, { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useChatStore } from './stores/chatStore';
import { useStatusStore } from './stores/statusStore';
import { useWhatsAppStore } from './stores/whatsappStore';
import { useThemeStore } from './stores/themeStore';

// Components
import { AuthModal } from './components/auth/AuthModal';
import { SidebarHeader } from './components/sidebar/SidebarHeader';
import { SearchBar } from './components/sidebar/SearchBar';
import { ConversationList } from './components/sidebar/ConversationList';
import { ChatHeader } from './components/chat/ChatHeader';
import { PinnedBanner } from './components/chat/PinnedBanner';
import { MessageList } from './components/chat/MessageList';
import { ChatInput } from './components/chat/ChatInput';
import { FloatingHearts } from './components/common/FloatingHearts';

// Modals
import { CallModal } from './components/calls/CallModal';
import { StatusViewerModal } from './components/status/StatusViewerModal';
import { CreateStatusModal } from './components/status/CreateStatusModal';
import { NewChatModal } from './components/groups/NewChatModal';
import { NewGroupModal } from './components/groups/NewGroupModal';
import { GroupInfoModal } from './components/groups/GroupInfoModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { WhatsAppConnectModal } from './components/whatsapp/WhatsAppConnectModal';
import { WhatsAppSimulatorModal } from './components/whatsapp/WhatsAppSimulatorModal';

// Icons
import { Heart, Plus, Sparkles, MessageSquareCode } from 'lucide-react';

export const App: React.FC = () => {
  const { user, isInitialized, initializeAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messagesByConversation,
    isLoadingMessages,
    fetchConversations,
  } = useChatStore();
  const { fetchStatuses } = useStatusStore();
  const { fetchIntegration, openSimulator } = useWhatsAppStore();

  // Modal Visibility States
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize auth & data on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchStatuses();
      fetchIntegration();
    }
  }, [user]);

  if (!isInitialized) {
    return (
      <div className={`theme-${theme} h-screen w-screen flex items-center justify-center [background:var(--bg-gradient)] text-slate-700`}>
        <FloatingHearts />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-14 h-14 rounded-full [background:var(--header-bg)] text-white flex items-center justify-center shadow-lg shadow-pink-500/25 animate-bounce">
            <Heart className="w-7 h-7 fill-white" />
          </div>
          <p className="text-xs font-bold text-pink-500 tracking-wider uppercase animate-pulse">
            Loading mChat... 💖
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`theme-${theme}`}>
        <AuthModal />
      </div>
    );
  }

  const activeMessages = activeConversation ? messagesByConversation[activeConversation._id] || [] : [];
  const pinnedMessage = activeMessages.find((m) => m.pinned) || null;

  return (
    <div className={`theme-${theme} relative flex h-screen w-screen [background:var(--bg-gradient)] text-slate-800 dark:text-slate-100 overflow-hidden select-none p-0 md:p-6 lg:p-8 transition-colors`}>
      {/* Floating Animated Hearts / Ambient Background */}
      {theme === 'pastel' && <FloatingHearts />}

      {/* Main Glass Card Container */}
      <div className="relative z-10 w-full h-full max-w-7xl mx-auto flex rounded-none md:rounded-[32px] shadow-2xl bubble-glass overflow-hidden">
        {/* 1. LEFT SIDEBAR (Desktop: 360px-390px, Mobile: Full screen when no active chat) */}
        <aside
          className={`w-full md:w-[360px] lg:w-[390px] h-full flex flex-col bg-white/80 dark:bg-slate-900/80 border-r border-pink-100/90 dark:border-slate-800 shrink-0 z-10 transition-all ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          <SidebarHeader
            onOpenNewChat={() => setIsNewChatOpen(true)}
            onOpenNewGroup={() => setIsNewGroupOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
          <SearchBar />
          <ConversationList onOpenNewChat={() => setIsNewChatOpen(true)} />
        </aside>

        {/* 2. RIGHT CHAT AREA (Desktop: Flex-1, Mobile: Full screen when conversation active) */}
        <main
          className={`flex-1 h-full flex flex-col bg-[#FFF8FA]/90 dark:bg-slate-950/90 overflow-hidden transition-colors ${
            !activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              <ChatHeader
                conversation={activeConversation}
                onBack={() => setActiveConversation(null)}
                onOpenGroupInfo={() => setIsGroupInfoOpen(true)}
              />
              <PinnedBanner
                pinnedMessage={pinnedMessage}
                onScrollToMessage={(msgId) => {
                  const el = document.getElementById(`msg-${msgId}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
              <MessageList
                conversation={activeConversation}
                messages={activeMessages}
                isLoading={isLoadingMessages}
              />
              <ChatInput />
            </>
          ) : (
            /* Empty Chat Area State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-pink-100 to-rose-200 dark:from-slate-800 dark:to-purple-950 flex items-center justify-center text-4xl shadow-xl animate-gentle-bounce border border-pink-200/50 dark:border-purple-800/40">
                  🐼💖🧸
                </div>
              </div>

              <div className="space-y-2 max-w-sm">
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center justify-center gap-2">
                  mChat
                  <Heart className="w-6 h-6 fill-pink-500 text-pink-500 animate-pulse" />
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Unified real-time messaging with custom themes, glassmorphism, WebRTC calling, and Meta WhatsApp Cloud integration.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setIsNewChatOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 [background:var(--header-bg)] text-white rounded-full text-xs font-bold shadow-lg shadow-pink-500/25 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Start New Chat
                </button>

                <button
                  onClick={openSimulator}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:scale-105 active:scale-95 transition-all"
                >
                  <MessageSquareCode className="w-4 h-4" />
                  WhatsApp Inbound
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. GLOBAL MODALS */}
      <CallModal />
      <StatusViewerModal />
      <CreateStatusModal />
      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      <NewGroupModal isOpen={isNewGroupOpen} onClose={() => setIsNewGroupOpen(false)} />
      {activeConversation && activeConversation.type === 'group' && (
        <GroupInfoModal
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          conversation={activeConversation}
        />
      )}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <WhatsAppConnectModal />
      <WhatsAppSimulatorModal />
    </div>
  );
};

export default App;
