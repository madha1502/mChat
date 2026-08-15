import { create } from 'zustand';
import { IUser, CallType, CallStatus } from '../types';
import { socketService } from '../services/socketService';
import { webrtcManager } from '../services/webrtcService';

interface CallState {
  callStatus: CallStatus;
  callId: string | null;
  callType: CallType;
  peerUser: IUser | null;
  conversationId?: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  duration: number;
  pendingOffer: any | null;

  // Actions
  startCall: (targetUser: IUser, type: CallType, conversationId?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;

  // Sockets Event Handlers
  handleIncomingCall: (data: { callId: string; caller: IUser; conversationId?: string; type: CallType; offer: any }) => void;
  handleCallAccepted: (data: { callId: string; receiverId: string; answer: any }) => void;
  handleIceCandidate: (candidate: any) => void;
  handleCallRejected: (data: { callId: string; reason?: string }) => void;
  handleCallEnded: (data: { callId?: string; endedBy: string }) => void;
  handlePeerMediaState: (data: any) => void;
}

let timerInterval: any = null;

export const useCallStore = create<CallState>((set, get) => ({
  callStatus: 'idle',
  callId: null,
  callType: 'audio',
  peerUser: null,
  conversationId: undefined,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  duration: 0,
  pendingOffer: null,

  startCall: async (targetUser: IUser, type: CallType, conversationId?: string) => {
    try {
      set({
        callStatus: 'calling',
        callType: type,
        peerUser: targetUser,
        conversationId,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        duration: 0,
      });

      webrtcManager.initPeerConnection(
        (remoteStream) => {
          set({ remoteStream });
        },
        (candidate) => {
          socketService.sendIceCandidate(targetUser._id, candidate);
        }
      );

      const localStream = await webrtcManager.getLocalMedia(type);
      set({ localStream });

      const offer = await webrtcManager.createOffer();

      socketService.callUser({
        targetUserId: targetUser._id,
        conversationId,
        type,
        offer,
      });
    } catch (err: any) {
      console.error('[Start Call Error]', err);
      get().endCall();
    }
  },

  acceptCall: async () => {
    const { peerUser, callType, pendingOffer, callId } = get();
    if (!peerUser || !pendingOffer || !callId) return;

    try {
      set({ callStatus: 'connected', duration: 0 });

      webrtcManager.initPeerConnection(
        (remoteStream) => {
          set({ remoteStream });
        },
        (candidate) => {
          socketService.sendIceCandidate(peerUser._id, candidate);
        }
      );

      const localStream = await webrtcManager.getLocalMedia(callType);
      set({ localStream });

      const answer = await webrtcManager.createAnswer(pendingOffer);

      socketService.answerCall({
        callId,
        callerId: peerUser._id,
        answer,
      });

      // Start duration timer
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        set((s) => ({ duration: s.duration + 1 }));
      }, 1000);
    } catch (err) {
      console.error('[Accept Call Error]', err);
      get().endCall();
    }
  },

  rejectCall: () => {
    const { callId, peerUser } = get();
    if (callId && peerUser) {
      socketService.rejectCall({
        callId,
        callerId: peerUser._id,
      });
    }
    get().endCall();
  },

  endCall: () => {
    const { callId, peerUser } = get();
    if (callId && peerUser) {
      socketService.endCall({
        callId,
        targetUserId: peerUser._id,
      });
    }

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    webrtcManager.close();

    set({
      callStatus: 'idle',
      callId: null,
      peerUser: null,
      localStream: null,
      remoteStream: null,
      pendingOffer: null,
      duration: 0,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
    });
  },

  toggleMute: () => {
    const isMuted = webrtcManager.toggleMute();
    set({ isMuted });

    const peer = get().peerUser;
    if (peer) {
      socketService.toggleMediaState({
        targetUserId: peer._id,
        isMuted,
      });
    }
  },

  toggleVideo: () => {
    const isVideoOff = webrtcManager.toggleVideo();
    set({ isVideoOff });

    const peer = get().peerUser;
    if (peer) {
      socketService.toggleMediaState({
        targetUserId: peer._id,
        isVideoOff,
      });
    }
  },

  toggleScreenShare: async () => {
    const isSharing = get().isScreenSharing;
    if (isSharing) {
      webrtcManager.stopScreenShare();
      set({ isScreenSharing: false });
    } else {
      const stream = await webrtcManager.startScreenShare();
      if (stream) {
        set({ isScreenSharing: true });
      }
    }
  },

  // Sockets Event Handlers
  handleIncomingCall: ({ callId, caller, conversationId, type, offer }) => {
    set({
      callStatus: 'incoming',
      callId,
      peerUser: caller,
      conversationId,
      callType: type,
      pendingOffer: offer,
      duration: 0,
    });
  },

  handleCallAccepted: async ({ answer }) => {
    set({ callStatus: 'connected' });
    await webrtcManager.setRemoteAnswer(answer);

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      set((s) => ({ duration: s.duration + 1 }));
    }, 1000);
  },

  handleIceCandidate: async (candidate) => {
    await webrtcManager.addIceCandidate(candidate);
  },

  handleCallRejected: () => {
    get().endCall();
  },

  handleCallEnded: () => {
    get().endCall();
  },

  handlePeerMediaState: (_data) => {
    // Media state updated on peer
  },
}));
