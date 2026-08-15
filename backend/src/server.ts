import 'dotenv/config';
import http from 'http';
import app from './app';
import { testConnection } from './config/database';
import { redisReady } from './config/redis';
import { attachWebSocket } from './ws';

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    const redisOk = await redisReady();
    if (!redisOk) {
      console.warn('Redis unavailable; recommendation cache and bandit hot-path will degrade gracefully');
    }

    const server = http.createServer(app);
    attachWebSocket(server);

    // Bind 0.0.0.0 so cloud hosts (Render/Fly) can reach the process.
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`CampusLink API on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`WebSocket: ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
