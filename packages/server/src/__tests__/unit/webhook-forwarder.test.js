"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const webhook_forwarder_1 = require("../../services/webhook-forwarder");
const test_utils_1 = require("@webhook-proxy/test-utils");
(0, globals_1.describe)('WebhookForwarder', () => {
    let forwarder;
    let mockPrisma;
    let mockQueue;
    let mockLogger;
    (0, globals_1.beforeEach)(() => {
        mockPrisma = (0, test_utils_1.createMockPrismaClient)();
        mockQueue = (0, test_utils_1.createMockQueue)('webhook-queue');
        mockLogger = (0, test_utils_1.createMockLogger)();
        forwarder = new webhook_forwarder_1.WebhookForwarder(mockPrisma, mockQueue, mockLogger);
    });
    (0, globals_1.describe)('forwardWebhook', () => {
        (0, globals_1.it)('should successfully forward a webhook', async () => {
            const endpoint = test_utils_1.DataGenerator.endpoint();
            const webhookRequest = test_utils_1.DataGenerator.webhookRequest();
            test_utils_1.mockPrismaHelpers.mockFindSuccess(mockPrisma, 'endpoint', endpoint);
            test_utils_1.mockPrismaHelpers.mockCreate(mockPrisma, 'webhook', {
                id: 'webhook-123',
                endpointId: endpoint.id,
                ...webhookRequest,
                status: 'pending',
            });
            const result = await forwarder.forwardWebhook(endpoint.id, webhookRequest);
            (0, globals_1.expect)(result).toHaveProperty('webhookId', 'webhook-123');
            (0, globals_1.expect)(mockQueue.add).toHaveBeenCalledWith('process-webhook', globals_1.expect.objectContaining({
                webhookId: 'webhook-123',
                endpoint,
                request: webhookRequest,
            }));
        });
        (0, globals_1.it)('should throw error if endpoint not found', async () => {
            const webhookRequest = test_utils_1.DataGenerator.webhookRequest();
            test_utils_1.mockPrismaHelpers.mockNotFound(mockPrisma, 'endpoint');
            await (0, globals_1.expect)(forwarder.forwardWebhook('non-existent', webhookRequest)).rejects.toThrow('Endpoint not found');
        });
        (0, globals_1.it)('should throw error if endpoint is inactive', async () => {
            const endpoint = test_utils_1.DataGenerator.endpoint({ isActive: false });
            const webhookRequest = test_utils_1.DataGenerator.webhookRequest();
            test_utils_1.mockPrismaHelpers.mockFindSuccess(mockPrisma, 'endpoint', endpoint);
            await (0, globals_1.expect)(forwarder.forwardWebhook(endpoint.id, webhookRequest)).rejects.toThrow('Endpoint is not active');
        });
    });
    (0, globals_1.describe)('processWebhook', () => {
        (0, globals_1.it)('should successfully deliver webhook', async () => {
            const webhook = test_utils_1.DataGenerator.webhook({ status: 'pending' });
            const endpoint = test_utils_1.DataGenerator.endpoint();
            // Mock successful HTTP request
            const mockAxios = {
                request: globals_1.jest.fn().mockResolvedValue({
                    status: 200,
                    data: { success: true },
                    headers: { 'content-type': 'application/json' },
                }),
            };
            await forwarder.processWebhook(webhook, endpoint, mockAxios);
            (0, globals_1.expect)(mockPrisma.webhook.update).toHaveBeenCalledWith({
                where: { id: webhook.id },
                data: globals_1.expect.objectContaining({
                    status: 'delivered',
                    statusCode: 200,
                    deliveredAt: globals_1.expect.any(Date),
                }),
            });
        });
        (0, globals_1.it)('should handle webhook delivery failure', async () => {
            const webhook = test_utils_1.DataGenerator.webhook({ status: 'pending' });
            const endpoint = test_utils_1.DataGenerator.endpoint();
            // Mock failed HTTP request
            const mockAxios = {
                request: globals_1.jest.fn().mockRejectedValue(new Error('Connection timeout')),
            };
            await forwarder.processWebhook(webhook, endpoint, mockAxios);
            (0, globals_1.expect)(mockPrisma.webhook.update).toHaveBeenCalledWith({
                where: { id: webhook.id },
                data: globals_1.expect.objectContaining({
                    status: 'failed',
                    error: 'Connection timeout',
                    attempts: webhook.attempts + 1,
                }),
            });
        });
        (0, globals_1.it)('should retry webhook on failure if retries remaining', async () => {
            const webhook = test_utils_1.DataGenerator.webhook({
                status: 'pending',
                attempts: 1,
            });
            const endpoint = test_utils_1.DataGenerator.endpoint({
                retryConfig: { maxRetries: 3, retryDelay: 1000 },
            });
            // Mock failed HTTP request
            const mockAxios = {
                request: globals_1.jest.fn().mockRejectedValue(new Error('Server error')),
            };
            await forwarder.processWebhook(webhook, endpoint, mockAxios);
            (0, globals_1.expect)(mockPrisma.webhook.update).toHaveBeenCalledWith({
                where: { id: webhook.id },
                data: globals_1.expect.objectContaining({
                    status: 'retrying',
                    nextRetryAt: globals_1.expect.any(Date),
                }),
            });
        });
    });
});
//# sourceMappingURL=webhook-forwarder.test.js.map