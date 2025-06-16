"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookForwarder = void 0;
const axios_1 = __importStar(require("axios"));
const p_retry_1 = __importDefault(require("p-retry"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
class WebhookForwarder {
    timeout;
    maxRetries;
    retryDelay;
    constructor() {
        this.timeout = config_1.config.webhook.timeoutMs;
        this.maxRetries = config_1.config.webhook.maxRetries;
        this.retryDelay = config_1.config.webhook.retryDelayMs;
    }
    async forwardWebhook(options) {
        const { webhookId, targetUrl, method, headers, query, body } = options;
        const startTime = Date.now();
        logger_1.logger.info(`Forwarding webhook ${webhookId} to ${targetUrl}`);
        try {
            const response = await (0, p_retry_1.default)(async () => {
                const axiosResponse = await (0, axios_1.default)({
                    method: method,
                    url: targetUrl,
                    headers: this.sanitizeHeaders(headers),
                    params: query,
                    data: body,
                    timeout: this.timeout,
                    validateStatus: () => true, // Accept all status codes
                    maxRedirects: 5,
                });
                // Retry on 5xx errors
                if (axiosResponse.status >= 500) {
                    throw new Error(`Server error: ${axiosResponse.status}`);
                }
                return axiosResponse;
            }, {
                retries: this.maxRetries,
                minTimeout: this.retryDelay,
                maxTimeout: this.retryDelay * 10,
                onFailedAttempt: (error) => {
                    logger_1.logger.warn(`Webhook ${webhookId} delivery attempt ${error.attemptNumber} failed: ${error.message}`);
                },
            });
            const duration = Date.now() - startTime;
            logger_1.logger.info(`Webhook ${webhookId} delivered successfully. Status: ${response.status}, Duration: ${duration}ms`);
            return {
                success: response.status < 400,
                statusCode: response.status,
                response: this.sanitizeResponse(response.data),
                duration,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            if (error instanceof axios_1.AxiosError) {
                logger_1.logger.error(`Webhook ${webhookId} delivery failed: ${error.message}`, {
                    code: error.code,
                    response: error.response?.data,
                });
                return {
                    success: false,
                    statusCode: error.response?.status,
                    error: this.getErrorMessage(error),
                    duration,
                };
            }
            logger_1.logger.error(`Webhook ${webhookId} delivery failed with unexpected error:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                duration,
            };
        }
    }
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        // Remove headers that might cause issues
        const headersToRemove = [
            'host',
            'content-length',
            'connection',
            'accept-encoding',
            'cf-', // Cloudflare headers
            'x-forwarded-', // Proxy headers
        ];
        Object.keys(sanitized).forEach((key) => {
            const lowerKey = key.toLowerCase();
            if (headersToRemove.some(prefix => lowerKey.startsWith(prefix))) {
                delete sanitized[key];
            }
        });
        // Add webhook proxy identification
        sanitized['X-Webhook-Proxy'] = 'true';
        sanitized['X-Webhook-Proxy-Version'] = '1.0.0';
        return sanitized;
    }
    sanitizeResponse(data) {
        // Limit response size to prevent memory issues
        const maxResponseSize = 1024 * 1024; // 1MB
        try {
            const stringified = JSON.stringify(data);
            if (stringified.length > maxResponseSize) {
                return {
                    _truncated: true,
                    _originalSize: stringified.length,
                    _message: 'Response too large, truncated',
                };
            }
            return data;
        }
        catch {
            // If JSON.stringify fails, return a safe representation
            return {
                _type: typeof data,
                _message: 'Response could not be serialized',
            };
        }
    }
    getErrorMessage(error) {
        if (error.code === 'ECONNREFUSED') {
            return 'Connection refused - target server is not reachable';
        }
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return `Request timeout after ${this.timeout}ms`;
        }
        if (error.code === 'ENOTFOUND') {
            return 'Target URL hostname could not be resolved';
        }
        if (error.response) {
            return `HTTP ${error.response.status}: ${error.response.statusText || 'Unknown error'}`;
        }
        return error.message || 'Unknown error occurred';
    }
}
exports.WebhookForwarder = WebhookForwarder;
//# sourceMappingURL=webhook-forwarder.js.map