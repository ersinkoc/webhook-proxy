import { jest } from '@jest/globals';

// Setup environment variables
process.env.NODE_ENV = 'test';
process.env.WEBHOOK_PROXY_API_URL = 'http://localhost:3000';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  // Keep error for debugging
  console.error = originalConsole.error;
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

beforeEach(() => {
  jest.clearAllMocks();
});