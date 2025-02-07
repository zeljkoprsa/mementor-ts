import path from 'path';
import { SnapshotGenerator } from '../services/snapshotGenerator';
import { ProjectConfig } from '../types';

export async function handleSnapshotCommand(config: ProjectConfig): Promise<void> {
  try {
    const generator = new SnapshotGenerator();
    
    // Get the active context file path
    const docsDir = path.join(process.cwd(), 'docs/context');
    const activeContextPath = path.join(docsDir, 'active_context.md');
    
    // Create snapshots directory if it doesn't exist
    const snapshotsDir = path.join(docsDir, 'snapshots');
    
    // Generate the snapshot
    await generator.createSnapshot(activeContextPath, snapshotsDir);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to create snapshot:', error.message);
    } else {
      console.error('An unknown error occurred while creating snapshot');
    }
    throw error;
  }
}
