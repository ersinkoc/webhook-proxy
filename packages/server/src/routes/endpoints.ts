import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { 
  ApiResponse, 
  CreateEndpointDto, 
  UpdateEndpointDto,
  EndpointWithStats,
  PaginatedResponse 
} from '@ersinkoc/webhook-proxy-shared';
import { Endpoint } from '@prisma/client';

const createEndpointSchema = z.object({
  name: z.string().min(1).max(100),
  targetUrl: z.string().url(),
});

const updateEndpointSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

const querySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  pageSize: z.string().optional().default('20').transform(Number),
  search: z.string().optional(),
});

export async function endpointRoutes(app: FastifyInstance) {
  // List endpoints
  app.get<{
    Querystring: z.infer<typeof querySchema>;
  }>('/', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      const { page, pageSize, search } = querySchema.parse(request.query);
      const offset = (page - 1) * pageSize;

      const where = {
        userId: request.authenticatedUser!.id,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { targetUrl: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [endpoints, total] = await Promise.all([
        app.prisma.endpoint.findMany({
          where,
          include: {
            _count: {
              select: { webhooks: true },
            },
          },
          take: pageSize,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        app.prisma.endpoint.count({ where }),
      ]);

      const endpointsWithStats: EndpointWithStats[] = await Promise.all(
        endpoints.map(async (endpoint: Endpoint & { _count: { webhooks: number } }) => {
          const lastWebhook = await app.prisma.webhook.findFirst({
            where: { endpointId: endpoint.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          });

          return {
            id: endpoint.id,
            name: endpoint.name,
            slug: endpoint.slug,
            targetUrl: endpoint.targetUrl,
            apiKey: endpoint.apiKey,
            isActive: endpoint.isActive,
            createdAt: endpoint.createdAt.toISOString(),
            updatedAt: endpoint.updatedAt.toISOString(),
            webhookCount: endpoint._count.webhooks,
            lastWebhookAt: lastWebhook?.createdAt.toISOString(),
          };
        })
      );

      return reply.send({
        success: true,
        data: {
          items: endpointsWithStats,
          total,
          page,
          pageSize,
          hasMore: total > page * pageSize,
        } satisfies PaginatedResponse<EndpointWithStats>,
      } satisfies ApiResponse);
    },
  });

  // Get single endpoint
  app.get<{
    Params: { id: string };
  }>('/:id', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;

      const endpoint = await app.prisma.endpoint.findFirst({
        where: {
          id,
          userId: request.authenticatedUser!.id,
        },
        include: {
          _count: {
            select: { webhooks: true },
          },
        },
      });

      if (!endpoint) {
        return reply.status(404).send({
          success: false,
          error: 'Endpoint not found',
        } satisfies ApiResponse);
      }

      const lastWebhook = await app.prisma.webhook.findFirst({
        where: { endpointId: endpoint.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      const endpointWithStats: EndpointWithStats = {
        id: endpoint.id,
        name: endpoint.name,
        slug: endpoint.slug,
        targetUrl: endpoint.targetUrl,
        apiKey: endpoint.apiKey,
        isActive: endpoint.isActive,
        createdAt: endpoint.createdAt.toISOString(),
        updatedAt: endpoint.updatedAt.toISOString(),
        webhookCount: endpoint._count.webhooks,
        lastWebhookAt: lastWebhook?.createdAt.toISOString(),
      };

      return reply.send({
        success: true,
        data: endpointWithStats,
      } satisfies ApiResponse);
    },
  });

  // Create endpoint
  app.post<{
    Body: CreateEndpointDto;
  }>('/', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      const { name, targetUrl } = createEndpointSchema.parse(request.body);

      const endpoint = await app.prisma.endpoint.create({
        data: {
          name,
          targetUrl,
          slug: nanoid(8),
          apiKey: `whep_${crypto.randomBytes(16).toString('hex')}`,
          userId: request.authenticatedUser!.id,
        },
      });

      const endpointWithStats: EndpointWithStats = {
        id: endpoint.id,
        name: endpoint.name,
        slug: endpoint.slug,
        targetUrl: endpoint.targetUrl,
        apiKey: endpoint.apiKey,
        isActive: endpoint.isActive,
        createdAt: endpoint.createdAt.toISOString(),
        updatedAt: endpoint.updatedAt.toISOString(),
        webhookCount: 0,
      };

      return reply.status(201).send({
        success: true,
        data: endpointWithStats,
      } satisfies ApiResponse);
    },
  });

  // Update endpoint
  app.put<{
    Params: { id: string };
    Body: UpdateEndpointDto;
  }>('/:id', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;
      const updates = updateEndpointSchema.parse(request.body);

      const endpoint = await app.prisma.endpoint.findFirst({
        where: {
          id,
          userId: request.authenticatedUser!.id,
        },
      });

      if (!endpoint) {
        return reply.status(404).send({
          success: false,
          error: 'Endpoint not found',
        } satisfies ApiResponse);
      }

      const updated = await app.prisma.endpoint.update({
        where: { id },
        data: updates,
        include: {
          _count: {
            select: { webhooks: true },
          },
        },
      });

      const lastWebhook = await app.prisma.webhook.findFirst({
        where: { endpointId: updated.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      const endpointWithStats: EndpointWithStats = {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        targetUrl: updated.targetUrl,
        apiKey: updated.apiKey,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        webhookCount: updated._count.webhooks,
        lastWebhookAt: lastWebhook?.createdAt.toISOString(),
      };

      return reply.send({
        success: true,
        data: endpointWithStats,
      } satisfies ApiResponse);
    },
  });

  // Delete endpoint
  app.delete<{
    Params: { id: string };
  }>('/:id', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;

      const endpoint = await app.prisma.endpoint.findFirst({
        where: {
          id,
          userId: request.authenticatedUser!.id,
        },
      });

      if (!endpoint) {
        return reply.status(404).send({
          success: false,
          error: 'Endpoint not found',
        } satisfies ApiResponse);
      }

      await app.prisma.endpoint.delete({
        where: { id },
      });

      return reply.status(204).send();
    },
  });

  // Regenerate API key
  app.post<{
    Params: { id: string };
  }>('/:id/regenerate-key', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;

      const endpoint = await app.prisma.endpoint.findFirst({
        where: {
          id,
          userId: request.authenticatedUser!.id,
        },
      });

      if (!endpoint) {
        return reply.status(404).send({
          success: false,
          error: 'Endpoint not found',
        } satisfies ApiResponse);
      }

      const newApiKey = `whep_${crypto.randomBytes(16).toString('hex')}`;

      const updated = await app.prisma.endpoint.update({
        where: { id },
        data: { apiKey: newApiKey },
      });

      return reply.send({
        success: true,
        data: {
          apiKey: updated.apiKey,
        },
      } satisfies ApiResponse);
    },
  });
}