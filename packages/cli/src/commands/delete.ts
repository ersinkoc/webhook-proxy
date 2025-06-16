import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { createApiClient } from '../api.js';

export async function deleteEndpoint(endpointId: string) {
  try {
    const api = createApiClient();
    
    // Get endpoint details first
    const endpointResponse = await api.get(`/api/endpoints/${endpointId}`);
    const endpoint = endpointResponse.data.data;

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to delete "${endpoint.name}"?`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Deletion cancelled'));
      return;
    }

    const spinner = ora('Deleting endpoint...').start();
    
    await api.delete(`/api/endpoints/${endpointId}`);
    
    spinner.succeed(chalk.green('Endpoint deleted successfully'));
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error(chalk.red('Endpoint not found'));
    } else {
      console.error(chalk.red('Failed to delete endpoint'));
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
}