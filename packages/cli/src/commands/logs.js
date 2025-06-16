"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logs = logs;
const chalk_1 = __importDefault(require("chalk"));
const api_js_1 = require("../api.js");
const config_js_1 = require("../config.js");
const socket_io_client_1 = require("socket.io-client");
const date_fns_1 = require("date-fns");
async function logs(endpointId, options) {
    try {
        const api = (0, api_js_1.createApiClient)();
        const lines = parseInt(options.lines || '20');
        // Get recent webhooks
        const response = await api.get('/api/webhooks', {
            params: {
                endpointId,
                pageSize: lines,
            },
        });
        const webhooks = response.data.data.items;
        // Display recent webhooks
        if (webhooks.length > 0) {
            console.log(chalk_1.default.bold(`\nRecent webhooks (last ${lines}):\n`));
            webhooks.reverse().forEach((webhook) => {
                displayWebhook(webhook);
            });
        }
        else {
            console.log(chalk_1.default.yellow('No webhooks found for this endpoint'));
        }
        // Follow mode
        if (options.follow) {
            console.log(chalk_1.default.gray('\nFollowing new webhooks... (Ctrl+C to exit)\n'));
            const socket = (0, socket_io_client_1.io)((0, config_js_1.getApiUrl)(), {
                transports: ['websocket'],
                auth: {
                    token: 'cli', // This would need proper auth in production
                },
            });
            socket.on('connect', () => {
                socket.emit('subscribe:endpoint', endpointId);
            });
            socket.on('webhook:event', (event) => {
                if (event.type === 'webhook:received') {
                    displayWebhook(event.data);
                }
                else if (event.type === 'webhook:delivered') {
                    console.log(chalk_1.default.green(`✓ Delivered: ${event.data.webhookId} - Status: ${event.data.statusCode} (${event.data.duration}ms)`));
                }
                else if (event.type === 'webhook:failed') {
                    console.log(chalk_1.default.red(`✗ Failed: ${event.data.webhookId} - ${event.data.error}`));
                }
            });
            socket.on('disconnect', () => {
                console.log(chalk_1.default.yellow('\nDisconnected from server'));
                process.exit(0);
            });
            // Handle Ctrl+C
            process.on('SIGINT', () => {
                socket.close();
                console.log(chalk_1.default.gray('\n\nStopped following logs'));
                process.exit(0);
            });
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Failed to get logs'));
        console.error(chalk_1.default.red(error.message));
        process.exit(1);
    }
}
function displayWebhook(webhook) {
    const time = (0, date_fns_1.formatDistanceToNow)(new Date(webhook.createdAt), { addSuffix: true });
    const status = webhook.statusCode
        ? webhook.statusCode >= 200 && webhook.statusCode < 400
            ? chalk_1.default.green(webhook.statusCode)
            : chalk_1.default.red(webhook.statusCode)
        : chalk_1.default.yellow('pending');
    console.log(`${chalk_1.default.gray(time)} ${chalk_1.default.cyan(webhook.method)} ${status} ${webhook.duration ? `(${webhook.duration}ms)` : ''}`);
    if (webhook.body) {
        const bodyPreview = JSON.stringify(webhook.body);
        const truncated = bodyPreview.length > 100
            ? bodyPreview.substring(0, 100) + '...'
            : bodyPreview;
        console.log(`  ${chalk_1.default.gray('Body:')} ${truncated}`);
    }
}
//# sourceMappingURL=logs.js.map