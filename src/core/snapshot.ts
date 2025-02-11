import { ContextSnapshot, ProjectConfig, DocumentContent } from '../types';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { simpleGit } from 'simple-git';

/**
 * Generates a new documentation snapshot based on current project state.
 * @async
 * @param {ProjectConfig} config - Project configuration
 * @returns {Promise<ContextSnapshot>} Generated snapshot with current documentation state
 * @throws {Error} When snapshot generation fails
 */
export async function generateSnapshot(config: ProjectConfig): Promise<ContextSnapshot> {
  const timestamp = new Date().toISOString();
  const git = simpleGit();

  try {
    // Get git status
    const status = await git.status();

    // Get changed files
    const changes = await Promise.all(
      status.modified.map(async file => ({
        file,
        type: 'modified' as const,
        description: await generateChangeDescription(file),
      })),
    );

    // Get current documentation state
    const documents = await getCurrentDocuments(config);

    // Create snapshot
    const snapshot: ContextSnapshot = {
      timestamp,
      changes,
      documents,
    };

    // Save snapshot
    await saveSnapshot(snapshot, config);

    return snapshot;
  } catch (error) {
    console.error('Error generating snapshot:', error);
    throw error;
  }
}

/**
 * Generates a description of changes for a modified file.
 * @async
 * @param {string} file - Path to the modified file
 * @returns {Promise<string>} Description of the changes
 * @throws {Error} When git operations fail
 */
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

/**
 * Retrieves the current state of all documentation files.
 * @async
 * @param {ProjectConfig} config - Project configuration
 * @returns {Promise<DocumentContent[]>} Array of document contents
 * @throws {Error} When reading documents fails
 */
async function getCurrentDocuments(config: ProjectConfig): Promise<DocumentContent[]> {
  const docsPattern = path.join(config.docsDir, '*.md');
  const docFiles = await glob(docsPattern);

  return Promise.all(
    docFiles.map(async file => {
      const content = await fs.readFile(file, 'utf-8');
      return {
        meta: {
          title: path.basename(file, '.md'),
          date: new Date().toISOString(),
          tags: [],
          type: getDocType(file),
        },
        content,
      };
    }),
  );
}

/**
 * Determines the type of documentation based on file path.
 * @param {string} filepath - Path to the documentation file
 * @returns {'architecture' | 'development' | 'changelog' | 'readme'} Document type
 */
function getDocType(filepath: string): 'architecture' | 'development' | 'changelog' | 'readme' {
  const filename = path.basename(filepath, '.md').toLowerCase();

  if (filename.includes('architecture')) return 'architecture';
  if (filename.includes('development')) return 'development';
  if (filename.includes('changelog')) return 'changelog';
  return 'readme';
}

/**
 * Saves a documentation snapshot to disk.
 * @async
 * @param {ContextSnapshot} snapshot - The snapshot to save
 * @param {ProjectConfig} config - Project configuration
 * @returns {Promise<void>}
 * @throws {Error} When saving snapshot fails
 */
async function saveSnapshot(snapshot: ContextSnapshot, config: ProjectConfig): Promise<void> {
  const snapshotDir = path.join(
    config.docsDir,
    'snapshots',
    new Date().getFullYear().toString(),
    (new Date().getMonth() + 1).toString().padStart(2, '0'),
  );

  // Ensure directory exists
  await fs.mkdir(snapshotDir, { recursive: true });

  // Save snapshot
  const filename = `snapshot_${snapshot.timestamp.replace(/[:.]/g, '')}.json`;
  await fs.writeFile(path.join(snapshotDir, filename), JSON.stringify(snapshot, null, 2));
}
