import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectStack } from '../utils/detect-stack.js';
import { scaffoldTierSafe } from '../scaffold/index.js';
import { generateContextImport } from '../generators/context-import.js';
import { printPlan, printNextSteps } from '../utils/print-plan.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');

export async function initInPlace(options) {
  const cwd = process.cwd();

  console.log();
  console.log(chalk.dim(`Analyzing existing project at ${cwd}...`));

  // ── Auto-detect stack ────────────────────────────────────────────────

  const detected = await detectStack(cwd);

  if (detected.detectedFiles.length > 0) {
    console.log(chalk.dim(`Detected: ${detected.detectedFiles.join(', ')}`));
  }

  // ── Confirmation wizard ──────────────────────────────────────────────

  const stackLabel = {
    'node-ts': 'Node.js / TypeScript',
    'node-js': 'Node.js / JavaScript',
    python: 'Python',
    go: 'Go',
    other: 'Other / mixed',
  }[detected.techStack] || detected.techStack;

  const tierDefault = detected.suggestedTier || 'm';
  const tierLabels = { s: 'Fast Lane', m: 'Standard', l: 'Full' };

  console.log();

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: path.basename(cwd),
    },
    {
      type: 'list',
      name: 'techStack',
      message: 'Tech stack:',
      default: detected.techStack,
      choices: [
        { name: `Node.js / TypeScript${detected.techStack === 'node-ts' ? chalk.dim(' (detected)') : ''}`, value: 'node-ts' },
        { name: `Node.js / JavaScript${detected.techStack === 'node-js' ? chalk.dim(' (detected)') : ''}`, value: 'node-js' },
        { name: `Python${detected.techStack === 'python' ? chalk.dim(' (detected)') : ''}`, value: 'python' },
        { name: `Go${detected.techStack === 'go' ? chalk.dim(' (detected)') : ''}`, value: 'go' },
        { name: 'Other / mixed', value: 'other' },
      ],
    },
    {
      type: 'input',
      name: 'testCommand',
      message: 'Test command:',
      default: detected.testCommand || 'npm test',
    },
    {
      type: 'input',
      name: 'typeCheckCommand',
      message: 'Type check command (blank if none):',
      default: detected.typeCheckCommand || '',
      when: (a) => ['node-ts', 'node-js'].includes(a.techStack),
    },
    {
      type: 'input',
      name: 'devCommand',
      message: 'Dev server command:',
      default: detected.devCommand || 'npm run dev',
    },
    {
      type: 'list',
      name: 'tier',
      message: `Pipeline tier (suggested: ${tierDefault.toUpperCase()} — ${tierLabels[tierDefault]}):`,
      when: !options.tier,
      default: tierDefault,
      choices: [
        { name: 'S — Fast Lane    (bugfixes, ≤3 files)', value: 's' },
        { name: 'M — Standard     (feature blocks, 1–2 weeks)', value: 'm' },
        { name: 'L — Full         (complex domain, long-running)', value: 'l' },
      ],
    },
    {
      type: 'input',
      name: 'e2eCommand',
      message: 'E2E test command (Playwright/Cypress — leave blank to skip):',
      when: (a) => {
        const tier = options.tier || a.tier;
        return tier === 'm' || tier === 'l';
      },
      default: '',
    },
    // Feature flags — tier M/L only
    {
      type: 'list',
      name: 'hasApi',
      message: 'Does your project have an API layer?',
      when: (a) => {
        const tier = options.tier || a.tier;
        return tier === 'm' || tier === 'l';
      },
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
    },
    {
      type: 'list',
      name: 'hasDatabase',
      message: 'Does your project use a database?',
      when: (a) => {
        const tier = options.tier || a.tier;
        return tier === 'm' || tier === 'l';
      },
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
    },
    {
      type: 'list',
      name: 'hasFrontend',
      message: 'Does your project have a frontend / UI?',
      when: (a) => {
        const tier = options.tier || a.tier;
        return tier === 'm' || tier === 'l';
      },
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
    },
    {
      type: 'list',
      name: 'hasDesignSystem',
      message: 'Do you use a component library or design system?',
      when: (a) => {
        const tier = options.tier || a.tier;
        return (tier === 'm' || tier === 'l') && a.hasFrontend === true;
      },
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
    },
    {
      type: 'input',
      name: 'designSystemName',
      message: 'Design system name (e.g. shadcn/ui, MUI, Ant Design):',
      when: (a) => {
        const tier = options.tier || a.tier;
        return (tier === 'm' || tier === 'l') && a.hasFrontend === true && a.hasDesignSystem === true;
      },
      default: 'component library',
    },
    {
      type: 'list',
      name: 'auditModel',
      message: 'Preferred model for heavy audit skills (ux-audit, visual-audit)?',
      when: (a) => {
        const tier = options.tier || a.tier;
        return (tier === 'm' || tier === 'l') && a.hasFrontend === true;
      },
      choices: [
        { name: 'Sonnet — faster, lower cost  (recommended)', value: 'sonnet' },
        { name: 'Opus   — more thorough, higher cost', value: 'opus' },
      ],
      default: 'sonnet',
    },
    {
      type: 'confirm',
      name: 'hasPrd',
      message: 'Track a Product Requirements Document (PRD) per block?',
      when: (a) => {
        const tier = options.tier || a.tier;
        return tier === 'm' || tier === 'l';
      },
      default: false,
    },
    {
      type: 'confirm',
      name: 'includePreCommit',
      message: 'Include pre-commit config (secret scanning + AI commit audit)?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'includeGithub',
      message: 'Include .github/ (PR template + CODEOWNERS)?',
      default: true,
    },
  ]);

  const config = {
    ...answers,
    tier: options.tier || answers.tier,
    mode: 'in-place',
    // Pass detected values as fallbacks for the Stop hook interpolation
    buildCommand: detected.buildCommand,
    installCommand: detected.installCommand,
    hasE2E: answers.e2eCommand ? answers.e2eCommand.trim() !== '' : false,
    hasApi: answers.hasApi,
    hasDatabase: answers.hasDatabase,
    hasFrontend: answers.hasFrontend,
    hasDesignSystem: answers.hasDesignSystem,
    designSystemName: answers.designSystemName || 'component library',
    auditModel: answers.auditModel || 'sonnet',
    hasPrd: answers.hasPrd ?? false,
  };

  // ── Conflict preview ─────────────────────────────────────────────────

  const conflicts = await detectConflicts(cwd, config);
  if (conflicts.length > 0) {
    console.log();
    console.log(chalk.yellow('These files already exist and will NOT be overwritten:'));
    conflicts.forEach(f => console.log(`  ${chalk.dim('=')} ${f}`));
  }

  if (options.dryRun) {
    console.log();
    console.log(chalk.yellow('Dry run — no files will be written.'));
    console.log();
    printPlan(config);
    return;
  }

  // ── Scaffold (safe mode — no overwrites) ─────────────────────────────

  const spinner = ora('Adding governance scaffold to existing project...').start();

  try {
    await scaffoldTierSafe(config.tier, cwd, config, TEMPLATES_DIR);
    spinner.text = 'Generating CONTEXT_IMPORT.md...';
    await generateContextImport(config, cwd, [{ name: path.basename(cwd), path: cwd, source: '.' }], []);
    spinner.succeed('Governance scaffold added.');
  } catch (err) {
    spinner.fail('Scaffolding failed.');
    console.error(chalk.red(err.message));
    process.exit(1);
  }

  // Append .claude/session to existing .gitignore if needed
  await appendIfMissing(cwd, [
    '.claude/session/',
    '.claude/context/',
    '.claude/CLAUDE.local.md',
    '.claude/settings.local.json',
    'CONTEXT_IMPORT.md',
  ]);

  // ── Summary ──────────────────────────────────────────────────────────

  console.log();
  console.log(chalk.green.bold('✓ In-place scaffold complete'));
  console.log();
  printPlan(config);
  console.log();
  console.log(chalk.bold('Next steps:'));
  printNextSteps(config);
  console.log();
  console.log(chalk.dim('Docs: https://github.com/marcoguillermaz/claude-dev-kit'));
}

async function detectConflicts(dir, config) {
  const fs = (await import('fs-extra')).default;
  const critical = ['CLAUDE.md', 'MEMORY.md', '.gitignore', 'README.md'];
  const conflicts = [];
  for (const f of critical) {
    if (await fs.pathExists(path.join(dir, f))) conflicts.push(f);
  }
  return conflicts;
}

async function appendIfMissing(dir, entries) {
  const fs = (await import('fs-extra')).default;
  const gitignorePath = path.join(dir, '.gitignore');
  let content = '';

  if (await fs.pathExists(gitignorePath)) {
    content = await fs.readFile(gitignorePath, 'utf8');
  }

  const toAdd = entries.filter(e => !content.includes(e));
  if (toAdd.length > 0) {
    const section = '\n# claude-dev-kit\n' + toAdd.join('\n') + '\n';
    await fs.appendFile(gitignorePath, section);
  }
}
