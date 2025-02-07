import * as chokidar from 'chokidar';
import { ProjectConfig } from '../types';
import { generateSnapshot } from './snapshot';
import { updateDocumentation } from './documentation';
import path from 'path';

interface FileHandler {
  (filepath: string): Promise<void>;
}

export class ProjectWatcher {
  private watcher: chokidar.FSWatcher;
  private config: ProjectConfig;
  private readonly watchPatterns = [
    '**/*.{ts,tsx,js,jsx}',
    'docs/context/*.md'
  ];
  private readonly ignoredPatterns = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**'
  ];

  constructor(config: ProjectConfig) {
    this.config = config;
    this.watcher = chokidar.watch(this.watchPatterns, {
      ignored: this.ignoredPatterns,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    this.setupWatchers();
  }

  private handleFileChange: FileHandler = async (filepath: string): Promise<void> => {
    console.log(`File ${filepath} has been changed`);
    
    try {
      const snapshot = await generateSnapshot(this.config);
      await updateDocumentation(filepath, snapshot, this.config);
      
      if (this.config.git.enabled && this.config.git.autoCommit) {
        // Git operations will be handled by git.ts
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error handling file change:', error.message);
      } else {
        console.error('Unknown error handling file change');
      }
    }
  };

  private handleFileAdd: FileHandler = async (filepath: string): Promise<void> => {
    console.log(`File ${filepath} has been added`);
    await this.handleFileChange(filepath);
  };

  private handleFileDelete: FileHandler = async (filepath: string): Promise<void> => {
    console.log(`File ${filepath} has been removed`);
    try {
      const snapshot = await generateSnapshot(this.config);
      await updateDocumentation(filepath, snapshot, this.config);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error handling file deletion:', error.message);
      } else {
        console.error('Unknown error handling file deletion');
      }
    }
  };

  private setupWatchers(): void {
    this.watcher
      .on('change', this.handleFileChange)
      .on('add', this.handleFileAdd)
      .on('unlink', this.handleFileDelete)
      .on('error', (error: unknown) => {
        if (error instanceof Error) {
          console.error('Watcher error:', error.message);
        } else {
          console.error('Unknown watcher error:', error);
        }
      });
  }

  public async start(): Promise<void> {
    console.log('Starting project watcher...');
    try {
      // Wait for initial scan to complete
      await new Promise<void>((resolve) => {
        this.watcher.on('ready', () => {
          console.log('Watcher ready, monitoring for changes...');
          resolve();
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to start watcher:', error.message);
      }
      throw error;
    }
  }

  public async stop(): Promise<void> {
    console.log('Stopping project watcher...');
    try {
      await this.watcher.close();
      console.log('Watcher stopped successfully');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to stop watcher:', error.message);
      }
      throw error;
    }
  }
}
