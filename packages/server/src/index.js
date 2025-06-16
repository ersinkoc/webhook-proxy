"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const logger_1 = require("./utils/logger");
const config_1 = require("./config");
async function start() {
    try {
        const app = await (0, app_1.buildApp)();
        await app.listen({
            port: config_1.config.port,
            host: '0.0.0.0',
        });
        logger_1.logger.info(`🚀 Server running at http://localhost:${config_1.config.port}`);
        logger_1.logger.info(`📡 Webhook endpoint: ${config_1.config.urls.publicWebhook}/webhook/:endpointId`);
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map