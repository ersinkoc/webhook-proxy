"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const client_1 = require("@prisma/client");
const test_utils_1 = require("@webhook-proxy/test-utils");
const app_1 = require("../../app");
(0, globals_1.describe)('Endpoints API Integration Tests', () => {
    let app;
    let prisma;
    let apiHelper;
    let authHelper;
    let dbHelper;
    let testUser;
    (0, globals_1.beforeAll)(async () => {
        // Setup test database
        prisma = new client_1.PrismaClient();
        await (0, test_utils_1.waitForDatabase)(prisma);
        // Build app
        app = await (0, app_1.buildApp)({ logger: false });
        await app.ready();
        // Setup helpers
        authHelper = (0, test_utils_1.createAuthTestHelper)(process.env.JWT_SECRET);
        dbHelper = (0, test_utils_1.createDatabaseTestHelper)(prisma);
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
        apiHelper = (0, test_utils_1.createApiTestHelper)(app.server, testUser.token);
    });
    (0, globals_1.afterAll)(async () => {
        await dbHelper.cleanDatabase();
        await prisma.$disconnect();
        await app.close();
    });
    (0, globals_1.beforeEach)(async () => {
        // Clean endpoints and webhooks between tests
        await prisma.webhook.deleteMany();
        await prisma.endpoint.deleteMany({ where: { userId: testUser.id } });
    });
    (0, globals_1.describe)('GET /api/endpoints', () => {
        (0, globals_1.it)('should list user endpoints', async () => {
            // Create test endpoints
            const endpoints = test_utils_1.DataGenerator.bulkEndpoints(3, { userId: testUser.id });
            await dbHelper.seedTestData({ endpoints });
            const response = await apiHelper.get('/api/endpoints').expect(200);
            (0, globals_1.expect)(response.body).toMatchObject({
                success: true,
                data: globals_1.expect.arrayContaining([
                    globals_1.expect.objectContaining({ userId: testUser.id }),
                ]),
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 3,
                    hasMore: false,
                },
            });
        });
        (0, globals_1.it)('should support pagination', async () => {
            // Create 15 endpoints
            const endpoints = test_utils_1.DataGenerator.bulkEndpoints(15, { userId: testUser.id });
            await dbHelper.seedTestData({ endpoints });
            // First page
            const page1 = await apiHelper.get('/api/endpoints?page=1&limit=10').expect(200);
            (0, globals_1.expect)(page1.body.data).toHaveLength(10);
            (0, globals_1.expect)(page1.body.pagination.hasMore).toBe(true);
            // Second page
            const page2 = await apiHelper.get('/api/endpoints?page=2&limit=10').expect(200);
            (0, globals_1.expect)(page2.body.data).toHaveLength(5);
            (0, globals_1.expect)(page2.body.pagination.hasMore).toBe(false);
        });
        (0, globals_1.it)('should filter by active status', async () => {
            const activeEndpoint = test_utils_1.DataGenerator.endpoint({ userId: testUser.id, isActive: true });
            const inactiveEndpoint = test_utils_1.DataGenerator.endpoint({ userId: testUser.id, isActive: false });
            await dbHelper.seedTestData({
                endpoints: [activeEndpoint, inactiveEndpoint],
            });
            const response = await apiHelper.get('/api/endpoints?isActive=true').expect(200);
            (0, globals_1.expect)(response.body.data).toHaveLength(1);
            (0, globals_1.expect)(response.body.data[0].id).toBe(activeEndpoint.id);
        });
    });
    (0, globals_1.describe)('POST /api/endpoints', () => {
        (0, globals_1.it)('should create new endpoint', async () => {
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
            (0, globals_1.expect)(response.body).toMatchObject({
                success: true,
                data: globals_1.expect.objectContaining({
                    id: globals_1.expect.any(String),
                    userId: testUser.id,
                    name: endpointData.name,
                    url: endpointData.url,
                    isActive: true,
                    secret: globals_1.expect.any(String),
                }),
            });
            // Verify in database
            await dbHelper.assertRecordExists('endpoint', { id: response.body.data.id });
        });
        (0, globals_1.it)('should validate endpoint data', async () => {
            const invalidData = {
                name: '', // Empty name
                url: 'not-a-url', // Invalid URL
            };
            const response = await apiHelper.post('/api/endpoints')
                .send(invalidData)
                .expect(400);
            (0, globals_1.expect)(response.body.error).toContain('Validation');
        });
        (0, globals_1.it)('should enforce rate limits', async () => {
            // Test rate limiting (assuming 10 requests per minute)
            await apiHelper.testRateLimit('/api/endpoints', 10, 60000);
        });
    });
    (0, globals_1.describe)('PUT /api/endpoints/:id', () => {
        (0, globals_1.it)('should update endpoint', async () => {
            const endpoint = test_utils_1.DataGenerator.endpoint({ userId: testUser.id });
            await dbHelper.seedTestData({ endpoints: [endpoint] });
            const updates = {
                name: 'Updated Name',
                url: 'https://new-url.com/webhook',
                isActive: false,
            };
            const response = await apiHelper.put(`/api/endpoints/${endpoint.id}`)
                .send(updates)
                .expect(200);
            (0, globals_1.expect)(response.body.data).toMatchObject({
                id: endpoint.id,
                ...updates,
            });
        });
        (0, globals_1.it)('should not allow updating other users endpoints', async () => {
            const otherUserEndpoint = test_utils_1.DataGenerator.endpoint({ userId: 'other-user-id' });
            await dbHelper.seedTestData({ endpoints: [otherUserEndpoint] });
            await apiHelper.put(`/api/endpoints/${otherUserEndpoint.id}`)
                .send({ name: 'Hacked!' })
                .expect(404);
        });
    });
    (0, globals_1.describe)('DELETE /api/endpoints/:id', () => {
        (0, globals_1.it)('should delete endpoint and associated webhooks', async () => {
            const endpoint = test_utils_1.DataGenerator.endpoint({ userId: testUser.id });
            const webhooks = test_utils_1.DataGenerator.bulkWebhooks(5, endpoint.id);
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
    (0, globals_1.describe)('GET /api/endpoints/:id/webhooks', () => {
        (0, globals_1.it)('should list webhooks for endpoint', async () => {
            const endpoint = test_utils_1.DataGenerator.endpoint({ userId: testUser.id });
            const webhooks = test_utils_1.DataGenerator.bulkWebhooks(5, endpoint.id);
            await dbHelper.seedTestData({
                endpoints: [endpoint],
                webhooks,
            });
            const response = await apiHelper.get(`/api/endpoints/${endpoint.id}/webhooks`)
                .expect(200);
            (0, globals_1.expect)(response.body.data).toHaveLength(5);
            (0, globals_1.expect)(response.body.data[0]).toMatchObject({
                endpointId: endpoint.id,
            });
        });
        (0, globals_1.it)('should filter webhooks by status', async () => {
            const endpoint = test_utils_1.DataGenerator.endpoint({ userId: testUser.id });
            const deliveredWebhook = test_utils_1.DataGenerator.webhook({
                endpointId: endpoint.id,
                status: 'delivered',
            });
            const failedWebhook = test_utils_1.DataGenerator.webhook({
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
            (0, globals_1.expect)(response.body.data).toHaveLength(1);
            (0, globals_1.expect)(response.body.data[0].id).toBe(deliveredWebhook.id);
        });
    });
});
//# sourceMappingURL=endpoints.test.js.map