"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@testing-library/jest-dom");
const globals_1 = require("@jest/globals");
// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: globals_1.jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: globals_1.jest.fn(), // deprecated
        removeListener: globals_1.jest.fn(), // deprecated
        addEventListener: globals_1.jest.fn(),
        removeEventListener: globals_1.jest.fn(),
        dispatchEvent: globals_1.jest.fn(),
    })),
});
// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    unobserve() { }
};
// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    unobserve() { }
};
beforeEach(() => {
    globals_1.jest.clearAllMocks();
});
//# sourceMappingURL=setup.js.map