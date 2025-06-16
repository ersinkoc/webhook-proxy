import chalk from 'chalk';
import { createApiClient } from '../api.js';
import { getApiUrl } from '../config.js';
import { formatDistanceToNow } from 'date-fns';

export async function info(endpointId: string) {
  try {
    const api = createApiClient();
    const response = await api.get(`/api/endpoints/${endpointId}`);
    const endpoint = response.data.data;
    
    const webhookUrl = `${getApiUrl().replace(/\/api$/, '')}/webhook/${endpoint.slug}`;

    console.log(chalk.bold('\nEndpoint Information:\n'));
    console.log(`  ${chalk.gray('ID:')}         ${endpoint.id}`);
    console.log(`  ${chalk.gray('Name:')}       ${endpoint.name}`);
    console.log(`  ${chalk.gray('Status:')}     ${endpoint.isActive ? chalk.green('Active') : chalk.gray('Inactive')}`);
    console.log(`  ${chalk.gray('Created:')}    ${formatDistanceToNow(new Date(endpoint.createdAt), { addSuffix: true })}`);
    console.log(`  ${chalk.gray('Updated:')}    ${formatDistanceToNow(new Date(endpoint.updatedAt), { addSuffix: true })}`);
    
    console.log(chalk.bold('\nConfiguration:\n'));
    console.log(`  ${chalk.gray('Target URL:')} ${endpoint.targetUrl}`);
    console.log(`  ${chalk.gray('Webhook URL:')} ${chalk.cyan(webhookUrl)}`);
    console.log(`  ${chalk.gray('API Key:')} ${endpoint.apiKey}`);
    
    console.log(chalk.bold('\nStatistics:\n'));
    console.log(`  ${chalk.gray('Total Webhooks:')} ${endpoint.webhookCount}`);
    console.log(`  ${chalk.gray('Last Activity:')} ${
      endpoint.lastWebhookAt 
        ? formatDistanceToNow(new Date(endpoint.lastWebhookAt), { addSuffix: true })
        : 'Never'
    }`);
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error(chalk.red('Endpoint not found'));
    } else {
      console.error(chalk.red('Failed to get endpoint info'));
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
}