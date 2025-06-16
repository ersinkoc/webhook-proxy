import chalk from 'chalk';
import ora from 'ora';
import { createApiClient } from '../api.js';
import { getApiUrl, getApiKey } from '../config.js';

export async function status() {
  const apiUrl = getApiUrl();
  const apiKey = getApiKey();

  console.log(chalk.bold('\nWebhook Proxy Status:\n'));
  console.log(`  ${chalk.gray('API URL:')} ${apiUrl}`);
  console.log(`  ${chalk.gray('Authenticated:')} ${apiKey ? chalk.green('Yes') : chalk.red('No')}`);

  if (!apiKey) {
    console.log(chalk.yellow('\nNot authenticated. Run "webhook-proxy login <api-key>" to authenticate.'));
    return;
  }

  const spinner = ora('Checking server connection...').start();

  try {
    const api = createApiClient();
    
    // Check health
    const healthResponse = await api.get('/health');
    const health = healthResponse.data;

    // Get user info
    const userResponse = await api.get('/api/auth/me');
    const user = userResponse.data.data.user;

    // Get endpoint stats
    const endpointsResponse = await api.get('/api/endpoints');
    const endpoints = endpointsResponse.data.data.items;

    spinner.succeed(chalk.green('Connected to server'));

    console.log(chalk.bold('\nAccount:\n'));
    console.log(`  ${chalk.gray('Email:')} ${user.email}`);
    console.log(`  ${chalk.gray('User ID:')} ${user.id}`);

    console.log(chalk.bold('\nEndpoints:\n'));
    console.log(`  ${chalk.gray('Total:')} ${endpoints.length}`);
    console.log(`  ${chalk.gray('Active:')} ${endpoints.filter((e: any) => e.isActive).length}`);
    console.log(`  ${chalk.gray('Inactive:')} ${endpoints.filter((e: any) => !e.isActive).length}`);

    console.log(chalk.bold('\nServer:\n'));
    console.log(`  ${chalk.gray('Status:')} ${chalk.green(health.status)}`);
    console.log(`  ${chalk.gray('Version:')} ${health.version}`);
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to connect to server'));
    
    if (error.code === 'ECONNREFUSED') {
      console.error(chalk.red('\nServer is not running or not accessible at ' + apiUrl));
    } else {
      console.error(chalk.red('\n' + error.message));
    }
    
    process.exit(1);
  }
}