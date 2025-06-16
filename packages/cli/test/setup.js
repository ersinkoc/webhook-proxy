"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Setup environment variables
process.env.NODE_ENV = 'test';
process.env.WEBHOOK_PROXY_API_URL = 'http://localhost:3000';
// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeAll(() => {
    console.log = globals_1.jest.fn();
    console.info = globals_1.jest.fn();
    console.warn = globals_1.jest.fn();
    // Keep error for debugging
    console.error = originalConsole.error;
});
afterAll(() => {
    Object.assign(console, originalConsole);
});
beforeEach(() => {
    globals_1.jest.clearAllMocks();
});
//# sourceMappingURL=setup.js.map