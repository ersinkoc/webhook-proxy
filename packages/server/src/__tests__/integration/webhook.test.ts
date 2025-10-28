import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { PrismaClient } from '@prisma/client';
import nock from 'nock';

describe('Webhook Integration Testing', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testEndpoint: any;
  let testUser: any;

  beforeAll(async () => {
    app = await buildApp();
    prisma = app.prisma;

    testUser = await prisma.user.create({
      data: {
        email: 'webhook-test@example.com',
        apiKey: 'whp_webhook_test_' + Math.random().toString(36).substr(2, 9),
      },
    });

    testEndpoint = await prisma.endpoint.create({
      data: {
        name: 'Webhook Test',
        slug: 'webhook-test',
        targetUrl: 'http://localhost:3000/target',
        apiKey: 'whep_webhook_test_' + Math.random().toString(36).substr(2, 9),
        userId: testUser.id,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should wait for webhook forwarding to complete before responding', async () => {
    const scope = nock('http://localhost:3000')
      .post('/target')
      .delay(1000)
      .reply(200, { success: true });

    const response = await app.inject({
      method: 'POST',
      url: `/webhook/${testEndpoint.slug}`,
      payload: { test: 'race-condition' },
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.payload);
    expect(result.data.delivery.statusCode).toBe(200);

    scope.done();
  });

  it('should sanitize sensitive headers before forwarding', async () => {
    const scope = nock('http://localhost:3000')
      .post('/target', (body) => {
        return !body.headers.authorization && !body.headers.cookie;
      })
      .reply(200, { success: true });

    const response = await app.inject({
      method: 'POST',
      url: `/webhook/${testEndpoint.slug}`,
      payload: { test: 'header-sanitization' },
      headers: {
        Authorization: 'Bearer secret-token',
        Cookie: 'session=secret-session',
        'X-Test-Header': 'test-value',
      },
    });

    expect(response.statusCode).toBe(200);
    scope.done();
  });
});
