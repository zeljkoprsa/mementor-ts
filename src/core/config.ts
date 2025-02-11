import fs from 'fs/promises';
import path from 'path';

export interface MementorConfig {
  docsDir: string;
  templatesDir: string;
  gitIntegration: boolean;
}

const defaultConfig: MementorConfig = {
  docsDir: 'docs',
  templatesDir: 'docs/templates',
  gitIntegration: true,
};

/**
 * Load mementor configuration from the current directory
 */
export async function getConfig(): Promise<MementorConfig> {
  try {
    const configPath = path.join(process.cwd(), 'mementor.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return { ...defaultConfig, ...JSON.parse(content) };
  } catch {
    // If config file doesn't exist, return default config
    return defaultConfig;
  }
}
