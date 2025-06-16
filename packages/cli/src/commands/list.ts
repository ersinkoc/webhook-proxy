import chalk from 'chalk';
import Table from 'cli-table3';
import { createApiClient } from '../api.js';
import { formatDistanceToNow } from 'date-fns';

export async function list(options: { all?: boolean }) {
  try {
    const api = createApiClient();
    const response = await api.get('/api/endpoints');
    const endpoints = response.data.data.items;

    const filteredEndpoints = options.all 
      ? endpoints 
      : endpoints.filter((e: any) => e.isActive);

    if (filteredEndpoints.length === 0) {
      console.log(chalk.yellow('No endpoints found'));
      return;
    }

    const table = new Table({
      head: ['Name', 'Status', 'Target URL', 'Webhooks', 'Last Activity'],
      style: { head: ['cyan'] },
    });

    filteredEndpoints.forEach((endpoint: any) => {
      table.push([
        endpoint.name,
        endpoint.isActive 
          ? chalk.green('Active') 
          : chalk.gray('Inactive'),
        endpoint.targetUrl,
        endpoint.webhookCount.toString(),
        endpoint.lastWebhookAt 
          ? formatDistanceToNow(new Date(endpoint.lastWebhookAt), { addSuffix: true })
          : chalk.gray('Never'),
      ]);
    });

    console.log(table.toString());
    console.log(`\n${chalk.gray(`Showing ${filteredEndpoints.length} endpoint(s)`)}`);
  } catch (error: any) {
    console.error(chalk.red('Failed to list endpoints'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}