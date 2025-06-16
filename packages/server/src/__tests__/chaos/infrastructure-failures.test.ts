import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../app';
import Redis from 'ioredis';
import { QueueService } from '../../services/queue';

describe('Chaos Engineering - Infrastructure Failures', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let redis: Redis;
  let queueService: QueueService;
  let testEndpoint: any;
  let originalDatabaseUrl: string;
  let originalRedisUrl: string;

  beforeAll(async () => {
    originalDatabaseUrl = process.env.DATABASE_URL!;
    originalRedisUrl = process.env.REDIS_URL!;
    
    app = await buildApp();
    prisma = app.prisma;
    redis = new Redis(process.env.REDIS_URL!);
    queueService = new QueueService(prisma);

    // Create test endpoint
    const user = await prisma.user.create({
      data: {
        email: 'chaos@example.com',
        apiKey: 'whp_chaos_' + Math.random().toString(36).substr(2, 9),
      },
    });

    testEndpoint = await prisma.endpoint.create({
      data: {
        name: 'Chaos Test',
        slug: 'chaos-test',
        targetUrl: 'http://localhost:3000/webhook',
        apiKey: 'whep_chaos_' + Math.random().toString(36).substr(2, 9),
        userId: user.id,
      },
    });
  });

  afterAll(async () => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.REDIS_URL = originalRedisUrl;
    await queueService.close();
    await redis.quit();
    await app.close();
  });

  describe('Database failures', () => {
    it('should handle database connection loss gracefully', async () => {
      // Store original prisma instance
      const originalPrisma = app.prisma;

      // Mock database failure
      const mockPrisma = {
        webhook: {
          create: jest.fn().mockRejectedValue(new Error('Connection lost')),
          findMany: jest.fn().mockRejectedValue(new Error('Connection lost')),
        },
        endpoint: {
          findFirst: jest.fn().mockResolvedValue(testEndpoint),
        },
        $connect: jest.fn().mockRejectedValue(new Error('Connection lost')),
        $disconnect: jest.fn(),
      };

      // Replace prisma instance
      (app as any).prisma = mockPrisma;

      // Send webhook - should still accept it
      const response = await app.inject({
        method: 'POST',
        url: `/webhook/${testEndpoint.slug}`,
        payload: { test: 'db-failure' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Should accept webhook and queue it
      expect(response.statusCode).toBe(200);

      // Restore original prisma
      (app as any).prisma = originalPrisma;

      // Verify webhook was queued in Redis
      const queuedWebhooks = await redis.llen('webhook-queue');
      expect(queuedWebhooks).toBeGreaterThan(0);
    });

    it('should handle database query timeouts', async () => {
      const slowQueryEndpoint = await prisma.endpoint.create({
        data: {
          name: 'Slow Query Test',
          slug: 'slow-query-' + Date.now(),
          targetUrl: 'http://localhost:3000',
          apiKey: 'whep_slow_' + Math.random().toString(36).substr(2, 9),
          userId: testEndpoint.userId,
        },
      });

      // Mock slow query
      const originalCreate = prisma.webhook.create;
      prisma.webhook.create = jest.fn().mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve({
          id: 'timeout-webhook',
          endpointId: slowQueryEndpoint.id,
          method: 'POST',
          headers: {},
          createdAt: new Date(),
        }), 10000)) // 10 second delay
      );

      const response = await app.inject({
        method: 'POST',
        url: `/webhook/${slowQueryEndpoint.slug}`,
        payload: { test: 'query-timeout' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Should timeout and handle gracefully
      expect(response.statusCode).toBe(200);

      // Restore original
      prisma.webhook.create = originalCreate;
    });

    it('should handle database deadlocks', async () => {
      // Simulate deadlock scenario
      const deadlockError = new Error('deadlock detected');
      (deadlockError as any).code = 'P2034';

      const originalCreate = prisma.webhook.create;
      let attempts = 0;
      
      prisma.webhook.create = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(deadlockError);
        }
        return originalCreate.call(prisma.webhook, {
          data: {
            endpointId: testEndpoint.id,
            method: 'POST',
            headers: {},
            body: { resolved: true },
          },
        });
      });

      const response = await app.inject({
        method: 'POST',
        url: `/webhook/${testEndpoint.slug}`,
        payload: { test: 'deadlock' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(attempts).toBe(3); // Should retry on deadlock

      // Restore
      prisma.webhook.create = originalCreate;
    });
  });

  describe('Redis failures', () => {
    it('should handle Redis connection loss', async () => {
      // Close Redis connection
      await redis.quit();

      // Send webhook
      const response = await app.inject({
        method: 'POST',
        url: `/webhook/${testEndpoint.slug}`,
        payload: { test: 'redis-down' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Should still work without Redis (degraded mode)
      expect(response.statusCode).toBe(200);

      // Reconnect Redis
      redis = new Redis(process.env.REDIS_URL!);
    });

    it('should handle Redis memory exhaustion', async () => {
      // Fill Redis memory (simulated)
      const largeData = 'x'.repeat(1024 * 1024); // 1MB
      const promises = [];
      
      try {
        for (let i = 0; i < 100; i++) {
          promises.push(redis.set(`large-key-${i}`, largeData));
        }
        await Promise.all(promises);
      } catch (error) {
        // Memory might be exhausted
      }

      // Try to send webhook
      const response = await app.inject({
        method: 'POST',
        url: `/webhook/${testEndpoint.slug}`,
        payload: { test: 'redis-memory' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Should handle gracefully
      expect(response.statusCode).toBe(200);

      // Cleanup
      for (let i = 0; i < 100; i++) {
        await redis.del(`large-key-${i}`);
      }
    });

    it('should handle Redis cluster failover', async () => {
      // Simulate cluster failover by disconnecting and reconnecting
      const originalClient = (queueService as any).redis;
      
      // Disconnect
      await originalClient.disconnect();

      // Send webhooks during failover
      const responses = await Promise.all(
        Array.from({ length: 5 }, () =>
          app.inject({
            method: 'POST',
            url: `/webhook/${testEndpoint.slug}`,
            payload: { test: 'failover' },
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
      );

      expect(responses.every((r) => r.statusCode === 200)).toBe(true);

      // Reconnect
      await originalClient.connect();
    });
  });

  describe('Network partitions', () => {
    it('should handle partial network failure', async () => {
      // Mock network failure to target servers
      const originalForward = (app as any).webhookForwarder.forwardWebhook;
      let failureCount = 0;

      (app as any).webhookForwarder.forwardWebhook = jest.fn().mockImplementation((options) => {
        failureCount++;
        if (failureCount % 3 === 0) {
          // Every 3rd request fails
          return Promise.resolve({
            success: false,
            error: 'Network unreachable',
            duration: 100,
          });
        }
        return originalForward.call((app as any).webhookForwarder, options);
      });

      // Send multiple webhooks
      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          app.inject({
            method: 'POST',
            url: `/webhook/${testEndpoint.slug}`,
            payload: { test: 'network-partition' },
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
      );

      expect(responses.every((r) => r.statusCode === 200)).toBe(true);
      expect(failureCount).toBe(10);

      // Restore
      (app as any).webhookForwarder.forwardWebhook = originalForward;
    });

    it('should handle DNS resolution failures', async () => {
      const dnsEndpoint = await prisma.endpoint.create({
        data: {
          name: 'DNS Failure Test',
          slug: 'dns-fail-' + Date.now(),
          targetUrl: 'http://non-existent-domain-12345.com/webhook',
          apiKey: 'whep_dns_' + Math.random().toString(36).substr(2, 9),
          userId: testEndpoint.userId,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/webhook/${dnsEndpoint.slug}`,
        payload: { test: 'dns-failure' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);

      // Check webhook was stored with error
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const webhooks = await prisma.webhook.findMany({
        where: { endpointId: dnsEndpoint.id },
      });

      expect(webhooks[0].error).toContain('ENOTFOUND');
    });
  });

  describe('Resource exhaustion', () => {
    it('should handle CPU exhaustion', async () => {
      // Simulate CPU intensive operation
      const cpuIntensive = () => {
        const start = Date.now();
        while (Date.now() - start < 100) {
          // Busy loop for 100ms
          Math.sqrt(Math.random());
        }
      };

      // Start CPU intensive tasks in background
      const intervals = Array.from({ length: 10 }, () =>
        setInterval(cpuIntensive, 10)
      );

      try {
        // Send webhooks during high CPU
        const startTime = Date.now();
        const response = await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload: { test: 'cpu-exhaustion' },
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const duration = Date.now() - startTime;

        expect(response.statusCode).toBe(200);
        // Should still respond within reasonable time
        expect(duration).toBeLessThan(5000);
      } finally {
        // Cleanup intervals
        intervals.forEach(clearInterval);
      }
    });

    it('should handle memory pressure', async () => {
      const memoryHogs: any[] = [];
      
      try {
        // Allocate large amounts of memory
        for (let i = 0; i < 50; i++) {
          memoryHogs.push(Buffer.alloc(10 * 1024 * 1024)); // 10MB each
        }

        // Check if we can still process webhooks
        const response = await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload: { test: 'memory-pressure' },
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(response.statusCode).toBe(200);
      } finally {
        // Release memory
        memoryHogs.length = 0;
        if (global.gc) {
          global.gc();
        }
      }
    });

    it('should handle file descriptor exhaustion', async () => {
      const connections: any[] = [];
      
      try {
        // Try to exhaust file descriptors
        for (let i = 0; i < 100; i++) {
          try {
            const redis = new Redis(process.env.REDIS_URL!);
            connections.push(redis);
          } catch {
            break; // Hit limit
          }
        }

        // Should still handle requests
        const response = await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload: { test: 'fd-exhaustion' },
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(response.statusCode).toBe(200);
      } finally {
        // Cleanup connections
        await Promise.all(connections.map((c) => c.quit()));
      }
    });
  });

  describe('Cascading failures', () => {
    it('should prevent cascade failure from slow endpoints', async () => {
      // Create multiple endpoints with varying response times
      const endpoints = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          const endpoint = await prisma.endpoint.create({
            data: {
              name: `Cascade Test ${i}`,
              slug: `cascade-${i}-${Date.now()}`,
              targetUrl: `http://localhost:300${i}/slow`, // Different ports
              apiKey: `whep_cascade_${i}_${Math.random().toString(36).substr(2, 9)}`,
              userId: testEndpoint.userId,
            },
          });
          return endpoint;
        })
      );

      // Mock slow responses for some endpoints
      const originalForward = (app as any).webhookForwarder.forwardWebhook;
      (app as any).webhookForwarder.forwardWebhook = jest.fn().mockImplementation((options) => {
        if (options.targetUrl.includes('3002') || options.targetUrl.includes('3003')) {
          // Slow endpoints
          return new Promise((resolve) =>
            setTimeout(() => resolve({
              success: false,
              error: 'Timeout',
              duration: 30000,
            }), 30000)
          );
        }
        return Promise.resolve({
          success: true,
          statusCode: 200,
          duration: 100,
        });
      });

      // Send webhooks to all endpoints concurrently
      const startTime = Date.now();
      const responses = await Promise.all(
        endpoints.map((endpoint) =>
          app.inject({
            method: 'POST',
            url: `/webhook/${endpoint.slug}`,
            payload: { test: 'cascade' },
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
      );

      const duration = Date.now() - startTime;

      // All should respond quickly (not wait for slow endpoints)
      expect(responses.every((r) => r.statusCode === 200)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should not cascade delays

      // Restore
      (app as any).webhookForwarder.forwardWebhook = originalForward;
    });

    it('should handle thundering herd after recovery', async () => {
      // Simulate service recovery with many queued webhooks
      const webhookIds: string[] = [];

      // Queue many webhooks
      for (let i = 0; i < 100; i++) {
        await redis.lpush('webhook-retry-queue', JSON.stringify({
          webhookId: `queued-${i}`,
          endpointId: testEndpoint.id,
          targetUrl: testEndpoint.targetUrl,
          method: 'POST',
          headers: {},
          body: { queued: i },
        }));
        webhookIds.push(`queued-${i}`);
      }

      // Process queue (simulating recovery)
      const startTime = Date.now();
      let processed = 0;

      // Mock forwarder to track processing
      const originalForward = (app as any).webhookForwarder.forwardWebhook;
      (app as any).webhookForwarder.forwardWebhook = jest.fn().mockImplementation(() => {
        processed++;
        return Promise.resolve({
          success: true,
          statusCode: 200,
          duration: 50,
        });
      });

      // Start processing (would normally be done by queue worker)
      const processingPromises = [];
      for (let i = 0; i < 10; i++) {
        processingPromises.push(
          (async () => {
            while (true) {
              const item = await redis.rpop('webhook-retry-queue');
              if (!item) break;
              const data = JSON.parse(item);
              await (app as any).webhookForwarder.forwardWebhook(data);
            }
          })()
        );
      }

      await Promise.all(processingPromises);
      const duration = Date.now() - startTime;

      // Should process all webhooks without overwhelming the system
      expect(processed).toBe(100);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Restore
      (app as any).webhookForwarder.forwardWebhook = originalForward;
    });
  });

  describe('Recovery testing', () => {
    it('should recover gracefully after multiple failures', async () => {
      const failureTypes = ['database', 'redis', 'network'];
      const originalHandlers: any = {};

      // Mock various failures
      failureTypes.forEach((type) => {
        switch (type) {
          case 'database':
            originalHandlers.database = prisma.webhook.create;
            break;
          case 'redis':
            originalHandlers.redis = redis.set;
            break;
          case 'network':
            originalHandlers.network = (app as any).webhookForwarder.forwardWebhook;
            break;
        }
      });

      // Cycle through failures
      for (const failureType of failureTypes) {
        // Inject failure
        switch (failureType) {
          case 'database':
            prisma.webhook.create = jest.fn().mockRejectedValue(new Error('DB Error'));
            break;
          case 'redis':
            redis.set = jest.fn().mockRejectedValue(new Error('Redis Error'));
            break;
          case 'network':
            (app as any).webhookForwarder.forwardWebhook = jest.fn()
              .mockRejectedValue(new Error('Network Error'));
            break;
        }

        // Send webhook during failure
        const response = await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload: { test: `recovery-${failureType}` },
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(response.statusCode).toBe(200);

        // Restore service
        switch (failureType) {
          case 'database':
            prisma.webhook.create = originalHandlers.database;
            break;
          case 'redis':
            redis.set = originalHandlers.redis;
            break;
          case 'network':
            (app as any).webhookForwarder.forwardWebhook = originalHandlers.network;
            break;
        }

        // Verify recovery
        const recoveryResponse = await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload: { test: `recovered-${failureType}` },
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(recoveryResponse.statusCode).toBe(200);
      }
    });
  });
});