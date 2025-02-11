import * as chokidar from 'chokidar';
import { ProjectConfig } from '../types';
import { generateSnapshot } from './snapshot';
import { updateDocumentation } from './documentation';

/**
 * Function type for handling file changes.
 * @callback FileHandler
 * @param {string} filepath - Path to the changed file
 * @returns {Promise<void>}
 */
interface FileHandler {
  (filepath: string): Promise<void>;
}

/**
 * Watches project files for changes and triggers documentation updates.
 * @class ProjectWatcher
 * @property {chokidar.FSWatcher} watcher - The file system watcher instance
 * @property {ProjectConfig} config - Project configuration
 * @property {string[]} watchPatterns - Glob patterns for files to watch
 * @property {string[]} ignoredPatterns - Glob patterns for files to ignore
 */
export class ProjectWatcher {
  private watcher: chokidar.FSWatcher;
  private config: ProjectConfig;
  private readonly watchPatterns = ['**/*.{ts,tsx,js,jsx}', 'docs/context/*.md'];
  private readonly ignoredPatterns = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
  ];

  /**
   * Creates a new ProjectWatcher instance.
   * @param {ProjectConfig} config - Project configuration
   */
  constructor(config: ProjectConfig) {
    this.config = config;
    this.watcher = chokidar.watch(this.watchPatterns, {
      ignored: this.ignoredPatterns,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    this.setupWatchers();
  }

  /**
   * Handles file changes by generating a new snapshot and updating documentation.
   * @private
   * @param {string} filepath - Path to the changed file
   * @returns {Promise<void>}
   * @throws {Error} When file change handling fails
   */
  private handleFileChange: FileHandler = async (filepath: string): Promise<void> => {
    console.warn(`File ${filepath} has been changed`);

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
    console.warn(`File ${filepath} has been added`);
    await this.handleFileChange(filepath);
  };

  private handleFileDelete: FileHandler = async (filepath: string): Promise<void> => {
    console.warn(`File ${filepath} has been removed`);
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

  /**
   * Sets up file system watchers with event handlers.
   * @private
   */
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
    console.warn('Starting project watcher...');
    try {
      // Wait for initial scan to complete
      await new Promise<void>(resolve => {
        this.watcher.on('ready', () => {
          console.warn('Watcher ready, monitoring for changes...');
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
    console.warn('Stopping project watcher...');
    try {
      await this.watcher.close();
      console.warn('Watcher stopped successfully');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to stop watcher:', error.message);
      }
      throw error;
    }
  }
}
