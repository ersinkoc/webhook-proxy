import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';

// Setup globals
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Setup environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/webhook_proxy_test';

// Mock timers
beforeEach(() => {
  jest.clearAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(30000);