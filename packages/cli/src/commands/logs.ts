import chalk from 'chalk';
import { createApiClient } from '../api.js';
import { getApiUrl } from '../config.js';
import { io } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import { WebhookEvent } from '@ersinkoc/webhook-proxy-shared';

export async function logs(endpointId: string, options: { follow?: boolean; lines?: string }) {
  try {
    const api = createApiClient();
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
      console.log(chalk.bold(`\nRecent webhooks (last ${lines}):\n`));
      
      webhooks.reverse().forEach((webhook: any) => {
        displayWebhook(webhook);
      });
    } else {
      console.log(chalk.yellow('No webhooks found for this endpoint'));
    }

    // Follow mode
    if (options.follow) {
      console.log(chalk.gray('\nFollowing new webhooks... (Ctrl+C to exit)\n'));
      
      const socket = io(getApiUrl(), {
        transports: ['websocket'],
        auth: {
          token: 'cli', // This would need proper auth in production
        },
      });

      socket.on('connect', () => {
        socket.emit('subscribe:endpoint', endpointId);
      });

      socket.on('webhook:event', (event: WebhookEvent) => {
        if (event.type === 'webhook:received') {
          displayWebhook(event.data);
        } else if (event.type === 'webhook:delivered') {
          console.log(
            chalk.green(`✓ Delivered: ${event.data.webhookId} - Status: ${event.data.statusCode} (${event.data.duration}ms)`)
          );
        } else if (event.type === 'webhook:failed') {
          console.log(
            chalk.red(`✗ Failed: ${event.data.webhookId} - ${event.data.error}`)
          );
        }
      });

      socket.on('disconnect', () => {
        console.log(chalk.yellow('\nDisconnected from server'));
        process.exit(0);
      });

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        socket.close();
        console.log(chalk.gray('\n\nStopped following logs'));
        process.exit(0);
      });
    }
  } catch (error: any) {
    console.error(chalk.red('Failed to get logs'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

function displayWebhook(webhook: any) {
  const time = formatDistanceToNow(new Date(webhook.createdAt), { addSuffix: true });
  const status = webhook.statusCode 
    ? webhook.statusCode >= 200 && webhook.statusCode < 400 
      ? chalk.green(webhook.statusCode) 
      : chalk.red(webhook.statusCode)
    : chalk.yellow('pending');

  console.log(
    `${chalk.gray(time)} ${chalk.cyan(webhook.method)} ${status} ${
      webhook.duration ? `(${webhook.duration}ms)` : ''
    }`
  );
  
  if (webhook.body) {
    const bodyPreview = JSON.stringify(webhook.body);
    const truncated = bodyPreview.length > 100 
      ? bodyPreview.substring(0, 100) + '...' 
      : bodyPreview;
    console.log(`  ${chalk.gray('Body:')} ${truncated}`);
  }
}