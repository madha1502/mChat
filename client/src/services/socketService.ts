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
      import.meta.env.VITE_API_URL ||
      (window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin);

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

    // 1. Instant Messaging Listeners
    socket.on('new_message', ({ message, conversationId }: { message: any; conversationId: string }) => {
      console.log('[Socket.IO] Incoming message received:', message);
      useChatStore.getState().handleIncomingMessage(conversationId, message);
    });

    socket.on('conversation_created', () => {
      useChatStore.getState().fetchConversations();
    });

    socket.on('conversation_updated', (data: any) => {
      useChatStore.getState().handleConversationUpdated(data);
    });

    socket.on('message_delivered', ({ messageId, conversationId, deliveredAt }: any) => {
      useChatStore.getState().handleMessageDelivered(conversationId, messageId, deliveredAt);
    });

    socket.on('message_read', ({ conversationId, readerId, readAt }: any) => {
      useChatStore.getState().handleMessageRead(conversationId, readerId, readAt);
    });

    socket.on('message_edited', ({ messageId, conversationId, content, isEdited }: any) => {
      useChatStore.getState().handleMessageEdited(conversationId, messageId, content, isEdited);
    });

    socket.on('message_deleted', ({ messageId, conversationId, forEveryone }: any) => {
      useChatStore.getState().handleMessageDeleted(conversationId, messageId, forEveryone);
    });

    socket.on('reaction_updated', ({ messageId, conversationId, reactions }: any) => {
      useChatStore.getState().handleReactionUpdated(conversationId, messageId, reactions);
    });

    // 2. Presence & Typing Listeners
    socket.on('user_presence_change', (data: { userId: string; isOnline: boolean; lastSeen?: string }) => {
      useChatStore.getState().handlePresenceChange(data.userId, data.isOnline, data.lastSeen);
    });

    socket.on('user_typing', ({ conversationId, userId, userName }: any) => {
      useChatStore.getState().setUserTyping(conversationId, userId, userName, true);
    });

    socket.on('user_stop_typing', ({ conversationId, userId }: any) => {
      useChatStore.getState().setUserTyping(conversationId, userId, '', false);
    });

    // 3. WebRTC Signaling Listeners
    socket.on('incoming_call', (data: any) => {
      useCallStore.getState().handleIncomingCall(data);
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

    socket.on('peer_media_state_changed', (data: any) => {
      useCallStore.getState().handlePeerMediaState(data);
    });

    // 4. Group Updates
    socket.on('group_added', () => {
      useChatStore.getState().fetchConversations();
    });

    socket.on('group_metadata_updated', ({ conversationId, updates }: any) => {
      useChatStore.getState().handleGroupUpdated(conversationId, updates);
    });
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket(): Socket | null {
    return socket;
  },

  joinConversation(conversationId: string) {
    socket?.emit('join_conversation', conversationId);
  },

  leaveConversation(conversationId: string) {
    socket?.emit('leave_conversation', conversationId);
  },

  sendMessage(messageData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!socket?.connected) {
        return reject(new Error('Socket not connected'));
      }
      socket.emit('send_message', messageData, (response: any) => {
        if (response?.success) {
          resolve(response.message);
        } else {
          reject(new Error(response?.error || 'Failed to send message'));
        }
      });
    });
  },

  emitTyping(conversationId: string) {
    socket?.emit('typing', { conversationId });
  },

  emitStopTyping(conversationId: string) {
    socket?.emit('stop_typing', { conversationId });
  },

  emitRead(conversationId: string, messageIds?: string[]) {
    socket?.emit('message_read', { conversationId, messageIds });
  },

  emitDelivered(messageId: string, conversationId: string) {
    socket?.emit('message_delivered', { messageId, conversationId });
  },

  editMessage(messageId: string, content: string): Promise<any> {
    return new Promise((resolve, reject) => {
      socket?.emit('edit_message', { messageId, content }, (res: any) => {
        if (res?.success) resolve(res.message);
        else reject(new Error(res?.error || 'Failed to edit message'));
      });
    });
  },

  deleteMessage(messageId: string, forEveryone: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      socket?.emit('delete_message', { messageId, forEveryone }, (res: any) => {
        if (res?.success) resolve();
        else reject(new Error(res?.error || 'Failed to delete message'));
      });
    });
  },

  toggleReaction(messageId: string, emoji: string): Promise<any> {
    return new Promise((resolve, reject) => {
      socket?.emit('toggle_reaction', { messageId, emoji }, (res: any) => {
        if (res?.success) resolve(res.reactions);
        else reject(new Error(res?.error || 'Failed to toggle reaction'));
      });
    });
  },

  // WebRTC Signaling Calls
  callUser(data: { targetUserId: string; conversationId?: string; type: 'audio' | 'video'; offer: any }) {
    socket?.emit('call_user', data);
  },

  answerCall(data: { callId: string; callerId: string; answer: any }) {
    socket?.emit('answer_call', data);
  },

  sendIceCandidate(targetUserId: string, candidate: any) {
    socket?.emit('ice_candidate', { targetUserId, candidate });
  },

  rejectCall(data: { callId: string; callerId: string; reason?: string }) {
    socket?.emit('reject_call', data);
  },

  endCall(data: { callId?: string; targetUserId?: string }) {
    socket?.emit('end_call', data);
  },

  toggleMediaState(data: { targetUserId: string; isMuted?: boolean; isVideoOff?: boolean; isScreenSharing?: boolean }) {
    socket?.emit('toggle_media_state', data);
  },
};
