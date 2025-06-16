import { WebhookForwarder } from '../../services/webhook-forwarder';
import axios, { AxiosError } from 'axios';
import { logger } from '../../utils/logger';
import { generateWebhook, generateLargePayload } from '@webhook-proxy/test-utils';

jest.mock('axios');
jest.mock('../../utils/logger');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhookForwarder', () => {
  let forwarder: WebhookForwarder;

  beforeEach(() => {
    forwarder = new WebhookForwarder();
    jest.clearAllMocks();
  });

  describe('Real-world scenarios', () => {
    it('should handle GitHub webhook with large payload (>1MB)', async () => {
      const largePayload = generateLargePayload(1.5 * 1024 * 1024); // 1.5MB
      const webhook = generateWebhook({
        body: largePayload,
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'push',
          'x-github-delivery': 'test-delivery-123',
        },
      });

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
        headers: {},
      });

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://example.com/webhook',
          data: largePayload,
        })
      );
    });

    it('should retry on network failures with exponential backoff', async () => {
      const webhook = generateWebhook();
      let attemptCount = 0;
      const attemptTimes: number[] = [];

      mockedAxios
        .mockImplementationOnce(() => {
          attemptTimes.push(Date.now());
          attemptCount++;
          return Promise.reject(new Error('ECONNRESET'));
        })
        .mockImplementationOnce(() => {
          attemptTimes.push(Date.now());
          attemptCount++;
          return Promise.reject(new Error('ETIMEDOUT'));
        })
        .mockImplementationOnce(() => {
          attemptTimes.push(Date.now());
          attemptCount++;
          return Promise.resolve({ status: 200, data: 'success', headers: {} });
        });

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(attemptCount).toBe(3);
      expect(result.success).toBe(true);
      
      // Verify exponential backoff
      if (attemptTimes.length >= 2) {
        const firstDelay = attemptTimes[1] - attemptTimes[0];
        const secondDelay = attemptTimes[2] - attemptTimes[1];
        expect(secondDelay).toBeGreaterThan(firstDelay);
      }
    });

    it('should handle Stripe webhook with signature headers', async () => {
      const stripePayload = {
        id: 'evt_test_123',
        object: 'event',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_123',
            amount_paid: 2000,
            currency: 'usd',
          },
        },
      };

      const webhook = generateWebhook({
        body: stripePayload,
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
      });

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { received: true },
        headers: {},
      });

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/stripe/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(result.success).toBe(true);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'stripe-signature': 't=1234567890,v1=test_signature',
          }),
        })
      );
    });

    it('should fail gracefully on invalid JSON response', async () => {
      const webhook = generateWebhook();

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: 'Invalid JSON: {broken',
        headers: { 'content-type': 'application/json' },
      });

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.response).toBe('Invalid JSON: {broken');
    });

    it('should handle target server returning 500 errors with retry', async () => {
      const webhook = generateWebhook();

      mockedAxios
        .mockResolvedValueOnce({
          status: 500,
          data: 'Internal Server Error',
          headers: {},
        })
        .mockResolvedValueOnce({
          status: 503,
          data: 'Service Unavailable',
          headers: {},
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { success: true },
          headers: {},
        });

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockedAxios).toHaveBeenCalledTimes(3);
    });

    it('should handle circular JSON references safely', async () => {
      const webhook = generateWebhook();
      const circularObj: any = { a: 1 };
      circularObj.self = circularObj;

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: circularObj,
        headers: {},
      });

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(result.success).toBe(true);
      expect(result.response).toEqual({
        _type: 'object',
        _message: 'Response could not be serialized',
      });
    });

    it('should preserve custom headers except restricted ones', async () => {
      const webhook = generateWebhook({
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
          'authorization': 'Bearer token123',
          'host': 'malicious.com', // Should be removed
          'content-length': '999', // Should be removed
          'cf-ray': 'cloudflare-id', // Should be removed
        },
      });

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
        headers: {},
      });

      await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      const calledHeaders = mockedAxios.mock.calls[0][0].headers;
      expect(calledHeaders['x-custom-header']).toBe('custom-value');
      expect(calledHeaders['authorization']).toBe('Bearer token123');
      expect(calledHeaders['host']).toBeUndefined();
      expect(calledHeaders['content-length']).toBeUndefined();
      expect(calledHeaders['cf-ray']).toBeUndefined();
      expect(calledHeaders['X-Webhook-Proxy']).toBe('true');
    });
  });

  describe('Performance tests', () => {
    it('should handle concurrent webhook forwarding efficiently', async () => {
      const webhooks = Array.from({ length: 50 }, () => generateWebhook());
      
      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
      });

      const startTime = Date.now();
      const results = await Promise.all(
        webhooks.map((webhook) =>
          forwarder.forwardWebhook({
            webhookId: webhook.id,
            targetUrl: 'https://example.com/webhook',
            method: webhook.method,
            headers: webhook.headers,
            body: webhook.body,
          })
        )
      );
      const duration = Date.now() - startTime;

      expect(results.every((r) => r.success)).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should limit response size to prevent memory issues', async () => {
      const webhook = generateWebhook();
      const largeResponse = 'x'.repeat(2 * 1024 * 1024); // 2MB response

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: largeResponse,
        headers: {},
      });

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(result.success).toBe(true);
      expect(result.response).toEqual({
        _truncated: true,
        _originalSize: expect.any(Number),
        _message: 'Response too large, truncated',
      });
    });
  });

  describe('Error handling', () => {
    it('should handle DNS resolution failures', async () => {
      const webhook = generateWebhook();
      const error = new Error('getaddrinfo ENOTFOUND invalid.domain.com') as AxiosError;
      error.code = 'ENOTFOUND';

      mockedAxios.mockRejectedValue(error);

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://invalid.domain.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('hostname could not be resolved');
    });

    it('should handle connection timeouts', async () => {
      const webhook = generateWebhook();
      const error = new Error('timeout of 30000ms exceeded') as AxiosError;
      error.code = 'ECONNABORTED';

      mockedAxios.mockRejectedValue(error);

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://slow.example.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Request timeout after 30000ms');
    });

    it('should handle SSL certificate errors', async () => {
      const webhook = generateWebhook();
      const error = new Error('self signed certificate') as AxiosError;
      error.code = 'DEPTH_ZERO_SELF_SIGNED_CERT';

      mockedAxios.mockRejectedValue(error);

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://self-signed.example.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('self signed certificate');
    });

    it('should handle axios response errors with status codes', async () => {
      const webhook = generateWebhook();
      const error = new Error('Request failed with status code 404') as AxiosError;
      error.response = {
        status: 404,
        statusText: 'Not Found',
        data: { error: 'Endpoint not found' },
        headers: {},
        config: {} as any,
      };

      mockedAxios.mockRejectedValue(error);

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/missing',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('HTTP 404: Not Found');
    });
  });

  describe('Request modification', () => {
    it('should support all HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      
      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
      });

      for (const method of methods) {
        const webhook = generateWebhook({ method });
        
        await forwarder.forwardWebhook({
          webhookId: webhook.id,
          targetUrl: 'https://example.com/webhook',
          method,
          headers: webhook.headers,
          body: method === 'GET' || method === 'HEAD' ? undefined : webhook.body,
        });

        expect(mockedAxios).toHaveBeenCalledWith(
          expect.objectContaining({
            method: method.toLowerCase() as any,
          })
        );
      }
    });

    it('should handle query parameters', async () => {
      const webhook = generateWebhook();
      const query = {
        token: 'abc123',
        timestamp: '1234567890',
      };

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
        headers: {},
      });

      await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        query,
        body: webhook.body,
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          params: query,
        })
      );
    });

    it('should follow redirects up to 5 times', async () => {
      const webhook = generateWebhook();

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
        headers: {},
      });

      await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRedirects: 5,
        })
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty body for POST requests', async () => {
      const webhook = generateWebhook({ body: undefined });

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
        headers: {},
      });

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/webhook',
        method: 'POST',
        headers: webhook.headers,
        body: undefined,
      });

      expect(result.success).toBe(true);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: undefined,
        })
      );
    });

    it('should handle binary data', async () => {
      const binaryData = Buffer.from('binary content');
      const webhook = generateWebhook({
        body: binaryData,
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
        headers: {},
      });

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl: 'https://example.com/webhook',
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(result.success).toBe(true);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: binaryData,
        })
      );
    });

    it('should handle very long URLs', async () => {
      const webhook = generateWebhook();
      const longPath = 'a'.repeat(2000);
      const targetUrl = `https://example.com/${longPath}`;

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
        headers: {},
      });

      const result = await forwarder.forwardWebhook({
        webhookId: webhook.id,
        targetUrl,
        method: webhook.method,
        headers: webhook.headers,
        body: webhook.body,
      });

      expect(result.success).toBe(true);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: targetUrl,
        })
      );
    });
  });
});