#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
const { default: { version } } = await import('../package.json', { assert: { type: 'json' } });
import { init } from './commands/init.js';
import { login } from './commands/login.js';
import { logout } from './commands/logout.js';
import { create } from './commands/create.js';
import { list } from './commands/list.js';
import { deleteEndpoint } from './commands/delete.js';
import { info } from './commands/info.js';
import { logs } from './commands/logs.js';
import { status } from './commands/status.js';
import { tunnel } from './commands/tunnel.js';
import { test } from './commands/test.js';

const program = new Command();

program
  .name('webhook-proxy')
  .description('CLI tool for managing webhook endpoints')
  .version(version);

program
  .command('init')
  .description('Initialize webhook proxy configuration')
  .action(init);

program
  .command('login <api-key>')
  .description('Set API key for authentication')
  .action(login);

program
  .command('logout')
  .description('Clear authentication')
  .action(logout);

program
  .command('create <name> <target-url>')
  .description('Create new webhook endpoint')
  .action(create);

program
  .command('list')
  .alias('ls')
  .description('List all endpoints')
  .option('-a, --all', 'Show inactive endpoints')
  .action(list);

program
  .command('delete <endpoint-id>')
  .alias('rm')
  .description('Delete endpoint')
  .action(deleteEndpoint);

program
  .command('info <endpoint-id>')
  .description('Show endpoint details')
  .action(info);

program
  .command('logs <endpoint-id>')
  .description('Show webhook logs')
  .option('-f, --follow', 'Follow logs in real-time')
  .option('-n, --lines <number>', 'Number of lines to show', '20')
  .action(logs);

program
  .command('status')
  .description('Show connection status')
  .action(status);

program
  .command('tunnel <port>')
  .description('Quick tunnel to local port')
  .option('-n, --name <name>', 'Endpoint name', 'Local Tunnel')
  .action(tunnel);

program
  .command('test <endpoint-id>')
  .description('Send test webhook')
  .option('-m, --method <method>', 'HTTP method', 'POST')
  .option('-b, --body <json>', 'Request body as JSON')
  .action(test);

program.parse();

// Handle errors
process.on('unhandledRejection', (error: any) => {
  console.error(chalk.red('Error:'), error.message || error);
  process.exit(1);
});