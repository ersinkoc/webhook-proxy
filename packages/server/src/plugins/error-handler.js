"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const zod_1 = require("zod");
exports.errorHandler = (0, fastify_plugin_1.default)(async (app) => {
    app.setErrorHandler((error, request, reply) => {
        const { validation, statusCode = 500 } = error;
        // Handle Fastify validation errors
        if (validation) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Validation error',
                details: validation,
            });
        }
        // Handle Zod validation errors
        if (error instanceof zod_1.ZodError) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Validation error',
                details: error.errors,
            });
        }
        // Handle custom API errors
        if ('statusCode' in error && 'error' in error) {
            return reply.status(error.statusCode).send(error);
        }
        // Log unexpected errors
        if (statusCode >= 500) {
            app.log.error(error);
        }
        // Default error response
        return reply.status(statusCode).send({
            statusCode,
            error: error.name || 'Internal Server Error',
            message: statusCode < 500 ? error.message : 'An unexpected error occurred',
        });
    });
    app.setNotFoundHandler((request, reply) => {
        return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: `Route ${request.method} ${request.url} not found`,
        });
    });
});
//# sourceMappingURL=error-handler.js.map