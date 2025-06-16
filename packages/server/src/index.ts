import { buildApp } from './app';
import { logger } from './utils/logger';
import { config } from './config';

async function start() {
  try {
    const app = await buildApp();
    
    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });
    
    logger.info(`🚀 Server running at http://localhost:${config.port}`);
    logger.info(`📡 Webhook endpoint: ${config.urls.publicWebhook}/webhook/:endpointId`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();