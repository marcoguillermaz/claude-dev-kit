import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { interpolate } from '../scaffold/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');

/**
 * Generate CLAUDE.md from the tier template, applying wizard answers.
 * Single authoritative writer — scaffold/index.js does NOT copy CLAUDE.md.
 *
 * Pipeline: raw template → interpolate() (all placeholders) → command block
 *           → rule imports → active skills → conditional stripping → write
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

  // Resolve all template placeholders (stack labels, commands, booleans, conditionals)
  content = interpolate(content, config);

  // Overwrite the command block with formatted version (adds inline comments)
  const commands = buildCommandsBlock(config);
  content = content.replace(/```bash[\s\S]*?```/, commands);

  // Inject rule @-imports and Active Skills section for tier S/M/L
  if (tier === 's' || tier === 'm' || tier === 'l') {
    content = injectRuleImports(content);
    content = injectActiveSkills(content, config);
  }

  // Strip web-centric convention for projects without API routes
  if (config.hasApi === false) {
    content = content.replace(/^- Every API route:.*\n/m, '');
  }

  // Strip irrelevant Tech Stack placeholders for native stacks
  const nativeStacks = ['swift', 'kotlin', 'rust', 'dotnet', 'java'];
  if (nativeStacks.includes(config.techStack)) {
    content = content.replace(/^- \*\*Auth\*\*:.*\n/m, '');
    content = content.replace(/^- \*\*Storage\*\*:.*\n/m, '');
    content = content.replace(/^- \*\*Email\*\*:.*\n/m, '');
    content = content.replace(/^- \*\*Deploy\*\*:.*$/m, '- **Deploy**: _native distribution_');
  }

  // Strip sections containing only placeholder content to save context tokens
  content = stripUnfilledSections(content);

  await fs.writeFile(path.join(targetDir, 'CLAUDE.md'), content);
}

const NATIVE_CMD_DEFAULTS = {
  swift: {
    install: '# no install step',
    dev: 'swift run',
    build: 'xcodebuild build',
    test: 'xcodebuild test',
    typeCheck: '',
  },
  kotlin: {
    install: '# no install step',
    dev: './gradlew run',
    build: './gradlew build',
    test: './gradlew test',
    typeCheck: '',
  },
  rust: {
    install: '# no install step',
    dev: 'cargo run',
    build: 'cargo build --release',
    test: 'cargo test',
    typeCheck: '',
  },
  dotnet: {
    install: 'dotnet restore',
    dev: 'dotnet run',
    build: 'dotnet build',
    test: 'dotnet test',
    typeCheck: '',
  },
  java: {
    install: 'mvn install',
    dev: 'mvn exec:java',
    build: 'mvn package',
    test: 'mvn test',
    typeCheck: '',
  },
};

function buildCommandsBlock(config) {
  const ncd = NATIVE_CMD_DEFAULTS[config.techStack] || {};
  const install = config.installCommand || ncd.install || 'npm install';
  const dev = config.devCommand || ncd.dev || 'npm run dev';
  const build = config.buildCommand || ncd.build || 'npm run build';
  const test = config.testCommand || ncd.test || 'npm test';
  const typeCheck = config.typeCheckCommand || ncd.typeCheck || '';
  const migration = config.migrationCommand || '';
  const e2e = config.e2eCommand || '';

  const lines = ['```bash'];
  if (install) lines.push(`${install}     # install dependencies`);
  if (dev) lines.push(`${dev}          # start dev server`);
  if (build) lines.push(`${build}       # production build`);
  if (test) lines.push(`${test}         # run tests`);
  if (typeCheck) lines.push(`${typeCheck}  # type check`);
  if (migration && migration !== '# not configured') lines.push(`${migration}  # run migrations`);
  if (e2e && e2e !== '# not configured') lines.push(`${e2e}  # end-to-end tests`);
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
  if (imports.every((i) => content.includes(i))) return content;

  const importBlock = '\n' + imports.join('\n') + '\n';
  // Insert after the first heading line (# ...)
  return content.replace(/^(# .+)$/m, `$1${importBlock}`);
}

/**
 * Append an Active Skills section listing which skills are installed,
 * based on feature flags from the wizard.
 */
function injectActiveSkills(content, config) {
  // Always installed (all tiers with skills)
  const active = ['arch-audit', 'skill-dev', 'perf-audit', 'simplify', 'commit'];

  const tier = (config.tier || 's').toLowerCase();

  // Tier S: only security-audit as conditional skill
  if (tier === 's') {
    if (config.hasApi !== false) active.push('security-audit');
  }

  // Tier M/L: full conditional skill set
  if (tier === 'm' || tier === 'l') {
    if (config.hasApi !== false) active.push('api-design', 'security-audit');
    if (config.hasDatabase !== false) active.push('skill-db');
    if (config.hasFrontend !== false) {
      active.push('responsive-audit', 'visual-audit', 'ux-audit');
      if (config.hasDesignSystem !== false) active.push('ui-audit');
    }
  }

  const section = `\n## Active Skills\n${active.map((s) => `- \`/${s}\``).join('\n')}\n`;

  // Append before Environment section, or at end of file
  if (content.includes('\n## Environment')) {
    return content.replace('\n## Environment', section + '\n## Environment');
  }
  return content + section;
}

/**
 * Remove sections that contain only placeholder content (bracket patterns,
 * HTML comments, empty lines). These waste context tokens every session
 * until the user fills them in. Stripped sections are documented in
 * FIRST_SESSION.md so users know they exist.
 */
function stripUnfilledSections(content) {
  const sectionsToStrip = new Set([
    'RBAC / Roles',
    'Key Workflows',
    'Navigation by Role',
    'Known Patterns',
  ]);

  const lines = content.split('\n');
  const sections = [];
  let current = { heading: null, lines: [] };

  for (const line of lines) {
    const match = line.match(/^## (.+)/);
    if (match) {
      sections.push(current);
      current = { heading: match[1].trim(), lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);

  const kept = sections.filter((s) => !s.heading || !sectionsToStrip.has(s.heading));

  // Rejoin and collapse runs of 3+ blank lines to 2
  return kept
    .map((s) => s.lines.join('\n'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

// Exported for unit testing only — not part of the public API
export const _testHelpers = {
  buildCommandsBlock,
  injectRuleImports,
  injectActiveSkills,
  stripUnfilledSections,
};

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
