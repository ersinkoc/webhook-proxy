import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../app';
import { MockWebhookServer } from '@webhook-proxy/test-utils';
import { Server } from 'socket.io';
import { io as ioClient, Socket } from 'socket.io-client';
import { config } from '../../config';

describe('Webhook Flow Integration', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let mockServer: MockWebhookServer;
  let socketServer: Server;
  let socketClient: Socket;
  let testApiKey: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup test database
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/webhook_proxy_test';
    
    // Initialize app
    app = await buildApp();
    prisma = app.prisma;
    
    // Clean database
    await prisma.webhook.deleteMany();
    await prisma.endpoint.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        apiKey: 'whp_test_' + Math.random().toString(36).substr(2, 9),
      },
    });
    testApiKey = user.apiKey;
    testUserId = user.id;

    // Start mock webhook server
    mockServer = new MockWebhookServer();
    await mockServer.start(3001);

    // Setup socket connection
    socketServer = app.io;
    socketClient = ioClient(`http://localhost:${config.port}`, {
      auth: {
        token: testApiKey,
      },
    });

    await new Promise((resolve) => {
      socketClient.on('connect', resolve);
    });
  });

  afterAll(async () => {
    await socketClient.close();
    await mockServer.stop();
    await app.close();
    await prisma.$disconnect();
  });

  describe('End-to-end webhook processing', () => {
    it('should process GitHub webhook from creation to delivery', async () => {
      // 1. Create endpoint
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/endpoints',
        payload: {
          name: 'GitHub Test',
          targetUrl: 'http://localhost:3001/webhook',
        },
        headers: {
          'X-API-Key': testApiKey,
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const endpoint = JSON.parse(createResponse.payload).data;
      expect(endpoint.slug).toBeDefined();
      expect(endpoint.apiKey).toBeDefined();

      // 2. Setup webhook expectations
      mockServer.expectWebhook('/webhook', {
        status: 200,
        response: { received: true },
      });

      // 3. Subscribe to socket events
      const receivedEvents: any[] = [];
      socketClient.emit('subscribe:endpoint', endpoint.id);
      socketClient.on('webhook:event', (event) => {
        receivedEvents.push(event);
      });

      // 4. Send GitHub webhook
      const githubPayload = {
        ref: 'refs/heads/main',
        commits: [
          {
            id: 'abc123',
            message: 'Test commit',
            author: {
              name: 'Test User',
              email: 'test@example.com',
            },
          },
        ],
        repository: {
          name: 'test-repo',
          full_name: 'testuser/test-repo',
        },
      };

      const webhookResponse = await app.inject({
        method: 'POST',
        url: `/webhook/${endpoint.slug}`,
        payload: githubPayload,
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'push',
          'X-GitHub-Delivery': 'test-delivery-123',
          'X-Hub-Signature-256': 'sha256=test-signature',
        },
      });

      expect(webhookResponse.statusCode).toBe(200);
      const webhookResult = JSON.parse(webhookResponse.payload);
      expect(webhookResult.success).toBe(true);
      expect(webhookResult.webhookId).toBeDefined();

      // 5. Wait for delivery
      await mockServer.waitForWebhook('/webhook', 5000);

      // 6. Verify webhook was delivered
      const deliveredWebhooks = mockServer.getReceivedWebhooks('/webhook');
      expect(deliveredWebhooks).toHaveLength(1);
      expect(deliveredWebhooks[0].body).toEqual(githubPayload);
      expect(deliveredWebhooks[0].headers['x-github-event']).toBe('push');

      // 7. Verify webhook is stored in database
      const storedWebhook = await prisma.webhook.findUnique({
        where: { id: webhookResult.webhookId },
      });
      expect(storedWebhook).toBeDefined();
      expect(storedWebhook!.method).toBe('POST');
      expect(storedWebhook!.statusCode).toBe(200);
      expect(storedWebhook!.deliveredAt).toBeDefined();
      expect(storedWebhook!.body).toEqual(githubPayload);

      // 8. Verify socket events were emitted
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[0].type).toBe('webhook:received');
      expect(receivedEvents[1].type).toBe('webhook:delivered');
    });

    it('should handle Stripe webhook with signature verification', async () => {
      // Create endpoint for Stripe
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/endpoints',
        payload: {
          name: 'Stripe Test',
          targetUrl: 'http://localhost:3001/stripe-webhook',
        },
        headers: {
          'X-API-Key': testApiKey,
        },
      });

      const endpoint = JSON.parse(createResponse.payload).data;

      // Setup mock server expectation
      mockServer.expectWebhook('/stripe-webhook', {
        status: 200,
        response: { success: true },
      });

      // Send Stripe webhook
      const stripePayload = {
        id: 'evt_test_webhook',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'pi_test_payment',
            object: 'payment_intent',
            amount: 2000,
            currency: 'usd',
            status: 'succeeded',
          },
        },
        type: 'payment_intent.succeeded',
      };

      const timestamp = Math.floor(Date.now() / 1000);
      const signature = `t=${timestamp},v1=test_signature,v0=test_signature_v0`;

      const webhookResponse = await app.inject({
        method: 'POST',
        url: `/webhook/${endpoint.slug}`,
        payload: stripePayload,
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': signature,
        },
      });

      expect(webhookResponse.statusCode).toBe(200);

      // Verify delivery
      await mockServer.waitForWebhook('/stripe-webhook', 5000);
      const delivered = mockServer.getReceivedWebhooks('/stripe-webhook');
      expect(delivered[0].headers['stripe-signature']).toBe(signature);
    });

    it('should handle webhook with query parameters', async () => {
      const endpoint = await prisma.endpoint.create({
        data: {
          name: 'Query Test',
          slug: 'query-test-' + Date.now(),
          targetUrl: 'http://localhost:3001/query-webhook',
          apiKey: 'whep_test_' + Math.random().toString(36).substr(2, 9),
          userId: testUserId,
        },
      });

      mockServer.expectWebhook('/query-webhook', {
        status: 200,
        response: { received: true },
      });

      const queryParams = {
        token: 'abc123',
        timestamp: '1234567890',
        signature: 'test-sig',
      };

      const webhookResponse = await app.inject({
        method: 'POST',
        url: `/webhook/${endpoint.slug}?token=abc123&timestamp=1234567890&signature=test-sig`,
        payload: { test: 'data' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(webhookResponse.statusCode).toBe(200);

      await mockServer.waitForWebhook('/query-webhook', 5000);
      const delivered = mockServer.getReceivedWebhooks('/query-webhook');
      expect(delivered[0].query).toEqual(queryParams);
    });

    it('should handle multiple concurrent webhooks', async () => {
      const endpoint = await prisma.endpoint.create({
        data: {
          name: 'Concurrent Test',
          slug: 'concurrent-test-' + Date.now(),
          targetUrl: 'http://localhost:3001/concurrent',
          apiKey: 'whep_test_' + Math.random().toString(36).substr(2, 9),
          userId: testUserId,
        },
      });

      // Expect multiple webhooks
      for (let i = 0; i < 10; i++) {
        mockServer.expectWebhook('/concurrent', {
          status: 200,
          response: { id: i },
        });
      }

      // Send 10 concurrent webhooks
      const promises = Array.from({ length: 10 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: `/webhook/${endpoint.slug}`,
          payload: { index: i, timestamp: Date.now() },
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      const responses = await Promise.all(promises);
      expect(responses.every((r) => r.statusCode === 200)).toBe(true);

      // Verify all were delivered
      await mockServer.waitForWebhooks('/concurrent', 10, 10000);
      const delivered = mockServer.getReceivedWebhooks('/concurrent');
      expect(delivered).toHaveLength(10);
    });
  });

  describe('Error scenarios', () => {
    it('should handle target server downtime gracefully', async () => {
      const endpoint = await prisma.endpoint.create({
        data: {
          name: 'Downtime Test',
          slug: 'downtime-test-' + Date.now(),
          targetUrl: 'http://localhost:9999/unreachable', // Non-existent server
          apiKey: 'whep_test_' + Math.random().toString(36).substr(2, 9),
          userId: testUserId,
        },
      });

      const webhookResponse = await app.inject({
        method: 'POST',
        url: `/webhook/${endpoint.slug}`,
        payload: { test: 'data' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Should still accept webhook
      expect(webhookResponse.statusCode).toBe(200);
      const result = JSON.parse(webhookResponse.payload);
      expect(result.success).toBe(true);
      expect(result.webhookId).toBeDefined();

      // Verify webhook is stored with error
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const webhook = await prisma.webhook.findUnique({
        where: { id: result.webhookId },
      });
      expect(webhook!.error).toContain('ECONNREFUSED');
    });

    it('should handle target server timeout', async () => {
      const endpoint = await prisma.endpoint.create({
        data: {
          name: 'Timeout Test',
          slug: 'timeout-test-' + Date.now(),
          targetUrl: 'http://localhost:3001/timeout',
          apiKey: 'whep_test_' + Math.random().toString(36).substr(2, 9),
          userId: testUserId,
        },
      });

      // Setup mock to timeout
      mockServer.expectWebhook('/timeout', {
        delay: 35000, // Longer than webhook timeout
        status: 200,
        response: { received: true },
      });

      const webhookResponse = await app.inject({
        method: 'POST',
        url: `/webhook/${endpoint.slug}`,
        payload: { test: 'timeout' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(webhookResponse.statusCode).toBe(200);

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 31000));

      const result = JSON.parse(webhookResponse.payload);
      const webhook = await prisma.webhook.findUnique({
        where: { id: result.webhookId },
      });
      expect(webhook!.error).toContain('timeout');
    }, 40000);

    it('should handle target server returning 5xx errors', async () => {
      const endpoint = await prisma.endpoint.create({
        data: {
          name: 'Server Error Test',
          slug: 'server-error-test-' + Date.now(),
          targetUrl: 'http://localhost:3001/server-error',
          apiKey: 'whep_test_' + Math.random().toString(36).substr(2, 9),
          userId: testUserId,
        },
      });

      // Setup mock to return 500 errors
      let attempts = 0;
      mockServer.expectWebhook('/server-error', () => {
        attempts++;
        if (attempts < 3) {
          return {
            status: 500,
            response: { error: 'Internal Server Error' },
          };
        }
        return {
          status: 200,
          response: { success: true },
        };
      });

      const webhookResponse = await app.inject({
        method: 'POST',
        url: `/webhook/${endpoint.slug}`,
        payload: { test: 'error' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(webhookResponse.statusCode).toBe(200);

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 5000));
      expect(attempts).toBe(3);

      const result = JSON.parse(webhookResponse.payload);
      const webhook = await prisma.webhook.findUnique({
        where: { id: result.webhookId },
      });
      expect(webhook!.statusCode).toBe(200);
    });
  });

  describe('Webhook management API', () => {
    it('should list webhooks with filtering', async () => {
      const endpoint = await prisma.endpoint.create({
        data: {
          name: 'List Test',
          slug: 'list-test-' + Date.now(),
          targetUrl: 'http://localhost:3001/list',
          apiKey: 'whep_test_' + Math.random().toString(36).substr(2, 9),
          userId: testUserId,
        },
      });

      // Create various webhooks
      await prisma.webhook.createMany({
        data: [
          {
            endpointId: endpoint.id,
            method: 'POST',
            headers: {},
            body: { test: 1 },
            statusCode: 200,
            deliveredAt: new Date(),
          },
          {
            endpointId: endpoint.id,
            method: 'POST',
            headers: {},
            body: { test: 2 },
            statusCode: 404,
            deliveredAt: new Date(),
          },
          {
            endpointId: endpoint.id,
            method: 'GET',
            headers: {},
            statusCode: 200,
            deliveredAt: new Date(),
          },
        ],
      });

      // Test filtering by success
      const successResponse = await app.inject({
        method: 'GET',
        url: `/api/webhooks?endpointId=${endpoint.id}&success=true`,
        headers: {
          'X-API-Key': testApiKey,
        },
      });

      expect(successResponse.statusCode).toBe(200);
      const successData = JSON.parse(successResponse.payload).data;
      expect(successData.items).toHaveLength(2);
      expect(successData.items.every((w: any) => w.statusCode < 400)).toBe(true);

      // Test filtering by method
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/webhooks?endpointId=${endpoint.id}&method=GET`,
        headers: {
          'X-API-Key': testApiKey,
        },
      });

      const getData = JSON.parse(getResponse.payload).data;
      expect(getData.items).toHaveLength(1);
      expect(getData.items[0].method).toBe('GET');
    });

    it('should resend webhook successfully', async () => {
      const endpoint = await prisma.endpoint.create({
        data: {
          name: 'Resend Test',
          slug: 'resend-test-' + Date.now(),
          targetUrl: 'http://localhost:3001/resend',
          apiKey: 'whep_test_' + Math.random().toString(36).substr(2, 9),
          userId: testUserId,
        },
      });

      // Create a failed webhook
      const webhook = await prisma.webhook.create({
        data: {
          endpointId: endpoint.id,
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: { test: 'resend' },
          statusCode: 500,
          error: 'Original failure',
          deliveredAt: new Date(),
        },
      });

      // Setup successful response for resend
      mockServer.expectWebhook('/resend', {
        status: 200,
        response: { success: true },
      });

      const resendResponse = await app.inject({
        method: 'POST',
        url: `/api/webhooks/${webhook.id}/resend`,
        headers: {
          'X-API-Key': testApiKey,
        },
      });

      expect(resendResponse.statusCode).toBe(200);
      const resendResult = JSON.parse(resendResponse.payload).data;
      expect(resendResult.success).toBe(true);
      expect(resendResult.statusCode).toBe(200);

      // Verify webhook was delivered
      await mockServer.waitForWebhook('/resend', 5000);
      const delivered = mockServer.getReceivedWebhooks('/resend');
      expect(delivered[0].body).toEqual({ test: 'resend' });
    });

    it('should delete webhooks in bulk', async () => {
      const endpoint = await prisma.endpoint.create({
        data: {
          name: 'Bulk Delete Test',
          slug: 'bulk-delete-test-' + Date.now(),
          targetUrl: 'http://localhost:3001/bulk',
          apiKey: 'whep_test_' + Math.random().toString(36).substr(2, 9),
          userId: testUserId,
        },
      });

      // Create multiple webhooks
      await prisma.webhook.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          endpointId: endpoint.id,
          method: 'POST',
          headers: {},
          body: { index: i },
        })),
      });

      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/webhooks/bulk?endpointId=${endpoint.id}`,
        headers: {
          'X-API-Key': testApiKey,
        },
      });

      expect(deleteResponse.statusCode).toBe(200);
      const deleteResult = JSON.parse(deleteResponse.payload).data;
      expect(deleteResult.deleted).toBe(5);

      // Verify webhooks are deleted
      const remaining = await prisma.webhook.count({
        where: { endpointId: endpoint.id },
      });
      expect(remaining).toBe(0);
    });
  });

  describe('Real-time features', () => {
    it('should broadcast webhook events to multiple clients', async () => {
      const endpoint = await prisma.endpoint.create({
        data: {
          name: 'Broadcast Test',
          slug: 'broadcast-test-' + Date.now(),
          targetUrl: 'http://localhost:3001/broadcast',
          apiKey: 'whep_test_' + Math.random().toString(36).substr(2, 9),
          userId: testUserId,
        },
      });

      // Create multiple socket clients
      const clients = await Promise.all(
        Array.from({ length: 3 }, () =>
          ioClient(`http://localhost:${config.port}`, {
            auth: { token: testApiKey },
          })
        )
      );

      // Wait for connections
      await Promise.all(
        clients.map(
          (client) =>
            new Promise((resolve) => {
              client.on('connect', resolve);
            })
        )
      );

      // Subscribe all clients to the endpoint
      const receivedEvents: any[][] = [[], [], []];
      clients.forEach((client, index) => {
        client.emit('subscribe:endpoint', endpoint.id);
        client.on('webhook:event', (event) => {
          receivedEvents[index].push(event);
        });
      });

      // Setup mock response
      mockServer.expectWebhook('/broadcast', {
        status: 200,
        response: { success: true },
      });

      // Send webhook
      await app.inject({
        method: 'POST',
        url: `/webhook/${endpoint.slug}`,
        payload: { broadcast: 'test' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Wait for events
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify all clients received events
      receivedEvents.forEach((events) => {
        expect(events).toHaveLength(2);
        expect(events[0].type).toBe('webhook:received');
        expect(events[1].type).toBe('webhook:delivered');
      });

      // Cleanup
      await Promise.all(clients.map((client) => client.close()));
    });

    it('should handle client disconnection and reconnection', async () => {
      const endpoint = await prisma.endpoint.create({
        data: {
          name: 'Reconnect Test',
          slug: 'reconnect-test-' + Date.now(),
          targetUrl: 'http://localhost:3001/reconnect',
          apiKey: 'whep_test_' + Math.random().toString(36).substr(2, 9),
          userId: testUserId,
        },
      });

      // Create client
      const client = ioClient(`http://localhost:${config.port}`, {
        auth: { token: testApiKey },
      });

      await new Promise((resolve) => {
        client.on('connect', resolve);
      });

      const events: any[] = [];
      client.emit('subscribe:endpoint', endpoint.id);
      client.on('webhook:event', (event) => {
        events.push(event);
      });

      // Disconnect
      client.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send webhook while disconnected
      mockServer.expectWebhook('/reconnect', {
        status: 200,
        response: { success: true },
      });

      await app.inject({
        method: 'POST',
        url: `/webhook/${endpoint.slug}`,
        payload: { disconnected: true },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Reconnect
      client.connect();
      await new Promise((resolve) => {
        client.on('connect', resolve);
      });

      // Re-subscribe
      client.emit('subscribe:endpoint', endpoint.id);

      // Send another webhook
      await app.inject({
        method: 'POST',
        url: `/webhook/${endpoint.slug}`,
        payload: { reconnected: true },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should only receive events for webhook sent after reconnection
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events.some((e) => e.data.body?.reconnected)).toBe(true);
      expect(events.every((e) => !e.data.body?.disconnected)).toBe(true);

      await client.close();
    });
  });
});