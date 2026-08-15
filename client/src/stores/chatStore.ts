import { create } from 'zustand';
import { api } from '../services/api';
import { IConversation, IMessage, IUser } from '../types';
import { socketService } from '../services/socketService';
import { useAuthStore } from './authStore';

interface ChatState {
  conversations: IConversation[];
  activeConversation: IConversation | null;
  messagesByConversation: Record<string, IMessage[]>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isConnected: boolean;
  filter: 'all' | 'unread' | 'groups' | 'whatsapp';
  searchQuery: string;
  typingUsers: Record<string, { userId: string; name: string }[]>;
  replyingTo: IMessage | null;

  // Actions
  setIsConnected: (connected: boolean) => void;
  setFilter: (filter: 'all' | 'unread' | 'groups' | 'whatsapp') => void;
  setSearchQuery: (query: string) => void;
  setReplyingTo: (msg: IMessage | null) => void;

  fetchConversations: () => Promise<void>;
  setActiveConversation: (conversation: IConversation | null) => Promise<void>;
  fetchMessages: (conversationId: string, before?: string) => Promise<void>;

  sendTextMessage: (content: string) => Promise<void>;
  sendMediaMessage: (mediaData: {
    messageType: any;
    mediaUrl: string;
    fileName?: string;
    fileSize?: number;
    caption?: string;
  }) => Promise<void>;
  sendLocationMessage: (location: { latitude: number; longitude: number; name?: string; address?: string }) => Promise<void>;
  sendContactMessage: (contact: { name: string; email?: string; username?: string; userId?: string }) => Promise<void>;

  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  toggleStarMessage: (messageId: string) => Promise<void>;

  togglePinConversation: (conversationId: string) => Promise<void>;
  toggleArchiveConversation: (conversationId: string) => Promise<void>;
  setDisappearingTimer: (conversationId: string, seconds: number) => Promise<void>;

  // Real-time Event Handlers
  handleIncomingMessage: (conversationId: string, message: IMessage) => void;
  handleConversationUpdated: (data: any) => void;
  handleMessageDelivered: (conversationId: string, messageId: string, deliveredAt: string) => void;
  handleMessageRead: (conversationId: string, readerId: string, readAt: string) => void;
  handleMessageEdited: (conversationId: string, messageId: string, content: string, isEdited: boolean) => void;
  handleMessageDeleted: (conversationId: string, messageId: string, forEveryone: boolean) => void;
  handleReactionUpdated: (conversationId: string, messageId: string, reactions: any[]) => void;
  handlePresenceChange: (userId: string, isOnline: boolean, lastSeen?: string) => void;
  setUserTyping: (conversationId: string, userId: string, name: string, isTyping: boolean) => void;
  handleGroupUpdated: (conversationId: string, updates: any) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messagesByConversation: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  isConnected: false,
  filter: 'all',
  searchQuery: '',
  typingUsers: {},
  replyingTo: null,

  setIsConnected: (connected: boolean) => set({ isConnected: connected }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setReplyingTo: (replyingTo) => set({ replyingTo }),

  fetchConversations: async () => {
    try {
      set({ isLoadingConversations: true });
      const res = await api.get('/conversations');
      if (res.data.success) {
        set({ conversations: res.data.data, isLoadingConversations: false });
      }
    } catch (err) {
      set({ isLoadingConversations: false });
    }
  },

  setActiveConversation: async (conversation: IConversation | null) => {
    const prev = get().activeConversation;
    if (prev) {
      socketService.leaveConversation(prev._id);
    }

    set({ activeConversation: conversation, replyingTo: null });

    if (conversation) {
      socketService.joinConversation(conversation._id);
      socketService.emitRead(conversation._id);

      // Reset local unread count
      const updatedConversations = get().conversations.map((c) =>
        c._id === conversation._id ? { ...c, unreadCount: 0 } : c
      );
      set({ conversations: updatedConversations });

      await get().fetchMessages(conversation._id);
    }
  },

  fetchMessages: async (conversationId: string, before?: string) => {
    try {
      set({ isLoadingMessages: true });
      const url = before ? `/messages/${conversationId}?before=${before}&limit=50` : `/messages/${conversationId}?limit=50`;
      const res = await api.get(url);
      if (res.data.success) {
        const newMsgs: IMessage[] = res.data.data;
        const existing = get().messagesByConversation[conversationId] || [];

        const merged = before ? [...newMsgs, ...existing] : newMsgs;
        // Deduplicate messages by _id
        const unique = Array.from(new Map(merged.map((m) => [m._id || m.clientMessageId, m])).values());

        set({
          messagesByConversation: {
            ...get().messagesByConversation,
            [conversationId]: unique,
          },
          isLoadingMessages: false,
        });
      }
    } catch (err) {
      set({ isLoadingMessages: false });
    }
  },

  sendTextMessage: async (content: string) => {
    const activeConv = get().activeConversation;
    const currentUser = useAuthStore.getState().user;
    if (!activeConv || !currentUser || !content.trim()) return;

    const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const replyTo = get().replyingTo;

    // Optimistic message
    const optimisticMessage: IMessage = {
      _id: clientMessageId,
      clientMessageId,
      conversationId: activeConv._id,
      senderId: currentUser,
      messageType: 'text',
      content,
      replyTo: replyTo || undefined,
      reactions: [],
      sentAt: new Date().toISOString(),
      status: 'sending',
      source: activeConv.source,
    };

    const convMsgs = get().messagesByConversation[activeConv._id] || [];
    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [activeConv._id]: [...convMsgs, optimisticMessage],
      },
      replyingTo: null,
    });

    try {
      if (activeConv.source === 'whatsapp_business' && activeConv.whatsappMetadata) {
        // Outbound WhatsApp message
        await api.post('/integrations/whatsapp/send', {
          recipientPhone: activeConv.whatsappMetadata.customerPhoneNumber,
          messageType: 'text',
          content,
          clientMessageId,
        });
      } else {
        // Real-time socket message
        await socketService.sendMessage({
          clientMessageId,
          conversationId: activeConv._id,
          messageType: 'text',
          content,
          replyTo: replyTo?._id,
        });
      }
    } catch (err) {
      // Mark optimistic message as failed
      const updated = (get().messagesByConversation[activeConv._id] || []).map((m) =>
        m.clientMessageId === clientMessageId ? { ...m, status: 'failed' as const } : m
      );
      set({
        messagesByConversation: {
          ...get().messagesByConversation,
          [activeConv._id]: updated,
        },
      });
    }
  },

  sendMediaMessage: async (mediaData) => {
    const activeConv = get().activeConversation;
    const currentUser = useAuthStore.getState().user;
    if (!activeConv || !currentUser) return;

    const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const optimisticMessage: IMessage = {
      _id: clientMessageId,
      clientMessageId,
      conversationId: activeConv._id,
      senderId: currentUser,
      messageType: mediaData.messageType,
      content: mediaData.caption || '',
      mediaUrl: mediaData.mediaUrl,
      fileName: mediaData.fileName,
      fileSize: mediaData.fileSize,
      reactions: [],
      sentAt: new Date().toISOString(),
      status: 'sending',
      source: activeConv.source,
    };

    const convMsgs = get().messagesByConversation[activeConv._id] || [];
    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [activeConv._id]: [...convMsgs, optimisticMessage],
      },
      replyingTo: null,
    });

    try {
      if (activeConv.source === 'whatsapp_business' && activeConv.whatsappMetadata) {
        await api.post('/integrations/whatsapp/send', {
          recipientPhone: activeConv.whatsappMetadata.customerPhoneNumber,
          messageType: mediaData.messageType,
          mediaUrl: mediaData.mediaUrl,
          caption: mediaData.caption,
          fileName: mediaData.fileName,
          clientMessageId,
        });
      } else {
        await socketService.sendMessage({
          clientMessageId,
          conversationId: activeConv._id,
          messageType: mediaData.messageType,
          mediaUrl: mediaData.mediaUrl,
          fileName: mediaData.fileName,
          fileSize: mediaData.fileSize,
          content: mediaData.caption || '',
          replyTo: get().replyingTo?._id,
        });
      }
    } catch (err) {
      const updated = (get().messagesByConversation[activeConv._id] || []).map((m) =>
        m.clientMessageId === clientMessageId ? { ...m, status: 'failed' as const } : m
      );
      set({
        messagesByConversation: {
          ...get().messagesByConversation,
          [activeConv._id]: updated,
        },
      });
    }
  },

  sendLocationMessage: async (location) => {
    const activeConv = get().activeConversation;
    const currentUser = useAuthStore.getState().user;
    if (!activeConv || !currentUser) return;

    const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await socketService.sendMessage({
      clientMessageId,
      conversationId: activeConv._id,
      messageType: 'location',
      location,
      content: `📍 Location: ${location.name || `${location.latitude}, ${location.longitude}`}`,
    });
  },

  sendContactMessage: async (contact) => {
    const activeConv = get().activeConversation;
    const currentUser = useAuthStore.getState().user;
    if (!activeConv || !currentUser) return;

    const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await socketService.sendMessage({
      clientMessageId,
      conversationId: activeConv._id,
      messageType: 'contact',
      contact,
      content: `👤 Contact: ${contact.name}`,
    });
  },

  editMessage: async (messageId: string, content: string) => {
    await socketService.editMessage(messageId, content);
  },

  deleteMessage: async (messageId: string, forEveryone: boolean) => {
    await socketService.deleteMessage(messageId, forEveryone);
  },

  toggleReaction: async (messageId: string, emoji: string) => {
    await socketService.toggleReaction(messageId, emoji);
  },

  toggleStarMessage: async (messageId: string) => {
    await api.post(`/messages/${messageId}/star`);
  },

  togglePinConversation: async (conversationId: string) => {
    const res = await api.post(`/conversations/${conversationId}/pin`);
    if (res.data.success) {
      const updated = get().conversations.map((c) =>
        c._id === conversationId ? { ...c, isPinned: res.data.data.isPinned } : c
      );
      set({ conversations: updated });
    }
  },

  toggleArchiveConversation: async (conversationId: string) => {
    const res = await api.post(`/conversations/${conversationId}/archive`);
    if (res.data.success) {
      const updated = get().conversations.map((c) =>
        c._id === conversationId ? { ...c, isArchived: res.data.data.isArchived } : c
      );
      set({ conversations: updated });
    }
  },

  setDisappearingTimer: async (conversationId: string, seconds: number) => {
    const res = await api.post(`/conversations/${conversationId}/disappearing`, { seconds });
    if (res.data.success && get().activeConversation?._id === conversationId) {
      set({
        activeConversation: {
          ...get().activeConversation!,
          disappearingTimer: seconds,
        },
      });
    }
  },

  // Real-time Event Handlers
  handleIncomingMessage: (conversationId: string, message: IMessage) => {
    const activeConv = get().activeConversation;
    const isCurrentActive = activeConv?._id === conversationId;

    // 1. Update message stream for this conversation
    const currentMsgs = get().messagesByConversation[conversationId] || [];
    // Replace optimistic message if match by clientMessageId or append
    const existsIndex = currentMsgs.findIndex(
      (m) => m.clientMessageId === message.clientMessageId || m._id === message._id
    );

    let updatedMsgs: IMessage[];
    if (existsIndex > -1) {
      updatedMsgs = [...currentMsgs];
      updatedMsgs[existsIndex] = message;
    } else {
      updatedMsgs = [...currentMsgs, message];
    }

    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: updatedMsgs,
      },
    });

    // 2. Mark as read immediately if currently viewing this active conversation
    if (isCurrentActive) {
      socketService.emitRead(conversationId, [message._id]);
    } else {
      // Emit delivery receipt
      socketService.emitDelivered(message._id, conversationId);
    }

    // 3. Update preview in conversations list
    const hasConvInList = get().conversations.some((c) => c._id === conversationId);
    if (!hasConvInList) {
      get().fetchConversations();
    } else {
      const updatedConversations = get().conversations.map((c) => {
        if (c._id === conversationId) {
          return {
            ...c,
            lastMessage: message,
            lastMessageAt: message.sentAt || new Date().toISOString(),
            unreadCount: isCurrentActive ? 0 : (c.unreadCount || 0) + 1,
          };
        }
        return c;
      });

      // Move latest conversation to top
      updatedConversations.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const dateA = new Date(a.lastMessageAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.lastMessageAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      set({ conversations: updatedConversations });
    }
  },

  handleConversationUpdated: ({ conversationId, lastMessage, unreadCount }: any) => {
    const activeConv = get().activeConversation;
    const isCurrentActive = activeConv?._id === conversationId;

    const hasConvInList = get().conversations.some((c) => c._id === conversationId);
    if (!hasConvInList) {
      get().fetchConversations();
      return;
    }

    const updated = get().conversations.map((c) => {
      if (c._id === conversationId) {
        return {
          ...c,
          lastMessage: lastMessage || c.lastMessage,
          unreadCount: isCurrentActive ? 0 : unreadCount,
          lastMessageAt: lastMessage?.sentAt || new Date().toISOString(),
        };
      }
      return c;
    });

    // Move updated conversation to top
    updated.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime();
    });

    set({ conversations: updated });
  },

  handleMessageDelivered: (conversationId: string, messageId: string, deliveredAt: string) => {
    const msgs = get().messagesByConversation[conversationId];
    if (!msgs) return;

    const updated = msgs.map((m) =>
      m._id === messageId || m.clientMessageId === messageId ? { ...m, deliveredAt, status: 'delivered' as const } : m
    );

    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: updated,
      },
    });
  },

  handleMessageRead: (conversationId: string, _readerId: string, readAt: string) => {
    const msgs = get().messagesByConversation[conversationId];
    if (!msgs) return;

    const updated = msgs.map((m) => ({ ...m, readAt, status: 'read' as const }));

    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: updated,
      },
    });
  },

  handleMessageEdited: (conversationId: string, messageId: string, content: string, isEdited: boolean) => {
    const msgs = get().messagesByConversation[conversationId];
    if (!msgs) return;

    const updated = msgs.map((m) =>
      m._id === messageId ? { ...m, content, isEdited } : m
    );

    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: updated,
      },
    });
  },

  handleMessageDeleted: (conversationId: string, messageId: string, forEveryone: boolean) => {
    const msgs = get().messagesByConversation[conversationId];
    if (!msgs) return;

    let updated: IMessage[];
    if (forEveryone) {
      updated = msgs.map((m) =>
        m._id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted', mediaUrl: undefined } : m
      );
    } else {
      updated = msgs.filter((m) => m._id !== messageId);
    }

    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: updated,
      },
    });
  },

  handleReactionUpdated: (conversationId: string, messageId: string, reactions: any[]) => {
    const msgs = get().messagesByConversation[conversationId];
    if (!msgs) return;

    const updated = msgs.map((m) => (m._id === messageId ? { ...m, reactions } : m));

    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: updated,
      },
    });
  },

  handlePresenceChange: (userId: string, isOnline: boolean, lastSeen?: string) => {
    const updatedConversations = get().conversations.map((c) => {
      const updatedParticipants = c.participants.map((p) =>
        p._id === userId ? { ...p, isOnline, lastSeen: lastSeen || p.lastSeen } : p
      );
      return { ...c, participants: updatedParticipants };
    });

    let updatedActive = get().activeConversation;
    if (updatedActive) {
      updatedActive = {
        ...updatedActive,
        participants: updatedActive.participants.map((p) =>
          p._id === userId ? { ...p, isOnline, lastSeen: lastSeen || p.lastSeen } : p
        ),
      };
    }

    set({
      conversations: updatedConversations,
      activeConversation: updatedActive,
    });
  },

  setUserTyping: (conversationId: string, userId: string, name: string, isTyping: boolean) => {
    const current = get().typingUsers[conversationId] || [];
    let updated: { userId: string; name: string }[];

    if (isTyping) {
      if (!current.some((u) => u.userId === userId)) {
        updated = [...current, { userId, name }];
      } else {
        updated = current;
      }
    } else {
      updated = current.filter((u) => u.userId !== userId);
    }

    set({
      typingUsers: {
        ...get().typingUsers,
        [conversationId]: updated,
      },
    });
  },

  handleGroupUpdated: (conversationId: string, updates: any) => {
    const updated = get().conversations.map((c) =>
      c._id === conversationId ? { ...c, group: { ...c.group, ...updates } } : c
    );
    set({ conversations: updated });
  },
}));
