"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMITS = exports.DEFAULT_PAGINATION = exports.WEBHOOK_EVENTS = exports.HTTP_METHODS = exports.API_VERSION = void 0;
exports.API_VERSION = 'v1';
exports.HTTP_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'HEAD',
    'OPTIONS',
];
exports.WEBHOOK_EVENTS = {
    RECEIVED: 'webhook:received',
    DELIVERED: 'webhook:delivered',
    FAILED: 'webhook:failed',
};
exports.DEFAULT_PAGINATION = {
    PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
};
exports.RATE_LIMITS = {
    DEFAULT: {
        MAX: 100,
        WINDOW_MS: 60 * 1000, // 1 minute
    },
    WEBHOOK: {
        MAX: 1000,
        WINDOW_MS: 60 * 1000, // 1 minute
    },
};
//# sourceMappingURL=constants.js.map