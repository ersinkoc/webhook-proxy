import { FastifyInstance } from 'fastify';
import { User } from '@prisma/client';
declare module 'fastify' {
    interface FastifyRequest {
        user?: User;
    }
}
declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: {
            userId: string;
            apiKey: string;
        };
    }
}
export declare const authPlugin: (app: FastifyInstance) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map