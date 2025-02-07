import Mustache from 'mustache';
import fs from 'fs/promises';
import path from 'path';

export interface HealthMetrics {
  last_updated: string;
  word_count: number;
  reading_time: number;
  has_todos: boolean;
  todo_count: number;
  linked_files: string[];
  broken_links: string[];
  completion_percentage: number;
  section_count: number;
  section_depth: number;
  code_blocks: number;
  avg_section_length: number;
  readability_score: number;
  last_snapshot_delta: number;
}

export interface DocumentationMetadata {
  version: string;
  created_at: string;
  updated_at: string;
  dependencies: Array<{ name: string; version: string }>;
  health_metrics?: HealthMetrics;
  tags: string[];
}

export interface TemplateData {
  project_name?: string;
  decision_date?: string;
  decisions?: string[];
  next_steps?: Array<{
    description: string;
    completed: boolean;
  }>;
  focus_areas?: string[];
  issues?: string[];
  env_items?: string[];
  title?: string;
  description?: string;
  changes?: string[];
  state_items?: Array<{
    category: string;
    items: Array<{
      description: string;
      completed: boolean;
    }>;
  }>;
  dependencies?: Array<{
    name: string;
    version: string;
  }>;
  metadata?: DocumentationMetadata;
  health_metrics?: HealthMetrics;
  next_actions?: string[];
  health_metrics_display?: {
    last_updated: string;
    word_count: number;
    reading_time: number;
    todo_count: number;
    completion_percentage: number;
    section_count: number;
    code_blocks: number;
  };
}

export class TemplateRenderer {
  private templateDir: string;

  constructor() {
    this.templateDir = path.join(__dirname, '../templates/mustache');
  }

  private generateMetadataHeader(metadata: DocumentationMetadata): string {
    const header = [
      '=== MEMENTOR SNAPSHOT ===',
      `Version: ${metadata.version}`,
      `Created: ${metadata.created_at}`,
      `Updated: ${metadata.updated_at}`,
      '',
      'Dependencies:'
    ];

    metadata.dependencies.forEach(dep => {
      header.push(`- ${dep.name}: ${dep.version}`);
    });

    if (metadata.health_metrics) {
      const m = metadata.health_metrics;
      header.push('',
        'Health Metrics:',
        `- Word Count: ${m.word_count}`,
        `- Reading Time: ${m.reading_time} minutes`,
        `- TODOs: ${m.todo_count}`,
        `- Completion: ${m.completion_percentage}%`,
        `- Sections: ${m.section_count}`,
        `- Code Blocks: ${m.code_blocks}`,
        `- Days Since Last Snapshot: ${m.last_snapshot_delta}`
      );
    }

    if (metadata.tags.length > 0) {
      header.push('', 'Tags:', ...metadata.tags.map(tag => `- ${tag}`));
    }

    return header.join('\n');
  }

  async createSnapshot(templateName: string, data: TemplateData): Promise<string> {
    const content = await this.renderTemplate(templateName, data);
    
    if (data.metadata) {
      const header = this.generateMetadataHeader(data.metadata);
      return `${header}\n\n---\n\n${content}`;
    }
    
    return content;
  }

  async renderTemplate(templateName: string, data: TemplateData): Promise<string> {
    try {
      const templatePath = path.join(this.templateDir, `${templateName}.mustache`);
      const template = await fs.readFile(templatePath, 'utf-8');
      
      // Add default values
      const defaultData = {
        decision_date: new Date().toISOString().split('T')[0],
        health_metrics: {
          last_updated: new Date().toISOString(),
          word_count: 0,
          reading_time: 0,
          todo_count: 0,
          completion_percentage: 0,
          section_count: 0,
          code_blocks: 0
        }
      };

      // Merge default data with provided data
      const mergedData = { ...defaultData, ...data };

      return Mustache.render(template, mergedData);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to render template ${templateName}: ${error.message}`);
      }
      throw error;
    }
  }

  async listTemplates(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.templateDir);
      return files
        .filter(file => file.endsWith('.mustache'))
        .map(file => file.replace('.mustache', ''));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to list templates: ${error.message}`);
      }
      throw error;
    }
  }
}
