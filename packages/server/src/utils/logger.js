"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const config_1 = require("../config");
exports.logger = (0, pino_1.default)({
    level: config_1.config.isProduction ? 'info' : 'debug',
    transport: config_1.config.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    base: {
        env: config_1.config.env,
    },
    redact: {
        paths: ['req.headers.authorization', 'req.headers["x-api-key"]', '*.apiKey', '*.password'],
        remove: true,
    },
});
//# sourceMappingURL=logger.js.map