import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { config } from '../config';
import { User } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    authenticatedUser?: User;
  }
  
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      apiKey: string;
    };
    user: {
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
      const token = request.headers.authorization?.replace('Bearer ', '');

      if (apiKey && token) {
        throw new Error('Provide either an API key or a JWT token, not both');
      }
      
      if (apiKey) {
        const user = await app.prisma.user.findUnique({
          where: { apiKey },
        });

        if (!user) {
          throw new Error('Invalid API key');
        }

        request.authenticatedUser = user;
        return;
      }

      // Check for JWT token
      const token = request.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        throw new Error('Missing authentication');
      }

      const decoded = await request.jwtVerify() as { userId: string; apiKey: string };
      
      const user = await app.prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      request.authenticatedUser = user;
    } catch (error) {
      const err = new Error('Authentication required');
      (err as any).statusCode = 401;
      throw err;
    }
  });
});