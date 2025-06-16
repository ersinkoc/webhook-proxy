"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const util_1 = require("util");
// Setup globals
global.TextEncoder = util_1.TextEncoder;
global.TextDecoder = util_1.TextDecoder;
// Setup environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/webhook_proxy_test';
// Mock timers
beforeEach(() => {
    globals_1.jest.clearAllMocks();
});
// Increase timeout for integration tests
globals_1.jest.setTimeout(30000);
//# sourceMappingURL=setup.js.map