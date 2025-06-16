import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { PrismaClient } from '@prisma/client';

describe('Security Testing', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testApiKey: string;
  let testEndpoint: any;

  beforeAll(async () => {
    app = await buildApp();
    prisma = app.prisma;

    // Create test user and endpoint
    const user = await prisma.user.create({
      data: {
        email: 'security-test@example.com',
        apiKey: 'whp_security_test_' + Math.random().toString(36).substr(2, 9),
      },
    });
    testApiKey = user.apiKey;

    testEndpoint = await prisma.endpoint.create({
      data: {
        name: 'Security Test',
        slug: 'security-test',
        targetUrl: 'http://localhost:3000/webhook',
        apiKey: 'whep_test_' + Math.random().toString(36).substr(2, 9),
        userId: user.id,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Input validation', () => {
    it('should prevent SQL injection in endpoint creation', async () => {
      const maliciousPayloads = [
        { name: "'; DROP TABLE endpoints; --", targetUrl: 'http://localhost:3000' },
        { name: "' OR '1'='1", targetUrl: 'http://localhost:3000' },
        { name: 'test"; DELETE FROM users WHERE "1"="1', targetUrl: 'http://localhost:3000' },
        { name: 'test\' UNION SELECT * FROM users--', targetUrl: 'http://localhost:3000' },
      ];

      for (const payload of maliciousPayloads) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/endpoints',
          payload,
          headers: {
            'X-API-Key': testApiKey,
          },
        });

        // Should either reject or safely handle the input
        if (response.statusCode === 201) {
          const created = JSON.parse(response.payload).data;
          // Verify the name was properly escaped/sanitized
          expect(created.name).toBe(payload.name);
          
          // Verify database integrity
          const tableCheck = await prisma.$queryRaw`
            SELECT tablename FROM pg_tables WHERE schemaname = 'public'
          `;
          expect(tableCheck).toBeDefined();
          expect((tableCheck as any[]).length).toBeGreaterThan(0);
        }
      }
    });

    it('should prevent XSS in webhook payloads', async () => {
      const xssPayloads = [
        { message: '<script>alert("XSS")</script>' },
        { html: '<img src="x" onerror="alert(1)">' },
        { data: '<iframe src="javascript:alert(\'XSS\')"></iframe>' },
        { svg: '<svg onload="alert(1)">' },
        { link: 'javascript:alert("XSS")' },
      ];

      for (const payload of xssPayloads) {
        const response = await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(response.statusCode).toBe(200);
        const result = JSON.parse(response.payload);
        
        // Fetch the stored webhook
        const webhook = await prisma.webhook.findUnique({
          where: { id: result.webhookId },
        });

        // Verify payload is stored as-is (not executed)
        expect(webhook!.body).toEqual(payload);
      }
    });

    it('should prevent NoSQL injection attempts', async () => {
      const noSqlPayloads = [
        { $gt: '', $lt: '~' },
        { $where: 'this.password == this.password' },
        { __proto__: { isAdmin: true } },
        { constructor: { prototype: { isAdmin: true } } },
      ];

      for (const payload of noSqlPayloads) {
        const response = await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(response.statusCode).toBe(200);
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const malformedPayloads = [
        '{"invalid": json}',
        '{"unclosed": "string',
        '{"number": 1.2.3}',
        '{invalid}',
        '[]{}',
      ];

      for (const payload of malformedPayloads) {
        const response = await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // Should either parse what it can or reject gracefully
        expect([200, 400]).toContain(response.statusCode);
      }
    });

    it('should prevent path traversal in URLs', async () => {
      const pathTraversalUrls = [
        'http://localhost:3000/../../etc/passwd',
        'http://localhost:3000/../../../windows/system32',
        'file:///etc/passwd',
        'http://localhost:3000/webhook%2f..%2f..%2fetc%2fpasswd',
      ];

      for (const targetUrl of pathTraversalUrls) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/endpoints',
          payload: {
            name: 'Path Traversal Test',
            targetUrl,
          },
          headers: {
            'X-API-Key': testApiKey,
          },
        });

        if (targetUrl.startsWith('file://')) {
          expect(response.statusCode).toBe(400);
        } else {
          // Should accept but normalize the URL
          expect(response.statusCode).toBe(201);
        }
      }
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without API key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/endpoints',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject requests with invalid API key', async () => {
      const invalidKeys = [
        'invalid-key',
        'whp_',
        'whp_00000000000000000000000000000000',
        '',
        'null',
        'undefined',
      ];

      for (const key of invalidKeys) {
        const response = await app.inject({
          method: 'GET',
          url: '/api/endpoints',
          headers: {
            'X-API-Key': key,
          },
        });

        expect(response.statusCode).toBe(401);
      }
    });

    it('should prevent access to other users endpoints', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          apiKey: 'whp_other_' + Math.random().toString(36).substr(2, 9),
        },
      });

      const otherEndpoint = await prisma.endpoint.create({
        data: {
          name: 'Other User Endpoint',
          slug: 'other-endpoint',
          targetUrl: 'http://localhost:3000',
          apiKey: 'whep_other_' + Math.random().toString(36).substr(2, 9),
          userId: otherUser.id,
        },
      });

      // Try to access with wrong user's API key
      const response = await app.inject({
        method: 'GET',
        url: `/api/endpoints/${otherEndpoint.id}`,
        headers: {
          'X-API-Key': testApiKey,
        },
      });

      expect(response.statusCode).toBe(404);

      // Try to delete
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/endpoints/${otherEndpoint.id}`,
        headers: {
          'X-API-Key': testApiKey,
        },
      });

      expect(deleteResponse.statusCode).toBe(404);
    });

    it('should prevent JWT token manipulation', async () => {
      // Get valid token
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { apiKey: testApiKey },
      });

      const { token } = JSON.parse(loginResponse.payload).data;

      // Try manipulated tokens
      const manipulatedTokens = [
        token.slice(0, -1), // Modified last character
        token + 'extra', // Added characters
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJhZG1pbiIsImFwaUtleSI6ImFkbWluIn0.invalid', // Fake admin token
      ];

      for (const badToken of manipulatedTokens) {
        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/me',
          headers: {
            'Authorization': `Bearer ${badToken}`,
          },
        });

        expect(response.statusCode).toBe(401);
      }
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const requests = Array.from({ length: 150 }, () =>
        app.inject({
          method: 'GET',
          url: '/api/endpoints',
          headers: {
            'X-API-Key': testApiKey,
          },
        })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.statusCode === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Check rate limit headers
      const limitedResponse = rateLimited[0];
      expect(limitedResponse.headers['x-ratelimit-limit']).toBeDefined();
      expect(limitedResponse.headers['x-ratelimit-remaining']).toBe('0');
    });

    it('should have separate rate limits for webhook endpoints', async () => {
      // Webhook endpoints should have higher limits
      const requests = Array.from({ length: 1100 }, () =>
        app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload: { test: true },
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      const responses = await Promise.all(requests);
      const successful = responses.filter((r) => r.statusCode === 200);
      const rateLimited = responses.filter((r) => r.statusCode === 429);

      // Should allow at least 1000 requests
      expect(successful.length).toBeGreaterThanOrEqual(1000);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Headers & CORS', () => {
    it('should set security headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should enforce CORS policy', async () => {
      const unauthorizedOrigins = [
        'http://evil.com',
        'https://malicious.site',
        'null',
      ];

      for (const origin of unauthorizedOrigins) {
        const response = await app.inject({
          method: 'OPTIONS',
          url: '/api/endpoints',
          headers: {
            'Origin': origin,
            'Access-Control-Request-Method': 'GET',
          },
        });

        // Should not include the origin in Access-Control-Allow-Origin
        if (response.headers['access-control-allow-origin']) {
          expect(response.headers['access-control-allow-origin']).not.toBe(origin);
        }
      }
    });
  });

  describe('Resource exhaustion protection', () => {
    it('should limit request body size', async () => {
      const largePayload = 'x'.repeat(11 * 1024 * 1024); // 11MB

      const response = await app.inject({
        method: 'POST',
        url: `/webhook/${testEndpoint.slug}`,
        payload: largePayload,
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      expect(response.statusCode).toBe(413); // Payload Too Large
    });

    it('should prevent infinite loops in webhook forwarding', async () => {
      // Create endpoint that points to itself
      const selfEndpoint = await prisma.endpoint.create({
        data: {
          name: 'Self Reference',
          slug: 'self-ref-' + Date.now(),
          targetUrl: `${process.env.API_BASE_URL}/webhook/self-ref-${Date.now()}`,
          apiKey: 'whep_self_' + Math.random().toString(36).substr(2, 9),
          userId: testEndpoint.userId,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/webhook/${selfEndpoint.slug}`,
        payload: { test: 'loop' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      
      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check that we don't have infinite webhooks
      const webhookCount = await prisma.webhook.count({
        where: { endpointId: selfEndpoint.id },
      });

      expect(webhookCount).toBeLessThan(10); // Should have loop detection
    });

    it('should handle zip bomb attempts', async () => {
      // Create a highly compressible payload
      const zipBomb = {
        data: Array(1000).fill('AAAAAAAAAA'.repeat(1000)).join(''),
      };

      const response = await app.inject({
        method: 'POST',
        url: `/webhook/${testEndpoint.slug}`,
        payload: JSON.stringify(zipBomb),
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
        },
      });

      // Should either reject or handle safely
      expect([200, 400, 413]).toContain(response.statusCode);
    });
  });

  describe('Timing attacks', () => {
    it('should have consistent response times for authentication failures', async () => {
      const validKey = testApiKey;
      const invalidKeys = [
        'whp_invalid_key_1',
        'whp_invalid_key_2',
        'whp_invalid_key_3',
      ];

      // Measure valid key response time
      const validStart = Date.now();
      await app.inject({
        method: 'GET',
        url: '/api/endpoints',
        headers: { 'X-API-Key': validKey },
      });
      const validTime = Date.now() - validStart;

      // Measure invalid key response times
      const invalidTimes: number[] = [];
      for (const key of invalidKeys) {
        const start = Date.now();
        await app.inject({
          method: 'GET',
          url: '/api/endpoints',
          headers: { 'X-API-Key': key },
        });
        invalidTimes.push(Date.now() - start);
      }

      // Response times should be similar (within 50ms)
      const avgInvalidTime = invalidTimes.reduce((a, b) => a + b) / invalidTimes.length;
      expect(Math.abs(validTime - avgInvalidTime)).toBeLessThan(50);
    });
  });

  describe('Content Security', () => {
    it('should sanitize file uploads in webhook payloads', async () => {
      const filePayloads = [
        {
          filename: '../../../etc/passwd',
          content: 'malicious content',
        },
        {
          filename: 'test.php',
          content: '<?php system($_GET["cmd"]); ?>',
        },
        {
          filename: 'test.exe',
          content: Buffer.from('MZ\x90\x00').toString('base64'), // PE header
        },
      ];

      for (const payload of filePayloads) {
        const response = await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(response.statusCode).toBe(200);
        
        // Verify payload is stored safely
        const result = JSON.parse(response.payload);
        const webhook = await prisma.webhook.findUnique({
          where: { id: result.webhookId },
        });

        expect(webhook!.body).toEqual(payload);
        // Should not execute or save files
      }
    });

    it('should handle Unicode and special characters safely', async () => {
      const unicodePayloads = [
        { text: '𝕳𝖊𝖑𝖑𝖔 𝖂𝖔𝖗𝖑𝖉' }, // Unicode fonts
        { text: '���' }, // Null bytes
        { text: '\u202E\u0065\u0078\u0065\u002E\u0074\u0078\u0074' }, // Right-to-left override
        { text: '＜script＞alert(1)＜/script＞' }, // Full-width characters
      ];

      for (const payload of unicodePayloads) {
        const response = await app.inject({
          method: 'POST',
          url: `/webhook/${testEndpoint.slug}`,
          payload,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(response.statusCode).toBe(200);
      }
    });
  });
});