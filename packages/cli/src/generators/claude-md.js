import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');

/**
 * Generate CLAUDE.md from the tier template, applying wizard answers.
 * The template is pre-populated with all placeholders; we replace what we know.
 */
export async function generateClaudeMd(config, targetDir) {
  const tier = (config.tier || 's').toLowerCase();
  const templatePath = path.join(TEMPLATES_DIR, `tier-${tier}`, 'CLAUDE.md');

  let content;
  if (await fs.pathExists(templatePath)) {
    content = await fs.readFile(templatePath, 'utf8');
  } else {
    content = getMinimalTemplate();
  }

  // Apply known values from wizard answers
  content = content
    .replace(/\[PROJECT_NAME\]/g, config.projectName)
    .replace(/\[TECH_STACK_SUMMARY\]/g, techStackSummary(config.techStack));

  // Inject commands
  const commands = buildCommandsBlock(config);
  content = content.replace(/```bash[\s\S]*?```/, commands);

  // Inject rule @-imports and Active Skills section for tier M/L
  if (tier === 'm' || tier === 'l') {
    content = injectRuleImports(content);
    content = injectActiveSkills(content, config);
  }

  await fs.writeFile(path.join(targetDir, 'CLAUDE.md'), content);
}

function techStackSummary(stack) {
  const map = {
    'node-ts': 'Node.js + TypeScript',
    'node-js': 'Node.js + JavaScript',
    python: 'Python',
    go: 'Go',
    other: 'Mixed',
  };
  return map[stack] || stack;
}

function buildCommandsBlock(config) {
  const lines = ['```bash'];
  if (config.installCommand) lines.push(`${config.installCommand}     # install dependencies`);
  if (config.devCommand) lines.push(`${config.devCommand}          # start dev server`);
  if (config.buildCommand) lines.push(`${config.buildCommand}       # production build`);
  if (config.testCommand) lines.push(`${config.testCommand}         # run tests`);
  if (config.typeCheckCommand) lines.push(`${config.typeCheckCommand}  # type check`);
  lines.push('```');
  return lines.join('\n');
}

/**
 * Append @-imports for the three shared rule files before the first ##-heading
 * that doesn't already have them. If they already exist, skip.
 */
function injectRuleImports(content) {
  const imports = [
    '@.claude/rules/output-style.md',
    '@.claude/rules/claudemd-standards.md',
    '@.claude/rules/pipeline-standards.md',
  ];
  // If any import already present, skip (idempotent)
  if (imports.every(i => content.includes(i))) return content;

  const importBlock = '\n' + imports.join('\n') + '\n';
  // Insert after the first heading line (# ...)
  return content.replace(/^(# .+)$/m, `$1${importBlock}`);
}

/**
 * Append an Active Skills section listing which skills are installed,
 * based on feature flags from the wizard.
 */
function injectActiveSkills(content, config) {
  // Always installed
  const active = ['arch-audit', 'skill-dev', 'perf-audit', 'commit'];

  if (config.hasApi !== false) active.push('api-design', 'security-audit');
  if (config.hasDatabase !== false) active.push('skill-db');
  if (config.hasFrontend !== false) {
    active.push('responsive-audit', 'visual-audit', 'ux-audit');
    if (config.hasDesignSystem !== false) active.push('ui-audit');
  }

  const section = `\n## Active Skills\n${active.map(s => `- \`/${s}\``).join('\n')}\n`;

  // Append before Environment section, or at end of file
  if (content.includes('\n## Environment')) {
    return content.replace('\n## Environment', section + '\n## Environment');
  }
  return content + section;
}

function getMinimalTemplate() {
  return `# [PROJECT_NAME] — Project Context

## Overview
[One paragraph: what the product does, who uses it, what problem it solves.]

## Tech Stack
- **Stack**: [TECH_STACK_SUMMARY]

## Key Commands
\`\`\`bash
[INSTALL_COMMAND]
[DEV_COMMAND]
[BUILD_COMMAND]
[TEST_COMMAND]
[TYPE_CHECK_COMMAND]
\`\`\`

## Coding Conventions
- [Add non-obvious conventions here]

## Known Patterns
<!-- Add non-obvious gotchas here as you discover them. -->
`;
}
