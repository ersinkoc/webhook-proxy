"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.endpointRoutes = endpointRoutes;
const zod_1 = require("zod");
const nanoid_1 = require("nanoid");
const crypto_1 = __importDefault(require("crypto"));
const createEndpointSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    targetUrl: zod_1.z.string().url(),
});
const updateEndpointSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    targetUrl: zod_1.z.string().url().optional(),
    isActive: zod_1.z.boolean().optional(),
});
const querySchema = zod_1.z.object({
    page: zod_1.z.string().optional().default('1').transform(Number),
    pageSize: zod_1.z.string().optional().default('20').transform(Number),
    search: zod_1.z.string().optional(),
});
async function endpointRoutes(app) {
    // List endpoints
    app.get('/', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            const { page, pageSize, search } = querySchema.parse(request.query);
            const offset = (page - 1) * pageSize;
            const where = {
                userId: request.user.id,
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { targetUrl: { contains: search, mode: 'insensitive' } },
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
            const endpointsWithStats = await Promise.all(endpoints.map(async (endpoint) => {
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
            }));
            return reply.send({
                success: true,
                data: {
                    items: endpointsWithStats,
                    total,
                    page,
                    pageSize,
                    hasMore: total > page * pageSize,
                },
            });
        },
    });
    // Get single endpoint
    app.get('/:id', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            const { id } = request.params;
            const endpoint = await app.prisma.endpoint.findFirst({
                where: {
                    id,
                    userId: request.user.id,
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
                });
            }
            const lastWebhook = await app.prisma.webhook.findFirst({
                where: { endpointId: endpoint.id },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            });
            const endpointWithStats = {
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
            });
        },
    });
    // Create endpoint
    app.post('/', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            const { name, targetUrl } = createEndpointSchema.parse(request.body);
            const endpoint = await app.prisma.endpoint.create({
                data: {
                    name,
                    targetUrl,
                    slug: (0, nanoid_1.nanoid)(8),
                    apiKey: `whep_${crypto_1.default.randomBytes(16).toString('hex')}`,
                    userId: request.user.id,
                },
            });
            const endpointWithStats = {
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
            });
        },
    });
    // Update endpoint
    app.put('/:id', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            const { id } = request.params;
            const updates = updateEndpointSchema.parse(request.body);
            const endpoint = await app.prisma.endpoint.findFirst({
                where: {
                    id,
                    userId: request.user.id,
                },
            });
            if (!endpoint) {
                return reply.status(404).send({
                    success: false,
                    error: 'Endpoint not found',
                });
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
            const endpointWithStats = {
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
            });
        },
    });
    // Delete endpoint
    app.delete('/:id', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            const { id } = request.params;
            const endpoint = await app.prisma.endpoint.findFirst({
                where: {
                    id,
                    userId: request.user.id,
                },
            });
            if (!endpoint) {
                return reply.status(404).send({
                    success: false,
                    error: 'Endpoint not found',
                });
            }
            await app.prisma.endpoint.delete({
                where: { id },
            });
            return reply.status(204).send();
        },
    });
    // Regenerate API key
    app.post('/:id/regenerate-key', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            const { id } = request.params;
            const endpoint = await app.prisma.endpoint.findFirst({
                where: {
                    id,
                    userId: request.user.id,
                },
            });
            if (!endpoint) {
                return reply.status(404).send({
                    success: false,
                    error: 'Endpoint not found',
                });
            }
            const newApiKey = `whep_${crypto_1.default.randomBytes(16).toString('hex')}`;
            const updated = await app.prisma.endpoint.update({
                where: { id },
                data: { apiKey: newApiKey },
            });
            return reply.send({
                success: true,
                data: {
                    apiKey: updated.apiKey,
                },
            });
        },
    });
}
//# sourceMappingURL=endpoints.js.map