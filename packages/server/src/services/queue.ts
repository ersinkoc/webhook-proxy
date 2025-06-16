import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { WebhookForwarder } from './webhook-forwarder';
import { PrismaClient } from '@prisma/client';

export interface WebhookJobData {
  webhookId: string;
  endpointId: string;
  targetUrl: string;
  method: string;
  headers: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
}

export class QueueService {
  private webhookQueue: Queue<WebhookJobData>;
  private worker: Worker<WebhookJobData>;
  private redis: Redis;
  private forwarder: WebhookForwarder;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
    });
    
    this.prisma = prisma;
    this.forwarder = new WebhookForwarder();

    // Create queue
    this.webhookQueue = new Queue('webhooks', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: config.webhook.maxRetries,
        backoff: {
          type: 'exponential',
          delay: config.webhook.retryDelayMs,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000,    // Keep max 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });

    // Create worker
    this.worker = new Worker(
      'webhooks',
      async (job: Job<WebhookJobData>) => {
        await this.processWebhook(job);
      },
      {
        connection: this.redis,
        concurrency: 10,
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      logger.info(`Webhook job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Webhook job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      logger.error('Worker error:', err);
    });
  }

  async enqueueWebhook(data: WebhookJobData): Promise<void> {
    const job = await this.webhookQueue.add('forward-webhook', data, {
      priority: 1,
    });
    
    logger.info(`Enqueued webhook job ${job.id} for webhook ${data.webhookId}`);
  }

  private async processWebhook(job: Job<WebhookJobData>): Promise<void> {
    const { webhookId, targetUrl, method, headers, query, body } = job.data;

    logger.info(`Processing webhook job ${job.id} for webhook ${webhookId}`);

    try {
      const result = await this.forwarder.forwardWebhook({
        webhookId,
        targetUrl,
        method,
        headers,
        query,
        body,
      });

      // Update webhook with delivery result
      await this.prisma.webhook.update({
        where: { id: webhookId },
        data: {
          statusCode: result.statusCode,
          response: result.response,
          error: result.error,
          deliveredAt: new Date(),
          duration: result.duration,
        },
      });

      // Emit success event (would need Socket.io instance here)
      // This would be better handled through a pub/sub mechanism
      
      if (!result.success) {
        throw new Error(result.error || `HTTP ${result.statusCode}`);
      }
    } catch (error) {
      logger.error(`Failed to process webhook ${webhookId}:`, error);
      throw error; // Re-throw to trigger retry
    }
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.webhookQueue.getWaitingCount(),
      this.webhookQueue.getActiveCount(),
      this.webhookQueue.getCompletedCount(),
      this.webhookQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.webhookQueue.close();
    this.redis.disconnect();
  }
}