"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
const createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
async function authRoutes(app) {
    // Login with API key
    app.post('/login', async (request, reply) => {
        const { apiKey } = request.body;
        const user = await app.prisma.user.findUnique({
            where: { apiKey },
        });
        if (!user) {
            return reply.status(401).send({
                success: false,
                error: 'Invalid API key',
            });
        }
        const token = app.jwt.sign({
            userId: user.id,
            apiKey: user.apiKey,
        });
        return reply.send({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    apiKey: user.apiKey,
                },
            },
        });
    });
    // Create new user (admin only - for demo purposes)
    app.post('/register', async (request, reply) => {
        const { email } = createUserSchema.parse(request.body);
        // Check if user already exists
        const existing = await app.prisma.user.findUnique({
            where: { email },
        });
        if (existing) {
            return reply.status(400).send({
                success: false,
                error: 'User already exists',
            });
        }
        // Generate API key
        const apiKey = `whp_${crypto_1.default.randomBytes(24).toString('hex')}`;
        const user = await app.prisma.user.create({
            data: {
                email,
                apiKey,
            },
        });
        const token = app.jwt.sign({
            userId: user.id,
            apiKey: user.apiKey,
        });
        return reply.status(201).send({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    apiKey: user.apiKey,
                },
            },
        });
    });
    // Get current user
    app.get('/me', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            return reply.send({
                success: true,
                data: {
                    user: {
                        id: request.user.id,
                        email: request.user.email,
                        apiKey: request.user.apiKey,
                    },
                },
            });
        },
    });
    // Refresh token
    app.post('/refresh', {
        onRequest: [app.authenticate],
        handler: async (request, reply) => {
            const token = app.jwt.sign({
                userId: request.user.id,
                apiKey: request.user.apiKey,
            });
            return reply.send({
                success: true,
                data: { token },
            });
        },
    });
}
//# sourceMappingURL=auth.js.map