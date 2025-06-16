"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const client_1 = require("@prisma/client");
exports.prismaPlugin = (0, fastify_plugin_1.default)(async (app) => {
    const prisma = new client_1.PrismaClient({
        log: app.log.level === 'debug' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
    await prisma.$connect();
    app.decorate('prisma', prisma);
    app.addHook('onClose', async () => {
        await prisma.$disconnect();
    });
});
//# sourceMappingURL=prisma.js.map