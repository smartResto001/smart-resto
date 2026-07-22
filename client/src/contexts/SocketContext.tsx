import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  playNotificationSound: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Web Audio API Chime Synthesizer for instant notification sounds
const playChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.error('Audio play error:', err);
  }
};

const getSocketUrl = (): string => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
      return apiUrl.replace(/\/api\/?$/, '');
    }
  }
  return '/';
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Socket.io client initialization targeting the backend host
    const socketUrl = getSocketUrl();
    const socketInstance = io(socketUrl, {
      transports: ['polling', 'websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket connected:', socketInstance.id);
      setIsConnected(true);

      if (user?.role) {
        socketInstance.emit('join:role', user.role);
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('⚡ Socket disconnected');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user?.role]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        playNotificationSound: playChime,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
