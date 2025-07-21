import axios, { AxiosError } from 'axios';
import pRetry from 'p-retry';
import { WebhookDeliveryResult } from '@ersinkoc/webhook-proxy-shared';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface ForwardWebhookOptions {
  webhookId: string;
  targetUrl: string;
  method: string;
  headers: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
}

export class WebhookForwarder {
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor() {
    this.timeout = config.webhook.timeoutMs;
    this.maxRetries = config.webhook.maxRetries;
    this.retryDelay = config.webhook.retryDelayMs;
  }

  async forwardWebhook(options: ForwardWebhookOptions): Promise<WebhookDeliveryResult> {
    const { webhookId, targetUrl, method, headers, query, body } = options;
    const startTime = Date.now();

    logger.info(`Forwarding webhook ${webhookId} to ${targetUrl}`);

    try {
      const response = await pRetry(
        async () => {
          const axiosResponse = await axios({
            method: method as any,
            url: targetUrl,
            headers: this.sanitizeHeaders(headers),
            params: query,
            data: body,
            timeout: this.timeout,
            validateStatus: () => true, // Accept all status codes
            maxRedirects: 5,
          });

          // Retry on 5xx errors
          if (axiosResponse.status >= 500) {
            throw new Error(`Server error: ${axiosResponse.status}`);
          }

          return axiosResponse;
        },
        {
          retries: this.maxRetries,
          minTimeout: this.retryDelay,
          maxTimeout: this.retryDelay * 10,
          onFailedAttempt: (error) => {
            logger.warn(
              `Webhook ${webhookId} delivery attempt ${error.attemptNumber} failed: ${error.message}`
            );
          },
        }
      );

      const duration = Date.now() - startTime;

      logger.info(
        `Webhook ${webhookId} delivered successfully. Status: ${response.status}, Duration: ${duration}ms`
      );

      return {
        success: response.status < 400,
        statusCode: response.status,
        response: this.sanitizeResponse(response.data),
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof AxiosError) {
        logger.error(
          `Webhook ${webhookId} delivery failed: ${error.message}`,
          {
            code: error.code,
            response: error.response?.data,
          }
        );

        return {
          success: false,
          statusCode: error.response?.status,
          error: this.getErrorMessage(error),
          duration,
        };
      }

      logger.error(`Webhook ${webhookId} delivery failed with unexpected error:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };
    }
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    
    // Remove headers that might cause issues
    const headersToRemove = [
      'host',
      'content-length',
      'connection',
      'accept-encoding',
      'cf-', // Cloudflare headers
      'x-forwarded-', // Proxy headers
    ];

    Object.keys(sanitized).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (headersToRemove.some(prefix => lowerKey.startsWith(prefix))) {
        delete sanitized[key];
      }
    });

    // Add webhook proxy identification
    sanitized['X-Webhook-Proxy'] = 'true';
    sanitized['X-Webhook-Proxy-Version'] = '1.0.0';

    return sanitized;
  }

  private sanitizeResponse(data: any): any {
    // Limit response size to prevent memory issues
    const maxResponseSize = 1024 * 1024; // 1MB
    
    try {
      const stringified = JSON.stringify(data);
      if (stringified.length > maxResponseSize) {
        return {
          _truncated: true,
          _originalSize: stringified.length,
          _message: 'Response too large, truncated',
        };
      }
      return data;
    } catch {
      // If JSON.stringify fails, return a safe representation
      return {
        _type: typeof data,
        _message: 'Response could not be serialized',
      };
    }
  }

  private getErrorMessage(error: AxiosError): string {
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused - target server is not reachable';
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return `Request timeout after ${this.timeout}ms`;
    }
    if (error.code === 'ENOTFOUND') {
      return 'Target URL hostname could not be resolved';
    }
    if (error.response) {
      return `HTTP ${error.response.status}: ${error.response.statusText || 'Unknown error'}`;
    }
    return error.message || 'Unknown error occurred';
  }
}