import fs from 'fs/promises';
import path from 'path';
import { ProjectConfig } from '../types';
import { TemplateRenderer, TemplateData } from '../services/templateRenderer';
import { SnapshotGenerator } from '../services/snapshotGenerator';

async function ensureDirectory(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
    console.log(`✓ Created directory: ${dir}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to create directory ${dir}:`, error.message);
    }
    throw error;
  }
}

async function createFromTemplate(
  renderer: TemplateRenderer,
  templateName: string,
  targetPath: string,
  data: TemplateData
): Promise<void> {
  try {
    // Check if file exists
    try {
      await fs.access(targetPath);
      console.log(`⚠️  File ${templateName} already exists, skipping...`);
      return;
    } catch {
      // File doesn't exist, proceed with creation
    }

    const content = await renderer.renderTemplate(templateName, data);
    await fs.writeFile(targetPath, content);
    console.log(`✓ Created ${templateName}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to create ${templateName}:`, error.message);
    }
    throw error;
  }
}

async function initializeTemplates(config: ProjectConfig): Promise<void> {
  try {
    // Create required directories
    const docsDir = path.join(process.cwd(), 'docs/context');
    const snapshotsDir = path.join(docsDir, 'snapshots');
    await ensureDirectory(docsDir);
    await ensureDirectory(snapshotsDir);

    // Initialize template renderer
    const renderer = new TemplateRenderer();

    // Get project name from directory
    const projectName = path.basename(process.cwd());

    // Prepare template data
    const templateData: TemplateData = {
      project_name: projectName,
      decision_date: new Date().toISOString().split('T')[0],
      next_steps: [],
      focus_areas: [],
      issues: [],
      env_items: [
        'Node.js',
        'TypeScript',
        'Git'
      ]
    };

    // Get list of available templates
    const templates = await renderer.listTemplates();
    console.log('Found templates:', templates);

    // Create each template in the project
    for (const template of templates) {
      const targetPath = path.join(docsDir, `${template}.md`);
      await createFromTemplate(renderer, template, targetPath, templateData);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to initialize templates:', error.message);
    }
    throw error;
  }
}

export async function initializeProject(config: ProjectConfig): Promise<void> {
  try {
    // Initialize templates
    await initializeTemplates(config);

    // Create initial snapshot
    const generator = new SnapshotGenerator();
    const docsDir = path.join(process.cwd(), 'docs/context');
    const snapshotsDir = path.join(docsDir, 'snapshots');
    await generator.createSnapshot(path.join(docsDir, 'active_context.md'), snapshotsDir);

    console.log('\n✨ Project initialized successfully!');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to initialize project:', error.message);
    }
    throw error;
  }
}
