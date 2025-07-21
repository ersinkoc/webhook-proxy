import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './plugins/error-handler';
import { prismaPlugin } from './plugins/prisma';
import { authPlugin } from './plugins/auth';
import { socketPlugin } from './plugins/socket';
import { endpointRoutes } from './routes/endpoints';
import { webhookRoutes } from './routes/webhooks';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';

export async function buildApp() {
  const app = Fastify({
    logger,
    trustProxy: true,
  });

  // Register plugins
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disable for API
  });

  await app.register(cors, {
    origin: [config.urls.web],
    credentials: true,
  });

  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
    keyGenerator: (request) => {
      return request.headers['x-api-key'] as string || request.ip;
    },
  });

  // Custom plugins
  await app.register(errorHandler);
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(socketPlugin);

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(endpointRoutes, { prefix: '/api/endpoints' });
  await app.register(webhookRoutes, { prefix: '/api/webhooks' });
  
  // Dynamic webhook receiver route (moved to webhooks route file)

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  return app;
}