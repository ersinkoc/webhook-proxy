import { homedir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

export interface Config {
  apiKey?: string;
  apiUrl?: string;
}

const configDir = join(homedir(), '.webhook-proxy');
const configPath = join(configDir, 'config.json');

// Ensure config directory exists
if (!existsSync(configDir)) {
  mkdirSync(configDir, { recursive: true });
}

export function loadConfig(): Config {
  try {
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Ignore errors
  }
  
  return {
    apiUrl: process.env.WEBHOOK_PROXY_API_URL || 'http://localhost:3001',
  };
}

export function saveConfig(config: Config): void {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function getApiKey(): string | undefined {
  const config = loadConfig();
  return config.apiKey || process.env.WEBHOOK_PROXY_API_KEY;
}

export function getApiUrl(): string {
  const config = loadConfig();
  return config.apiUrl || 'http://localhost:3001';
}