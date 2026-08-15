import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { initializeSocket } from './sockets/index.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { apiLimiter } from './middleware/rateLimiter.middleware.js';

const app = express();
const server = http.createServer(app);

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body Parsing & Cookies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Static Uploads Serving
const uploadsPath = path.resolve(process.cwd(), config.storage.uploadDir);
app.use('/uploads', express.static(uploadsPath));

// API Rate Limiting
app.use('/api', apiLimiter);

// API Routes
app.use('/api', routes);

// 404 Handler for undefined API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// Global Error Handler
app.use(errorHandler);

// Initialize WebSockets Engine
initializeSocket(server);

// Start Database & HTTP Server
const startServer = async () => {
  await connectDatabase();

  server.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 mChat Server is running`);
    console.log(`🌐 URL: http://localhost:${config.port}`);
    console.log(`🔌 WebSockets: Ready`);
    console.log(`📁 Uploads Directory: ${uploadsPath}`);
    console.log(`💬 Meta WhatsApp Business Webhook: http://localhost:${config.port}/api/integrations/whatsapp/webhook`);
    console.log(`=======================================================`);
  });
};

startServer().catch((err) => {
  console.error('[Server Startup Error]', err);
});

export { app, server };
