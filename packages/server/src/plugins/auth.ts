import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { config } from '../config';
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

export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(jwt, {
    secret: config.security.jwtSecret,
    sign: {
      expiresIn: '7d',
    },
  });

  app.decorate('authenticate', async function (request: FastifyRequest) {
    try {
      // Check for API key in header
      const apiKey = request.headers['x-api-key'] as string;
      
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
    } catch (error) {
      throw app.httpErrors.unauthorized('Authentication required');
    }
  });
});