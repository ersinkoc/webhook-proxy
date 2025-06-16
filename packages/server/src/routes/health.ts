import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (request, reply) => {
    try {
      // Check database connection
      await app.prisma.$queryRaw`SELECT 1`;
      
      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          database: 'connected',
        },
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  app.get('/api', async (request, reply) => {
    return reply.send({
      version: 'v1',
      endpoints: {
        auth: '/api/auth',
        endpoints: '/api/endpoints',
        webhooks: '/api/webhooks',
        webhook: '/webhook/:endpointId',
      },
    });
  });
}