"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRoutes = webhookRoutes;
const zod_1 = require("zod");
const shared_1 = require("@webhook-proxy/shared");
const webhook_forwarder_1 = require("../services/webhook-forwarder");
const querySchema = zod_1.z.object({
    endpointId: zod_1.z.string().optional(),
    method: zod_1.z.string().optional(),
    statusCode: zod_1.z.string().optional().transform((val) => val ? parseInt(val) : undefined),
    success: zod_1.z.string().optional().transform((val) => val === 'true'),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    page: zod_1.z.string().optional().default('1').transform(Number),
    pageSize: zod_1.z.string().optional().default('20').transform(Number),
});
async function webhookRoutes(app) {
    const forwarder = new webhook_forwarder_1.WebhookForwarder();
    // List webhooks
    app.get('/', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            const filters = querySchema.parse(request.query);
            const { page, pageSize } = filters;
            const offset = (page - 1) * pageSize;
            // Build where clause
            const where = {};
            // Ensure user can only see their own webhooks
            where.endpoint = {
                userId: request.user.id,
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
                }
                else {
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
            const webhookData = webhooks.map((webhook) => ({
                id: webhook.id,
                endpointId: webhook.endpointId,
                method: webhook.method,
                headers: webhook.headers,
                query: webhook.query,
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
                },
            });
        },
    });
    // Get single webhook
    app.get('/:id', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            const { id } = request.params;
            const webhook = await app.prisma.webhook.findFirst({
                where: {
                    id,
                    endpoint: {
                        userId: request.user.id,
                    },
                },
            });
            if (!webhook) {
                return reply.status(404).send({
                    success: false,
                    error: 'Webhook not found',
                });
            }
            const webhookData = {
                id: webhook.id,
                endpointId: webhook.endpointId,
                method: webhook.method,
                headers: webhook.headers,
                query: webhook.query,
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
            });
        },
    });
    // Resend webhook
    app.post('/:id/resend', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            const { id } = request.params;
            const webhook = await app.prisma.webhook.findFirst({
                where: {
                    id,
                    endpoint: {
                        userId: request.user.id,
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
                });
            }
            if (!webhook.endpoint.isActive) {
                return reply.status(400).send({
                    success: false,
                    error: 'Endpoint is not active',
                });
            }
            // Forward the webhook
            const result = await forwarder.forwardWebhook({
                webhookId: webhook.id,
                targetUrl: webhook.endpoint.targetUrl,
                method: webhook.method,
                headers: webhook.headers,
                query: webhook.query,
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
            });
        },
    });
    // Delete webhook
    app.delete('/:id', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            const { id } = request.params;
            const webhook = await app.prisma.webhook.findFirst({
                where: {
                    id,
                    endpoint: {
                        userId: request.user.id,
                    },
                },
            });
            if (!webhook) {
                return reply.status(404).send({
                    success: false,
                    error: 'Webhook not found',
                });
            }
            await app.prisma.webhook.delete({
                where: { id },
            });
            return reply.status(204).send();
        },
    });
    // Delete all webhooks for an endpoint
    app.delete('/bulk', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            const { endpointId } = request.query;
            // Verify endpoint belongs to user
            const endpoint = await app.prisma.endpoint.findFirst({
                where: {
                    id: endpointId,
                    userId: request.user.id,
                },
            });
            if (!endpoint) {
                return reply.status(404).send({
                    success: false,
                    error: 'Endpoint not found',
                });
            }
            const result = await app.prisma.webhook.deleteMany({
                where: { endpointId },
            });
            return reply.send({
                success: true,
                data: {
                    deleted: result.count,
                },
            });
        },
    });
    // Register dynamic webhook receiver route at root level
    app.register(async function webhookReceiver(app) {
        app.all('/webhook/:endpointId', {
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
                    });
                }
                // Parse request data
                const headers = (0, shared_1.parseHeaders)(request.headers);
                const query = request.query;
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
                    webhookId: webhook.id,
                });
            },
        });
    }, { prefix: '' }); // Register at root level, not under /api/webhooks
}
//# sourceMappingURL=webhooks.js.map