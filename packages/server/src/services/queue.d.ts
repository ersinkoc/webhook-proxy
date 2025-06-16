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
export declare class QueueService {
    private webhookQueue;
    private worker;
    private redis;
    private forwarder;
    private prisma;
    constructor(prisma: PrismaClient);
    private setupEventHandlers;
    enqueueWebhook(data: WebhookJobData): Promise<void>;
    private processWebhook;
    getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        total: number;
    }>;
    close(): Promise<void>;
}
//# sourceMappingURL=queue.d.ts.map