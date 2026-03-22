import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');

// Files that are safe to upgrade (non-destructive — they don't contain user content)
const UPGRADEABLE_FILES = [
  { template: 'common/context-review.md', target: '.claude/rules/context-review.md' },
  { template: 'common/rules/security.md', target: '.claude/rules/security.md' },
  { template: 'common/rules/git.md', target: '.claude/rules/git.md' },
  { template: 'common/files-guide.md', target: '.claude/files-guide.md' },
  { template: 'common/PULL_REQUEST_TEMPLATE.md', target: '.github/PULL_REQUEST_TEMPLATE.md' },
];

// Files that require user review before upgrade (they may contain customizations)
const REVIEW_REQUIRED = [
  '.claude/rules/pipeline.md',
  '.claude/settings.json',
  'CLAUDE.md',
  'MEMORY.md',
];

export async function upgrade(options) {
  const cwd = process.cwd();
  console.log();
  console.log(chalk.bold('claude-dev-kit upgrade'));
  console.log();

  const updates = [];
  const skipped = [];

  for (const file of UPGRADEABLE_FILES) {
    const templatePath = path.join(TEMPLATES_DIR, file.template);
    const targetPath = path.join(cwd, file.target);

    if (!fs.existsSync(templatePath)) continue;

    if (!fs.existsSync(targetPath)) {
      updates.push({ ...file, reason: 'new file' });
      continue;
    }

    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const targetContent = fs.readFileSync(targetPath, 'utf8');

    if (templateContent !== targetContent) {
      updates.push({ ...file, reason: 'updated in template' });
    }
  }

  if (updates.length === 0) {
    console.log(chalk.green('✓ All upgradeable files are up to date.'));
  } else {
    console.log(chalk.bold(`${updates.length} file(s) to upgrade:`));
    updates.forEach(u => console.log(`  ${chalk.cyan('→')} ${u.target} ${chalk.dim(`(${u.reason})`)}`));
  }

  // Files that need manual review
  console.log();
  console.log(chalk.bold('Requires manual review (may contain your customizations):'));
  REVIEW_REQUIRED.forEach(f => {
    const exists = fs.existsSync(path.join(cwd, f));
    if (exists) {
      console.log(`  ${chalk.yellow('⚠')} ${f} — compare with template manually`);
    }
  });

  if (options.dryRun || updates.length === 0) {
    if (options.dryRun) console.log();
    if (options.dryRun) console.log(chalk.yellow('Dry run — no files written.'));
    return;
  }

  console.log();
  for (const file of updates) {
    const templatePath = path.join(TEMPLATES_DIR, file.template);
    const targetPath = path.join(cwd, file.target);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.copy(templatePath, targetPath);
    console.log(`  ${chalk.green('✓')} Updated ${file.target}`);
  }

  console.log();
  console.log(chalk.green('Upgrade complete.'));
  console.log(chalk.dim('Review the manual-review files above to pick up any improvements.'));
  console.log();
}
