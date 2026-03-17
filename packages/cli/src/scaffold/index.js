import fs from 'fs-extra';
import path from 'path';

/**
 * Scaffold a tier's template files into the target directory.
 * Copies common files first, then tier-specific files (tier overrides common).
 */
export async function scaffoldTier(tier, targetDir, config, templatesDir) {
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
 * Replace template placeholders with actual values from config.
 */
function interpolate(content, config) {
  const tier = (config.tier || 's').toUpperCase();
  const tierLabel = { S: 'Fast Lane', M: 'Standard', L: 'Full' }[tier] || '';

  return content
    .replace(/\[PROJECT_NAME\]/g, config.projectName || 'My Project')
    .replace(/\[TYPE_CHECK_COMMAND\]/g, config.typeCheckCommand || 'npx tsc --noEmit')
    .replace(/\[TEST_COMMAND\]/g, config.testCommand || 'npm test')
    .replace(/\[BUILD_COMMAND\]/g, config.buildCommand || 'npm run build')
    .replace(/\[DEV_COMMAND\]/g, config.devCommand || 'npm run dev')
    .replace(/\[INSTALL_COMMAND\]/g, config.installCommand || 'npm install')
    .replace(/\[TECH_LEAD\]/g, config.techLead || 'tech-lead')
    .replace(/\[BACKEND_LEAD\]/g, config.backendLead || 'backend-lead')
    .replace(/\[SECURITY_REVIEWER\]/g, config.securityReviewer || 'security-reviewer');
}
