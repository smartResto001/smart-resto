import http from 'http';
import app from './app';
import { initSocketIO } from './socket/socketHandler';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

server.listen(PORT, () => {
  console.log(`🚀 SmartResto Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time events`);
});
