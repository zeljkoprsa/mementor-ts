import { marked } from 'marked';
import fs from 'fs/promises';
import path from 'path';
import { DocumentContent, ContextSnapshot, ProjectConfig } from '../types';

export async function updateDocumentation(
  filepath: string,
  snapshot: ContextSnapshot,
  config: ProjectConfig
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
        console.log('No specific documentation update needed for this file type');
    }
    
    // Update changelog
    await updateChangelog(filepath, snapshot, config);
    
  } catch (error) {
    console.error('Error updating documentation:', error);
    throw error;
  }
}

function getDocumentationType(filepath: string): string {
  if (filepath.includes('/components/')) return 'component';
  if (filepath.includes('/hooks/')) return 'hook';
  if (filepath.includes('/utils/') || filepath.includes('/lib/')) return 'util';
  return 'other';
}

async function updateComponentDocs(
  filepath: string,
  content: string,
  config: ProjectConfig
): Promise<void> {
  // Extract component documentation
  const componentName = path.basename(filepath, path.extname(filepath));
  const componentDoc = extractComponentDoc(content);
  
  // Update DEVELOPMENT.md with component info
  const devDocsPath = path.join(config.docsDir, 'DEVELOPMENT.md');
  await updateComponentSection(devDocsPath, componentName, componentDoc);
}

async function updateHookDocs(
  filepath: string,
  content: string,
  config: ProjectConfig
): Promise<void> {
  // Similar to component docs but for hooks
}

async function updateUtilDocs(
  filepath: string,
  content: string,
  config: ProjectConfig
): Promise<void> {
  // Similar to component docs but for utilities
}

async function updateChangelog(
  filepath: string,
  snapshot: ContextSnapshot,
  config: ProjectConfig
): Promise<void> {
  const changelogPath = path.join(config.docsDir, 'CHANGELOG.md');
  const changelog = await fs.readFile(changelogPath, 'utf-8');
  
  // Add new changes to unreleased section
  const updatedChangelog = addUnreleasedChanges(changelog, snapshot);
  
  await fs.writeFile(changelogPath, updatedChangelog, 'utf-8');
}

function extractComponentDoc(content: string): string {
  // Extract JSDoc comments and TypeScript interfaces
  const docRegex = /\/\*\*[\s\S]*?\*\//g;
  const docs = content.match(docRegex) || [];
  
  return docs.join('\n\n');
}

async function updateComponentSection(
  devDocsPath: string,
  componentName: string,
  componentDoc: string
): Promise<void> {
  const devDocs = await fs.readFile(devDocsPath, 'utf-8');
  
  // Find components section and update
  // This is a simplified version - would need more robust parsing
  const componentSection = `## Components\n\n### ${componentName}\n${componentDoc}\n`;
  
  // Update or append component documentation
  const updatedDocs = devDocs.includes(`### ${componentName}`)
    ? devDocs.replace(
        new RegExp(`### ${componentName}[\\s\\S]*?(?=##|$)`),
        componentSection
      )
    : devDocs + '\n' + componentSection;
  
  await fs.writeFile(devDocsPath, updatedDocs, 'utf-8');
}

function addUnreleasedChanges(
  changelog: string,
  snapshot: ContextSnapshot
): string {
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

function formatChanges(snapshot: ContextSnapshot): string {
  return snapshot.changes
    .map(change => `- ${change.type}: ${change.description}`)
    .join('\n');
}
