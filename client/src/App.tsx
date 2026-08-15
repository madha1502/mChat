import React, { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useChatStore } from './stores/chatStore';
import { useStatusStore } from './stores/statusStore';
import { useWhatsAppStore } from './stores/whatsappStore';

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
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 text-slate-700">
        <FloatingHearts />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white flex items-center justify-center shadow-lg shadow-pink-500/25 animate-bounce">
            <Heart className="w-7 h-7 fill-white" />
          </div>
          <p className="text-xs font-bold text-pink-500 tracking-wider uppercase animate-pulse">
            Loading Love Bubble... 💖
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  const activeMessages = activeConversation ? messagesByConversation[activeConversation._id] || [] : [];
  const pinnedMessage = activeMessages.find((m) => m.pinned) || null;

  return (
    <div className="relative flex h-screen w-screen bg-gradient-to-br from-pink-100 via-rose-50 via-purple-50 to-blue-100 text-slate-800 overflow-hidden select-none p-0 md:p-6 lg:p-8">
      {/* Floating Animated Hearts Background */}
      <FloatingHearts />

      {/* Main Glass Card Container */}
      <div className="relative z-10 w-full h-full max-w-7xl mx-auto flex rounded-none md:rounded-[32px] shadow-2xl bg-white/90 backdrop-blur-xl border border-white/80 overflow-hidden">
        {/* 1. LEFT SIDEBAR (Desktop: 360px-400px, Mobile: Full screen when no active chat) */}
        <aside
          className={`w-full md:w-[360px] lg:w-[390px] h-full flex flex-col bg-white/80 border-r border-pink-100/90 shrink-0 z-10 transition-all ${
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
          className={`flex-1 h-full flex flex-col bg-[#FFF8FA]/90 overflow-hidden ${
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
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-pink-100 to-rose-200 flex items-center justify-center text-4xl shadow-xl animate-gentle-bounce">
                  🐼💖🧸
                </div>
              </div>

              <div className="space-y-2 max-w-sm">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-2">
                  Love Bubble
                  <Heart className="w-6 h-6 fill-pink-500 text-pink-500" />
                </h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Chat in style with floating hearts, bouncy bubbles, real-time voice notes, and WhatsApp Business integration.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setIsNewChatOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white rounded-full text-xs font-bold shadow-lg shadow-pink-500/25 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Start New Chat
                </button>

                <button
                  onClick={openSimulator}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-xs font-bold hover:bg-emerald-100 hover:scale-105 active:scale-95 transition-all"
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
