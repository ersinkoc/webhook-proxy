import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { ApiError } from '@webhook-proxy/shared';

export const errorHandler = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error, request, reply) => {
    const { validation, statusCode = 500 } = error;

    // Handle Fastify validation errors
    if (validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation error',
        details: validation,
      } satisfies ApiError);
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation error',
        details: error.errors,
      } satisfies ApiError);
    }

    // Handle custom API errors
    if ('statusCode' in error && 'error' in error) {
      return reply.status(error.statusCode).send(error);
    }

    // Log unexpected errors
    if (statusCode >= 500) {
      app.log.error(error);
    }

    // Default error response
    return reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Internal Server Error',
      message: statusCode < 500 ? error.message : 'An unexpected error occurred',
    } satisfies ApiError);
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    } satisfies ApiError);
  });
});