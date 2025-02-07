import fs from 'fs/promises';
import path from 'path';
import { HealthMetrics } from './templateRenderer';

interface SnapshotMetadata {
  version: string;
  created_at: string;
  updated_at: string;
  health_metrics?: HealthMetrics;
}

interface SnapshotDiff {
  oldPath: string;
  newPath: string;
  metrics: {
    old: HealthMetrics;
    new: HealthMetrics;
    changes: Partial<
      Record<
        keyof HealthMetrics,
        {
          old: number | string | boolean | string[];
          new: number | string | boolean | string[];
          delta?: number;
        }
      >
    >;
  };
  content: {
    added: string[];
    removed: string[];
    modified: Array<{
      old: string;
      new: string;
    }>;
  };
}

export class SnapshotComparer {
  private async parseSnapshot(
    filePath: string,
  ): Promise<{ metadata: SnapshotMetadata; content: string[] }> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Find metadata section
    const metadataEndIndex = lines.findIndex(line => line === '---');
    if (metadataEndIndex === -1) {
      throw new Error('Invalid snapshot format: no metadata section found');
    }

    const metadataLines = lines.slice(0, metadataEndIndex);
    const contentLines = lines.slice(metadataEndIndex + 1);

    // Parse metadata
    const version = metadataLines.find(line => line.startsWith('Version:'))?.split(': ')[1] || '';
    const created = metadataLines.find(line => line.startsWith('Created:'))?.split(': ')[1] || '';
    const updated = metadataLines.find(line => line.startsWith('Updated:'))?.split(': ')[1] || '';

    // Parse health metrics
    const healthMetrics: HealthMetrics = {
      last_updated: updated,
      word_count: this.extractMetric(metadataLines, 'Word Count') || 0,
      reading_time: this.extractMetric(metadataLines, 'Reading Time') || 0,
      has_todos: this.extractMetric(metadataLines, 'TODOs') > 0,
      todo_count: this.extractMetric(metadataLines, 'TODOs') || 0,
      linked_files: [],
      broken_links: [],
      completion_percentage: this.extractMetric(metadataLines, 'Completion', true) || 0,
      section_count: this.extractMetric(metadataLines, 'Sections') || 0,
      section_depth: 0,
      code_blocks: this.extractMetric(metadataLines, 'Code Blocks') || 0,
      avg_section_length: 0,
      readability_score: 0,
      last_snapshot_delta: this.extractMetric(metadataLines, 'Days Since Last Snapshot') || 0,
    };

    return {
      metadata: {
        version,
        created_at: created,
        updated_at: updated,
        health_metrics: healthMetrics,
      },
      content: contentLines.filter(line => line.trim() !== ''),
    };
  }

  private extractMetric(lines: string[], key: string, isPercentage = false): number {
    const line = lines.find(l => l.includes(`- ${key}:`));
    if (!line) return 0;

    const value = line.split(':')[1].trim();
    if (isPercentage) {
      return parseFloat(value.replace('%', ''));
    }
    return parseInt(value.split(' ')[0], 10);
  }

  private compareMetrics(
    old: HealthMetrics,
    current: HealthMetrics,
  ): SnapshotDiff['metrics']['changes'] {
    const changes: SnapshotDiff['metrics']['changes'] = {};

    for (const key of Object.keys(old) as Array<keyof HealthMetrics>) {
      const oldValue = old[key];
      const newValue = current[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          old: oldValue,
          new: newValue,
        };

        // Add delta for numeric values
        if (typeof oldValue === 'number' && typeof newValue === 'number') {
          changes[key]!.delta = newValue - oldValue;
        }
      }
    }

    return changes;
  }

  private compareContent(oldLines: string[], newLines: string[]): SnapshotDiff['content'] {
    const added: string[] = [];
    const removed: string[] = [];
    const modified: Array<{ old: string; new: string }> = [];

    // Create sets for quick lookup
    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);

    // Find added lines
    for (const line of newLines) {
      if (!oldSet.has(line)) {
        if (this.findSimilarLine(line, oldLines)) {
          modified.push({
            old: this.findSimilarLine(line, oldLines)!,
            new: line,
          });
        } else {
          added.push(line);
        }
      }
    }

    // Find removed lines
    for (const line of oldLines) {
      if (!newSet.has(line) && !modified.some(m => m.old === line)) {
        removed.push(line);
      }
    }

    return { added, removed, modified };
  }

  private findSimilarLine(line: string, lines: string[]): string | null {
    // Simple similarity check based on common words
    const words = new Set(line.toLowerCase().split(/\s+/));
    const threshold = 0.7; // 70% similarity required

    for (const otherLine of lines) {
      const otherWords = new Set(otherLine.toLowerCase().split(/\s+/));
      const commonWords = [...words].filter(word => otherWords.has(word));
      const similarity = commonWords.length / Math.max(words.size, otherWords.size);

      if (similarity >= threshold) {
        return otherLine;
      }
    }

    return null;
  }

  async compareSnapshots(oldPath: string, newPath: string): Promise<SnapshotDiff> {
    const [oldSnapshot, newSnapshot] = await Promise.all([
      this.parseSnapshot(oldPath),
      this.parseSnapshot(newPath),
    ]);

    return {
      oldPath,
      newPath,
      metrics: {
        old: oldSnapshot.metadata.health_metrics!,
        new: newSnapshot.metadata.health_metrics!,
        changes: this.compareMetrics(
          oldSnapshot.metadata.health_metrics!,
          newSnapshot.metadata.health_metrics!,
        ),
      },
      content: this.compareContent(oldSnapshot.content, newSnapshot.content),
    };
  }

  formatDiff(diff: SnapshotDiff): string {
    const lines: string[] = [
      '=== SNAPSHOT COMPARISON ===',
      `Old: ${path.basename(diff.oldPath)}`,
      `New: ${path.basename(diff.newPath)}`,
      '',
      '=== METRICS CHANGES ===',
    ];

    // Format metric changes
    for (const [key, change] of Object.entries(diff.metrics.changes)) {
      const formattedKey = key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      lines.push(`${formattedKey}:`);
      if (typeof change.old === 'number' && typeof change.new === 'number') {
        const trend = change.delta! > 0 ? '📈' : change.delta! < 0 ? '📉' : '➡️';
        lines.push(
          `  ${change.old} → ${change.new} ${trend} (${change.delta! >= 0 ? '+' : ''}${change.delta})`,
        );
      } else {
        lines.push(`  ${change.old} → ${change.new}`);
      }
    }

    // Format content changes
    if (diff.content.added.length > 0) {
      lines.push('', '=== ADDED CONTENT ===');
      diff.content.added.forEach(line => lines.push(`+ ${line}`));
    }

    if (diff.content.removed.length > 0) {
      lines.push('', '=== REMOVED CONTENT ===');
      diff.content.removed.forEach(line => lines.push(`- ${line}`));
    }

    if (diff.content.modified.length > 0) {
      lines.push('', '=== MODIFIED CONTENT ===');
      diff.content.modified.forEach(({ old, new: newLine }) => {
        lines.push(`- ${old}`);
        lines.push(`+ ${newLine}`);
        lines.push('');
      });
    }

    return lines.join('\n');
  }
}
