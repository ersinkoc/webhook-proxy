"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiClient = createApiClient;
const axios_1 = __importDefault(require("axios"));
const config_js_1 = require("./config.js");
const chalk_1 = __importDefault(require("chalk"));
function createApiClient() {
    const apiKey = (0, config_js_1.getApiKey)();
    const apiUrl = (0, config_js_1.getApiUrl)();
    if (!apiKey) {
        console.error(chalk_1.default.red('Error: No API key found. Please run "webhook-proxy login <api-key>" first.'));
        process.exit(1);
    }
    const client = axios_1.default.create({
        baseURL: apiUrl,
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
        },
    });
    client.interceptors.response.use((response) => response, (error) => {
        if (error.response?.status === 401) {
            console.error(chalk_1.default.red('Error: Invalid API key. Please check your credentials.'));
            process.exit(1);
        }
        throw error;
    });
    return client;
}
//# sourceMappingURL=api.js.map