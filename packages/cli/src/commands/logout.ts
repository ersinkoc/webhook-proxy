import chalk from 'chalk';
import { loadConfig, saveConfig } from '../config.js';

export function logout() {
  const config = loadConfig();
  
  if (!config.apiKey) {
    console.log(chalk.yellow('Not logged in'));
    return;
  }

  saveConfig({
    ...config,
    apiKey: undefined,
  });

  console.log(chalk.green('✅ Logged out successfully'));
}