/**
 * sync-from-pilot — extract agnostic governance updates from a pilot project
 * and apply them to the CDK templates.
 *
 * Usage:
 *   node packages/cli/src/index.js sync-from-pilot --source /path/to/pilot
 *   node packages/cli/src/index.js sync-from-pilot --source /path/to/pilot --tier m
 *   node packages/cli/src/index.js sync-from-pilot --source /path/to/pilot --dry-run
 *
 * The command reads .claude/rules/pipeline.md and .claude/skills/*\/SKILL.md
 * from the source project, strips domain-specific tokens, then diffs the result
 * against the CDK templates and reports (or applies) the delta.
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');

// ---------------------------------------------------------------------------
// Agnostic filter — tokens that mark content as domain-specific.
// Lines containing ANY of these tokens are stripped from source content
// before comparison. Add tokens here as new pilot-specific patterns emerge.
// ---------------------------------------------------------------------------
const DOMAIN_TOKENS = [
  // Project names and branding
  'staff-manager',
  'staff-staging',
  'staff.peerpetual',
  'peerpetual',
  'sm-fix',
  'sm-deploy',
  'sm-cleanup',

  // Infrastructure identifiers
  'gjwkvgfwkdwzqlvudgqr',   // staging Supabase project ID
  'nyajqcjqmgxctlqighql',   // production Supabase project ID
  'mcp__claude_ai_Supabase',
  'execute_sql',
  'supabase/migrations',
  'staging DB',
  'production DB',

  // Project-specific URLs
  'staff-staging.peerpetual.it',
  'staff.peerpetual.it',
  'vercel',

  // Domain model references
  'entity-manifest',
  'prd/01-rbac-matrix',
  'docs/prd/',
  'profile-editing-contract',
  'docs/sitemap',
  'docs/db-map',
  'docs/dependency-map',
  'liquidazione',
  'compensi',
  'compensazioni',
  'rimborsi',
  'responsabile',
  'collaboratore',
  'uscente',

  // Test accounts
  'collaboratore_test@test.com',
  'responsabile_compensi_test@test.com',
  'admin_test@test.com',
  '@test.com',
  '@test.local',

  // Worktree-specific commands (staff-manager uses worktrees; CDK uses branches)
  'worktree add',
  'worktrees/',
  'EnterWorktree',
  'ExitWorktree',
  'symlinkDirectories',
  '.next',             // Next.js build artefact — too specific

  // Framework-specific (Next.js)
  'npx tsc --noEmit',
  'npm run build',
  'npx vitest',
  'usebruno',
  'Bruno',
  '.bru',
  'loading.tsx',
  'app/api/',
  'page.tsx',
  'await params',      // Next.js 15 breaking change — not agnostic
  'proxy.ts',
  'lib/nav.ts',
  'lib/transitions',
  'shadcn',

  // Italian execution keywords and UI text
  'Esegui',
  'Procedi',
  'Confermo',
  'procedi',
  'confermo',

  // Figma MCP file ID
  'p9kUAQ2qNVg4PojTBEkSmC',
  'get_variable_defs',

  // GSheets integration
  'GSheet',
  'gdoc-append',
  'Google Docs',

  // Resend email provider
  'resend-verify',
  '/resend-verify',

  // Port detection (Node.js + worktree pattern)
  'lsof -ti:',
  'staff-dev.log',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return a filtered version of `content` with domain-specific lines removed.
 * A line is removed if it contains any DOMAIN_TOKENS entry (case-insensitive).
 * Empty lines that result from stripping are collapsed (max 2 consecutive blank lines).
 */
function filterAgnostic(content) {
  const lines = content.split('\n');
  const filtered = lines.filter(line => {
    const lower = line.toLowerCase();
    return !DOMAIN_TOKENS.some(token => lower.includes(token.toLowerCase()));
  });

  // Collapse consecutive blank lines down to max 1
  const collapsed = [];
  let blanks = 0;
  for (const line of filtered) {
    if (line.trim() === '') {
      blanks++;
      if (blanks <= 1) collapsed.push(line);
    } else {
      blanks = 0;
      collapsed.push(line);
    }
  }
  return collapsed.join('\n');
}

/**
 * Produce a simple line-level diff summary between two strings.
 * Returns { added, removed, unchanged } line counts and a list of changed sections.
 */
function diffSummary(original, updated) {
  const origLines = new Set(original.split('\n').map(l => l.trim()).filter(Boolean));
  const updLines = new Set(updated.split('\n').map(l => l.trim()).filter(Boolean));

  const added = [...updLines].filter(l => !origLines.has(l)).length;
  const removed = [...origLines].filter(l => !updLines.has(l)).length;
  const unchanged = [...origLines].filter(l => updLines.has(l)).length;

  return { added, removed, unchanged };
}

/**
 * Read a file if it exists, return null otherwise.
 */
function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

// ---------------------------------------------------------------------------
// Core sync logic
// ---------------------------------------------------------------------------

/**
 * Sync a single file: read from source, filter, diff against template, apply.
 */
function syncFile({ sourceFile, templateFile, label, dryRun, verbose }) {
  const sourceContent = readIfExists(sourceFile);
  if (!sourceContent) {
    if (verbose) console.log(chalk.gray(`  skip ${label} — not found in source`));
    return { status: 'skipped' };
  }

  const templateContent = readIfExists(templateFile);
  if (!templateContent) {
    if (verbose) console.log(chalk.gray(`  skip ${label} — template file not found`));
    return { status: 'skipped' };
  }

  const filtered = filterAgnostic(sourceContent);
  const diff = diffSummary(templateContent, filtered);

  if (diff.added === 0 && diff.removed === 0) {
    console.log(chalk.green(`  ✓ ${label} — already up to date`));
    return { status: 'up-to-date' };
  }

  console.log(
    chalk.yellow(`  ~ ${label}`) +
    chalk.gray(` (+${diff.added} lines, -${diff.removed} lines)`)
  );

  if (!dryRun) {
    fs.writeFileSync(templateFile, filtered, 'utf8');
    console.log(chalk.green(`    written → ${path.relative(process.cwd(), templateFile)}`));
  } else {
    console.log(chalk.gray(`    [dry-run] would write → ${path.relative(process.cwd(), templateFile)}`));
  }

  return { status: dryRun ? 'pending' : 'updated', diff };
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export async function syncFromPilot(options) {
  const { source, tier, dryRun, verbose } = options;

  if (!source) {
    console.error(chalk.red('Error: --source <path> is required'));
    console.log(`  Example: claude-dev-kit sync-from-pilot --source ~/Projects/my-pilot`);
    process.exit(1);
  }

  const sourcePath = path.resolve(source);
  if (!fs.existsSync(sourcePath)) {
    console.error(chalk.red(`Error: source path not found: ${sourcePath}`));
    process.exit(1);
  }

  const tiers = tier ? [tier] : ['m', 'l'];
  const validTiers = ['m', 'l'];
  for (const t of tiers) {
    if (!validTiers.includes(t)) {
      console.error(chalk.red(`Error: invalid tier "${t}". Valid values: m, l`));
      process.exit(1);
    }
  }

  console.log();
  console.log(chalk.bold('sync-from-pilot'));
  console.log(chalk.gray(`  source : ${sourcePath}`));
  console.log(chalk.gray(`  tiers  : ${tiers.map(t => `tier-${t}`).join(', ')}`));
  console.log(chalk.gray(`  mode   : ${dryRun ? 'dry-run (no writes)' : 'apply'}`));
  console.log();

  // Resolve source files
  const sourcePipeline = path.join(sourcePath, '.claude', 'rules', 'pipeline.md');
  const sourceSkillsDir = path.join(sourcePath, '.claude', 'skills');

  // Discover skills in source
  let sourceSkills = [];
  if (fs.existsSync(sourceSkillsDir)) {
    sourceSkills = fs.readdirSync(sourceSkillsDir)
      .filter(name => {
        const skillFile = path.join(sourceSkillsDir, name, 'SKILL.md');
        return fs.existsSync(skillFile);
      });
  }

  const results = { updated: 0, skipped: 0, upToDate: 0, errors: 0 };

  for (const t of tiers) {
    const tierDir = path.join(TEMPLATES_DIR, `tier-${t}`);
    console.log(chalk.bold.blue(`tier-${t}`));

    // --- pipeline.md ---
    const pipelineResult = syncFile({
      sourceFile: sourcePipeline,
      templateFile: path.join(tierDir, '.claude', 'rules', 'pipeline.md'),
      label: 'pipeline.md',
      dryRun,
      verbose,
    });
    if (pipelineResult.status === 'updated') results.updated++;
    else if (pipelineResult.status === 'skipped') results.skipped++;
    else if (pipelineResult.status === 'up-to-date') results.upToDate++;

    // --- skills ---
    const tierSkillsDir = path.join(tierDir, '.claude', 'skills');
    if (!fs.existsSync(tierSkillsDir)) {
      console.log(chalk.gray(`  skip skills — no .claude/skills/ in tier-${t} template`));
      continue;
    }

    const tierSkills = fs.readdirSync(tierSkillsDir).filter(name =>
      fs.existsSync(path.join(tierSkillsDir, name, 'SKILL.md'))
    );

    for (const skillName of tierSkills) {
      // Only sync skills that exist in both source and template
      if (!sourceSkills.includes(skillName)) {
        if (verbose) console.log(chalk.gray(`  skip skill/${skillName} — not in source`));
        results.skipped++;
        continue;
      }

      const skillResult = syncFile({
        sourceFile: path.join(sourceSkillsDir, skillName, 'SKILL.md'),
        templateFile: path.join(tierSkillsDir, skillName, 'SKILL.md'),
        label: `skills/${skillName}/SKILL.md`,
        dryRun,
        verbose,
      });
      if (skillResult.status === 'updated') results.updated++;
      else if (skillResult.status === 'skipped') results.skipped++;
      else if (skillResult.status === 'up-to-date') results.upToDate++;
    }

    console.log();
  }

  // Summary
  console.log(chalk.bold('Summary'));
  console.log(`  ${chalk.green(results.updated + ' updated')}  ${chalk.gray(results.upToDate + ' up-to-date')}  ${chalk.gray(results.skipped + ' skipped')}`);

  if (dryRun && results.updated > 0) {
    console.log();
    console.log(chalk.yellow('Dry-run mode — no files were written. Re-run without --dry-run to apply.'));
  }

  if (!dryRun && results.updated > 0) {
    console.log();
    console.log(chalk.gray('Tip: run `node packages/cli/test/integration/run.js` to verify templates are still valid.'));
  }
}
