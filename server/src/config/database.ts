import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDatabase = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[MongoDB] Could not connect to primary MongoDB at ${config.mongodbUri}.`);
    console.log(`[MongoDB] Initializing in-memory Mongo server for zero-config local run...`);

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();

      const conn = await mongoose.connect(memoryUri, {
        autoIndex: true,
      });

      console.log(`[MongoDB] ✅ In-Memory MongoDB Server running at: ${memoryUri}`);
    } catch (memErr) {
      console.error('[MongoDB] Failed to start fallback in-memory MongoDB:', memErr);
    }
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected from database.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Reconnected to database.');
  });
};
