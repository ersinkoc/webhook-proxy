import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Server } from 'socket.io';
import { config } from '../config';
import { WebhookEvent } from '@webhook-proxy/shared';

declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}

export const socketPlugin = fp(async (app: FastifyInstance) => {
  const io = new Server(app.server, {
    cors: {
      origin: config.urls.web,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    app.log.info(`Socket connected: ${socket.id}`);

    socket.on('subscribe:endpoint', async (endpointId: string) => {
      // Verify endpoint exists and user has access
      // For now, just join the room
      socket.join(`endpoint:${endpointId}`);
      app.log.info(`Socket ${socket.id} subscribed to endpoint ${endpointId}`);
    });

    socket.on('unsubscribe:endpoint', (endpointId: string) => {
      socket.leave(`endpoint:${endpointId}`);
      app.log.info(`Socket ${socket.id} unsubscribed from endpoint ${endpointId}`);
    });

    socket.on('disconnect', () => {
      app.log.info(`Socket disconnected: ${socket.id}`);
    });
  });

  app.decorate('io', io);

  // Helper method to emit webhook events
  app.decorate('emitWebhookEvent', (endpointId: string, event: WebhookEvent) => {
    io.to(`endpoint:${endpointId}`).emit('webhook:event', event);
  });
});