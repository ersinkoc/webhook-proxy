import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { WebhookForwarder } from '../../services/webhook-forwarder';
import { 
  createMockLogger,
  createMockQueue,
  DataGenerator,
  createMockPrismaClient,
  mockPrismaHelpers,
} from '@webhook-proxy/test-utils';

describe('WebhookForwarder', () => {
  let forwarder: WebhookForwarder;
  let mockPrisma: any;
  let mockQueue: any;
  let mockLogger: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    mockQueue = createMockQueue('webhook-queue');
    mockLogger = createMockLogger();

    forwarder = new WebhookForwarder(mockPrisma, mockQueue, mockLogger);
  });

  describe('forwardWebhook', () => {
    it('should successfully forward a webhook', async () => {
      const endpoint = DataGenerator.endpoint();
      const webhookRequest = DataGenerator.webhookRequest();

      mockPrismaHelpers.mockFindSuccess(mockPrisma, 'endpoint', endpoint);
      mockPrismaHelpers.mockCreate(mockPrisma, 'webhook', {
        id: 'webhook-123',
        endpointId: endpoint.id,
        ...webhookRequest,
        status: 'pending',
      });

      const result = await forwarder.forwardWebhook(endpoint.id, webhookRequest);

      expect(result).toHaveProperty('webhookId', 'webhook-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-webhook',
        expect.objectContaining({
          webhookId: 'webhook-123',
          endpoint,
          request: webhookRequest,
        })
      );
    });

    it('should throw error if endpoint not found', async () => {
      const webhookRequest = DataGenerator.webhookRequest();

      mockPrismaHelpers.mockNotFound(mockPrisma, 'endpoint');

      await expect(
        forwarder.forwardWebhook('non-existent', webhookRequest)
      ).rejects.toThrow('Endpoint not found');
    });

    it('should throw error if endpoint is inactive', async () => {
      const endpoint = DataGenerator.endpoint({ isActive: false });
      const webhookRequest = DataGenerator.webhookRequest();

      mockPrismaHelpers.mockFindSuccess(mockPrisma, 'endpoint', endpoint);

      await expect(
        forwarder.forwardWebhook(endpoint.id, webhookRequest)
      ).rejects.toThrow('Endpoint is not active');
    });
  });

  describe('processWebhook', () => {
    it('should successfully deliver webhook', async () => {
      const webhook = DataGenerator.webhook({ status: 'pending' });
      const endpoint = DataGenerator.endpoint();

      // Mock successful HTTP request
      const mockAxios = {
        request: jest.fn().mockResolvedValue({
          status: 200,
          data: { success: true },
          headers: { 'content-type': 'application/json' },
        }),
      };

      await forwarder.processWebhook(webhook, endpoint, mockAxios as any);

      expect(mockPrisma.webhook.update).toHaveBeenCalledWith({
        where: { id: webhook.id },
        data: expect.objectContaining({
          status: 'delivered',
          statusCode: 200,
          deliveredAt: expect.any(Date),
        }),
      });
    });

    it('should handle webhook delivery failure', async () => {
      const webhook = DataGenerator.webhook({ status: 'pending' });
      const endpoint = DataGenerator.endpoint();

      // Mock failed HTTP request
      const mockAxios = {
        request: jest.fn().mockRejectedValue(new Error('Connection timeout')),
      };

      await forwarder.processWebhook(webhook, endpoint, mockAxios as any);

      expect(mockPrisma.webhook.update).toHaveBeenCalledWith({
        where: { id: webhook.id },
        data: expect.objectContaining({
          status: 'failed',
          error: 'Connection timeout',
          attempts: webhook.attempts + 1,
        }),
      });
    });

    it('should retry webhook on failure if retries remaining', async () => {
      const webhook = DataGenerator.webhook({ 
        status: 'pending',
        attempts: 1,
      });
      const endpoint = DataGenerator.endpoint({
        retryConfig: { maxRetries: 3, retryDelay: 1000 },
      });

      // Mock failed HTTP request
      const mockAxios = {
        request: jest.fn().mockRejectedValue(new Error('Server error')),
      };

      await forwarder.processWebhook(webhook, endpoint, mockAxios as any);

      expect(mockPrisma.webhook.update).toHaveBeenCalledWith({
        where: { id: webhook.id },
        data: expect.objectContaining({
          status: 'retrying',
          nextRetryAt: expect.any(Date),
        }),
      });
    });
  });
});