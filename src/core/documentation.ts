import fs from 'fs/promises';
import path from 'path';
import { ContextSnapshot, ProjectConfig } from '../types';

/**
 * Updates documentation based on changes in a source file.
 * @async
 * @param {string} filepath - Path to the changed file
 * @param {ContextSnapshot} snapshot - Current documentation snapshot
 * @param {ProjectConfig} config - Project configuration
 * @throws {Error} When documentation update fails
 */
export async function updateDocumentation(
  filepath: string,
  snapshot: ContextSnapshot,
  config: ProjectConfig,
): Promise<void> {
  try {
    // Read the changed file
    const content = await fs.readFile(filepath, 'utf-8');

    // Determine documentation type based on file
    const docType = getDocumentationType(filepath);

    // Update relevant documentation
    switch (docType) {
      case 'component':
        await updateComponentDocs(filepath, content, config);
        break;
      case 'hook':
        await updateHookDocs(filepath, content, config);
        break;
      case 'util':
        await updateUtilDocs(filepath, content, config);
        break;
      default:
        console.warn('No specific documentation update needed for this file type');
    }

    // Update changelog
    await updateChangelog(filepath, snapshot, config);
  } catch (error) {
    console.error('Error updating documentation:', error);
    throw error;
  }
}

/**
 * Determines the type of documentation needed based on file location.
 * @param {string} filepath - Path to the file
 * @returns {string} The document type ('component', 'hook', 'util', or 'other')
 */
function getDocumentationType(filepath: string): string {
  if (filepath.includes('/components/')) return 'component';
  if (filepath.includes('/hooks/')) return 'hook';
  if (filepath.includes('/utils/') || filepath.includes('/lib/')) return 'util';
  return 'other';
}

/**
 * Updates documentation for a component.
 * @async
 * @param {string} _filepath - Path to the component file
 * @param {string} _content - Content of the component file
 * @param {ProjectConfig} _config - Project configuration
 */
async function updateComponentDocs(
  _filepath: string,
  _content: string,
  _config: ProjectConfig,
): Promise<void> {
  // Extract component documentation
  const componentName = path.basename(_filepath, path.extname(_filepath));
  const componentDoc = extractComponentDoc(_content);

  // Update DEVELOPMENT.md with component info
  const devDocsPath = path.join(_config.docsDir, 'DEVELOPMENT.md');
  await updateComponentSection(devDocsPath, componentName, componentDoc);
}

/**
 * Updates documentation for a React hook.
 * @async
 * @param {string} _filepath - Path to the hook file
 * @param {string} _content - Content of the hook file
 * @param {ProjectConfig} _config - Project configuration
 */
async function updateHookDocs(
  _filepath: string,
  _content: string,
  _config: ProjectConfig,
): Promise<void> {
  // Similar to component docs but for hooks
}

/**
 * Updates documentation for a utility function.
 * @async
 * @param {string} _filepath - Path to the utility file
 * @param {string} _content - Content of the utility file
 * @param {ProjectConfig} _config - Project configuration
 */
async function updateUtilDocs(
  _filepath: string,
  _content: string,
  _config: ProjectConfig,
): Promise<void> {
  // Similar to component docs but for utilities
}

/**
 * Updates the changelog with new changes.
 * @async
 * @param {string} filepath - Path to the changed file
 * @param {ContextSnapshot} snapshot - Current documentation snapshot
 * @param {ProjectConfig} config - Project configuration
 */
async function updateChangelog(
  filepath: string,
  snapshot: ContextSnapshot,
  config: ProjectConfig,
): Promise<void> {
  const changelogPath = path.join(config.docsDir, 'CHANGELOG.md');
  const changelog = await fs.readFile(changelogPath, 'utf-8');

  // Add new changes to unreleased section
  const updatedChangelog = addUnreleasedChanges(changelog, snapshot);

  await fs.writeFile(changelogPath, updatedChangelog, 'utf-8');
}

/**
 * Extracts documentation from a component's content.
 * @param {string} content - Component file content
 * @returns {string} Extracted documentation
 */
function extractComponentDoc(content: string): string {
  // Extract JSDoc comments and TypeScript interfaces
  const docRegex = /\/\*\*[\s\S]*?\*\//g;
  const docs = content.match(docRegex) || [];

  return docs.join('\n\n');
}

/**
 * Updates the component section in the development documentation.
 * @async
 * @param {string} devDocsPath - Path to development documentation
 * @param {string} componentName - Name of the component
 * @param {string} componentDoc - Component documentation
 */
async function updateComponentSection(
  devDocsPath: string,
  componentName: string,
  componentDoc: string,
): Promise<void> {
  const devDocs = await fs.readFile(devDocsPath, 'utf-8');

  // Find components section and update
  // This is a simplified version - would need more robust parsing
  const componentSection = `## Components\n\n### ${componentName}\n${componentDoc}\n`;

  // Update or append component documentation
  const updatedDocs = devDocs.includes(`### ${componentName}`)
    ? devDocs.replace(new RegExp(`### ${componentName}[\\s\\S]*?(?=##|$)`), componentSection)
    : devDocs + '\n' + componentSection;

  await fs.writeFile(devDocsPath, updatedDocs, 'utf-8');
}

/**
 * Adds unreleased changes to the changelog.
 * @param {string} changelog - Current changelog content
 * @param {ContextSnapshot} snapshot - Current documentation snapshot
 * @returns {string} Updated changelog content
 */
function addUnreleasedChanges(changelog: string, snapshot: ContextSnapshot): string {
  const lines = changelog.split('\n');
  const unreleasedIndex = lines.findIndex(line => line.includes('## [Unreleased]'));

  if (unreleasedIndex === -1) {
    // Add unreleased section if it doesn't exist
    return `## [Unreleased]\n\n${formatChanges(snapshot)}\n\n${changelog}`;
  }

  // Insert changes after unreleased header
  lines.splice(unreleasedIndex + 1, 0, formatChanges(snapshot));
  return lines.join('\n');
}

/**
 * Formats changes into a readable string.
 * @param {ContextSnapshot} snapshot - Current documentation snapshot
 * @returns {string} Formatted changes string
 */
function formatChanges(snapshot: ContextSnapshot): string {
  return snapshot.changes.map(change => `- ${change.type}: ${change.description}`).join('\n');
}
