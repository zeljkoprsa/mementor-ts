import fs from 'fs/promises';
import path from 'path';
import { ProjectConfig } from '../types';

async function isEmptyDir(dir: string): Promise<boolean> {
  try {
    const files = await fs.readdir(dir);
    return files.length === 0;
  } catch {
    return false;
  }
}

async function removeEmptyDirs(dir: string): Promise<void> {
  try {
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await removeEmptyDirs(fullPath);
        // Check if directory is empty after cleaning its contents
        if (await isEmptyDir(fullPath)) {
          await fs.rmdir(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error cleaning empty directories: ${error}`);
  }
}

export async function handleCleanupCommand(config: ProjectConfig): Promise<void> {
  try {
    const docsDir = path.join(process.cwd(), 'docs/context');
    const snapshotsDir = path.join(docsDir, 'snapshots');
    
    // Get all files in snapshots directory
    const files = await fs.readdir(snapshotsDir);
    
    // Move old snapshot files to the correct date-based directories
    for (const file of files) {
      if (file.startsWith('snapshot_') && file.endsWith('.md')) {
        const filePath = path.join(snapshotsDir, file);
        const stat = await fs.stat(filePath);
        
        // Extract date from filename or use file creation date
        const date = new Date(stat.birthtime);
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        // Create year/month/day directories
        const yearDir = path.join(snapshotsDir, year);
        const monthDir = path.join(yearDir, month);
        const dayDir = path.join(monthDir, day);
        
        await fs.mkdir(yearDir, { recursive: true });
        await fs.mkdir(monthDir, { recursive: true });
        await fs.mkdir(dayDir, { recursive: true });
        
        // Format time from the original filename or use current time
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '');
        const newFileName = `snapshot_${timeStr}.md`;
        const newPath = path.join(dayDir, newFileName);
        
        // Move the file
        await fs.rename(filePath, newPath);
        console.log(`✓ Moved ${file} to ${path.relative(snapshotsDir, newPath)}`);
      }
    }
    
    // Clean up empty directories
    await removeEmptyDirs(snapshotsDir);
    
    console.log('✨ Snapshot cleanup completed successfully!');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to clean up snapshots:', error.message);
    }
    throw error;
  }
}
