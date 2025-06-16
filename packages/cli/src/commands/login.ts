import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, saveConfig } from '../config.js';
import axios from 'axios';

export async function login(apiKey: string) {
  const spinner = ora('Verifying API key...').start();
  
  try {
    const config = loadConfig();
    
    // Verify the API key
    const response = await axios.get(`${config.apiUrl}/api/auth/me`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });

    const user = response.data.data.user;
    
    // Save the API key
    saveConfig({
      ...config,
      apiKey,
    });

    spinner.succeed(chalk.green(`Logged in as ${user.email}`));
  } catch (error: any) {
    spinner.fail(chalk.red('Invalid API key'));
    process.exit(1);
  }
}