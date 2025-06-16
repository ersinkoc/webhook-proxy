"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const socket_io_1 = require("socket.io");
const config_1 = require("../config");
exports.socketPlugin = (0, fastify_plugin_1.default)(async (app) => {
    const io = new socket_io_1.Server(app.server, {
        cors: {
            origin: config_1.config.urls.web,
            credentials: true,
        },
    });
    io.on('connection', (socket) => {
        app.log.info(`Socket connected: ${socket.id}`);
        socket.on('subscribe:endpoint', async (endpointId) => {
            // Verify endpoint exists and user has access
            // For now, just join the room
            socket.join(`endpoint:${endpointId}`);
            app.log.info(`Socket ${socket.id} subscribed to endpoint ${endpointId}`);
        });
        socket.on('unsubscribe:endpoint', (endpointId) => {
            socket.leave(`endpoint:${endpointId}`);
            app.log.info(`Socket ${socket.id} unsubscribed from endpoint ${endpointId}`);
        });
        socket.on('disconnect', () => {
            app.log.info(`Socket disconnected: ${socket.id}`);
        });
    });
    app.decorate('io', io);
    // Helper method to emit webhook events
    app.decorate('emitWebhookEvent', (endpointId, event) => {
        io.to(`endpoint:${endpointId}`).emit('webhook:event', event);
    });
});
//# sourceMappingURL=socket.js.map