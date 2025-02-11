/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import { AIContextManager } from '../core/ai/context-manager';
import { AISessionConfig } from '../core/ai/types';
import { getConfig } from '../core/config';
import path from 'path';

/**
 * Default AI session configuration
 */
const defaultAIConfig: AISessionConfig = {
  enabled: true,
  trackingLevel: 'standard',
  autoSnapshot: true,
  snapshotInterval: 300000, // 5 minutes
  gitIntegration: true,
  contextDirectory: 'docs/context',
  sessionsDirectory: 'docs/context/ai_sessions',
};

/**
 * Creates and configures the AI command group
 */
export function createAICommand(): Command {
  const ai = new Command('ai');
  ai.description('Manage AI development sessions');

  // List available sessions
  ai.command('list')
    .description('List available AI development sessions')
    .option('-d, --directory <directory>', 'Custom context directory')
    .option('-l, --limit <limit>', 'Limit number of sessions shown', '10')
    .action(async options => {
      try {
        const config = await getConfig();
        const aiConfig: AISessionConfig = {
          ...defaultAIConfig,
          contextDirectory: options.directory || path.join(config.docsDir, 'context'),
          sessionsDirectory: options.directory
            ? path.join(options.directory, 'ai_sessions')
            : path.join(config.docsDir, 'context/ai_sessions'),
        };

        const manager = new AIContextManager(aiConfig);
        const sessions = await manager.listSessions();
        const limit = parseInt(options.limit);

        console.log(chalk.bold('\nAvailable AI Sessions'));
        console.log('─'.repeat(30));

        sessions.slice(0, limit).forEach(session => {
          const status = session.endTime ? chalk.yellow('Ended') : chalk.green('Active');
          console.log(
            `\n${chalk.cyan(session.id)}\n` +
              `${chalk.dim('Started:')} ${new Date(session.startTime).toLocaleString()}\n` +
              `${chalk.dim('Status:')} ${status}\n` +
              `${chalk.dim('Objective:')} ${session.objective || '(No objective set)'}`,
          );
        });

        if (sessions.length > limit) {
          console.log(chalk.dim(`\n...and ${sessions.length - limit} more sessions`));
        }
      } catch (error) {
        console.error(chalk.red('Failed to list sessions:'), error);
        process.exit(1);
      }
    });

  // Restore a previous session
  ai.command('restore')
    .description('Restore a previous AI development session')
    .argument(
      '[sessionId]',
      'ID of the session to restore (optional, uses most recent if not specified)',
    )
    .option('-d, --directory <directory>', 'Custom context directory')
    .action(async (sessionId, options) => {
      try {
        const config = await getConfig();
        const aiConfig: AISessionConfig = {
          ...defaultAIConfig,
          contextDirectory: options.directory || path.join(config.docsDir, 'context'),
          sessionsDirectory: options.directory
            ? path.join(options.directory, 'ai_sessions')
            : path.join(config.docsDir, 'context/ai_sessions'),
        };

        const manager = new AIContextManager(aiConfig);

        if (!sessionId) {
          // If no session ID provided, get the most recent session
          const sessions = await manager.listSessions();
          if (sessions.length === 0) {
            console.log(chalk.yellow('No previous sessions found.'));
            return;
          }
          sessionId = sessions[0].id;
        }

        await manager.restoreSession(sessionId);
        const session = manager.getCurrentSession();

        if (!session) {
          console.error(chalk.red('Failed to restore session'));
          process.exit(1);
        }

        console.log(chalk.green('✨ Restored AI development session'));
        console.log(chalk.dim('Session ID:'), session.sessionId);
        console.log(chalk.dim('Started:'), new Date(session.timestamp.start).toLocaleString());
        console.log(
          chalk.dim('Objective:'),
          session.conversationState.currentObjective || '(No objective set)',
        );
      } catch (error) {
        console.error(chalk.red('Failed to restore session:'), error);
        process.exit(1);
      }
    });

  // Start a new AI session
  ai.command('start')
    .description('Start a new AI development session')
    .option('-o, --objective <objective>', 'Set the initial objective for the session')
    .option('-d, --directory <directory>', 'Set custom context directory')
    .action(async options => {
      try {
        const config = await getConfig();
        const aiConfig: AISessionConfig = {
          ...defaultAIConfig,
          contextDirectory: options.directory || path.join(config.docsDir, 'context'),
          sessionsDirectory: options.directory
            ? path.join(options.directory, 'ai_sessions')
            : path.join(config.docsDir, 'context/ai_sessions'),
        };

        const manager = new AIContextManager(aiConfig);
        const session = manager.getCurrentSession();

        if (!session) {
          console.error(chalk.red('Failed to create session'));
          process.exit(1);
        }

        if (options.objective) {
          await manager.setObjective(options.objective);
        }

        console.log(chalk.green('✨ Started new AI development session'));
        console.log(chalk.dim('Session ID:'), session.sessionId);
        console.log(chalk.dim('Context Directory:'), aiConfig.contextDirectory);
        if (options.objective) {
          console.log(chalk.dim('Initial Objective:'), options.objective);
        }
      } catch (error) {
        console.error(chalk.red('Failed to start AI session:'), error);
        process.exit(1);
      }
    });

  // Show current session status
  ai.command('status')
    .description('Show the status of the current AI development session')
    .option('-d, --directory <directory>', 'Custom context directory')
    .action(async options => {
      try {
        const config = await getConfig();
        const aiConfig: AISessionConfig = {
          ...defaultAIConfig,
          contextDirectory: options.directory || path.join(config.docsDir, 'context'),
        };

        const manager = new AIContextManager(aiConfig);
        const session = manager.getCurrentSession();

        if (!session) {
          console.log(chalk.yellow('No active AI session found.'));
          console.log(chalk.dim('Start a new session with:'), chalk.cyan('mementor ai start'));
          return;
        }

        console.log(chalk.bold('\nCurrent AI Session Status'));
        console.log('─'.repeat(30));
        console.log(chalk.dim('Session ID:'), session.sessionId);
        console.log(chalk.dim('Started:'), new Date(session.timestamp.start).toLocaleString());
        console.log(
          chalk.dim('Last Active:'),
          new Date(session.timestamp.lastActive).toLocaleString(),
        );

        console.log('\n' + chalk.bold('Current Objective:'));
        console.log(session.conversationState.currentObjective || '(No objective set)');

        console.log('\n' + chalk.bold('Task Progress:'));
        session.conversationState.taskProgress.forEach(task => {
          const status =
            task.status === 'completed'
              ? chalk.green('✓')
              : task.status === 'blocked'
                ? chalk.red('⚠')
                : chalk.yellow('○');
          console.log(`${status} ${task.description}`);
        });

        console.log('\n' + chalk.bold('Recent Changes:'));
        const recentChanges = session.conversationState.codeChanges.slice(-5);
        if (recentChanges.length > 0) {
          recentChanges.forEach(change => {
            console.log(`- ${change.type}: ${change.file}`);
          });
        } else {
          console.log('No recent changes');
        }
      } catch (error) {
        console.error(chalk.red('Failed to get session status:'), error);
        process.exit(1);
      }
    });

  // Pause current session (archive without ending)
  ai.command('pause')
    .description('Pause the current AI development session without ending it')
    .option('-d, --directory <directory>', 'Custom context directory')
    .action(async options => {
      try {
        const config = await getConfig();
        const aiConfig: AISessionConfig = {
          ...defaultAIConfig,
          contextDirectory: options.directory || path.join(config.docsDir, 'context'),
        };

        const manager = new AIContextManager(aiConfig);
        await manager.endSession(false); // Don't archive, just pause

        console.log(chalk.green('✨ AI development session paused'));
        console.log(
          chalk.dim('You can restore this session later with:'),
          chalk.cyan('mementor ai restore'),
        );
      } catch (error) {
        console.error(chalk.red('Failed to pause session:'), error);
        process.exit(1);
      }
    });

  // End current session
  ai.command('end')
    .description('End the current AI development session')
    .option('-d, --directory <directory>', 'Custom context directory')
    .option('-s, --summary', 'Generate session summary', false)
    .action(async options => {
      try {
        const config = await getConfig();
        const aiConfig: AISessionConfig = {
          ...defaultAIConfig,
          contextDirectory: options.directory || path.join(config.docsDir, 'context'),
        };

        const manager = new AIContextManager(aiConfig);
        await manager.endSession();

        if (options.summary) {
          await manager.generateSessionSummary();
        }

        console.log(chalk.green('✨ AI development session ended'));
        console.log(chalk.dim('Session data saved to:'), aiConfig.sessionsDirectory);
      } catch (error) {
        console.error(chalk.red('Failed to end AI session:'), error);
        process.exit(1);
      }
    });

  // Add task to current session
  ai.command('task')
    .description('Add or update a task in the current session')
    .argument('<description>', 'Task description')
    .option('-s, --status <status>', 'Task status (completed, in-progress, blocked)', 'in-progress')
    .option('-b, --blockers <blockers...>', 'List of blockers (if status is blocked)')
    .option('-d, --directory <directory>', 'Custom context directory')
    .action(async (description, options) => {
      try {
        const config = await getConfig();
        const aiConfig: AISessionConfig = {
          ...defaultAIConfig,
          contextDirectory: options.directory || path.join(config.docsDir, 'context'),
        };

        const manager = new AIContextManager(aiConfig);
        await manager.updateTaskProgress({
          description,
          status: options.status,
          blockers: options.blockers,
          startTime: new Date().toISOString(),
          completedTime: options.status === 'completed' ? new Date().toISOString() : undefined,
        });

        console.log(chalk.green('✨ Task updated successfully'));
      } catch (error) {
        console.error(chalk.red('Failed to update task:'), error);
        process.exit(1);
      }
    });

  // Archive old sessions
  ai.command('archive')
    .description('Archive old AI development sessions')
    .option('-d, --directory <directory>', 'Custom context directory')
    .option('-o, --older-than <days>', 'Archive sessions older than X days', '30')
    .option('-c, --compress', 'Compress archived sessions using gzip', false)
    .option('-k, --keep-original', 'Keep original files after archiving', false)
    .action(async options => {
      try {
        const config = await getConfig();
        const aiConfig: AISessionConfig = {
          ...defaultAIConfig,
          contextDirectory: options.directory || path.join(config.docsDir, 'context'),
          sessionsDirectory: options.directory
            ? path.join(options.directory, 'ai_sessions')
            : path.join(config.docsDir, 'context/ai_sessions'),
        };

        const manager = new AIContextManager(aiConfig);
        const days = parseInt(options.olderThan);

        console.log(chalk.dim('Archiving sessions older than'), chalk.cyan(`${days} days`));

        const { archivedCount, totalSize, compressedSize } = await manager.archiveOldSessions({
          olderThan: days,
          compress: options.compress,
        });

        if (archivedCount === 0) {
          console.log(chalk.yellow('No sessions found to archive.'));
          return;
        }

        console.log(chalk.green(`\n✨ Archived ${archivedCount} sessions`));
        console.log(chalk.dim('Original size:'), formatBytes(totalSize));
        if (options.compress) {
          console.log(chalk.dim('Compressed size:'), formatBytes(compressedSize));
          console.log(
            chalk.dim('Compression ratio:'),
            `${Math.round((1 - compressedSize / totalSize) * 100)}%`,
          );
        }
      } catch (error) {
        console.error(chalk.red('Failed to archive sessions:'), error);
        process.exit(1);
      }
    });

  // Clean up old sessions
  ai.command('cleanup')
    .description('Clean up old AI development sessions')
    .option('-d, --directory <directory>', 'Custom context directory')
    .option('-o, --older-than <days>', 'Clean up sessions older than X days', '90')
    .option('-a, --archive', 'Archive sessions before deletion', false)
    .option('-e, --ended-only', 'Only clean up ended sessions', false)
    .option('-f, --force', 'Skip confirmation prompt', false)
    .action(async options => {
      try {
        const config = await getConfig();
        const aiConfig: AISessionConfig = {
          ...defaultAIConfig,
          contextDirectory: options.directory || path.join(config.docsDir, 'context'),
          sessionsDirectory: options.directory
            ? path.join(options.directory, 'ai_sessions')
            : path.join(config.docsDir, 'context/ai_sessions'),
        };

        const manager = new AIContextManager(aiConfig);
        const days = parseInt(options.olderThan);

        // Get session count before cleanup
        const sessions = await manager.listSessions();
        const eligibleSessions = sessions.filter(s => {
          const date = new Date(s.endTime || s.startTime);
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          return date < cutoff && (!options.endedOnly || s.endTime);
        });

        if (eligibleSessions.length === 0) {
          console.log(chalk.yellow('No sessions found to clean up.'));
          return;
        }

        // Show warning and confirmation
        console.log(chalk.yellow('\n⚠️  Warning: This will permanently delete sessions'));
        console.log(chalk.dim('Sessions to clean up:'), chalk.cyan(eligibleSessions.length));
        console.log(chalk.dim('Older than:'), chalk.cyan(`${days} days`));
        if (options.archive) {
          console.log(chalk.dim('Archive before deletion:'), chalk.green('Yes'));
        }
        if (options.endedOnly) {
          console.log(chalk.dim('Only ended sessions:'), chalk.green('Yes'));
        }

        if (!options.force) {
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const answer = await new Promise<string>(resolve => {
            rl.question(chalk.yellow('\nAre you sure you want to continue? [y/N] '), resolve);
          });
          rl.close();

          if (answer.toLowerCase() !== 'y') {
            console.log(chalk.dim('\nCleanup cancelled.'));
            return;
          }
        }

        const { deletedCount, archivedCount, freedSpace } = await manager.cleanupSessions({
          olderThan: days,
          archiveFirst: options.archive,
          onlyEnded: options.endedOnly,
        });

        console.log(chalk.green(`\n✨ Cleaned up ${deletedCount} sessions`));
        if (archivedCount > 0) {
          console.log(chalk.dim('Archived:'), chalk.cyan(`${archivedCount} sessions`));
        }
        console.log(chalk.dim('Freed space:'), formatBytes(freedSpace));
      } catch (error) {
        console.error(chalk.red('Failed to clean up sessions:'), error);
        process.exit(1);
      }
    });

  // Helper function to format bytes
  function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }

  return ai;
}
