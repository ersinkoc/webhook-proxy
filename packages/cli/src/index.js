#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const package_json_1 = require("../package.json");
const init_js_1 = require("./commands/init.js");
const login_js_1 = require("./commands/login.js");
const logout_js_1 = require("./commands/logout.js");
const create_js_1 = require("./commands/create.js");
const list_js_1 = require("./commands/list.js");
const delete_js_1 = require("./commands/delete.js");
const info_js_1 = require("./commands/info.js");
const logs_js_1 = require("./commands/logs.js");
const status_js_1 = require("./commands/status.js");
const tunnel_js_1 = require("./commands/tunnel.js");
const test_js_1 = require("./commands/test.js");
const program = new commander_1.Command();
program
    .name('webhook-proxy')
    .description('CLI tool for managing webhook endpoints')
    .version(package_json_1.version);
program
    .command('init')
    .description('Initialize webhook proxy configuration')
    .action(init_js_1.init);
program
    .command('login <api-key>')
    .description('Set API key for authentication')
    .action(login_js_1.login);
program
    .command('logout')
    .description('Clear authentication')
    .action(logout_js_1.logout);
program
    .command('create <name> <target-url>')
    .description('Create new webhook endpoint')
    .action(create_js_1.create);
program
    .command('list')
    .alias('ls')
    .description('List all endpoints')
    .option('-a, --all', 'Show inactive endpoints')
    .action(list_js_1.list);
program
    .command('delete <endpoint-id>')
    .alias('rm')
    .description('Delete endpoint')
    .action(delete_js_1.deleteEndpoint);
program
    .command('info <endpoint-id>')
    .description('Show endpoint details')
    .action(info_js_1.info);
program
    .command('logs <endpoint-id>')
    .description('Show webhook logs')
    .option('-f, --follow', 'Follow logs in real-time')
    .option('-n, --lines <number>', 'Number of lines to show', '20')
    .action(logs_js_1.logs);
program
    .command('status')
    .description('Show connection status')
    .action(status_js_1.status);
program
    .command('tunnel <port>')
    .description('Quick tunnel to local port')
    .option('-n, --name <name>', 'Endpoint name', 'Local Tunnel')
    .action(tunnel_js_1.tunnel);
program
    .command('test <endpoint-id>')
    .description('Send test webhook')
    .option('-m, --method <method>', 'HTTP method', 'POST')
    .option('-b, --body <json>', 'Request body as JSON')
    .action(test_js_1.test);
program.parse();
// Handle errors
process.on('unhandledRejection', (error) => {
    console.error(chalk_1.default.red('Error:'), error.message || error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map