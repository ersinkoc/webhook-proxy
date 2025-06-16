import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { ApiResponse } from '@webhook-proxy/shared';

const loginSchema = z.object({
  email: z.string().email(),
});

const createUserSchema = z.object({
  email: z.string().email(),
});

export async function authRoutes(app: FastifyInstance) {
  // Login with API key
  app.post<{
    Body: { apiKey: string };
  }>('/login', async (request, reply) => {
    const { apiKey } = request.body;

    const user = await app.prisma.user.findUnique({
      where: { apiKey },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid API key',
      } satisfies ApiResponse);
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
    } satisfies ApiResponse);
  });

  // Create new user (admin only - for demo purposes)
  app.post<{
    Body: z.infer<typeof createUserSchema>;
  }>('/register', async (request, reply) => {
    const { email } = createUserSchema.parse(request.body);

    // Check if user already exists
    const existing = await app.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return reply.status(400).send({
        success: false,
        error: 'User already exists',
      } satisfies ApiResponse);
    }

    // Generate API key
    const apiKey = `whp_${crypto.randomBytes(24).toString('hex')}`;

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
    } satisfies ApiResponse);
  });

  // Get current user
  app.get('/me', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      return reply.send({
        success: true,
        data: {
          user: {
            id: request.user!.id,
            email: request.user!.email,
            apiKey: request.user!.apiKey,
          },
        },
      } satisfies ApiResponse);
    },
  });

  // Refresh token
  app.post('/refresh', {
    onRequest: [app.authenticate],
    handler: async (request, reply) => {
      const token = app.jwt.sign({
        userId: request.user!.id,
        apiKey: request.user!.apiKey,
      });

      return reply.send({
        success: true,
        data: { token },
      } satisfies ApiResponse);
    },
  });
}