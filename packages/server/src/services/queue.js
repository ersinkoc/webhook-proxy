"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const webhook_forwarder_1 = require("./webhook-forwarder");
class QueueService {
    webhookQueue;
    worker;
    redis;
    forwarder;
    prisma;
    constructor(prisma) {
        this.redis = new ioredis_1.default(config_1.config.redis.url, {
            maxRetriesPerRequest: null,
        });
        this.prisma = prisma;
        this.forwarder = new webhook_forwarder_1.WebhookForwarder();
        // Create queue
        this.webhookQueue = new bullmq_1.Queue('webhooks', {
            connection: this.redis,
            defaultJobOptions: {
                attempts: config_1.config.webhook.maxRetries,
                backoff: {
                    type: 'exponential',
                    delay: config_1.config.webhook.retryDelayMs,
                },
                removeOnComplete: {
                    age: 24 * 3600, // Keep completed jobs for 24 hours
                    count: 1000, // Keep max 1000 completed jobs
                },
                removeOnFail: {
                    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
                },
            },
        });
        // Create worker
        this.worker = new bullmq_1.Worker('webhooks', async (job) => {
            await this.processWebhook(job);
        }, {
            connection: this.redis,
            concurrency: 10,
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.worker.on('completed', (job) => {
            logger_1.logger.info(`Webhook job ${job.id} completed successfully`);
        });
        this.worker.on('failed', (job, err) => {
            logger_1.logger.error(`Webhook job ${job?.id} failed:`, err);
        });
        this.worker.on('error', (err) => {
            logger_1.logger.error('Worker error:', err);
        });
    }
    async enqueueWebhook(data) {
        const job = await this.webhookQueue.add('forward-webhook', data, {
            priority: 1,
        });
        logger_1.logger.info(`Enqueued webhook job ${job.id} for webhook ${data.webhookId}`);
    }
    async processWebhook(job) {
        const { webhookId, targetUrl, method, headers, query, body } = job.data;
        logger_1.logger.info(`Processing webhook job ${job.id} for webhook ${webhookId}`);
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
        }
        catch (error) {
            logger_1.logger.error(`Failed to process webhook ${webhookId}:`, error);
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
    async close() {
        await this.worker.close();
        await this.webhookQueue.close();
        this.redis.disconnect();
    }
}
exports.QueueService = QueueService;
//# sourceMappingURL=queue.js.map