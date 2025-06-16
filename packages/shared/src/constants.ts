export const API_VERSION = 'v1';

export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const;

export type HttpMethod = typeof HTTP_METHODS[number];

export const WEBHOOK_EVENTS = {
  RECEIVED: 'webhook:received',
  DELIVERED: 'webhook:delivered',
  FAILED: 'webhook:failed',
} as const;

export const DEFAULT_PAGINATION = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const RATE_LIMITS = {
  DEFAULT: {
    MAX: 100,
    WINDOW_MS: 60 * 1000, // 1 minute
  },
  WEBHOOK: {
    MAX: 1000,
    WINDOW_MS: 60 * 1000, // 1 minute
  },
} as const;