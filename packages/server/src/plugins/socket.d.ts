import { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
declare module 'fastify' {
    interface FastifyInstance {
        io: Server;
    }
}
export declare const socketPlugin: (app: FastifyInstance) => Promise<void>;
//# sourceMappingURL=socket.d.ts.map