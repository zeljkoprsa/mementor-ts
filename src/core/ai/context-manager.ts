import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { simpleGit } from 'simple-git';
import { AISessionContext, AISessionConfig, Decision, CodeChange, TaskProgress } from './types';

/**
 * Manages AI session context tracking and documentation.
 * This class is responsible for maintaining the state of AI-assisted development sessions,
 * including decisions, code changes, and context updates.
 */
export class AIContextManager {
  private currentSession: AISessionContext | null = null;
  private config: AISessionConfig;
  private git = simpleGit();
  private gitEnabled = false;

  private async initGit(): Promise<void> {
    try {
      const isRepo = await this.git.checkIsRepo();
      this.gitEnabled = isRepo;
    } catch {
      this.gitEnabled = false;
    }
  }
  private sessionFile: string;

  /**
   * Get the current session context
   */
  getCurrentSession(): AISessionContext | null {
    return this.currentSession;
  }

  /**
   * Set the current objective for the session
   */
  async setObjective(objective: string): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }
    this.currentSession.conversationState.currentObjective = objective;
    await this.updateActiveContext();
  }

  /**
   * End the current session and archive it
   */
  async endSession(archive: boolean = true): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.timestamp.end = new Date().toISOString();
    if (archive) {
      await this.archiveSession();
    }
    this.currentSession = null;
    await this.saveCurrentSessionRef();

    // Clear the active context
    const contextPath = path.join(this.config.contextDirectory, 'active_context.md');
    await fs.writeFile(contextPath, '', 'utf-8');
  }

  /**
   * Generate a summary of the current session
   */
  async generateSessionSummary(): Promise<string> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const summary = [
      '# AI Session Summary',
      `
Session ID: ${this.currentSession.sessionId}`,
      `Duration: ${this.getSessionDuration()}`,
      `
## Objective`,
      this.currentSession.conversationState.currentObjective,
      `
## Accomplishments`,
      ...this.currentSession.conversationState.taskProgress
        .filter(task => task.status === 'completed')
        .map(task => `- ${task.description}`),
      `
## Code Changes`,
      ...this.currentSession.conversationState.codeChanges.map(
        change => `- ${change.type}: ${change.file}\n  ${change.description}`,
      ),
      `
## Key Decisions`,
      ...this.currentSession.conversationState.decisions.map(
        decision => `- ${decision.decision}\n  Rationale: ${decision.rationale}`,
      ),
    ].join('\n');

    const summaryPath = path.join(
      this.config.sessionsDirectory,
      `summary_${this.currentSession.sessionId}.md`,
    );
    await fs.writeFile(summaryPath, summary, 'utf-8');
    return summary;
  }

  /**
   * Archive the current session
   */
  private async archiveSession(): Promise<void> {
    if (!this.currentSession) return;

    const sessionPath = path.join(
      this.config.sessionsDirectory,
      new Date().getFullYear().toString(),
      (new Date().getMonth() + 1).toString().padStart(2, '0'),
      `session_${this.currentSession.sessionId}.json`,
    );

    await fs.mkdir(path.dirname(sessionPath), { recursive: true });
    await fs.writeFile(sessionPath, JSON.stringify(this.currentSession, null, 2), 'utf-8');
  }

  /**
   * Calculate the duration of the current session
   */
  /**
   * List all available sessions
   */
  async listSessions(): Promise<
    Array<{
      id: string;
      startTime: string;
      endTime?: string;
      objective: string;
    }>
  > {
    const sessions: Array<{
      id: string;
      startTime: string;
      endTime?: string;
      objective: string;
    }> = [];

    // Recursively find all session files
    const findSessions = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await findSessions(fullPath);
        } else if (entry.name.startsWith('session_') && entry.name.endsWith('.json')) {
          const content = await fs.readFile(fullPath, 'utf-8');
          const session = JSON.parse(content);
          sessions.push({
            id: session.sessionId,
            startTime: session.timestamp.start,
            endTime: session.timestamp.end,
            objective: session.conversationState.currentObjective,
          });
        }
      }
    };

    await findSessions(this.config.sessionsDirectory);
    return sessions.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );
  }

  /**
   * Restore a specific session
   */
  async restoreSession(sessionId: string): Promise<void> {
    // Find the session file
    const sessionFile = await this.findSessionFile(sessionId);
    if (!sessionFile) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Read and parse the session
    const content = await fs.readFile(sessionFile, 'utf-8');
    const session = JSON.parse(content) as AISessionContext;

    // Update timestamps
    const now = new Date().toISOString();
    session.timestamp.lastActive = now;
    delete session.timestamp.end; // Remove end timestamp as we're continuing

    // Set as current session
    this.currentSession = session;
    await this.updateActiveContext();
    await this.saveCurrentSessionRef();
  }

  /**
   * Find a session file by ID
   */
  private async findSessionFile(sessionId: string): Promise<string | null> {
    const findInDir = async (dir: string): Promise<string | null> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const found = await findInDir(fullPath);
          if (found) return found;
        } else if (entry.name === `session_${sessionId}.json`) {
          return fullPath;
        }
      }

      return null;
    };

    return findInDir(this.config.sessionsDirectory);
  }

  /**
   * Try to restore the last active session
   */
  private async tryRestoreSession(): Promise<void> {
    try {
      if (
        await fs
          .access(this.sessionFile)
          .then(() => true)
          .catch(() => false)
      ) {
        const sessionId = await fs.readFile(this.sessionFile, 'utf-8');
        await this.restoreSession(sessionId);
      }
    } catch (error) {
      // Failed to restore session, will start fresh
      console.warn('Failed to restore previous session:', error);
    }
  }

  /**
   * Save reference to current session
   */
  private async saveCurrentSessionRef(): Promise<void> {
    if (!this.currentSession) {
      await fs.unlink(this.sessionFile).catch(() => {}); // Remove if exists
      return;
    }

    await fs.mkdir(path.dirname(this.sessionFile), { recursive: true });
    await fs.writeFile(this.sessionFile, this.currentSession.sessionId, 'utf-8');
  }

  /**
   * Archive old sessions to a compressed format
   */
  async archiveOldSessions(options: {
    olderThan: number; // days
    compress?: boolean;
  }): Promise<{
    archivedCount: number;
    totalSize: number;
    compressedSize: number;
  }> {
    const sessions = await this.listSessions();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.olderThan);

    let archivedCount = 0;
    let totalSize = 0;
    let compressedSize = 0;

    // Create archive directory
    const archiveDir = path.join(this.config.sessionsDirectory, 'archive');
    await fs.mkdir(archiveDir, { recursive: true });

    // Archive each old session
    for (const session of sessions) {
      const sessionDate = new Date(session.endTime || session.startTime);
      if (sessionDate < cutoffDate && session.endTime) {
        // Only archive ended sessions
        const sessionFile = await this.findSessionFile(session.id);
        if (!sessionFile) continue;

        // Read session data
        const content = await fs.readFile(sessionFile, 'utf-8');
        totalSize += content.length;

        // Create year/month structure in archive
        const date = new Date(session.startTime);
        const archivePath = path.join(
          archiveDir,
          date.getFullYear().toString(),
          (date.getMonth() + 1).toString().padStart(2, '0'),
        );
        await fs.mkdir(archivePath, { recursive: true });

        if (options.compress) {
          // Compress and store
          const zlib = await import('zlib');
          const compressed = zlib.gzipSync(content);
          compressedSize += compressed.length;
          await fs.writeFile(path.join(archivePath, `session_${session.id}.json.gz`), compressed);
        } else {
          // Just move to archive
          await fs.copyFile(sessionFile, path.join(archivePath, `session_${session.id}.json`));
          compressedSize = totalSize;
        }

        // Remove original file
        await fs.unlink(sessionFile);
        archivedCount++;
      }
    }

    return { archivedCount, totalSize, compressedSize };
  }

  /**
   * Clean up old sessions
   */
  async cleanupSessions(options: {
    olderThan: number; // days
    archiveFirst?: boolean;
    onlyEnded?: boolean;
  }): Promise<{
    deletedCount: number;
    archivedCount: number;
    freedSpace: number;
  }> {
    const sessions = await this.listSessions();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.olderThan);

    let deletedCount = 0;
    let archivedCount = 0;
    let freedSpace = 0;

    for (const session of sessions) {
      const sessionDate = new Date(session.endTime || session.startTime);
      if (sessionDate < cutoffDate && (!options.onlyEnded || session.endTime)) {
        const sessionFile = await this.findSessionFile(session.id);
        if (!sessionFile) continue;

        // Get file size before deletion
        const stats = await fs.stat(sessionFile);
        freedSpace += stats.size;

        if (options.archiveFirst) {
          // Archive the session first
          const { archivedCount: archived } = await this.archiveOldSessions({
            olderThan: 0, // Archive immediately
            compress: true,
          });
          archivedCount += archived;
        }

        // Delete the session file
        await fs.unlink(sessionFile);
        deletedCount++;

        // Also delete any associated summary files
        const summaryFile = path.join(path.dirname(sessionFile), `summary_${session.id}.md`);
        await fs.unlink(summaryFile).catch(() => {});
      }
    }

    return { deletedCount, archivedCount, freedSpace };
  }

  private getSessionDuration(): string {
    if (!this.currentSession) return '0 minutes';

    const start = new Date(this.currentSession.timestamp.start);
    const end = this.currentSession.timestamp.end
      ? new Date(this.currentSession.timestamp.end)
      : new Date();

    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hours ${remainingMinutes} minutes`;
  }

  constructor(config: AISessionConfig) {
    this.config = config;
    this.sessionFile = path.join(config.contextDirectory, '.current-session');
    this.currentSession = this.initializeSession();

    // Initialize git and try to restore existing session
    this.initGit().then(() => this.tryRestoreSession());
  }

  /**
   * Initializes a new AI session with default values
   */
  private initializeSession(): AISessionContext {
    const timestamp = new Date().toISOString();
    return {
      sessionId: uuidv4(),
      timestamp: {
        start: timestamp,
        lastActive: timestamp,
      },
      conversationState: {
        currentObjective: '',
        taskProgress: [],
        decisions: [],
        codeChanges: [],
      },
      projectState: {
        activeFiles: [],
        modifiedFiles: [],
        environmentContext: {},
        gitContext: {
          branch: '',
          lastCommit: '',
          uncommittedChanges: [],
        },
      },
      aiContext: {
        preferences: {
          codeStyle: {
            formatting: [],
            conventions: [],
            documentation: [],
          },
          projectRules: [],
          constraints: [],
        },
        memories: [],
        previousSessions: [],
      },
    };
  }

  /**
   * Records a decision made during the AI session
   */
  async trackDecision(decision: Decision): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }
    this.currentSession.conversationState.decisions.push(decision);
    await this.updateActiveContext();

    if (this.config.autoSnapshot) {
      await this.createSnapshot('decision');
    }
  }

  /**
   * Records a code change made during the AI session
   */
  async trackCodeChange(change: CodeChange): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }
    this.currentSession.conversationState.codeChanges.push(change);
    await this.updateActiveContext();

    if (this.config.autoSnapshot) {
      await this.createSnapshot('code-change');
    }
  }

  /**
   * Updates the task progress in the current session
   */
  async updateTaskProgress(task: TaskProgress): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const existingTaskIndex = this.currentSession.conversationState.taskProgress.findIndex(
      t => t.description === task.description,
    );

    if (existingTaskIndex >= 0) {
      this.currentSession.conversationState.taskProgress[existingTaskIndex] = task;
    } else {
      this.currentSession.conversationState.taskProgress.push(task);
    }

    await this.updateActiveContext();
  }

  /**
   * Updates the active context file with the current session state
   */
  private async getGitContext(): Promise<{
    branch: string;
    lastCommit: string;
    uncommittedChanges: string[];
  }> {
    if (!this.gitEnabled) {
      return {
        branch: '',
        lastCommit: '',
        uncommittedChanges: [],
      };
    }

    try {
      const [branch, status, lastCommit] = await Promise.all([
        this.git.branch(),
        this.git.status(),
        this.git.log({ maxCount: 1 }),
      ]);

      return {
        branch: branch.current || '',
        lastCommit: lastCommit.latest?.hash || '',
        uncommittedChanges: [
          ...status.modified,
          ...status.created,
          ...status.deleted,
          ...status.renamed.map(r => r.to),
        ],
      };
    } catch (error) {
      console.error('Failed to get git context:', error);
      return {
        branch: '',
        lastCommit: '',
        uncommittedChanges: [],
      };
    }
  }

  private async getActiveFiles(): Promise<string[]> {
    if (!this.currentSession) return [];

    const activeFiles = new Set<string>();

    // Add files from code changes
    this.currentSession.conversationState.codeChanges.forEach(change => {
      if (change.file) activeFiles.add(change.file);
    });

    // Add files from git context if available
    if (this.gitEnabled) {
      const { uncommittedChanges } = await this.getGitContext();
      uncommittedChanges.forEach(file => activeFiles.add(file));
    }

    return Array.from(activeFiles);
  }

  private async updateActiveContext(): Promise<void> {
    const contextPath = path.join(this.config.contextDirectory, 'active_context.md');
    const content = await this.formatContextMarkdown();
    await fs.writeFile(contextPath, content, 'utf-8');
  }

  /**
   * Creates a new snapshot of the current context
   */
  private async createSnapshot(_trigger: 'decision' | 'code-change' | 'manual'): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const snapshotPath = path.join(
      this.config.contextDirectory,
      'snapshots',
      new Date().getFullYear().toString(),
      (new Date().getMonth() + 1).toString().padStart(2, '0'),
      new Date().getDate().toString().padStart(2, '0'),
      `snapshot_${timestamp}.md`,
    );

    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
    const content = await this.formatContextMarkdown();
    await fs.writeFile(snapshotPath, content, 'utf-8');
  }

  /**
   * Formats the current session context as markdown
   */
  private async formatContextMarkdown(): Promise<string> {
    if (!this.currentSession) return '';

    // Get latest git and file context
    const [gitContext, activeFiles] = await Promise.all([
      this.getGitContext(),
      this.getActiveFiles(),
    ]);

    // Update session state
    this.currentSession.projectState.gitContext = gitContext;
    this.currentSession.projectState.activeFiles = activeFiles;
    this.currentSession.projectState.modifiedFiles = gitContext.uncommittedChanges;

    const session = this.currentSession;
    const duration = this.getSessionDuration();

    return `# AI Session Context
Session ID: ${session.sessionId}
Started: ${session.timestamp.start}
Last Active: ${session.timestamp.lastActive}
Duration: ${duration}

## Current Objective
${session.conversationState.currentObjective || '(No objective set)'}

## Task Progress
${
  session.conversationState.taskProgress.length > 0
    ? session.conversationState.taskProgress
        .map(
          task => `- [${task.status === 'completed' ? 'x' : ' '}] ${task.description}
    Status: ${task.status}
    ${task.blockers ? `Blockers: ${task.blockers.join(', ')}` : ''}`,
        )
        .join('\n')
    : '(No tasks recorded)'
}

## Recent Decisions
${
  session.conversationState.decisions.length > 0
    ? session.conversationState.decisions
        .map(
          decision => `### ${decision.timestamp}
- Context: ${decision.context}
- Decision: ${decision.decision}
- Rationale: ${decision.rationale}`,
        )
        .join('\n\n')
    : '(No decisions recorded)'
}

## Code Changes
${
  session.conversationState.codeChanges.length > 0
    ? session.conversationState.codeChanges
        .map(
          change => `- ${change.type}: ${change.file}
  Description: ${change.description}
  ${change.relatedDecision ? `Related Decision: ${change.relatedDecision}` : ''}`,
        )
        .join('\n')
    : '(No code changes recorded)'
}

## Project State
Active Files:
${activeFiles.length > 0 ? activeFiles.map(file => `- ${file}`).join('\n') : '(No active files)'}

Modified Files:
${
  gitContext.uncommittedChanges.length > 0
    ? gitContext.uncommittedChanges.map(file => `- ${file}`).join('\n')
    : '(No modified files)'
}

Git Context:
- Branch: ${gitContext.branch || '(not in a git repository)'}
- Last Commit: ${gitContext.lastCommit || '(no commits)'}
${
  gitContext.uncommittedChanges.length > 0
    ? '\nUncommitted Changes:\n' +
      gitContext.uncommittedChanges.map(change => `- ${change}`).join('\n')
    : ''
}

## AI Context
### Preferences
Code Style:
${session.aiContext.preferences.codeStyle.formatting.map(rule => `- ${rule}`).join('\n')}

Project Rules:
${session.aiContext.preferences.projectRules.map(rule => `- ${rule}`).join('\n')}

Constraints:
${session.aiContext.preferences.constraints.map(constraint => `- ${constraint}`).join('\n')}

### Previous Sessions
${session.aiContext.previousSessions.map(sessionId => `- ${sessionId}`).join('\n')}
`;
  }
}
