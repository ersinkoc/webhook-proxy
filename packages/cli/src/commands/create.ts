import chalk from 'chalk';
import ora from 'ora';
import { createApiClient } from '../api.js';
import { getApiUrl } from '../config.js';

export async function create(name: string, targetUrl: string) {
  // Validate URL
  try {
    new URL(targetUrl);
  } catch {
    console.error(chalk.red('Error: Invalid target URL'));
    process.exit(1);
  }

  const spinner = ora('Creating endpoint...').start();
  
  try {
    const api = createApiClient();
    const response = await api.post('/api/endpoints', {
      name,
      targetUrl,
    });

    const endpoint = response.data.data;
    const webhookUrl = `${getApiUrl().replace(/\/api$/, '')}/webhook/${endpoint.slug}`;

    spinner.succeed(chalk.green('Endpoint created successfully!'));
    
    console.log('\n' + chalk.bold('Endpoint Details:'));
    console.log(`  ID: ${chalk.cyan(endpoint.id)}`);
    console.log(`  Name: ${chalk.cyan(endpoint.name)}`);
    console.log(`  Target URL: ${chalk.cyan(endpoint.targetUrl)}`);
    console.log(`  Webhook URL: ${chalk.cyan(webhookUrl)}`);
    console.log(`  API Key: ${chalk.cyan(endpoint.apiKey)}`);
    
    console.log('\n' + chalk.gray('Send webhooks to the URL above to get started!'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to create endpoint'));
    console.error(chalk.red(error.response?.data?.message || error.message));
    process.exit(1);
  }
}