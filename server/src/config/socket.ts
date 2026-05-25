import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from './env';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`[Socket] User ${userId} joined their room`);
    });

    socket.on('join:dashboard', () => {
      socket.join('dashboard');
    });

    socket.on('join:network', () => {
      socket.join('network');
      console.log(`[Socket] Client joined network room: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function emitToUser(userId: string, event: string, data: any) {
  if (io) io.to(`user:${userId}`).emit(event, data);
}

export function emitToDashboard(event: string, data: any) {
  if (io) io.to('dashboard').emit(event, data);
}

export function emitToNetwork(event: string, data: any) {
  if (io) io.to('network').emit(event, data);
}

