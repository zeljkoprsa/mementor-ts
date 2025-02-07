#!/usr/bin/env node

import { Command } from 'commander';
import { ProjectWatcher } from './core/watcher';
import { handleSnapshotCommand } from './commands/snapshot';
import { handleCleanupCommand } from './commands/cleanup';
import { handleCompareCommand } from './commands/compare';
import { initializeProject } from './core/init';
import { ProjectConfig } from './types';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .name('mementor')
  .description('AI-driven documentation management for TypeScript projects')
  .version('1.0.0');

async function loadOrCreateConfig(): Promise<ProjectConfig> {
  try {
    const configFile = await fs.readFile('mementor.json', 'utf-8');
    return JSON.parse(configFile);
  } catch {
    // Create default config
    return {
      name: path.basename(process.cwd()),
      version: '1.0.0',
      docsDir: 'docs/context',
      templatesDir: 'docs/templates',
      git: {
        enabled: true,
        autoCommit: true,
        commitPrefix: 'docs'
      },
      features: {
        autoSnapshot: true,
        liveUpdate: true,
        gitHooks: true
      }
    };
  }
}

program
  .command('init')
  .description('Initialize Mementor in the current project')
  .action(async () => {
    try {
      const config = await loadOrCreateConfig();

      // Create directories
      await fs.mkdir(config.docsDir, { recursive: true });
      await fs.mkdir(config.templatesDir, { recursive: true });

      // Save config
      await fs.writeFile(
        'mementor.json',
        JSON.stringify(config, null, 2)
      );

      // Initialize the project
      await initializeProject(config);

      console.log('✨ Mementor initialized successfully!');
    } catch (error) {
      console.error('Error initializing Mementor:', error);
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Watch for changes and update documentation')
  .action(async () => {
    try {
      const config = await loadOrCreateConfig();

      // Start watcher
      const watcher = new ProjectWatcher(config);
      await watcher.start();

      console.log('👀 Watching for changes...');
    } catch (error) {
      console.error('Error starting watcher:', error);
      process.exit(1);
    }
  });

program
  .command('snapshot')
  .description('Create a snapshot of the current documentation state')
  .action(async () => {
    try {
      const config = await loadOrCreateConfig();
      await handleSnapshotCommand(config);
      console.log('📸 Snapshot created successfully!');
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      process.exit(1);
    }
  });
program
  .command('cleanup')
  .description('Clean up and organize snapshot files into year/month/day structure')
  .action(async () => {
    try {
      const config = await loadOrCreateConfig();
      await handleCleanupCommand(config);
    } catch (error) {
      console.error('Failed to clean up snapshots:', error);
      process.exit(1);
    }
  });

program
  .command('compare')
  .description('Compare snapshots to see changes')
  .option('-d, --date <date>', 'Compare snapshots from a specific date (YYYY-MM-DD)')
  .option('-o, --old <snapshot>', 'Old snapshot filename')
  .option('-n, --new <snapshot>', 'New snapshot filename')
  .action(async (options) => {
    try {
      const config = await loadOrCreateConfig();
      await handleCompareCommand(
        config,
        options.date,
        options.old,
        options.new
      );
    } catch (error) {
      console.error('Failed to compare snapshots:', error);
      process.exit(1);
    }
  });

program.parse();
