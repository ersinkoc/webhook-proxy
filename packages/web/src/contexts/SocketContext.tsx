import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebhookEvent } from '@ersinkoc/webhook-proxy-shared';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  subscribeToEndpoint: (endpointId: string) => void;
  unsubscribeFromEndpoint: (endpointId: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const newSocket = io(import.meta.env.VITE_WS_URL || '', {
      transports: ['websocket'],
      auth: {
        token: useAuthStore.getState().token,
      },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    newSocket.on('webhook:event', (event: WebhookEvent) => {
      switch (event.type) {
        case 'webhook:received':
          toast.success('New webhook received!');
          break;
        case 'webhook:delivered':
          if (!event.data.success) {
            toast.error('Webhook delivery failed');
          }
          break;
        case 'webhook:failed':
          toast.error('Webhook delivery failed');
          break;
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [isAuthenticated]);

  const subscribeToEndpoint = (endpointId: string) => {
    if (socket) {
      socket.emit('subscribe:endpoint', endpointId);
    }
  };

  const unsubscribeFromEndpoint = (endpointId: string) => {
    if (socket) {
      socket.emit('unsubscribe:endpoint', endpointId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        subscribeToEndpoint,
        unsubscribeFromEndpoint,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}