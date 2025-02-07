export interface DocumentMeta {
  title: string;
  date: string;
  tags: string[];
  type: 'architecture' | 'development' | 'changelog' | 'readme';
  version?: string;
}

export interface DocumentContent {
  meta: DocumentMeta;
  content: string;
}

export interface ContextSnapshot {
  timestamp: string;
  changes: {
    file: string;
    type: 'added' | 'modified' | 'deleted';
    description: string;
  }[];
  documents: DocumentContent[];
}

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
