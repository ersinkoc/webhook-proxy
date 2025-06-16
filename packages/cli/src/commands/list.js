"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const api_js_1 = require("../api.js");
const date_fns_1 = require("date-fns");
async function list(options) {
    try {
        const api = (0, api_js_1.createApiClient)();
        const response = await api.get('/api/endpoints');
        const endpoints = response.data.data.items;
        const filteredEndpoints = options.all
            ? endpoints
            : endpoints.filter((e) => e.isActive);
        if (filteredEndpoints.length === 0) {
            console.log(chalk_1.default.yellow('No endpoints found'));
            return;
        }
        const table = new cli_table3_1.default({
            head: ['Name', 'Status', 'Target URL', 'Webhooks', 'Last Activity'],
            style: { head: ['cyan'] },
        });
        filteredEndpoints.forEach((endpoint) => {
            table.push([
                endpoint.name,
                endpoint.isActive
                    ? chalk_1.default.green('Active')
                    : chalk_1.default.gray('Inactive'),
                endpoint.targetUrl,
                endpoint.webhookCount.toString(),
                endpoint.lastWebhookAt
                    ? (0, date_fns_1.formatDistanceToNow)(new Date(endpoint.lastWebhookAt), { addSuffix: true })
                    : chalk_1.default.gray('Never'),
            ]);
        });
        console.log(table.toString());
        console.log(`\n${chalk_1.default.gray(`Showing ${filteredEndpoints.length} endpoint(s)`)}`);
    }
    catch (error) {
        console.error(chalk_1.default.red('Failed to list endpoints'));
        console.error(chalk_1.default.red(error.message));
        process.exit(1);
    }
}
//# sourceMappingURL=list.js.map