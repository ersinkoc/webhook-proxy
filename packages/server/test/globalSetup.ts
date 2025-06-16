import { spawn } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async () => {
  console.log('Setting up test database...');

  try {
    // Create test database if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE DATABASE IF NOT EXISTS webhook_proxy_test;
    `).catch(() => {
      // Database might already exist
    });

    // Run migrations on test database
    const migrate = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
    });

    await new Promise((resolve, reject) => {
      migrate.on('exit', (code) => {
        if (code === 0) {
          resolve(undefined);
        } else {
          reject(new Error(`Migration failed with code ${code}`));
        }
      });
    });

    console.log('Test database setup complete');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};