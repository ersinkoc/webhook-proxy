import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  
  // Database
  DATABASE_URL: z.string(),
  
  // Redis
  REDIS_URL: z.string(),
  
  // Security
  JWT_SECRET: z.string(),
  API_KEY_SALT: z.string(),
  
  // URLs
  API_BASE_URL: z.string(),
  WEB_BASE_URL: z.string(),
  PUBLIC_WEBHOOK_URL: z.string(),
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  
  // Webhook Forwarding
  WEBHOOK_TIMEOUT_MS: z.string().default('30000').transform(Number),
  WEBHOOK_MAX_RETRIES: z.string().default('3').transform(Number),
  WEBHOOK_RETRY_DELAY_MS: z.string().default('1000').transform(Number),
});

const env = envSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
  database: {
    url: env.DATABASE_URL,
  },
  
  redis: {
    url: env.REDIS_URL,
  },
  
  security: {
    jwtSecret: env.JWT_SECRET,
    apiKeySalt: env.API_KEY_SALT,
  },
  
  urls: {
    api: env.API_BASE_URL,
    web: env.WEB_BASE_URL,
    publicWebhook: env.PUBLIC_WEBHOOK_URL,
  },
  
  rateLimit: {
    max: env.RATE_LIMIT_MAX,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
  },
  
  webhook: {
    timeoutMs: env.WEBHOOK_TIMEOUT_MS,
    maxRetries: env.WEBHOOK_MAX_RETRIES,
    retryDelayMs: env.WEBHOOK_RETRY_DELAY_MS,
  },
} as const;