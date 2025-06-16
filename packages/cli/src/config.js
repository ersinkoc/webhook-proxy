"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getApiKey = getApiKey;
exports.getApiUrl = getApiUrl;
const os_1 = require("os");
const path_1 = require("path");
const fs_1 = require("fs");
const configDir = (0, path_1.join)((0, os_1.homedir)(), '.webhook-proxy');
const configPath = (0, path_1.join)(configDir, 'config.json');
// Ensure config directory exists
if (!(0, fs_1.existsSync)(configDir)) {
    (0, fs_1.mkdirSync)(configDir, { recursive: true });
}
function loadConfig() {
    try {
        if ((0, fs_1.existsSync)(configPath)) {
            const content = (0, fs_1.readFileSync)(configPath, 'utf-8');
            return JSON.parse(content);
        }
    }
    catch {
        // Ignore errors
    }
    return {
        apiUrl: process.env.WEBHOOK_PROXY_API_URL || 'http://localhost:3001',
    };
}
function saveConfig(config) {
    (0, fs_1.writeFileSync)(configPath, JSON.stringify(config, null, 2));
}
function getApiKey() {
    const config = loadConfig();
    return config.apiKey || process.env.WEBHOOK_PROXY_API_KEY;
}
function getApiUrl() {
    const config = loadConfig();
    return config.apiUrl || 'http://localhost:3001';
}
//# sourceMappingURL=config.js.map