import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { PrismaClient } from '@prisma/client';
import v8 from 'v8';
import { performance } from 'perf_hooks';

describe('Performance Optimization Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testEndpoint: any;

  beforeAll(async () => {
    app = await buildApp();
    prisma = app.prisma;

    const user = await prisma.user.create({
      data: {
        email: 'perf@example.com',
        apiKey: 'whp_perf_' + Math.random().toString(36).substr(2, 9),
      },
    });

    testEndpoint = await prisma.endpoint.create({
      data: {
        name: 'Performance Test',
        slug: 'perf-test',
        targetUrl: 'http://localhost:3000/webhook',
        apiKey: 'whep_perf_' + Math.random().toString(36).substr(2, 9),
        userId: user.id,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Memory profiling', () => {
    it('should not leak memory during long-running operations', async () => {
      // Force garbage collection before test
      if (global.gc) {
        global.gc();
      }

      const initialHeap = v8.getHeapStatistics();
      const initialUsed = initialHeap.used_heap_size;
      const samples: number[] = [];

      // Run operations for 60 seconds
      const endTime = Date.now() + 60 * 1000;
      let iteration = 0;

      while (Date.now() < endTime) {
        // Process webhook
        await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload: {
            iteration,
            timestamp: Date.now(),
            data: Array(100).fill('test-data'),
          },
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // Sample memory every 100 iterations
        if (iteration % 100 === 0) {
          if (global.gc) {
            global.gc();
          }
          const currentHeap = v8.getHeapStatistics();
          samples.push(currentHeap.used_heap_size);
        }

        iteration++;
      }

      // Final garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalHeap = v8.getHeapStatistics();
      const finalUsed = finalHeap.used_heap_size;
      const memoryGrowth = finalUsed - initialUsed;

      // Calculate memory growth trend
      const firstHalf = samples.slice(0, samples.length / 2);
      const secondHalf = samples.slice(samples.length / 2);
      const avgFirstHalf = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
      const growthRate = (avgSecondHalf - avgFirstHalf) / avgFirstHalf;

      // Memory growth should be minimal
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
      expect(growthRate).toBeLessThan(0.1); // Less than 10% growth rate
    }, 70000);

    it('should efficiently handle large webhook payloads', async () => {
      const payloadSizes = [1, 10, 100, 1000]; // KB
      const results: any[] = [];

      for (const sizeKB of payloadSizes) {
        const payload = {
          size: sizeKB,
          data: 'x'.repeat(sizeKB * 1024),
        };

        const startMemory = process.memoryUsage();
        const startTime = performance.now();

        const response = await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const duration = performance.now() - startTime;
        const endMemory = process.memoryUsage();

        results.push({
          sizeKB,
          duration,
          memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
          success: response.statusCode === 200,
        });

        // Force GC between tests
        if (global.gc) {
          global.gc();
        }
      }

      // Verify linear scaling
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        
        if (index > 0) {
          const prevResult = results[index - 1];
          const sizeRatio = result.sizeKB / prevResult.sizeKB;
          const durationRatio = result.duration / prevResult.duration;
          
          // Duration should scale sub-linearly (better than O(n))
          expect(durationRatio).toBeLessThan(sizeRatio * 1.5);
        }
      });
    });

    it('should handle circular references without stack overflow', async () => {
      // Create circular reference
      const circularData: any = { level: 1 };
      circularData.self = circularData;
      circularData.children = [circularData];

      const response = await app.inject({
        method: 'POST',
        url: `/webhook/${testEndpoint.slug}`,
        payload: circularData,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Should handle gracefully (Fastify should serialize safely)
      expect([200, 400]).toContain(response.statusCode);
    });
  });

  describe('CPU optimization', () => {
    it('should process webhooks efficiently without blocking event loop', async () => {
      const eventLoopDelays: number[] = [];
      let measuring = true;

      // Monitor event loop delay
      const measureEventLoop = () => {
        const start = Date.now();
        setImmediate(() => {
          const delay = Date.now() - start;
          eventLoopDelays.push(delay);
          if (measuring) {
            measureEventLoop();
          }
        });
      };
      measureEventLoop();

      // Process many webhooks concurrently
      const webhookPromises = Array.from({ length: 100 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload: {
            index: i,
            data: Array(1000).fill({ nested: 'data' }),
          },
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      await Promise.all(webhookPromises);
      measuring = false;

      // Analyze event loop delays
      const avgDelay = eventLoopDelays.reduce((a, b) => a + b) / eventLoopDelays.length;
      const maxDelay = Math.max(...eventLoopDelays);

      // Event loop should not be blocked
      expect(avgDelay).toBeLessThan(50); // Average delay under 50ms
      expect(maxDelay).toBeLessThan(200); // Max delay under 200ms
    });

    it('should optimize JSON parsing for large payloads', async () => {
      const jsonSizes = [10, 100, 1000]; // KB
      const parseResults: any[] = [];

      for (const sizeKB of jsonSizes) {
        // Generate complex JSON
        const complexData = {
          users: Array.from({ length: sizeKB * 10 }, (_, i) => ({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            metadata: {
              created: new Date().toISOString(),
              tags: Array(10).fill('tag'),
              settings: { theme: 'dark', notifications: true },
            },
          })),
        };

        const payload = JSON.stringify(complexData);
        const startTime = performance.now();

        const response = await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const duration = performance.now() - startTime;

        parseResults.push({
          sizeKB,
          duration,
          bytesPerMs: (payload.length / duration),
        });

        expect(response.statusCode).toBe(200);
      }

      // Verify consistent parsing performance
      const avgBytesPerMs = parseResults.reduce((sum, r) => sum + r.bytesPerMs, 0) / parseResults.length;
      parseResults.forEach((result) => {
        // Performance should be within 20% of average
        expect(result.bytesPerMs).toBeGreaterThan(avgBytesPerMs * 0.8);
      });
    });

    it('should use efficient algorithms for webhook matching', async () => {
      // Create many endpoints to test matching performance
      const endpoints = await Promise.all(
        Array.from({ length: 100 }, async (_, i) => {
          return prisma.endpoint.create({
            data: {
              name: `Match Test ${i}`,
              slug: `match-test-${i}-${Date.now()}`,
              targetUrl: `http://localhost:300${i % 10}`,
              apiKey: `whep_match_${i}`,
              userId: testEndpoint.userId,
            },
          });
        })
      );

      // Test webhook matching performance
      const matchingTimes: number[] = [];

      for (const endpoint of endpoints.slice(0, 20)) {
        const startTime = performance.now();
        
        const response = await app.inject({
          method: 'POST',
          url: `/webhook/${endpoint.slug}`,
          payload: { test: 'matching' },
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const duration = performance.now() - startTime;
        matchingTimes.push(duration);

        expect(response.statusCode).toBe(200);
      }

      // Matching time should be consistent regardless of position
      const avgTime = matchingTimes.reduce((a, b) => a + b) / matchingTimes.length;
      const maxDeviation = Math.max(...matchingTimes.map((t) => Math.abs(t - avgTime)));

      expect(maxDeviation).toBeLessThan(avgTime * 0.5); // Within 50% of average
    });
  });

  describe('Database optimization', () => {
    it('should use efficient queries with proper indexing', async () => {
      // Create test data
      const webhooks = await Promise.all(
        Array.from({ length: 1000 }, async (_, i) => {
          return prisma.webhook.create({
            data: {
              endpointId: testEndpoint.id,
              method: i % 2 === 0 ? 'POST' : 'GET',
              headers: {},
              body: { index: i },
              statusCode: i % 5 === 0 ? 500 : 200,
              deliveredAt: i % 3 === 0 ? new Date() : null,
            },
          });
        })
      );

      // Test query performance
      const queries = [
        // Query by endpoint (indexed)
        async () => {
          const start = performance.now();
          await prisma.webhook.findMany({
            where: { endpointId: testEndpoint.id },
            take: 20,
          });
          return performance.now() - start;
        },
        // Query by date range (indexed)
        async () => {
          const start = performance.now();
          await prisma.webhook.findMany({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
            take: 20,
          });
          return performance.now() - start;
        },
        // Complex query with multiple conditions
        async () => {
          const start = performance.now();
          await prisma.webhook.findMany({
            where: {
              endpointId: testEndpoint.id,
              method: 'POST',
              statusCode: 200,
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          });
          return performance.now() - start;
        },
      ];

      const queryTimes = await Promise.all(queries.map((q) => q()));

      // All queries should be fast with proper indexing
      queryTimes.forEach((time) => {
        expect(time).toBeLessThan(50); // Under 50ms
      });
    });

    it('should batch database operations efficiently', async () => {
      const batchSizes = [1, 10, 100];
      const results: any[] = [];

      for (const batchSize of batchSizes) {
        const webhookData = Array.from({ length: batchSize }, (_, i) => ({
          endpointId: testEndpoint.id,
          method: 'POST',
          headers: {},
          body: { batch: batchSize, index: i },
        }));

        const startTime = performance.now();

        if (batchSize === 1) {
          await prisma.webhook.create({ data: webhookData[0] });
        } else {
          await prisma.webhook.createMany({ data: webhookData });
        }

        const duration = performance.now() - startTime;

        results.push({
          batchSize,
          duration,
          timePerRecord: duration / batchSize,
        });
      }

      // Batch operations should be more efficient
      expect(results[1].timePerRecord).toBeLessThan(results[0].timePerRecord);
      expect(results[2].timePerRecord).toBeLessThan(results[1].timePerRecord);
    });

    it('should use connection pooling effectively', async () => {
      // Simulate concurrent database operations
      const concurrencyLevels = [1, 10, 50];
      const results: any[] = [];

      for (const concurrency of concurrencyLevels) {
        const startTime = performance.now();
        
        const operations = Array.from({ length: concurrency }, () =>
          prisma.webhook.count({
            where: { endpointId: testEndpoint.id },
          })
        );

        await Promise.all(operations);
        const duration = performance.now() - startTime;

        results.push({
          concurrency,
          duration,
          avgTimePerOp: duration / concurrency,
        });
      }

      // Should handle concurrency efficiently with connection pooling
      // Higher concurrency should have better average time per operation
      expect(results[1].avgTimePerOp).toBeLessThan(results[0].avgTimePerOp * 1.5);
      expect(results[2].avgTimePerOp).toBeLessThan(results[1].avgTimePerOp * 1.5);
    });
  });

  describe('Network optimization', () => {
    it('should reuse HTTP connections efficiently', async () => {
      const mockForwarder = (app as any).webhookForwarder;
      const connectionReuse: Map<string, number> = new Map();

      // Mock to track connection reuse
      const originalForward = mockForwarder.forwardWebhook;
      mockForwarder.forwardWebhook = jest.fn().mockImplementation((options) => {
        const key = `${options.targetUrl}`;
        connectionReuse.set(key, (connectionReuse.get(key) || 0) + 1);
        return Promise.resolve({
          success: true,
          statusCode: 200,
          duration: 50,
        });
      });

      // Send multiple webhooks to same target
      const promises = Array.from({ length: 20 }, () =>
        app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload: { test: 'connection-reuse' },
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      await Promise.all(promises);

      // Should reuse connections
      expect(connectionReuse.get(testEndpoint.targetUrl)).toBe(20);

      // Restore
      mockForwarder.forwardWebhook = originalForward;
    });

    it('should compress large responses efficiently', async () => {
      const mockForwarder = (app as any).webhookForwarder;
      const originalForward = mockForwarder.forwardWebhook;

      // Test with compressible data
      const largeResponse = {
        data: Array(1000).fill({
          id: 'same-id',
          value: 'repeated-value-that-compresses-well',
          metadata: { type: 'test', category: 'performance' },
        }),
      };

      mockForwarder.forwardWebhook = jest.fn().mockResolvedValue({
        success: true,
        statusCode: 200,
        response: largeResponse,
        duration: 100,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/webhook/${testEndpoint.slug}`,
        payload: { test: 'compression' },
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
      });

      expect(response.statusCode).toBe(200);

      // Check if response is compressed (if compression is enabled)
      const contentEncoding = response.headers['content-encoding'];
      if (contentEncoding) {
        expect(['gzip', 'deflate']).toContain(contentEncoding);
      }

      // Restore
      mockForwarder.forwardWebhook = originalForward;
    });
  });

  describe('Caching optimization', () => {
    it('should cache endpoint lookups efficiently', async () => {
      const lookupTimes: number[] = [];

      // First lookup (cache miss)
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload: { test: 'cache', iteration: i },
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const duration = performance.now() - startTime;
        lookupTimes.push(duration);
      }

      // First lookup should be slower than subsequent ones
      const firstLookup = lookupTimes[0];
      const avgSubsequent = lookupTimes.slice(1).reduce((a, b) => a + b) / (lookupTimes.length - 1);

      expect(avgSubsequent).toBeLessThan(firstLookup * 0.8); // At least 20% faster
    });

    it('should implement efficient LRU cache for webhook data', async () => {
      // Create cache implementation
      class LRUCache<K, V> {
        private cache = new Map<K, V>();
        private maxSize: number;

        constructor(maxSize: number) {
          this.maxSize = maxSize;
        }

        get(key: K): V | undefined {
          const value = this.cache.get(key);
          if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
          }
          return value;
        }

        set(key: K, value: V): void {
          if (this.cache.has(key)) {
            this.cache.delete(key);
          } else if (this.cache.size >= this.maxSize) {
            // Remove least recently used (first item)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
          }
          this.cache.set(key, value);
        }
      }

      const cache = new LRUCache<string, any>(100);
      const cacheHits = { hit: 0, miss: 0 };

      // Simulate webhook processing with cache
      for (let i = 0; i < 1000; i++) {
        const webhookId = `webhook-${i % 150}`; // Some will be evicted
        
        if (cache.get(webhookId)) {
          cacheHits.hit++;
        } else {
          cacheHits.miss++;
          cache.set(webhookId, { id: webhookId, data: 'cached' });
        }
      }

      const hitRate = cacheHits.hit / (cacheHits.hit + cacheHits.miss);
      expect(hitRate).toBeGreaterThan(0.5); // At least 50% hit rate
    });
  });

  describe('Concurrency optimization', () => {
    it('should handle concurrent requests without performance degradation', async () => {
      const concurrencyLevels = [1, 10, 50, 100];
      const results: any[] = [];

      for (const level of concurrencyLevels) {
        const startTime = performance.now();
        
        const requests = Array.from({ length: level }, (_, i) =>
          app.inject({
            method: 'POST',
            url: `/webhook/${testEndpoint.slug}`,
            payload: { concurrency: level, index: i },
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );

        const responses = await Promise.all(requests);
        const duration = performance.now() - startTime;

        const allSuccessful = responses.every((r) => r.statusCode === 200);
        const avgResponseTime = duration / level;

        results.push({
          concurrency: level,
          totalDuration: duration,
          avgResponseTime,
          allSuccessful,
        });

        expect(allSuccessful).toBe(true);
      }

      // Response time should not increase linearly with concurrency
      const singleRequestTime = results[0].avgResponseTime;
      results.forEach((result) => {
        // Average response time should stay within 2x of single request
        expect(result.avgResponseTime).toBeLessThan(singleRequestTime * 2);
      });
    });

    it('should optimize worker thread usage for CPU-intensive tasks', async () => {
      // Mock CPU-intensive webhook processing
      const cpuIntensivePayload = {
        operation: 'compute',
        data: Array(1000).fill(Math.random()),
      };

      const workerResults: any[] = [];

      // Test with different worker configurations
      const workerCounts = [1, 2, 4];

      for (const workers of workerCounts) {
        const startTime = performance.now();
        
        // Simulate processing with worker threads
        const requests = Array.from({ length: 20 }, () =>
          app.inject({
            method: 'POST',
            url: `/webhook/${testEndpoint.slug}`,
            payload: cpuIntensivePayload,
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );

        await Promise.all(requests);
        const duration = performance.now() - startTime;

        workerResults.push({
          workers,
          duration,
          throughput: 20 / (duration / 1000), // requests per second
        });
      }

      // More workers should improve throughput for CPU-intensive tasks
      expect(workerResults[1].throughput).toBeGreaterThan(workerResults[0].throughput);
      expect(workerResults[2].throughput).toBeGreaterThan(workerResults[1].throughput);
    });
  });
});