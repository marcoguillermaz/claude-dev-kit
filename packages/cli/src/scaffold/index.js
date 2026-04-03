import fs from 'fs-extra';
import path from 'path';
import { AUDIT_MODEL_DEFAULT } from '../utils/constants.js';

/**
 * Scaffold Tier 0 (Discovery) — minimal: CLAUDE.md, settings.json, GETTING_STARTED.md only.
 * No pipeline, no docs folder, no pre-commit, no .github.
 */
export async function scaffoldTier0(targetDir, config, templatesDir) {
  const tierDir = path.join(templatesDir, 'tier-0');

  // Copy the three Tier 0 files with interpolation
  const files = [
    { src: 'CLAUDE.md', dest: 'CLAUDE.md' },
    { src: 'GETTING_STARTED.md', dest: 'GETTING_STARTED.md' },
    { src: '.claude/settings.json', dest: '.claude/settings.json' },
  ];

  for (const { src, dest } of files) {
    const srcPath = path.join(tierDir, src);
    const destPath = path.join(targetDir, dest);
    if (!(await fs.pathExists(srcPath))) continue;
    await fs.ensureDir(path.dirname(destPath));
    const content = await fs.readFile(srcPath, 'utf8');
    await fs.writeFile(destPath, interpolate(content, config));
  }

  // Create session directory (used by Claude for session recovery)
  await fs.ensureDir(path.join(targetDir, '.claude', 'session'));
}

/**
 * Scaffold a tier's template files into the target directory.
 * Copies common files first, then tier-specific files (tier overrides common).
 */
export async function scaffoldTier(tier, targetDir, config, templatesDir) {
  // Tier 0 is its own minimal path
  if (tier === '0') {
    return scaffoldTier0(targetDir, config, templatesDir);
  }
  const commonDir = path.join(templatesDir, 'common');
  const tierDir = path.join(templatesDir, `tier-${tier.toLowerCase()}`);

  // Copy common files — skip rules/ here, handled separately below
  await copyTemplateDir(commonDir, targetDir, config, {
    'gitignore': '.gitignore',
    'pre-commit-config.yaml': '.pre-commit-config.yaml',
    'adr-template.md': 'docs/adr/template.md',
    'PULL_REQUEST_TEMPLATE.md': '.github/PULL_REQUEST_TEMPLATE.md',
    'CODEOWNERS': '.github/CODEOWNERS',
    'context-review.md': '.claude/rules/context-review.md',
    'files-guide.md': '.claude/files-guide.md',
    'pipeline-standards.md': 'docs/pipeline-standards.md',
    'claudemd-standards.md': 'docs/claudemd-standards.md',
  }, config, ['rules']);

  // Copy tier-specific files (includes tier rules/ like pipeline.md)
  if (await fs.pathExists(tierDir)) {
    await copyTemplateDir(tierDir, targetDir, config, {}, config, []);
  }

  // Copy rules/ subdirectory from common
  const commonRulesDir = path.join(commonDir, 'rules');
  if (await fs.pathExists(commonRulesDir)) {
    const rules = await fs.readdir(commonRulesDir);
    for (const rule of rules) {
      const src = path.join(commonRulesDir, rule);
      const dest = path.join(targetDir, '.claude', 'rules', rule);
      await fs.ensureDir(path.dirname(dest));
      const content = await fs.readFile(src, 'utf8');
      await fs.writeFile(dest, interpolate(content, config));
    }
  }

  // Create session directory
  await fs.ensureDir(path.join(targetDir, '.claude', 'session'));

  // Create ADR directory
  await fs.ensureDir(path.join(targetDir, 'docs', 'adr'));

  // Conditionally exclude files the user opted out of
  if (!config.includePreCommit) {
    await fs.remove(path.join(targetDir, '.pre-commit-config.yaml'));
  }
  if (!config.includeGithub) {
    await fs.remove(path.join(targetDir, '.github'));
  }

  // Conditionally remove docs and skills that are not applicable for this project
  if (tier === 'm' || tier === 'l') {
    await pruneConditionalDocs(targetDir, config);
    await pruneSkills(targetDir, config);
  }
}

/**
 * Remove optional docs that are not applicable based on project feature flags.
 * Docs are only pruned when a feature flag is explicitly set to false (not undefined).
 */
async function pruneConditionalDocs(targetDir, config) {
  const nativeStacks = ['swift', 'kotlin', 'rust', 'dotnet', 'java'];
  const isNative = nativeStacks.includes(config.techStack);

  if (config.hasFrontend === false || isNative) {
    await fs.remove(path.join(targetDir, 'docs', 'sitemap.md'));
  }
  if (config.hasDatabase === false) {
    await fs.remove(path.join(targetDir, 'docs', 'db-map.md'));
  }
}

/**
 * Remove skill directories that are not applicable based on project feature flags.
 * Skills are only pruned when a feature flag is explicitly set to false (not undefined).
 */
async function pruneSkills(targetDir, config) {
  const skillsDir = path.join(targetDir, '.claude', 'skills');
  if (!(await fs.pathExists(skillsDir))) return;

  const skipSkills = new Set();

  if (config.hasApi === false) {
    skipSkills.add('api-design');
  }

  if (config.hasDatabase === false) {
    skipSkills.add('skill-db');
  }

  const nativeStacks = ['swift', 'kotlin', 'rust', 'dotnet', 'java'];
  const isNative = nativeStacks.includes(config.techStack);

  if (config.hasFrontend === false) {
    skipSkills.add('responsive-audit');
    skipSkills.add('visual-audit');
    skipSkills.add('ux-audit');
    skipSkills.add('ui-audit');
  } else if (isNative) {
    // responsive-audit is a web concept — not applicable for native UIs
    skipSkills.add('responsive-audit');
  }

  // ui-audit additionally requires a design system
  if (config.hasFrontend !== false && config.hasDesignSystem === false) {
    skipSkills.add('ui-audit');
  }

  for (const skill of skipSkills) {
    await fs.remove(path.join(skillsDir, skill));
  }
}

async function copyTemplateDir(srcDir, destDir, config, fileNameMap, userConfig, skipDirs = []) {
  if (!(await fs.pathExists(srcDir))) return;

  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (skipDirs.includes(entry.name)) continue;
      const subSrc = path.join(srcDir, entry.name);
      const subDest = path.join(destDir, entry.name);
      await copyTemplateDir(subSrc, subDest, config, {}, userConfig, []);
      continue;
    }

    // Map filename if needed
    const destName = fileNameMap[entry.name] || entry.name;

    // Skip github files if user opted out
    if (!userConfig.includeGithub && (destName.startsWith('.github/') || destName === 'CODEOWNERS' || destName === 'PULL_REQUEST_TEMPLATE.md')) {
      continue;
    }

    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, destName);

    await fs.ensureDir(path.dirname(dest));

    const content = await fs.readFile(src, 'utf8');
    await fs.writeFile(dest, interpolate(content, config));
  }
}

/**
 * Scaffold a tier's template files into the target directory — safe mode.
 * Same as scaffoldTier but skips files that already exist at the target path.
 * Used for in-place and from-context init modes to avoid overwriting the user's existing files.
 */
export async function scaffoldTierSafe(tier, targetDir, config, templatesDir) {
  const commonDir = path.join(templatesDir, 'common');
  const tierDir = path.join(templatesDir, `tier-${tier.toLowerCase()}`);

  await copyTemplateDirSafe(commonDir, targetDir, config, {
    'gitignore': '.gitignore',
    'pre-commit-config.yaml': '.pre-commit-config.yaml',
    'adr-template.md': 'docs/adr/template.md',
    'PULL_REQUEST_TEMPLATE.md': '.github/PULL_REQUEST_TEMPLATE.md',
    'CODEOWNERS': '.github/CODEOWNERS',
    'context-review.md': '.claude/rules/context-review.md',
    'files-guide.md': '.claude/files-guide.md',
    'pipeline-standards.md': 'docs/pipeline-standards.md',
    'claudemd-standards.md': 'docs/claudemd-standards.md',
  }, config, ['rules']);

  if (await fs.pathExists(tierDir)) {
    await copyTemplateDirSafe(tierDir, targetDir, config, {}, config, []);
  }

  const commonRulesDir = path.join(commonDir, 'rules');
  if (await fs.pathExists(commonRulesDir)) {
    const rules = await fs.readdir(commonRulesDir);
    for (const rule of rules) {
      const src = path.join(commonRulesDir, rule);
      const dest = path.join(targetDir, '.claude', 'rules', rule);
      if (await fs.pathExists(dest)) continue;
      await fs.ensureDir(path.dirname(dest));
      const content = await fs.readFile(src, 'utf8');
      await fs.writeFile(dest, interpolate(content, config));
    }
  }

  await fs.ensureDir(path.join(targetDir, '.claude', 'session'));
  await fs.ensureDir(path.join(targetDir, 'docs', 'adr'));

  if (!config.includePreCommit) {
    await fs.remove(path.join(targetDir, '.pre-commit-config.yaml'));
  }
  if (!config.includeGithub) {
    await fs.remove(path.join(targetDir, '.github'));
  }

  if (tier === 'm' || tier === 'l') {
    await pruneConditionalDocs(targetDir, config);
    await pruneSkills(targetDir, config);
  }
}

async function copyTemplateDirSafe(srcDir, destDir, config, fileNameMap, userConfig, skipDirs = []) {
  if (!(await fs.pathExists(srcDir))) return;

  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (skipDirs.includes(entry.name)) continue;
      const subSrc = path.join(srcDir, entry.name);
      const subDest = path.join(destDir, entry.name);
      await copyTemplateDirSafe(subSrc, subDest, config, {}, userConfig, []);
      continue;
    }

    const destName = fileNameMap[entry.name] || entry.name;

    if (!userConfig.includeGithub && (destName.startsWith('.github/') || destName === 'CODEOWNERS' || destName === 'PULL_REQUEST_TEMPLATE.md')) {
      continue;
    }

    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, destName);

    // Safe mode: skip if file already exists
    if (await fs.pathExists(dest)) continue;

    await fs.ensureDir(path.dirname(dest));
    const content = await fs.readFile(src, 'utf8');
    await fs.writeFile(dest, interpolate(content, config));
  }
}

/**
 * Replace template placeholders with actual values from config.
 */
function interpolate(content, config) {
  const techStackLabels = {
    'node-ts': 'Node.js + TypeScript',
    'node-js': 'Node.js + JavaScript',
    python: 'Python',
    go: 'Go',
    swift: 'Swift / macOS',
    kotlin: 'Kotlin / Android',
    rust: 'Rust',
    dotnet: '.NET / C#',
    ruby: 'Ruby',
    java: 'Java',
    other: 'Mixed',
  };

  const nativeCommandDefaults = {
    swift:  { install: '# no install step', dev: 'swift run',    build: 'xcodebuild build',     test: 'xcodebuild test',  typeCheck: '# type checking handled by compiler' },
    kotlin: { install: '# no install step', dev: './gradlew run', build: './gradlew build',      test: './gradlew test',   typeCheck: '# type checking handled by compiler' },
    rust:   { install: '# no install step', dev: 'cargo run',    build: 'cargo build --release', test: 'cargo test',       typeCheck: '# type checking handled by compiler' },
    dotnet: { install: 'dotnet restore',    dev: 'dotnet run',   build: 'dotnet build',          test: 'dotnet test',      typeCheck: '# type checking handled by compiler' },
    java:   { install: 'mvn install',       dev: 'mvn exec:java', build: 'mvn package',          test: 'mvn test',         typeCheck: '# type checking handled by compiler' },
  };
  const ncd = nativeCommandDefaults[config.techStack] || {};

  return content
    .replace(/\[PROJECT_NAME\]/g, config.projectName || 'My Project')
    .replace(/\[TECH_STACK_SUMMARY\]/g, techStackLabels[config.techStack] || config.techStack || 'Mixed')
    .replace(/\[TYPE_CHECK_COMMAND\]/g, config.typeCheckCommand || ncd.typeCheck || 'npx tsc --noEmit')
    .replace(/\[TEST_COMMAND\]/g, config.testCommand || ncd.test || 'npm test')
    .replace(/\[BUILD_COMMAND\]/g, config.buildCommand || ncd.build || 'npm run build')
    .replace(/\[DEV_COMMAND\]/g, config.devCommand || ncd.dev || 'npm run dev')
    .replace(/\[INSTALL_COMMAND\]/g, config.installCommand || ncd.install || 'npm install')
    .replace(/\[TECH_LEAD\]/g, config.techLead || 'tech-lead')
    .replace(/\[BACKEND_LEAD\]/g, config.backendLead || 'backend-lead')
    .replace(/\[SECURITY_REVIEWER\]/g, config.securityReviewer || 'security-reviewer')
    .replace(/\[E2E_COMMAND\]/g, config.e2eCommand || '# not configured')
    .replace(/\[HAS_API\]/g, config.hasApi === false ? 'false' : 'true')
    .replace(/\[HAS_DATABASE\]/g, config.hasDatabase === false ? 'false' : 'true')
    .replace(/\[HAS_FRONTEND\]/g, config.hasFrontend === false ? 'false' : 'true')
    .replace(/\[HAS_E2E\]/g, config.hasE2E ? 'true' : 'false')
    .replace(/\[AUDIT_MODEL\]/g, config.auditModel || AUDIT_MODEL_DEFAULT)
    .replace(/\[DESIGN_SYSTEM_NAME\]/g, config.designSystemName || 'component library')
    .replace(/\[HAS_PRD\]/g, config.hasPrd ? 'true' : 'false')
    .replace(/\[FRAMEWORK\]/g, ['swift', 'kotlin', 'rust', 'dotnet'].includes(config.techStack) ? 'N/A — native app' : config.hasFrontend === false ? 'N/A — no web frontend' : 'your frontend framework')
    .replace(/\[SITEMAP_OR_ROUTE_LIST\]/g, config.hasFrontend === false ? 'N/A — no web frontend' : 'docs/sitemap.md')
    .replace(/\[API_ROUTES_PATH\]/g, config.hasApi === false ? 'N/A — no API routes' : 'src/app/api/')
    .replace(/\[BUNDLE_TOOL\]/g, 'your build tool\'s bundle analyzer');
}
