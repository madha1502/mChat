import { Server } from 'socket.io';
import { Types } from 'mongoose';
import { AuthenticatedSocket } from './index.js';
import { Call, CallType } from '../models/Call.js';

export const registerCallHandlers = (io: Server, socket: AuthenticatedSocket): void => {
  const currentUser = socket.user;
  const currentUserId = currentUser._id.toString();

  // 1. Initiate Call with WebRTC Offer
  socket.on('call_user', async (data: {
    targetUserId: string;
    conversationId?: string;
    type: CallType;
    offer: any;
  }) => {
    try {
      const { targetUserId, conversationId, type = 'audio', offer } = data;

      // Create call log in database
      const call = await Call.create({
        callerId: currentUser._id,
        receiverId: new Types.ObjectId(targetUserId),
        conversationId: conversationId ? new Types.ObjectId(conversationId) : undefined,
        type,
        status: 'ringing',
        startedAt: new Date(),
      });

      // Send incoming call alert to target user's personal socket room
      io.to(`user:${targetUserId}`).emit('incoming_call', {
        callId: call._id.toString(),
        caller: {
          _id: currentUser._id.toString(),
          name: currentUser.name,
          username: currentUser.username,
          profilePicture: currentUser.profilePicture,
        },
        conversationId,
        type,
        offer,
      });
    } catch (e) {
      console.error('[call_user error]', e);
    }
  });

  // 2. Answer Call with WebRTC Answer SDP
  socket.on('answer_call', async (data: {
    callId: string;
    callerId: string;
    answer: any;
  }) => {
    try {
      const { callId, callerId, answer } = data;

      await Call.findByIdAndUpdate(callId, {
        status: 'connected',
        startedAt: new Date(),
      });

      io.to(`user:${callerId}`).emit('call_accepted', {
        callId,
        receiverId: currentUserId,
        answer,
      });
    } catch (e) {
      console.error('[answer_call error]', e);
    }
  });

  // 3. Relay ICE Candidates between peers
  socket.on('ice_candidate', (data: { targetUserId: string; candidate: any }) => {
    const { targetUserId, candidate } = data;
    io.to(`user:${targetUserId}`).emit('ice_candidate', {
      senderId: currentUserId,
      candidate,
    });
  });

  // 4. Reject Call
  socket.on('reject_call', async (data: { callId: string; callerId: string; reason?: string }) => {
    try {
      const { callId, callerId, reason = 'declined' } = data;

      if (callId) {
        await Call.findByIdAndUpdate(callId, {
          status: 'rejected',
          endedAt: new Date(),
        });
      }

      io.to(`user:${callerId}`).emit('call_rejected', {
        callId,
        reason,
      });
    } catch (e) {
      console.error('[reject_call error]', e);
    }
  });

  // 5. End Active Call
  socket.on('end_call', async (data: { callId?: string; targetUserId?: string }) => {
    try {
      const { callId, targetUserId } = data;

      if (callId) {
        const call = await Call.findById(callId);
        if (call) {
          const endedAt = new Date();
          const startedAt = call.startedAt || endedAt;
          const duration = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));

          call.status = 'ended';
          call.endedAt = endedAt;
          call.duration = duration;
          await call.save();
        }
      }

      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit('call_ended', {
          callId,
          endedBy: currentUserId,
        });
      }
    } catch (e) {
      console.error('[end_call error]', e);
    }
  });

  // 6. Media Toggle state sync (audio/video/screenshare)
  socket.on('toggle_media_state', (data: { targetUserId: string; isMuted?: boolean; isVideoOff?: boolean; isScreenSharing?: boolean }) => {
    io.to(`user:${data.targetUserId}`).emit('peer_media_state_changed', {
      senderId: currentUserId,
      ...data,
    });
  });
};
