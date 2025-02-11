/**
 * Metadata for a documentation file.
 * @interface DocumentMeta
 * @property {string} title - The title of the document
 * @property {string} date - The creation or last modification date
 * @property {string[]} tags - List of tags categorizing the document
 * @property {'architecture' | 'development' | 'changelog' | 'readme'} type - The type of documentation
 * @property {string} [version] - Optional version number of the document
 */
export interface DocumentMeta {
  title: string;
  date: string;
  tags: string[];
  type: 'architecture' | 'development' | 'changelog' | 'readme';
  version?: string;
}

/**
 * Represents a complete documentation file with its metadata and content.
 * @interface DocumentContent
 * @property {DocumentMeta} meta - The document's metadata
 * @property {string} content - The actual content of the document
 */
export interface DocumentContent {
  meta: DocumentMeta;
  content: string;
}

/**
 * Represents a point-in-time snapshot of the project's documentation context.
 * @interface ContextSnapshot
 * @property {string} timestamp - When the snapshot was created
 * @property {Array<{file: string, type: 'added' | 'modified' | 'deleted', description: string}>} changes - List of changes in this snapshot
 * @property {DocumentContent[]} documents - Collection of documents included in this snapshot
 */
export interface ContextSnapshot {
  timestamp: string;
  changes: {
    file: string;
    type: 'added' | 'modified' | 'deleted';
    description: string;
  }[];
  documents: DocumentContent[];
}

/**
 * Configuration options for a Mementor project.
 * @interface ProjectConfig
 * @property {string} name - The name of the project
 * @property {string} version - Project version
 * @property {string} docsDir - Directory where documentation is stored
 * @property {string} templatesDir - Directory containing documentation templates
 * @property {Object} git - Git integration settings
 * @property {boolean} git.enabled - Whether git integration is enabled
 * @property {boolean} git.autoCommit - Whether to automatically commit documentation changes
 * @property {string} git.commitPrefix - Prefix for git commit messages
 * @property {Object} features - Feature toggles
 * @property {boolean} features.autoSnapshot - Whether to automatically create snapshots
 * @property {boolean} features.liveUpdate - Whether to update documentation in real-time
 * @property {boolean} features.gitHooks - Whether to use git hooks
 */
export interface ProjectConfig {
  name: string;
  version: string;
  docsDir: string;
  templatesDir: string;
  git: {
    enabled: boolean;
    autoCommit: boolean;
    commitPrefix: string;
  };
  features: {
    autoSnapshot: boolean;
    liveUpdate: boolean;
    gitHooks: boolean;
  };
}
