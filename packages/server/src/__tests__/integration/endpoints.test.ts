import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { 
  createApiTestHelper,
  createAuthTestHelper,
  createDatabaseTestHelper,
  DataGenerator,
  waitForDatabase,
} from '@webhook-proxy/test-utils';
import { buildApp } from '../../app';

describe('Endpoints API Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let apiHelper: ReturnType<typeof createApiTestHelper>;
  let authHelper: ReturnType<typeof createAuthTestHelper>;
  let dbHelper: ReturnType<typeof createDatabaseTestHelper>;
  let testUser: any;

  beforeAll(async () => {
    // Setup test database
    prisma = new PrismaClient();
    await waitForDatabase(prisma);
    
    // Build app
    app = await buildApp({ logger: false });
    await app.ready();

    // Setup helpers
    authHelper = createAuthTestHelper(process.env.JWT_SECRET);
    dbHelper = createDatabaseTestHelper(prisma);
    
    // Create test user
    testUser = await authHelper.createTestUser();
    await dbHelper.seedTestData({
      users: [{
        id: testUser.id,
        email: testUser.email,
        password: testUser.hashedPassword,
        apiKey: testUser.apiKey,
        name: 'Test User',
      }],
    });

    apiHelper = createApiTestHelper(app.server, testUser.token);
  });

  afterAll(async () => {
    await dbHelper.cleanDatabase();
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean endpoints and webhooks between tests
    await prisma.webhook.deleteMany();
    await prisma.endpoint.deleteMany({ where: { userId: testUser.id } });
  });

  describe('GET /api/endpoints', () => {
    it('should list user endpoints', async () => {
      // Create test endpoints
      const endpoints = DataGenerator.bulkEndpoints(3, { userId: testUser.id });
      await dbHelper.seedTestData({ endpoints });

      const response = await apiHelper.get('/api/endpoints').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ userId: testUser.id }),
        ]),
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          hasMore: false,
        },
      });
    });

    it('should support pagination', async () => {
      // Create 15 endpoints
      const endpoints = DataGenerator.bulkEndpoints(15, { userId: testUser.id });
      await dbHelper.seedTestData({ endpoints });

      // First page
      const page1 = await apiHelper.get('/api/endpoints?page=1&limit=10').expect(200);
      expect(page1.body.data).toHaveLength(10);
      expect(page1.body.pagination.hasMore).toBe(true);

      // Second page
      const page2 = await apiHelper.get('/api/endpoints?page=2&limit=10').expect(200);
      expect(page2.body.data).toHaveLength(5);
      expect(page2.body.pagination.hasMore).toBe(false);
    });

    it('should filter by active status', async () => {
      const activeEndpoint = DataGenerator.endpoint({ userId: testUser.id, isActive: true });
      const inactiveEndpoint = DataGenerator.endpoint({ userId: testUser.id, isActive: false });
      
      await dbHelper.seedTestData({
        endpoints: [activeEndpoint, inactiveEndpoint],
      });

      const response = await apiHelper.get('/api/endpoints?isActive=true').expect(200);
      
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(activeEndpoint.id);
    });
  });

  describe('POST /api/endpoints', () => {
    it('should create new endpoint', async () => {
      const endpointData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        description: 'Test description',
        headers: {
          'X-Custom-Header': 'value',
        },
      };

      const response = await apiHelper.post('/api/endpoints')
        .send(endpointData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          userId: testUser.id,
          name: endpointData.name,
          url: endpointData.url,
          isActive: true,
          secret: expect.any(String),
        }),
      });

      // Verify in database
      await dbHelper.assertRecordExists('endpoint', { id: response.body.data.id });
    });

    it('should validate endpoint data', async () => {
      const invalidData = {
        name: '', // Empty name
        url: 'not-a-url', // Invalid URL
      };

      const response = await apiHelper.post('/api/endpoints')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Validation');
    });

    it('should enforce rate limits', async () => {
      // Test rate limiting (assuming 10 requests per minute)
      await apiHelper.testRateLimit('/api/endpoints', 10, 60000);
    });
  });

  describe('PUT /api/endpoints/:id', () => {
    it('should update endpoint', async () => {
      const endpoint = DataGenerator.endpoint({ userId: testUser.id });
      await dbHelper.seedTestData({ endpoints: [endpoint] });

      const updates = {
        name: 'Updated Name',
        url: 'https://new-url.com/webhook',
        isActive: false,
      };

      const response = await apiHelper.put(`/api/endpoints/${endpoint.id}`)
        .send(updates)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: endpoint.id,
        ...updates,
      });
    });

    it('should not allow updating other users endpoints', async () => {
      const otherUserEndpoint = DataGenerator.endpoint({ userId: 'other-user-id' });
      await dbHelper.seedTestData({ endpoints: [otherUserEndpoint] });

      await apiHelper.put(`/api/endpoints/${otherUserEndpoint.id}`)
        .send({ name: 'Hacked!' })
        .expect(404);
    });
  });

  describe('DELETE /api/endpoints/:id', () => {
    it('should delete endpoint and associated webhooks', async () => {
      const endpoint = DataGenerator.endpoint({ userId: testUser.id });
      const webhooks = DataGenerator.bulkWebhooks(5, endpoint.id);
      
      await dbHelper.seedTestData({ 
        endpoints: [endpoint],
        webhooks,
      });

      await apiHelper.delete(`/api/endpoints/${endpoint.id}`).expect(204);

      // Verify deletion
      await dbHelper.assertRecordNotExists('endpoint', { id: endpoint.id });
      await dbHelper.assertRecordNotExists('webhook', { endpointId: endpoint.id });
    });
  });

  describe('GET /api/endpoints/:id/webhooks', () => {
    it('should list webhooks for endpoint', async () => {
      const endpoint = DataGenerator.endpoint({ userId: testUser.id });
      const webhooks = DataGenerator.bulkWebhooks(5, endpoint.id);
      
      await dbHelper.seedTestData({ 
        endpoints: [endpoint],
        webhooks,
      });

      const response = await apiHelper.get(`/api/endpoints/${endpoint.id}/webhooks`)
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.data[0]).toMatchObject({
        endpointId: endpoint.id,
      });
    });

    it('should filter webhooks by status', async () => {
      const endpoint = DataGenerator.endpoint({ userId: testUser.id });
      const deliveredWebhook = DataGenerator.webhook({ 
        endpointId: endpoint.id,
        status: 'delivered',
      });
      const failedWebhook = DataGenerator.webhook({ 
        endpointId: endpoint.id,
        status: 'failed',
      });
      
      await dbHelper.seedTestData({ 
        endpoints: [endpoint],
        webhooks: [deliveredWebhook, failedWebhook],
      });

      const response = await apiHelper
        .get(`/api/endpoints/${endpoint.id}/webhooks?status=delivered`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(deliveredWebhook.id);
    });
  });
});