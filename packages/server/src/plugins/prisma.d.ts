import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}
export declare const prismaPlugin: (app: FastifyInstance) => Promise<void>;
//# sourceMappingURL=prisma.d.ts.map