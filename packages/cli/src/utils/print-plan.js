import chalk from 'chalk';
import { execSync } from 'child_process';

const TIER_LABELS = { '0': 'Discovery', S: 'Fast Lane', M: 'Standard', L: 'Full' };

export function printPlan(config) {
  const tier = (config.tier || 's').toUpperCase();
  const mode = config.mode || 'greenfield';

  console.log(chalk.bold('Project:') + ` ${config.projectName}`);
  console.log(chalk.bold('Mode:')    + ` ${formatMode(mode)}`);
  console.log(chalk.bold('Tier:')    + ` ${tier} — ${TIER_LABELS[tier] || tier}`);
  if (config.techStack) console.log(chalk.bold('Stack:') + ` ${config.techStack}`);

  // 3.3 — commands summary (only non-misleading values)
  const cmdLines = getCommandSummary(config);
  if (cmdLines.length > 0) {
    console.log();
    console.log(chalk.bold('Commands:'));
    cmdLines.forEach(l => console.log(`  ${l}`));
  }

  console.log();
  console.log(chalk.bold('Files that will be created:'));
  getFilePlan(config).forEach(f => console.log(`  ${chalk.dim('+')} ${f}`));

  // 3.1 — BUG-01: skills section for Tier S/M/L
  if (tier !== '0') {
    const { included, skipped } = getSkillsSummary(config);
    console.log();
    console.log(chalk.bold('Skills included:  ') + included.map(s => chalk.cyan(s)).join('  '));
    if (skipped.length > 0) {
      console.log(chalk.bold('Skills skipped:   ') + skipped.map(s => `${chalk.dim(s.name)} ${chalk.dim('(' + s.reason + ')')}`).join('  '));
    }
  }

  if (mode === 'from-context') {
    console.log();
    console.log(chalk.bold('Context sources:'));
    (config.sourceRepos || []).forEach(r => console.log(`  ${chalk.dim('→')} ${r.source}`));
    (config.sourceDocs  || []).forEach(d => console.log(`  ${chalk.dim('→')} ${d}`));
  }
}

export function printNextSteps(config) {
  const mode = config.mode || 'greenfield';

  // 3.4 — adapt doctor command to execution context
  const doctorCmd = getDoctorCmd();
  // 3.2 — detect package manager for pre-commit
  const preCommitCmd = getPreCommitInstallCmd();

  if (mode === 'greenfield') {
    const tier = (config.tier || 's').toUpperCase();
    if (tier === 'M' || tier === 'L') {
      console.log('  1. Read ' + chalk.cyan('FIRST_SESSION.md') + ' — your team\'s guide to the first session');
    }
    const step = (tier === 'M' || tier === 'L') ? 2 : 1;
    console.log(`  ${step}. Fill in the ` + chalk.cyan('CLAUDE.md') + ' placeholders');
    console.log(`  ${step + 1}. Replace ` + chalk.cyan('[TEST_COMMAND]') + ' in ' + chalk.cyan('.claude/settings.json') + ' Stop hook');
    console.log(`  ${step + 2}. Update ` + chalk.cyan('.github/CODEOWNERS') + ' with real GitHub usernames');
    if (config.includePreCommit) {
      console.log(`  ${step + 3}. Run ` + chalk.cyan(preCommitCmd) + ' to activate secret scanning');
    }
    console.log(`  ${step + (config.includePreCommit ? 4 : 3)}. Open Claude Code — run ` + chalk.cyan('/arch-audit') + ' to verify setup');
  }

  if (mode === 'from-context') {
    console.log('  1. ' + chalk.cyan('cd ' + config.projectName));
    console.log('  2. Open Claude Code: ' + chalk.cyan('claude'));
    console.log('  3. Claude will detect ' + chalk.cyan('CONTEXT_IMPORT.md') + ' and start the discovery pass automatically');
    console.log('     It will read your source repos and docs, then populate CLAUDE.md and docs/');
    console.log('  4. Confirm the discovery summary and answer any gap questions');
    console.log('  5. Run ' + chalk.cyan(doctorCmd) + ' after discovery completes');
  }

  if (mode === 'in-place') {
    console.log('  1. Open Claude Code: ' + chalk.cyan('claude'));
    console.log('  2. Claude will detect ' + chalk.cyan('CONTEXT_IMPORT.md') + ' and start the discovery pass automatically');
    console.log('     It will read the existing codebase and populate CLAUDE.md, requirements.md, etc.');
    console.log('  3. Confirm the discovery summary and answer any gap questions');
    console.log('  4. Run ' + chalk.cyan(doctorCmd) + ' after discovery completes');
    if (config.includePreCommit) {
      console.log('  5. Run ' + chalk.cyan(preCommitCmd) + ' to activate secret scanning');
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMode(mode) {
  return { greenfield: 'Greenfield', 'from-context': 'From context', 'in-place': 'In-place' }[mode] || mode;
}

/**
 * 3.2 — Detect the right pre-commit install command for this machine.
 * macOS + Homebrew → brew; everything else → pip.
 */
function getPreCommitInstallCmd() {
  if (process.platform === 'darwin') {
    try {
      execSync('which brew', { stdio: 'pipe' });
      return 'brew install pre-commit && pre-commit install';
    } catch { /* brew not available */ }
  }
  return 'pip install pre-commit && pre-commit install';
}

/**
 * 3.4 — Detect if the CLI is being run from its local source tree (e.g., during
 * development: `node packages/cli/src/index.js`) vs installed via npm/npx.
 * Returns the appropriate doctor command string.
 */
function getDoctorCmd() {
  const argv1 = process.argv[1] || '';
  const isLocal = argv1.endsWith('index.js') && !argv1.includes('node_modules');
  return isLocal ? `node ${argv1} doctor` : 'npx mg-claude-dev-kit doctor';
}

/**
 * 3.3 — Return command lines to display in the summary, skipping values that are
 * misleading defaults (e.g., "npm run dev" shown for a native/non-web stack).
 */
function getCommandSummary(config) {
  const lines = [];
  const webStacks = ['node-ts', 'node-js', 'python', 'ruby'];
  const nativeStacks = ['swift', 'kotlin', 'rust', 'dotnet', 'java'];
  const isWeb = webStacks.includes(config.techStack);
  const isNative = nativeStacks.includes(config.techStack);

  if (config.testCommand) {
    lines.push(`${chalk.dim('Test:  ')} ${config.testCommand}`);
  }

  if (config.devCommand) {
    // Skip 'npm run dev' for non-web stacks — it's a wrong default, not a real setting
    const isWrongDefault = !isWeb && config.devCommand === 'npm run dev';
    if (!isWrongDefault) {
      const label = isNative ? chalk.dim('Launch:') : chalk.dim('Dev:   ');
      lines.push(`${label} ${config.devCommand}`);
    }
  }

  if (config.e2eCommand) {
    lines.push(`${chalk.dim('E2E:   ')} ${config.e2eCommand}`);
  }

  // Show audit model when it matters (Tier M/L + UI present)
  const tier = (config.tier || 's').toUpperCase();
  if ((tier === 'M' || tier === 'L') && config.hasFrontend !== false && config.auditModel) {
    lines.push(`${chalk.dim('Audit: ')} ${config.auditModel}`);
  }

  return lines;
}

/**
 * 3.1 — BUG-01: compute the skills included/skipped based on config flags.
 * Mirrors the logic in scaffold/index.js → pruneSkills().
 */
function getSkillsSummary(config) {
  const tier = (config.tier || 's').toUpperCase();

  // Tier S: fixed set, no pruning
  if (tier === 'S') {
    return { included: ['arch-audit', 'commit'], skipped: [] };
  }

  // Tier M / L: full set with conditional pruning
  const included = ['arch-audit', 'skill-dev', 'perf-audit', 'commit', 'security-audit'];
  const skipped = [];

  if (config.hasApi !== false) {
    included.push('api-design');
  } else {
    skipped.push({ name: 'api-design', reason: 'no API layer' });
  }

  if (config.hasDatabase !== false) {
    included.push('skill-db');
  } else {
    skipped.push({ name: 'skill-db', reason: 'no database' });
  }

  if (config.hasFrontend !== false) {
    included.push('responsive-audit', 'visual-audit', 'ux-audit');
    if (config.hasDesignSystem !== false) {
      included.push('ui-audit');
    } else {
      skipped.push({ name: 'ui-audit', reason: 'no design system' });
    }
  } else {
    skipped.push(
      { name: 'responsive-audit', reason: 'no UI' },
      { name: 'visual-audit',     reason: 'no UI' },
      { name: 'ux-audit',         reason: 'no UI' },
      { name: 'ui-audit',         reason: 'no UI' },
    );
  }

  return { included, skipped };
}

function getFilePlan(config) {
  const tier = (config.tier || 's').toUpperCase();
  const mode = config.mode || 'greenfield';

  // Tier 0 is a minimal scaffold — no pipeline, no rules, no governance layer
  if (tier === '0') {
    return [
      'CLAUDE.md',
      'GETTING_STARTED.md',
      '.claude/settings.json',
      '.claude/session/  (directory)',
    ];
  }

  const base = [
    '.claude/settings.json',
    `.claude/rules/pipeline.md  (Tier ${tier})`,
    '.claude/rules/context-review.md',
    '.claude/rules/security.md',
    '.claude/rules/git.md',
    '.claude/files-guide.md',
    '.claude/session/  (directory)',
  ];

  if (mode === 'greenfield') {
    base.unshift('CLAUDE.md');
    base.push('README.md');
  } else {
    base.push('CONTEXT_IMPORT.md  ← Claude reads this and fills in the rest');
  }

  if (mode === 'greenfield' && (tier === 'M' || tier === 'L')) {
    base.push('MEMORY.md');
  }

  if (tier === 'M' || tier === 'L') {
    if (mode === 'greenfield') {
      base.push('FIRST_SESSION.md  ← start here', 'docs/requirements.md', 'docs/implementation-checklist.md', 'docs/refactoring-backlog.md');
    } else {
      base.push('docs/  (populated by Claude during discovery)');
    }
    base.push('docs/adr/template.md');
  }

  if (tier === 'L' && mode === 'greenfield') {
    base.push('docs/sitemap.md', 'docs/dependency-map.md');
  }

  if (config.includeGithub !== false) {
    base.push('.github/PULL_REQUEST_TEMPLATE.md', '.github/CODEOWNERS');
  }

  if (config.includePreCommit !== false) {
    base.push('.pre-commit-config.yaml');
  }

  if (mode === 'from-context') {
    base.push('.claude/context/  (cloned repos + docs)');
  }

  return base;
}
