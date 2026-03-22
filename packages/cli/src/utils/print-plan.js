import chalk from 'chalk';

const TIER_LABELS = { S: 'Fast Lane', M: 'Standard', L: 'Full' };

export function printPlan(config) {
  const tier = (config.tier || 's').toUpperCase();
  const mode = config.mode || 'greenfield';

  console.log(chalk.bold('Project:') + ` ${config.projectName}`);
  console.log(chalk.bold('Mode:')    + ` ${formatMode(mode)}`);
  console.log(chalk.bold('Tier:')    + ` ${tier} — ${TIER_LABELS[tier]}`);
  if (config.techStack) console.log(chalk.bold('Stack:') + ` ${config.techStack}`);
  console.log();
  console.log(chalk.bold('Files that will be created:'));

  getFilePlan(config).forEach(f => console.log(`  ${chalk.dim('+')} ${f}`));

  if (config.mode === 'from-context') {
    console.log();
    console.log(chalk.bold('Context sources:'));
    (config.sourceRepos || []).forEach(r => console.log(`  ${chalk.dim('→')} ${r.source}`));
    (config.sourceDocs || []).forEach(d => console.log(`  ${chalk.dim('→')} ${d}`));
  }
}

export function printNextSteps(config) {
  const mode = config.mode || 'greenfield';

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
      console.log(`  ${step + 3}. Run ` + chalk.cyan('pip install pre-commit && pre-commit install') + ' to activate secret scanning');
    }
    console.log(`  ${step + (config.includePreCommit ? 4 : 3)}. Open Claude Code — run ` + chalk.cyan('/arch-audit') + ' to verify setup');
  }

  if (mode === 'from-context') {
    console.log('  1. ' + chalk.cyan('cd ' + config.projectName));
    console.log('  2. Open Claude Code: ' + chalk.cyan('claude'));
    console.log('  3. Claude will detect ' + chalk.cyan('CONTEXT_IMPORT.md') + ' and start the discovery pass automatically');
    console.log('     It will read your source repos and docs, then populate CLAUDE.md and docs/');
    console.log('  4. Confirm the discovery summary and answer any gap questions');
    console.log('  5. Run ' + chalk.cyan('npx claude-dev-kit doctor') + ' after discovery completes');
  }

  if (mode === 'in-place') {
    console.log('  1. Open Claude Code: ' + chalk.cyan('claude'));
    console.log('  2. Claude will detect ' + chalk.cyan('CONTEXT_IMPORT.md') + ' and start the discovery pass automatically');
    console.log('     It will read the existing codebase and populate CLAUDE.md, requirements.md, etc.');
    console.log('  3. Confirm the discovery summary and answer any gap questions');
    console.log('  4. Run ' + chalk.cyan('npx claude-dev-kit doctor') + ' after discovery completes');
    if (config.includePreCommit) {
      console.log('  5. Run ' + chalk.cyan('pip install pre-commit && pre-commit install') + ' to activate secret scanning');
    }
  }
}

function formatMode(mode) {
  return { greenfield: 'Greenfield', 'from-context': 'From context', 'in-place': 'In-place' }[mode] || mode;
}

function getFilePlan(config) {
  const tier = (config.tier || 's').toUpperCase();
  const mode = config.mode || 'greenfield';

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
