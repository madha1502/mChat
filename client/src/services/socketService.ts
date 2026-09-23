import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';

let socket: Socket | null = null;

export const socketService = {
  connect(token: string) {
    if (socket?.connected) return;

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (window.location.port === '5173' ? 'http://localhost:5001' : window.location.origin);

    console.log('[Socket.IO] Connecting to:', socketUrl);

    socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to server successfully. Socket ID:', socket?.id);
      useChatStore.getState().setIsConnected(true);

      // Re-join active conversation if one is selected
      const activeConv = useChatStore.getState().activeConversation;
      if (activeConv) {
        socket?.emit('join_conversation', activeConv._id);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected from server. Reason:', reason);
      useChatStore.getState().setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
      useChatStore.getState().setIsConnected(false);
    });

    // Real-time online users count updates
    socket.on('online_count_update', ({ count }: { count: number }) => {
      console.log('[Socket.IO] Real-time online users count:', count);
      useChatStore.getState().setOnlineUsersCount(count);
    });

    // 1. Instant Messaging Listeners
    socket.on('new_message', ({ message, conversationId }: { message: any; conversationId: string }) => {
      console.log('[Socket.IO] Incoming message received:', message);
      useChatStore.getState().handleIncomingMessage(conversationId, message);
    });

    socket.on('conversation_created', () => {
      useChatStore.getState().fetchConversations();
    });

    socket.on('message_status_update', ({ conversationId, messageId, deliveredAt, status }: any) => {
      if (status === 'delivered') {
        useChatStore.getState().handleMessageDelivered(conversationId, messageId, deliveredAt || new Date().toISOString());
      }
    });

    socket.on('message_read_update', ({ conversationId, readerId, readAt }: any) => {
      useChatStore.getState().handleMessageRead(conversationId, readerId, readAt || new Date().toISOString());
    });

    socket.on('message_reaction_update', ({ conversationId, messageId, reactions }: any) => {
      useChatStore.getState().handleReactionUpdated(conversationId, messageId, reactions);
    });

    socket.on('message_edited', ({ conversationId, messageId, content, isEdited }: any) => {
      useChatStore.getState().handleMessageEdited(conversationId, messageId, content, isEdited ?? true);
    });

    socket.on('message_deleted', ({ conversationId, messageId, forEveryone }: any) => {
      useChatStore.getState().handleMessageDeleted(conversationId, messageId, forEveryone ?? true);
    });

    // 2. User Presence & Typing Listeners
    socket.on('user_presence_change', ({ userId, isOnline, lastSeen }: { userId: string; isOnline: boolean; lastSeen?: string }) => {
      useChatStore.getState().handlePresenceChange(userId, isOnline, lastSeen);
    });

    // 3. WebRTC Call Listeners
    socket.on('incoming_call', (data: any) => {
      console.log('[Socket.IO] Incoming WebRTC call:', data);
      useCallStore.getState().handleIncomingCall({
        callId: data.callId,
        caller: data.caller,
        conversationId: data.conversationId,
        type: data.type || data.callType || 'audio',
        offer: data.offer || data.signalData,
      });
    });

    socket.on('call_accepted', (data: any) => {
      useCallStore.getState().handleCallAccepted(data);
    });

    socket.on('ice_candidate', (data: any) => {
      useCallStore.getState().handleIceCandidate(data.candidate);
    });

    socket.on('call_rejected', (data: any) => {
      useCallStore.getState().handleCallRejected(data);
    });

    socket.on('call_ended', (data: any) => {
      useCallStore.getState().handleCallEnded(data);
    });

    socket.on('peer_media_state', (data: any) => {
      useCallStore.getState().handlePeerMediaState(data);
    });
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
      useChatStore.getState().setIsConnected(false);
    }
  },

  emitJoinConversation(conversationId: string) {
    socket?.emit('join_conversation', conversationId);
  },

  joinConversation(conversationId: string) {
    socket?.emit('join_conversation', conversationId);
  },

  emitLeaveConversation(conversationId: string) {
    socket?.emit('leave_conversation', conversationId);
  },

  leaveConversation(conversationId: string) {
    socket?.emit('leave_conversation', conversationId);
  },

  sendMessage(messageData: any) {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket disconnected'));
      socket.emit('send_message', messageData, (response: any) => {
        if (response?.error) reject(new Error(response.error));
        else resolve(response);
      });
    });
  },

  editMessage(messageId: string, content: string) {
    socket?.emit('edit_message', { messageId, content });
  },

  deleteMessage(messageId: string, forEveryone: boolean) {
    socket?.emit('delete_message', { messageId, forEveryone });
  },

  toggleReaction(messageId: string, emoji: string) {
    socket?.emit('toggle_reaction', { messageId, emoji });
  },

  emitRead(conversationId: string, messageIds?: string[]) {
    socket?.emit('mark_read', { conversationId, messageIds });
  },

  emitDelivered(messageId: string, conversationId: string) {
    socket?.emit('mark_delivered', { messageId, conversationId });
  },

  // WebRTC Signal Emitting Methods used by callStore
  callUser(data: { targetUserId: string; conversationId?: string; type: string; offer: any }) {
    socket?.emit('call_user', data);
  },

  answerCall(data: { callId: string; callerId: string; answer: any }) {
    socket?.emit('answer_call', data);
  },

  rejectCall(data: { callId: string; callerId: string }) {
    socket?.emit('reject_call', data);
  },

  endCall(data: { callId: string; targetUserId: string }) {
    socket?.emit('end_call', data);
  },

  sendIceCandidate(targetUserId: string, candidate: any) {
    socket?.emit('ice_candidate', { targetUserId, candidate });
  },

  toggleMediaState(data: { targetUserId: string; isMuted?: boolean; isVideoOff?: boolean }) {
    socket?.emit('toggle_media_state', data);
  },

  emitTyping(conversationId: string) {
    socket?.emit('typing', { conversationId });
  },

  emitStopTyping(conversationId: string) {
    socket?.emit('stop_typing', { conversationId });
  },
};
