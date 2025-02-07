import fs from 'fs/promises';
import path from 'path';
import { TemplateRenderer, TemplateData, DocumentationMetadata, HealthMetrics } from './templateRenderer';

export class SnapshotGenerator {
  private renderer: TemplateRenderer;

  constructor() {
    this.renderer = new TemplateRenderer();
  }

  private async calculateHealthMetrics(docPath: string): Promise<HealthMetrics> {
    const content = await fs.readFile(docPath, 'utf-8');
    const words = content.split(/\s+/).length;
    const sections = content.match(/^#{1,6}\s/gm)?.length || 0;
    const todos = content.match(/\[[\s\t]*\]/g)?.length || 0;
    const completedTodos = content.match(/\[x\]/gi)?.length || 0;
    const codeBlocks = content.match(/```[\s\S]*?```/g)?.length || 0;

    return {
      last_updated: new Date().toISOString(),
      word_count: words,
      reading_time: Math.ceil(words / 200), // Average reading speed
      has_todos: todos > 0,
      todo_count: todos,
      linked_files: [], // TODO: Implement link detection
      broken_links: [],
      completion_percentage: todos > 0 ? (completedTodos / todos) * 100 : 100,
      section_count: sections,
      section_depth: Math.max(...(content.match(/^(#{1,6})\s/gm)?.map(h => h.trim().length) || [0])),
      code_blocks: codeBlocks,
      avg_section_length: sections > 0 ? words / sections : words,
      readability_score: 0, // TODO: Implement readability calculation
      last_snapshot_delta: 0 // Will be calculated when creating snapshot
    };
  }

  private async getLastSnapshotDelta(snapshotsDir: string): Promise<number> {
    try {
      const files = await fs.readdir(snapshotsDir);
      if (files.length === 0) return 0;

      const snapshots = await Promise.all(
        files
          .filter(f => f.endsWith('.md'))
          .map(async f => {
            const stat = await fs.stat(path.join(snapshotsDir, f));
            return { name: f, mtime: stat.mtime };
          })
      );

      if (snapshots.length === 0) return 0;

      const latestSnapshot = snapshots.reduce((latest, current) => 
        current.mtime > latest.mtime ? current : latest
      );

      const daysSinceLastSnapshot = Math.floor(
        (Date.now() - latestSnapshot.mtime.getTime()) / (1000 * 60 * 60 * 24)
      );

      return daysSinceLastSnapshot;
    } catch (error) {
      console.error('Error calculating last snapshot delta:', error);
      return 0;
    }
  }

  private async ensureSnapshotDirectory(baseDir: string, date: Date): Promise<string> {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    const yearDir = path.join(baseDir, year);
    const monthDir = path.join(yearDir, month);
    const dayDir = path.join(monthDir, day);

    await fs.mkdir(yearDir, { recursive: true });
    await fs.mkdir(monthDir, { recursive: true });
    await fs.mkdir(dayDir, { recursive: true });

    return dayDir;
  }

  async createSnapshot(docPath: string, outputDir: string): Promise<void> {
    try {
      // Ensure snapshots directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Calculate health metrics
      const healthMetrics = await this.calculateHealthMetrics(docPath);
      
      // Update last snapshot delta
      healthMetrics.last_snapshot_delta = await this.getLastSnapshotDelta(outputDir);

      // Create metadata
      const metadata: DocumentationMetadata = {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        dependencies: [
          { name: 'mementor-ts', version: '1.0.0' }
        ],
        health_metrics: healthMetrics,
        tags: ['documentation', 'snapshot']
      };

      // Prepare template data
      const data: TemplateData = {
        title: 'Documentation Snapshot',
        description: 'Current state of project documentation',
        changes: [
          'Updated template system',
          'Added metadata support',
          'Implemented snapshot generation'
        ],
        state_items: [
          {
            category: 'Implementation',
            items: [
              { description: 'Template system', completed: true },
              { description: 'Metadata support', completed: true },
              { description: 'Snapshot generation', completed: true }
            ]
          }
        ],
        next_actions: [
          'Implement automated snapshot scheduling',
          'Add more comprehensive health metrics',
          'Create snapshot comparison tools'
        ],
        metadata
      };

      // Generate snapshot
      const content = await this.renderer.createSnapshot('snapshot', data);
      
      // Create organized directory structure
      const now = new Date();
      const snapshotDir = await this.ensureSnapshotDirectory(outputDir, now);
      
      // Format time for filename (HHMMSS)
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
      const outputPath = path.join(snapshotDir, `snapshot_${timeStr}.md`);
      await fs.writeFile(outputPath, content);
      
      console.log(`✨ Created snapshot: ${outputPath}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to create snapshot:', error.message);
      } else {
        console.error('An unknown error occurred while creating snapshot');
      }
      throw error;
    }
  }
}
