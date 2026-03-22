import fs from 'fs-extra';
import path from 'path';

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

  // Copy common files
  await copyTemplateDir(commonDir, targetDir, config, {
    // Map template filenames to target filenames
    'gitignore': '.gitignore',
    'pre-commit-config.yaml': '.pre-commit-config.yaml',
    'adr-template.md': 'docs/adr/template.md',
    'PULL_REQUEST_TEMPLATE.md': '.github/PULL_REQUEST_TEMPLATE.md',
    'CODEOWNERS': '.github/CODEOWNERS',
    'context-review.md': '.claude/rules/context-review.md',
    'files-guide.md': '.claude/files-guide.md',
  }, config);

  // Copy tier-specific files (these override anything from common with the same target path)
  if (await fs.pathExists(tierDir)) {
    await copyTemplateDir(tierDir, targetDir, config, {}, config);
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
}

async function copyTemplateDir(srcDir, destDir, config, fileNameMap, userConfig) {
  if (!(await fs.pathExists(srcDir))) return;

  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Recursively copy subdirectories (except 'rules' — handled separately)
      if (entry.name === 'rules') continue;
      const subSrc = path.join(srcDir, entry.name);
      const subDest = path.join(destDir, entry.name);
      await copyTemplateDir(subSrc, subDest, config, {}, userConfig);
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
  }, config);

  if (await fs.pathExists(tierDir)) {
    await copyTemplateDirSafe(tierDir, targetDir, config, {}, config);
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
}

async function copyTemplateDirSafe(srcDir, destDir, config, fileNameMap, userConfig) {
  if (!(await fs.pathExists(srcDir))) return;

  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === 'rules') continue;
      const subSrc = path.join(srcDir, entry.name);
      const subDest = path.join(destDir, entry.name);
      await copyTemplateDirSafe(subSrc, subDest, config, {}, userConfig);
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
    other: 'Mixed',
  };

  return content
    .replace(/\[PROJECT_NAME\]/g, config.projectName || 'My Project')
    .replace(/\[TECH_STACK_SUMMARY\]/g, techStackLabels[config.techStack] || config.techStack || 'Mixed')
    .replace(/\[TYPE_CHECK_COMMAND\]/g, config.typeCheckCommand || 'npx tsc --noEmit')
    .replace(/\[TEST_COMMAND\]/g, config.testCommand || 'npm test')
    .replace(/\[BUILD_COMMAND\]/g, config.buildCommand || 'npm run build')
    .replace(/\[DEV_COMMAND\]/g, config.devCommand || 'npm run dev')
    .replace(/\[INSTALL_COMMAND\]/g, config.installCommand || 'npm install')
    .replace(/\[TECH_LEAD\]/g, config.techLead || 'tech-lead')
    .replace(/\[BACKEND_LEAD\]/g, config.backendLead || 'backend-lead')
    .replace(/\[SECURITY_REVIEWER\]/g, config.securityReviewer || 'security-reviewer')
    .replace(/\[E2E_COMMAND\]/g, config.e2eCommand || '# not configured');
}
