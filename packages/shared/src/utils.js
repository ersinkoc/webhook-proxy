"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlug = generateSlug;
exports.formatDate = formatDate;
exports.isValidUrl = isValidUrl;
exports.parseHeaders = parseHeaders;
exports.sleep = sleep;
function generateSlug(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function formatDate(date) {
    return new Date(date).toISOString();
}
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
function parseHeaders(headers) {
    const parsed = {};
    if (typeof headers === 'object' && headers !== null) {
        Object.keys(headers).forEach((key) => {
            const value = headers[key];
            if (typeof value === 'string') {
                parsed[key.toLowerCase()] = value;
            }
            else if (Array.isArray(value)) {
                parsed[key.toLowerCase()] = value.join(', ');
            }
        });
    }
    return parsed;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=utils.js.map