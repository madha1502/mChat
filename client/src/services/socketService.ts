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

    socket.on('message_status_update', ({ messageId, status }: { messageId: string; status: string }) => {
      useChatStore.getState().handleMessageStatusUpdate(messageId, status);
    });

    socket.on('message_reaction_update', ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
      useChatStore.getState().handleReactionUpdate(messageId, reactions);
    });

    socket.on('message_edited', ({ messageId, content }: { messageId: string; content: string }) => {
      useChatStore.getState().handleMessageEdited(messageId, content);
    });

    socket.on('message_deleted', ({ messageId }: { messageId: string }) => {
      useChatStore.getState().handleMessageDeleted(messageId);
    });

    // 2. Typing Indicator Listeners
    socket.on('user_typing', ({ conversationId, userId, userName }: { conversationId: string; userId: string; userName: string }) => {
      useChatStore.getState().handleUserTyping(conversationId, userId, userName);
    });

    socket.on('user_stop_typing', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      useChatStore.getState().handleUserStopTyping(conversationId, userId);
    });

    // 3. User Presence Listeners
    socket.on('user_presence_change', ({ userId, isOnline, lastSeen }: { userId: string; isOnline: boolean; lastSeen?: string }) => {
      useChatStore.getState().handleUserPresenceChange(userId, isOnline, lastSeen);
    });

    // 4. WebRTC Peer-to-Peer Video/Voice Call Listeners
    socket.on('incoming_call', (data: { callId: string; caller: any; callType: 'audio' | 'video'; conversationId: string }) => {
      console.log('[Socket.IO] Incoming WebRTC call:', data);
      useCallStore.getState().handleIncomingCall(data);
    });

    socket.on('call_answered', (data: { callId: string; signalData: any }) => {
      console.log('[Socket.IO] Call answered by peer:', data);
      useCallStore.getState().handleCallAnswered(data);
    });

    socket.on('webrtc_signal', (data: { callId: string; signalData: any }) => {
      useCallStore.getState().handleWebRTCSignal(data);
    });

    socket.on('call_rejected', () => {
      useCallStore.getState().endCall();
    });

    socket.on('call_ended', () => {
      useCallStore.getState().endCall();
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

  emitLeaveConversation(conversationId: string) {
    socket?.emit('leave_conversation', conversationId);
  },

  emitTyping(conversationId: string) {
    socket?.emit('typing', { conversationId });
  },

  emitStopTyping(conversationId: string) {
    socket?.emit('stop_typing', { conversationId });
  },

  // WebRTC Signal Emitting
  emitCallSignal(targetUserId: string, signalData: any, callId: string) {
    socket?.emit('webrtc_signal', { targetUserId, signalData, callId });
  },

  emitRejectCall(callerId: string, callId: string) {
    socket?.emit('reject_call', { callerId, callId });
  },

  emitEndCall(peerUserId: string, callId: string) {
    socket?.emit('end_call', { peerUserId, callId });
  },
};
