import { ContextSnapshot, ProjectConfig } from '../types';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { simpleGit } from 'simple-git';

export async function generateSnapshot(
  config: ProjectConfig
): Promise<ContextSnapshot> {
  const timestamp = new Date().toISOString();
  const git = simpleGit();
  
  try {
    // Get git status
    const status = await git.status();
    
    // Get changed files
    const changes = await Promise.all(
      status.modified.map(async (file) => ({
        file,
        type: 'modified' as const,
        description: await generateChangeDescription(file)
      }))
    );
    
    // Get current documentation state
    const documents = await getCurrentDocuments(config);
    
    // Create snapshot
    const snapshot: ContextSnapshot = {
      timestamp,
      changes,
      documents
    };
    
    // Save snapshot
    await saveSnapshot(snapshot, config);
    
    return snapshot;
  } catch (error) {
    console.error('Error generating snapshot:', error);
    throw error;
  }
}

async function generateChangeDescription(file: string): Promise<string> {
  const git = simpleGit();
  
  try {
    // Get the last commit message for this file
    const log = await git.log({ file, maxCount: 1 });
    
    if (log.latest) {
      return log.latest.message;
    }
    
    return 'File modified';
  } catch (error) {
    console.error('Error generating change description:', error);
    return 'File modified';
  }
}

async function getCurrentDocuments(config: ProjectConfig) {
  const docsPattern = path.join(config.docsDir, '*.md');
  const docFiles = await glob(docsPattern);
  
  return Promise.all(
    docFiles.map(async (file) => {
      const content = await fs.readFile(file, 'utf-8');
      return {
        meta: {
          title: path.basename(file, '.md'),
          date: new Date().toISOString(),
          tags: [],
          type: getDocType(file)
        },
        content
      };
    })
  );
}

function getDocType(filepath: string): 'architecture' | 'development' | 'changelog' | 'readme' {
  const filename = path.basename(filepath, '.md').toLowerCase();
  
  if (filename.includes('architecture')) return 'architecture';
  if (filename.includes('development')) return 'development';
  if (filename.includes('changelog')) return 'changelog';
  return 'readme';
}

async function saveSnapshot(
  snapshot: ContextSnapshot,
  config: ProjectConfig
): Promise<void> {
  const snapshotDir = path.join(
    config.docsDir,
    'snapshots',
    new Date().getFullYear().toString(),
    (new Date().getMonth() + 1).toString().padStart(2, '0')
  );
  
  // Ensure directory exists
  await fs.mkdir(snapshotDir, { recursive: true });
  
  // Save snapshot
  const filename = `snapshot_${snapshot.timestamp.replace(/[:.]/g, '')}.json`;
  await fs.writeFile(
    path.join(snapshotDir, filename),
    JSON.stringify(snapshot, null, 2)
  );
}
