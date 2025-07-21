import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { 
  ApiResponse, 
  Webhook,
  PaginatedResponse,
  parseHeaders 
} from '@ersinkoc/webhook-proxy-shared';
import { WebhookForwarder } from '../services/webhook-forwarder';

const querySchema = z.object({
  endpointId: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  success: z.string().optional().transform((val) => val === 'true'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional().default('1').transform(Number),
  pageSize: z.string().optional().default('20').transform(Number),
});

export async function webhookRoutes(app: FastifyInstance) {
  const forwarder = new WebhookForwarder();

  // List webhooks
  app.get<{
    Querystring: z.infer<typeof querySchema>;
  }>('/', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      const filters = querySchema.parse(request.query);
      const { page, pageSize } = filters;
      const offset = (page - 1) * pageSize;

      // Build where clause
      const where: any = {};
      
      // Ensure user can only see their own webhooks
      where.endpoint = {
        userId: request.authenticatedUser!.id,
      };

      if (filters.endpointId) {
        where.endpointId = filters.endpointId;
      }
      if (filters.method) {
        where.method = filters.method;
      }
      if (filters.statusCode !== undefined) {
        where.statusCode = filters.statusCode;
      }
      if (filters.success !== undefined) {
        if (filters.success) {
          where.statusCode = { gte: 200, lt: 400 };
        } else {
          where.OR = [
            { statusCode: { gte: 400 } },
            { statusCode: null },
          ];
        }
      }
      if (filters.startDate) {
        where.createdAt = { ...where.createdAt, gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };
      }

      const [webhooks, total] = await Promise.all([
        app.prisma.webhook.findMany({
          where,
          take: pageSize,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        app.prisma.webhook.count({ where }),
      ]);

      const webhookData: Webhook[] = webhooks.map((webhook) => ({
        id: webhook.id,
        endpointId: webhook.endpointId,
        method: webhook.method,
        headers: webhook.headers as Record<string, string>,
        query: webhook.query as Record<string, string> | undefined,
        body: webhook.body,
        statusCode: webhook.statusCode ?? undefined,
        response: webhook.response,
        error: webhook.error ?? undefined,
        deliveredAt: webhook.deliveredAt?.toISOString(),
        duration: webhook.duration ?? undefined,
        createdAt: webhook.createdAt.toISOString(),
      }));

      return reply.send({
        success: true,
        data: {
          items: webhookData,
          total,
          page,
          pageSize,
          hasMore: total > page * pageSize,
        } satisfies PaginatedResponse<Webhook>,
      } satisfies ApiResponse);
    },
  });

  // Get single webhook
  app.get<{
    Params: { id: string };
  }>('/:id', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;

      const webhook = await app.prisma.webhook.findFirst({
        where: {
          id,
          endpoint: {
            userId: request.authenticatedUser!.id,
          },
        },
      });

      if (!webhook) {
        return reply.status(404).send({
          success: false,
          error: 'Webhook not found',
        } satisfies ApiResponse);
      }

      const webhookData: Webhook = {
        id: webhook.id,
        endpointId: webhook.endpointId,
        method: webhook.method,
        headers: webhook.headers as Record<string, string>,
        query: webhook.query as Record<string, string> | undefined,
        body: webhook.body,
        statusCode: webhook.statusCode ?? undefined,
        response: webhook.response,
        error: webhook.error ?? undefined,
        deliveredAt: webhook.deliveredAt?.toISOString(),
        duration: webhook.duration ?? undefined,
        createdAt: webhook.createdAt.toISOString(),
      };

      return reply.send({
        success: true,
        data: webhookData,
      } satisfies ApiResponse);
    },
  });

  // Resend webhook
  app.post<{
    Params: { id: string };
  }>('/:id/resend', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;

      const webhook = await app.prisma.webhook.findFirst({
        where: {
          id,
          endpoint: {
            userId: request.authenticatedUser!.id,
          },
        },
        include: {
          endpoint: true,
        },
      });

      if (!webhook) {
        return reply.status(404).send({
          success: false,
          error: 'Webhook not found',
        } satisfies ApiResponse);
      }

      if (!webhook.endpoint.isActive) {
        return reply.status(400).send({
          success: false,
          error: 'Endpoint is not active',
        } satisfies ApiResponse);
      }

      // Forward the webhook
      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: webhook.endpoint.targetUrl,
        method: webhook.method,
        headers: webhook.headers as Record<string, string>,
        query: webhook.query as Record<string, string> | undefined,
        body: webhook.body,
      });

      // Update webhook with new delivery result
      await app.prisma.webhook.update({
        where: { id },
        data: {
          statusCode: result.statusCode,
          response: result.response,
          error: result.error,
          deliveredAt: new Date(),
          duration: result.duration,
        },
      });

      // Emit real-time event
      app.io.to(`endpoint:${webhook.endpointId}`).emit('webhook:event', {
        type: result.success ? 'webhook:delivered' : 'webhook:failed',
        data: {
          webhookId: webhook.id,
          ...result,
        },
      });

      return reply.send({
        success: true,
        data: result,
      } satisfies ApiResponse);
    },
  });

  // Delete webhook
  app.delete<{
    Params: { id: string };
  }>('/:id', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;

      const webhook = await app.prisma.webhook.findFirst({
        where: {
          id,
          endpoint: {
            userId: request.authenticatedUser!.id,
          },
        },
      });

      if (!webhook) {
        return reply.status(404).send({
          success: false,
          error: 'Webhook not found',
        } satisfies ApiResponse);
      }

      await app.prisma.webhook.delete({
        where: { id },
      });

      return reply.status(204).send();
    },
  });

  // Delete all webhooks for an endpoint
  app.delete<{
    Querystring: { endpointId: string };
  }>('/bulk', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      const { endpointId } = request.query;

      // Verify endpoint belongs to user
      const endpoint = await app.prisma.endpoint.findFirst({
        where: {
          id: endpointId,
          userId: request.authenticatedUser!.id,
        },
      });

      if (!endpoint) {
        return reply.status(404).send({
          success: false,
          error: 'Endpoint not found',
        } satisfies ApiResponse);
      }

      const result = await app.prisma.webhook.deleteMany({
        where: { endpointId },
      });

      return reply.send({
        success: true,
        data: {
          deleted: result.count,
        },
      } satisfies ApiResponse);
    },
  });

  // Register dynamic webhook receiver route at root level
  app.register(async function webhookReceiver(app) {
    app.all<{
      Params: { endpointId: string };
    }>('/webhook/:endpointId', {
      config: {
        rateLimit: {
          max: 1000,
          timeWindow: 60 * 1000,
        },
      },
      handler: async (request, reply) => {
    const { endpointId } = request.params;

    // Find endpoint by slug or ID
    const endpoint = await app.prisma.endpoint.findFirst({
      where: {
        OR: [
          { id: endpointId },
          { slug: endpointId },
        ],
        isActive: true,
      },
    });

    if (!endpoint) {
      return reply.status(404).send({
        success: false,
        error: 'Endpoint not found',
      } satisfies ApiResponse);
    }

    // Parse request data
    const headers = parseHeaders(request.headers);
    const query = request.query as Record<string, string>;
    const body = request.body;

    // Store webhook
    const webhook = await app.prisma.webhook.create({
      data: {
        endpointId: endpoint.id,
        method: request.method,
        headers,
        query: Object.keys(query).length > 0 ? query : undefined,
        body: body || undefined,
      },
    });

    // Emit real-time event
    app.io.to(`endpoint:${endpoint.id}`).emit('webhook:event', {
      type: 'webhook:received',
      data: {
        id: webhook.id,
        endpointId: webhook.endpointId,
        method: webhook.method,
        headers,
        query: query || undefined,
        body: body || undefined,
        createdAt: webhook.createdAt.toISOString(),
      },
    });

    // Forward webhook asynchronously
    forwarder.forwardWebhook({
      webhookId: webhook.id,
      targetUrl: endpoint.targetUrl,
      method: request.method,
      headers,
      query,
      body,
    }).then(async (result) => {
      // Update webhook with delivery result
      await app.prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          statusCode: result.statusCode,
          response: result.response,
          error: result.error,
          deliveredAt: new Date(),
          duration: result.duration,
        },
      });

      // Emit delivery event
      app.io.to(`endpoint:${endpoint.id}`).emit('webhook:event', {
        type: result.success ? 'webhook:delivered' : 'webhook:failed',
        data: {
          webhookId: webhook.id,
          ...result,
        },
      });
    }).catch((error) => {
      app.log.error(`Failed to forward webhook ${webhook.id}:`, error);
    });

    // Respond immediately
    return reply.send({
      success: true,
      message: 'Webhook received',
      data: { webhookId: webhook.id },
    } satisfies ApiResponse);
      },
    });
  }, { prefix: '' }); // Register at root level, not under /api/webhooks
}