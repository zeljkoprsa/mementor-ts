import fs from 'fs/promises';
import path from 'path';
import { ProjectConfig } from '../types';
import { SnapshotComparer } from '../services/snapshotComparer';

async function findSnapshots(snapshotsDir: string, date?: string): Promise<string[]> {
  const snapshots: string[] = [];
  
  if (date) {
    // Parse date components
    const [year, month, day] = date.split('-').map(n => n.padStart(2, '0'));
    const targetDir = path.join(snapshotsDir, year, month, day);
    
    try {
      const files = await fs.readdir(targetDir);
      return files
        .filter(file => file.startsWith('snapshot_') && file.endsWith('.md'))
        .map(file => path.join(targetDir, file))
        .sort();
    } catch {
      return [];
    }
  } else {
    // Find all snapshots recursively
    async function walk(dir: string) {
      const items = await fs.readdir(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await walk(fullPath);
        } else if (item.startsWith('snapshot_') && item.endsWith('.md')) {
          snapshots.push(fullPath);
        }
      }
    }
    
    await walk(snapshotsDir);
    return snapshots.sort();
  }
}

export async function handleCompareCommand(
  config: ProjectConfig,
  date?: string,
  oldSnapshot?: string,
  newSnapshot?: string
): Promise<void> {
  try {
    const docsDir = path.join(process.cwd(), 'docs/context');
    const snapshotsDir = path.join(docsDir, 'snapshots');
    const comparer = new SnapshotComparer();
    
    let oldPath: string;
    let newPath: string;
    
    if (oldSnapshot && newSnapshot) {
      // Compare specific snapshots
      oldPath = path.join(snapshotsDir, oldSnapshot);
      newPath = path.join(snapshotsDir, newSnapshot);
    } else {
      // Find snapshots for the given date or latest snapshots
      const snapshots = await findSnapshots(snapshotsDir, date);
      if (snapshots.length < 2) {
        console.error('Need at least 2 snapshots to compare. Found:', snapshots.length);
        return;
      }
      
      oldPath = snapshots[snapshots.length - 2];
      newPath = snapshots[snapshots.length - 1];
    }
    
    // Ensure both snapshots exist
    await Promise.all([
      fs.access(oldPath),
      fs.access(newPath)
    ]);
    
    // Compare snapshots
    const diff = await comparer.compareSnapshots(oldPath, newPath);
    
    // Format and display the comparison
    console.log(comparer.formatDiff(diff));
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to compare snapshots:', error.message);
    }
    throw error;
  }
}
