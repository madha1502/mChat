import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User, IUser } from '../models/User.js';
import { JwtPayload } from '../middleware/auth.middleware.js';
import { registerPresenceHandlers } from './presence.socket.js';
import { registerMessageHandlers } from './message.socket.js';
import { registerTypingHandlers } from './typing.socket.js';
import { registerCallHandlers } from './call.socket.js';
import { registerGroupHandlers } from './group.socket.js';

let ioInstance: Server | null = null;

// Track online socket connections per user: Map<userId, Set<socketId>>
export const userSockets = new Map<string, Set<string>>();

export interface AuthenticatedSocket extends Socket {
  user: IUser;
}

export const initializeSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let token: string | undefined = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc: any, c) => {
          const [key, val] = c.trim().split('=');
          acc[key] = val;
          return acc;
        }, {});
        token = cookies.token;
      }

      if (!token && socket.handshake.query?.token) {
        token = socket.handshake.query.token as string;
      }

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      (socket as AuthenticatedSocket).user = user;
      next();
    } catch (err: any) {
      next(new Error(`Socket authentication error: ${err.message}`));
    }
  });

  io.on('connection', async (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const user = socket.user;
    const userId = user._id.toString();

    // Track user socket connection
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join personal room for notifications & direct events
    socket.join(`user:${userId}`);

    console.log(`[Socket.IO] User connected: ${user.name} (${userId}) - Socket: ${socket.id}`);

    // Broadcast updated online count to all connected users
    io.emit('online_count_update', { count: userSockets.size });

    // Register modular domain handlers
    registerPresenceHandlers(io, socket);
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerCallHandlers(io, socket);
    registerGroupHandlers(io, socket);

    // Conversation room joining/leaving
    socket.on('join_conversation', (conversationId: string) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('leave_conversation', (conversationId: string) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User disconnected: ${user.name} (${userId})`);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
      // Broadcast updated online count on disconnect
      io.emit('online_count_update', { count: userSockets.size });
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = (): Server => {
  if (!ioInstance) {
    throw new Error('Socket.IO server has not been initialized yet');
  }
  return ioInstance;
};
