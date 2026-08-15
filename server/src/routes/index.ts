import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import conversationRoutes from './conversation.routes.js';
import messageRoutes from './message.routes.js';
import statusRoutes from './status.routes.js';
import callRoutes from './call.routes.js';
import uploadRoutes from './upload.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import { userSockets } from '../sockets/index.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/statuses', statusRoutes);
router.use('/calls', callRoutes);
router.use('/uploads', uploadRoutes);
router.use('/integrations/whatsapp', whatsappRoutes);

// Health check, database connection status & live online users count
router.get('/health', (_req, res) => {
  const dbStateMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const stateCode = mongoose.connection.readyState;
  const isConnected = stateCode === 1;

  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'mChat API',
    onlineUsers: userSockets.size,
    database: {
      status: dbStateMap[stateCode] || 'unknown',
      connected: isConnected,
      host: mongoose.connection.host || 'none',
      name: mongoose.connection.name || 'none',
      port: mongoose.connection.port || 27017,
    },
  });
});

export default router;
