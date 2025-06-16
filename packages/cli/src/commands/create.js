"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const api_js_1 = require("../api.js");
const config_js_1 = require("../config.js");
async function create(name, targetUrl) {
    // Validate URL
    try {
        new URL(targetUrl);
    }
    catch {
        console.error(chalk_1.default.red('Error: Invalid target URL'));
        process.exit(1);
    }
    const spinner = (0, ora_1.default)('Creating endpoint...').start();
    try {
        const api = (0, api_js_1.createApiClient)();
        const response = await api.post('/api/endpoints', {
            name,
            targetUrl,
        });
        const endpoint = response.data.data;
        const webhookUrl = `${(0, config_js_1.getApiUrl)().replace(/\/api$/, '')}/webhook/${endpoint.slug}`;
        spinner.succeed(chalk_1.default.green('Endpoint created successfully!'));
        console.log('\n' + chalk_1.default.bold('Endpoint Details:'));
        console.log(`  ID: ${chalk_1.default.cyan(endpoint.id)}`);
        console.log(`  Name: ${chalk_1.default.cyan(endpoint.name)}`);
        console.log(`  Target URL: ${chalk_1.default.cyan(endpoint.targetUrl)}`);
        console.log(`  Webhook URL: ${chalk_1.default.cyan(webhookUrl)}`);
        console.log(`  API Key: ${chalk_1.default.cyan(endpoint.apiKey)}`);
        console.log('\n' + chalk_1.default.gray('Send webhooks to the URL above to get started!'));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Failed to create endpoint'));
        console.error(chalk_1.default.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}
//# sourceMappingURL=create.js.map