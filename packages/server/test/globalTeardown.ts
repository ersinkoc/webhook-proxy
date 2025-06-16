import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async () => {
  console.log('Cleaning up test database...');

  try {
    // Clean up test data
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE "Webhook", "Endpoint", "User" CASCADE;
    `).catch(() => {
      // Tables might not exist
    });

    console.log('Test database cleanup complete');
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
  } finally {
    await prisma.$disconnect();
  }
};