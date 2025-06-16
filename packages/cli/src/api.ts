import axios, { AxiosInstance } from 'axios';
import { getApiKey, getApiUrl } from './config.js';
import chalk from 'chalk';

export function createApiClient(): AxiosInstance {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();

  if (!apiKey) {
    console.error(chalk.red('Error: No API key found. Please run "webhook-proxy login <api-key>" first.'));
    process.exit(1);
  }

  const client = axios.create({
    baseURL: apiUrl,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        console.error(chalk.red('Error: Invalid API key. Please check your credentials.'));
        process.exit(1);
      }
      throw error;
    }
  );

  return client;
}