export interface Webhook {
  id: string;
  endpointId: string;
  method: string;
  headers: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  statusCode?: number;
  response?: any;
  error?: string;
  deliveredAt?: string;
  duration?: number;
  createdAt: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
  duration: number;
}

export interface WebhookFilters {
  endpointId?: string;
  method?: string;
  statusCode?: number;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export type WebhookEvent = 
  | { type: 'webhook:received'; data: Webhook }
  | { type: 'webhook:delivered'; data: WebhookDeliveryResult & { webhookId: string } }
  | { type: 'webhook:failed'; data: { webhookId: string; error: string } };