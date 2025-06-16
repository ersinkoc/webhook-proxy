import chalk from 'chalk';
import ora from 'ora';
import { createApiClient } from '../api.js';
import { getApiUrl } from '../config.js';

export async function tunnel(port: string, options: { name?: string }) {
  const portNumber = parseInt(port);
  
  if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
    console.error(chalk.red('Error: Invalid port number'));
    process.exit(1);
  }

  const targetUrl = `http://localhost:${portNumber}`;
  const name = options.name || `Local Tunnel (Port ${portNumber})`;

  const spinner = ora('Creating tunnel...').start();
  
  try {
    const api = createApiClient();
    const response = await api.post('/api/endpoints', {
      name,
      targetUrl,
    });

    const endpoint = response.data.data;
    const webhookUrl = `${getApiUrl().replace(/\/api$/, '')}/webhook/${endpoint.slug}`;

    spinner.succeed(chalk.green('Tunnel created successfully!'));
    
    console.log('\n' + chalk.bold('Tunnel Details:'));
    console.log(`  ${chalk.gray('Webhook URL:')} ${chalk.cyan(webhookUrl)}`);
    console.log(`  ${chalk.gray('Target:')} ${chalk.cyan(targetUrl)}`);
    console.log(`  ${chalk.gray('Endpoint ID:')} ${chalk.gray(endpoint.id)}`);
    
    console.log('\n' + chalk.yellow('⚠️  Make sure your local server is running on port ' + portNumber));
    console.log(chalk.gray('\nPress Ctrl+C to exit (the endpoint will remain active)'));
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log(chalk.gray('\n\nTunnel closed. The endpoint remains active.'));
      console.log(chalk.gray(`To delete it, run: webhook-proxy delete ${endpoint.id}`));
      process.exit(0);
    });
    
    // Prevent the process from exiting
    setInterval(() => {}, 1000);
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to create tunnel'));
    console.error(chalk.red(error.response?.data?.message || error.message));
    process.exit(1);
  }
}