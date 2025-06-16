"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.default = async () => {
    console.log('Cleaning up test database...');
    try {
        // Clean up test data
        await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE "Webhook", "Endpoint", "User" CASCADE;
    `).catch(() => {
            // Tables might not exist
        });
        console.log('Test database cleanup complete');
    }
    catch (error) {
        console.error('Failed to cleanup test database:', error);
    }
    finally {
        await prisma.$disconnect();
    }
};
//# sourceMappingURL=globalTeardown.js.map