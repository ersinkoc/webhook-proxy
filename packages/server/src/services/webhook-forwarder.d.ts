import { WebhookDeliveryResult } from '@webhook-proxy/shared';
export interface ForwardWebhookOptions {
    webhookId: string;
    targetUrl: string;
    method: string;
    headers: Record<string, string>;
    query?: Record<string, string>;
    body?: any;
}
export declare class WebhookForwarder {
    private readonly timeout;
    private readonly maxRetries;
    private readonly retryDelay;
    constructor();
    forwardWebhook(options: ForwardWebhookOptions): Promise<WebhookDeliveryResult>;
    private sanitizeHeaders;
    private sanitizeResponse;
    private getErrorMessage;
}
//# sourceMappingURL=webhook-forwarder.d.ts.map