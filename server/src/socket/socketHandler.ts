import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { isOriginAllowed } from '../utils/corsUtils';

let io: SocketIOServer | null = null;

export const initSocketIO = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS policy error'), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    socket.on('join:role', (role: string) => {
      if (role) {
        socket.join(`role:${role.toLowerCase()}`);
        console.log(`👤 Socket ${socket.id} joined room: role:${role.toLowerCase()}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getSocketIO = (): SocketIOServer | null => {
  return io;
};
