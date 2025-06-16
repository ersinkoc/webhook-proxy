"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const config_1 = require("../config");
exports.authPlugin = (0, fastify_plugin_1.default)(async (app) => {
    await app.register(jwt_1.default, {
        secret: config_1.config.security.jwtSecret,
        sign: {
            expiresIn: '7d',
        },
    });
    app.decorate('authenticate', async function (request) {
        try {
            // Check for API key in header
            const apiKey = request.headers['x-api-key'];
            if (apiKey) {
                const user = await app.prisma.user.findUnique({
                    where: { apiKey },
                });
                if (!user) {
                    throw new Error('Invalid API key');
                }
                request.user = user;
                return;
            }
            // Check for JWT token
            const token = request.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                throw new Error('Missing authentication');
            }
            const decoded = await request.jwtVerify();
            const user = await app.prisma.user.findUnique({
                where: { id: decoded.userId },
            });
            if (!user) {
                throw new Error('User not found');
            }
            request.user = user;
        }
        catch (error) {
            throw app.httpErrors.unauthorized('Authentication required');
        }
    });
});
//# sourceMappingURL=auth.js.map