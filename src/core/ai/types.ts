/**
 * Types for AI session context tracking in Mementor.
 * These types define the structure for tracking AI-assisted development sessions.
 */

/**
 * Represents the state and progress of a task within an AI session
 */
export interface TaskProgress {
  description: string;
  status: 'completed' | 'in-progress' | 'blocked';
  blockers?: string[];
  startTime: string;
  completedTime?: string;
}

/**
 * Represents a decision made during an AI session
 */
export interface Decision {
  context: string;
  decision: string;
  rationale: string;
  timestamp: string;
  impact: {
    files?: string[];
    components?: string[];
    documentation?: string[];
  };
}

/**
 * Represents a code change made during an AI session
 */
export interface CodeChange {
  file: string;
  type: 'create' | 'modify' | 'delete';
  description: string;
  relatedDecision?: string;
  timestamp: string;
  diff?: string;
}

/**
 * Represents user preferences and constraints for AI interactions
 */
export interface AIPreferences {
  codeStyle: {
    formatting: string[];
    conventions: string[];
    documentation: string[];
  };
  projectRules: string[];
  constraints: string[];
}

/**
 * Represents the complete context of an AI development session
 */
export interface SessionMetadata {
  duration: string;
  commitCount: number;
  fileChanges: {
    added: string[];
    modified: string[];
    deleted: string[];
  };
}

export interface AISessionContext {
  sessionId: string;
  timestamp: {
    start: string;
    lastActive: string;
    end?: string;
  };
  conversationState: {
    currentObjective: string;
    taskProgress: TaskProgress[];
    decisions: Decision[];
    codeChanges: CodeChange[];
  };
  projectState: {
    activeFiles: string[];
    modifiedFiles: string[];
    environmentContext: Record<string, string>;
    gitContext: {
      branch: string;
      lastCommit: string;
      uncommittedChanges: string[];
    };
  };
  aiContext: {
    preferences: AIPreferences;
    memories: string[];
    previousSessions: string[];
  };
}

/**
 * Configuration for AI session tracking
 */
export interface AISessionConfig {
  enabled: boolean;
  trackingLevel: 'minimal' | 'standard' | 'detailed';
  autoSnapshot: boolean;
  snapshotInterval?: number;
  gitIntegration: boolean;
  contextDirectory: string;
  sessionsDirectory: string;
}
