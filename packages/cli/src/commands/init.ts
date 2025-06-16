import inquirer from 'inquirer';
import chalk from 'chalk';
import { loadConfig, saveConfig } from '../config.js';

export async function init() {
  console.log(chalk.blue('🚀 Webhook Proxy CLI Setup\n'));

  const currentConfig = loadConfig();

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiUrl',
      message: 'API URL:',
      default: currentConfig.apiUrl || 'http://localhost:3001',
      validate: (input) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'API Key (optional, can be set later with login):',
      default: currentConfig.apiKey,
    },
  ]);

  const config = {
    apiUrl: answers.apiUrl,
    ...(answers.apiKey && { apiKey: answers.apiKey }),
  };

  saveConfig(config);

  console.log(chalk.green('\n✅ Configuration saved!'));
  
  if (!answers.apiKey) {
    console.log(chalk.yellow('\n⚠️  No API key set. Run "webhook-proxy login <api-key>" to authenticate.'));
  }
}