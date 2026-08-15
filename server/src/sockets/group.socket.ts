import { Server } from 'socket.io';
import { AuthenticatedSocket } from './index.js';

export const registerGroupHandlers = (io: Server, socket: AuthenticatedSocket): void => {
  // Join all participants to group room on group creation
  socket.on('group_created', ({ conversationId, participantIds }: { conversationId: string; participantIds: string[] }) => {
    participantIds.forEach((pid) => {
      io.to(`user:${pid}`).emit('group_added', { conversationId });
    });
  });

  // Group metadata updated
  socket.on('group_updated', ({ conversationId, updates }: { conversationId: string; updates: any }) => {
    io.to(`conversation:${conversationId}`).emit('group_metadata_updated', {
      conversationId,
      updates,
    });
  });
};
