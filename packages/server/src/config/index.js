"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
(0, dotenv_1.config)();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('3001').transform(Number),
    // Database
    DATABASE_URL: zod_1.z.string(),
    // Redis
    REDIS_URL: zod_1.z.string(),
    // Security
    JWT_SECRET: zod_1.z.string(),
    API_KEY_SALT: zod_1.z.string(),
    // URLs
    API_BASE_URL: zod_1.z.string(),
    WEB_BASE_URL: zod_1.z.string(),
    PUBLIC_WEBHOOK_URL: zod_1.z.string(),
    // Rate Limiting
    RATE_LIMIT_MAX: zod_1.z.string().default('100').transform(Number),
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().default('60000').transform(Number),
    // Webhook Forwarding
    WEBHOOK_TIMEOUT_MS: zod_1.z.string().default('30000').transform(Number),
    WEBHOOK_MAX_RETRIES: zod_1.z.string().default('3').transform(Number),
    WEBHOOK_RETRY_DELAY_MS: zod_1.z.string().default('1000').transform(Number),
});
const env = envSchema.parse(process.env);
exports.config = {
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
};
//# sourceMappingURL=index.js.map