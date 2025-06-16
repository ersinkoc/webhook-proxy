"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.status = status;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const api_js_1 = require("../api.js");
const config_js_1 = require("../config.js");
async function status() {
    const apiUrl = (0, config_js_1.getApiUrl)();
    const apiKey = (0, config_js_1.getApiKey)();
    console.log(chalk_1.default.bold('\nWebhook Proxy Status:\n'));
    console.log(`  ${chalk_1.default.gray('API URL:')} ${apiUrl}`);
    console.log(`  ${chalk_1.default.gray('Authenticated:')} ${apiKey ? chalk_1.default.green('Yes') : chalk_1.default.red('No')}`);
    if (!apiKey) {
        console.log(chalk_1.default.yellow('\nNot authenticated. Run "webhook-proxy login <api-key>" to authenticate.'));
        return;
    }
    const spinner = (0, ora_1.default)('Checking server connection...').start();
    try {
        const api = (0, api_js_1.createApiClient)();
        // Check health
        const healthResponse = await api.get('/health');
        const health = healthResponse.data;
        // Get user info
        const userResponse = await api.get('/api/auth/me');
        const user = userResponse.data.data.user;
        // Get endpoint stats
        const endpointsResponse = await api.get('/api/endpoints');
        const endpoints = endpointsResponse.data.data.items;
        spinner.succeed(chalk_1.default.green('Connected to server'));
        console.log(chalk_1.default.bold('\nAccount:\n'));
        console.log(`  ${chalk_1.default.gray('Email:')} ${user.email}`);
        console.log(`  ${chalk_1.default.gray('User ID:')} ${user.id}`);
        console.log(chalk_1.default.bold('\nEndpoints:\n'));
        console.log(`  ${chalk_1.default.gray('Total:')} ${endpoints.length}`);
        console.log(`  ${chalk_1.default.gray('Active:')} ${endpoints.filter((e) => e.isActive).length}`);
        console.log(`  ${chalk_1.default.gray('Inactive:')} ${endpoints.filter((e) => !e.isActive).length}`);
        console.log(chalk_1.default.bold('\nServer:\n'));
        console.log(`  ${chalk_1.default.gray('Status:')} ${chalk_1.default.green(health.status)}`);
        console.log(`  ${chalk_1.default.gray('Version:')} ${health.version}`);
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Failed to connect to server'));
        if (error.code === 'ECONNREFUSED') {
            console.error(chalk_1.default.red('\nServer is not running or not accessible at ' + apiUrl));
        }
        else {
            console.error(chalk_1.default.red('\n' + error.message));
        }
        process.exit(1);
    }
}
//# sourceMappingURL=status.js.map