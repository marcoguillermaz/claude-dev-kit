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

const NATIVE_CMD_DEFAULTS = {
  swift:  { install: '# no install step', dev: 'swift run',     build: 'xcodebuild build',      test: 'xcodebuild test',  typeCheck: '' },
  kotlin: { install: '# no install step', dev: './gradlew run',  build: './gradlew build',       test: './gradlew test',   typeCheck: '' },
  rust:   { install: '# no install step', dev: 'cargo run',      build: 'cargo build --release', test: 'cargo test',       typeCheck: '' },
  dotnet: { install: 'dotnet restore',    dev: 'dotnet run',     build: 'dotnet build',          test: 'dotnet test',      typeCheck: '' },
  java:   { install: 'mvn install',       dev: 'mvn exec:java',  build: 'mvn package',           test: 'mvn test',         typeCheck: '' },
};

function buildCommandsBlock(config) {
  const ncd = NATIVE_CMD_DEFAULTS[config.techStack] || {};
  const install = config.installCommand || ncd.install || 'npm install';
  const dev = config.devCommand || ncd.dev || 'npm run dev';
  const build = config.buildCommand || ncd.build || 'npm run build';
  const test = config.testCommand || ncd.test || 'npm test';
  const typeCheck = config.typeCheckCommand || ncd.typeCheck || '';

  const lines = ['```bash'];
  if (install) lines.push(`${install}     # install dependencies`);
  if (dev) lines.push(`${dev}          # start dev server`);
  if (build) lines.push(`${build}       # production build`);
  if (test) lines.push(`${test}         # run tests`);
  if (typeCheck) lines.push(`${typeCheck}  # type check`);
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
