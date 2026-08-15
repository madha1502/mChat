import { Server } from 'socket.io';
import { AuthenticatedSocket } from './index.js';

export const registerTypingHandlers = (io: Server, socket: AuthenticatedSocket): void => {
  const user = socket.user;
  const userId = user._id.toString();

  socket.on('typing', ({ conversationId }: { conversationId: string }) => {
    if (!conversationId) return;

    // Check if user has enabled typing indicators in privacy settings
    if (user.privacySettings && user.privacySettings.typingIndicator === false) {
      return;
    }

    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      conversationId,
      userId,
      userName: user.name,
    });
  });

  socket.on('stop_typing', ({ conversationId }: { conversationId: string }) => {
    if (!conversationId) return;

    socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
      conversationId,
      userId,
    });
  });
};
