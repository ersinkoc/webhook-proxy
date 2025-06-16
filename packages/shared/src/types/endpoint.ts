export interface Endpoint {
  id: string;
  name: string;
  slug: string;
  targetUrl: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEndpointDto {
  name: string;
  targetUrl: string;
}

export interface UpdateEndpointDto {
  name?: string;
  targetUrl?: string;
  isActive?: boolean;
}

export interface EndpointWithStats extends Endpoint {
  webhookCount: number;
  lastWebhookAt?: string;
}