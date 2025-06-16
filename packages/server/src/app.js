"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const error_handler_1 = require("./plugins/error-handler");
const prisma_1 = require("./plugins/prisma");
const auth_1 = require("./plugins/auth");
const socket_1 = require("./plugins/socket");
const endpoints_1 = require("./routes/endpoints");
const webhooks_1 = require("./routes/webhooks");
const auth_2 = require("./routes/auth");
const health_1 = require("./routes/health");
async function buildApp() {
    const app = (0, fastify_1.default)({
        logger: logger_1.logger,
        trustProxy: true,
    });
    // Register plugins
    await app.register(helmet_1.default, {
        contentSecurityPolicy: false, // Disable for API
    });
    await app.register(cors_1.default, {
        origin: [config_1.config.urls.web],
        credentials: true,
    });
    await app.register(rate_limit_1.default, {
        max: config_1.config.rateLimit.max,
        timeWindow: config_1.config.rateLimit.windowMs,
        skipFailedRequests: false,
        skipSuccessfulRequests: false,
        keyGenerator: (request) => {
            return request.headers['x-api-key'] || request.ip;
        },
    });
    // Custom plugins
    await app.register(error_handler_1.errorHandler);
    await app.register(prisma_1.prismaPlugin);
    await app.register(auth_1.authPlugin);
    await app.register(socket_1.socketPlugin);
    // Routes
    await app.register(health_1.healthRoutes);
    await app.register(auth_2.authRoutes, { prefix: '/api/auth' });
    await app.register(endpoints_1.endpointRoutes, { prefix: '/api/endpoints' });
    await app.register(webhooks_1.webhookRoutes, { prefix: '/api/webhooks' });
    // Dynamic webhook receiver route (moved to webhooks route file)
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        logger_1.logger.info('SIGTERM received, shutting down gracefully...');
        await app.close();
        process.exit(0);
    });
    return app;
}
//# sourceMappingURL=app.js.map