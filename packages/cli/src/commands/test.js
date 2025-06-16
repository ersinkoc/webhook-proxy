"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = test;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const axios_1 = __importDefault(require("axios"));
const api_js_1 = require("../api.js");
const config_js_1 = require("../config.js");
async function test(endpointId, options) {
    try {
        const api = (0, api_js_1.createApiClient)();
        // Get endpoint details
        const endpointResponse = await api.get(`/api/endpoints/${endpointId}`);
        const endpoint = endpointResponse.data.data;
        const webhookUrl = `${(0, config_js_1.getApiUrl)().replace(/\/api$/, '')}/webhook/${endpoint.slug}`;
        const method = options.method || 'POST';
        let body;
        if (options.body) {
            try {
                body = JSON.parse(options.body);
            }
            catch {
                console.error(chalk_1.default.red('Error: Invalid JSON body'));
                process.exit(1);
            }
        }
        else {
            // Default test payload
            body = {
                test: true,
                timestamp: new Date().toISOString(),
                message: 'Test webhook from CLI',
            };
        }
        const spinner = (0, ora_1.default)(`Sending ${method} webhook to ${endpoint.name}...`).start();
        const response = await (0, axios_1.default)({
            method,
            url: webhookUrl,
            data: body,
            headers: {
                'Content-Type': 'application/json',
                'X-Test-Webhook': 'true',
            },
        });
        spinner.succeed(chalk_1.default.green('Test webhook sent successfully!'));
        console.log('\n' + chalk_1.default.bold('Response:'));
        console.log(`  ${chalk_1.default.gray('Status:')} ${response.status} ${response.statusText}`);
        console.log(`  ${chalk_1.default.gray('Webhook ID:')} ${response.data.webhookId}`);
        console.log('\n' + chalk_1.default.gray(`Check the webhook details at:`));
        console.log(chalk_1.default.cyan(`webhook-proxy info ${endpointId}`));
        console.log(chalk_1.default.cyan(`webhook-proxy logs ${endpointId} -n 1`));
    }
    catch (error) {
        if (error.response?.status === 404) {
            console.error(chalk_1.default.red('Endpoint not found'));
        }
        else {
            console.error(chalk_1.default.red('Failed to send test webhook'));
            console.error(chalk_1.default.red(error.message));
        }
        process.exit(1);
    }
}
//# sourceMappingURL=test.js.map