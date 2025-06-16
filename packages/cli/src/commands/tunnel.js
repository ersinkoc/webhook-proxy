"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tunnel = tunnel;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const api_js_1 = require("../api.js");
const config_js_1 = require("../config.js");
async function tunnel(port, options) {
    const portNumber = parseInt(port);
    if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
        console.error(chalk_1.default.red('Error: Invalid port number'));
        process.exit(1);
    }
    const targetUrl = `http://localhost:${portNumber}`;
    const name = options.name || `Local Tunnel (Port ${portNumber})`;
    const spinner = (0, ora_1.default)('Creating tunnel...').start();
    try {
        const api = (0, api_js_1.createApiClient)();
        const response = await api.post('/api/endpoints', {
            name,
            targetUrl,
        });
        const endpoint = response.data.data;
        const webhookUrl = `${(0, config_js_1.getApiUrl)().replace(/\/api$/, '')}/webhook/${endpoint.slug}`;
        spinner.succeed(chalk_1.default.green('Tunnel created successfully!'));
        console.log('\n' + chalk_1.default.bold('Tunnel Details:'));
        console.log(`  ${chalk_1.default.gray('Webhook URL:')} ${chalk_1.default.cyan(webhookUrl)}`);
        console.log(`  ${chalk_1.default.gray('Target:')} ${chalk_1.default.cyan(targetUrl)}`);
        console.log(`  ${chalk_1.default.gray('Endpoint ID:')} ${chalk_1.default.gray(endpoint.id)}`);
        console.log('\n' + chalk_1.default.yellow('⚠️  Make sure your local server is running on port ' + portNumber));
        console.log(chalk_1.default.gray('\nPress Ctrl+C to exit (the endpoint will remain active)'));
        // Keep the process running
        process.on('SIGINT', () => {
            console.log(chalk_1.default.gray('\n\nTunnel closed. The endpoint remains active.'));
            console.log(chalk_1.default.gray(`To delete it, run: webhook-proxy delete ${endpoint.id}`));
            process.exit(0);
        });
        // Prevent the process from exiting
        setInterval(() => { }, 1000);
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Failed to create tunnel'));
        console.error(chalk_1.default.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}
//# sourceMappingURL=tunnel.js.map