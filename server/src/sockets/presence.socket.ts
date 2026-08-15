import { Server } from 'socket.io';
import { AuthenticatedSocket, userSockets } from './index.js';
import { User } from '../models/User.js';

export const registerPresenceHandlers = (io: Server, socket: AuthenticatedSocket): void => {
  const user = socket.user;
  const userId = user._id.toString();

  // Mark user as online if this is their first active socket
  const activeSockets = userSockets.get(userId);
  if (activeSockets && activeSockets.size === 1) {
    User.findByIdAndUpdate(userId, { isOnline: true }).exec();

    // Broadcast presence update to everyone (or active conversations)
    socket.broadcast.emit('user_presence_change', {
      userId,
      isOnline: true,
      lastSeen: new Date(),
    });
  }

  // Handle explicit presence inquiry
  socket.on('check_presence', async (targetUserIds: string[], callback?: (statuses: Record<string, { isOnline: boolean; lastSeen?: Date }>) => void) => {
    if (!Array.isArray(targetUserIds)) return;

    const result: Record<string, { isOnline: boolean; lastSeen?: Date }> = {};
    for (const targetId of targetUserIds) {
      const isOnline = userSockets.has(targetId) && userSockets.get(targetId)!.size > 0;
      result[targetId] = { isOnline };
    }

    if (callback) callback(result);
  });

  // Handle disconnect presence update
  socket.on('disconnect', async () => {
    const remainingSockets = userSockets.get(userId);
    if (!remainingSockets || remainingSockets.size === 0) {
      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen }).exec();

      socket.broadcast.emit('user_presence_change', {
        userId,
        isOnline: false,
        lastSeen,
      });
    }
  });
};
