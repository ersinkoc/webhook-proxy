"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.info = info;
const chalk_1 = __importDefault(require("chalk"));
const api_js_1 = require("../api.js");
const config_js_1 = require("../config.js");
const date_fns_1 = require("date-fns");
async function info(endpointId) {
    try {
        const api = (0, api_js_1.createApiClient)();
        const response = await api.get(`/api/endpoints/${endpointId}`);
        const endpoint = response.data.data;
        const webhookUrl = `${(0, config_js_1.getApiUrl)().replace(/\/api$/, '')}/webhook/${endpoint.slug}`;
        console.log(chalk_1.default.bold('\nEndpoint Information:\n'));
        console.log(`  ${chalk_1.default.gray('ID:')}         ${endpoint.id}`);
        console.log(`  ${chalk_1.default.gray('Name:')}       ${endpoint.name}`);
        console.log(`  ${chalk_1.default.gray('Status:')}     ${endpoint.isActive ? chalk_1.default.green('Active') : chalk_1.default.gray('Inactive')}`);
        console.log(`  ${chalk_1.default.gray('Created:')}    ${(0, date_fns_1.formatDistanceToNow)(new Date(endpoint.createdAt), { addSuffix: true })}`);
        console.log(`  ${chalk_1.default.gray('Updated:')}    ${(0, date_fns_1.formatDistanceToNow)(new Date(endpoint.updatedAt), { addSuffix: true })}`);
        console.log(chalk_1.default.bold('\nConfiguration:\n'));
        console.log(`  ${chalk_1.default.gray('Target URL:')} ${endpoint.targetUrl}`);
        console.log(`  ${chalk_1.default.gray('Webhook URL:')} ${chalk_1.default.cyan(webhookUrl)}`);
        console.log(`  ${chalk_1.default.gray('API Key:')} ${endpoint.apiKey}`);
        console.log(chalk_1.default.bold('\nStatistics:\n'));
        console.log(`  ${chalk_1.default.gray('Total Webhooks:')} ${endpoint.webhookCount}`);
        console.log(`  ${chalk_1.default.gray('Last Activity:')} ${endpoint.lastWebhookAt
            ? (0, date_fns_1.formatDistanceToNow)(new Date(endpoint.lastWebhookAt), { addSuffix: true })
            : 'Never'}`);
    }
    catch (error) {
        if (error.response?.status === 404) {
            console.error(chalk_1.default.red('Endpoint not found'));
        }
        else {
            console.error(chalk_1.default.red('Failed to get endpoint info'));
            console.error(chalk_1.default.red(error.message));
        }
        process.exit(1);
    }
}
//# sourceMappingURL=info.js.map