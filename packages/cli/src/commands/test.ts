import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { createApiClient } from '../api.js';
import { getApiUrl } from '../config.js';

export async function test(endpointId: string, options: { method?: string; body?: string }) {
  try {
    const api = createApiClient();
    
    // Get endpoint details
    const endpointResponse = await api.get(`/api/endpoints/${endpointId}`);
    const endpoint = endpointResponse.data.data;
    
    const webhookUrl = `${getApiUrl().replace(/\/api$/, '')}/webhook/${endpoint.slug}`;
    const method = options.method || 'POST';
    
    let body;
    if (options.body) {
      try {
        body = JSON.parse(options.body);
      } catch {
        console.error(chalk.red('Error: Invalid JSON body'));
        process.exit(1);
      }
    } else {
      // Default test payload
      body = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test webhook from CLI',
      };
    }

    const spinner = ora(`Sending ${method} webhook to ${endpoint.name}...`).start();

    const response = await axios({
      method,
      url: webhookUrl,
      data: body,
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Webhook': 'true',
      },
    });

    spinner.succeed(chalk.green('Test webhook sent successfully!'));
    
    console.log('\n' + chalk.bold('Response:'));
    console.log(`  ${chalk.gray('Status:')} ${response.status} ${response.statusText}`);
    console.log(`  ${chalk.gray('Webhook ID:')} ${response.data.webhookId}`);
    
    console.log('\n' + chalk.gray(`Check the webhook details at:`));
    console.log(chalk.cyan(`webhook-proxy info ${endpointId}`));
    console.log(chalk.cyan(`webhook-proxy logs ${endpointId} -n 1`));
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error(chalk.red('Endpoint not found'));
    } else {
      console.error(chalk.red('Failed to send test webhook'));
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
}