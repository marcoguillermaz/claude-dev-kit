import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateClaudeMd } from '../generators/claude-md.js';
import { generateReadme } from '../generators/readme.js';
import { scaffoldTier } from '../scaffold/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../../templates');

export async function init(options) {
  console.log();
  console.log(chalk.bold('claude-dev-kit') + chalk.dim(' — governance-first Claude Code scaffold'));
  console.log();

  // ── Wizard ──────────────────────────────────────────────────────────

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: path.basename(process.cwd()),
      validate: (v) => v.trim().length > 0 || 'Project name is required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Short description (one line):',
      validate: (v) => v.trim().length > 0 || 'Description is required',
    },
    {
      type: 'list',
      name: 'tier',
      message: 'Pipeline tier:',
      when: !options.tier,
      choices: [
        {
          name: 'S — Fast Lane  (bugfixes, ≤3 files, no gates)',
          value: 's',
        },
        {
          name: 'M — Standard   (feature blocks, 5 phases, 1–2 week changes)',
          value: 'm',
        },
        {
          name: 'L — Full       (complex domain, long-running, full governance)',
          value: 'l',
        },
      ],
    },
    {
      type: 'list',
      name: 'techStack',
      message: 'Primary tech stack:',
      choices: [
        { name: 'Node.js / TypeScript', value: 'node-ts' },
        { name: 'Node.js / JavaScript', value: 'node-js' },
        { name: 'Python', value: 'python' },
        { name: 'Go', value: 'go' },
        { name: 'Other / mixed', value: 'other' },
      ],
    },
    {
      type: 'input',
      name: 'testCommand',
      message: 'Test command:',
      default: (a) => {
        const defaults = {
          'node-ts': 'npx vitest run',
          'node-js': 'npm test',
          python: 'pytest',
          go: 'go test ./...',
          other: 'npm test',
        };
        return defaults[a.techStack] || 'npm test';
      },
    },
    {
      type: 'input',
      name: 'typeCheckCommand',
      message: 'Type check command (leave blank if none):',
      when: (a) => ['node-ts'].includes(a.techStack),
      default: 'npx tsc --noEmit',
    },
    {
      type: 'input',
      name: 'devCommand',
      message: 'Dev server command:',
      default: (a) => {
        const defaults = {
          'node-ts': 'npm run dev',
          'node-js': 'npm run dev',
          python: 'python -m uvicorn main:app --reload',
          go: 'go run .',
          other: 'npm run dev',
        };
        return defaults[a.techStack] || 'npm run dev';
      },
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

  const tier = options.tier || answers.tier;
  const config = { ...answers, tier };

  if (options.dryRun) {
    console.log();
    console.log(chalk.yellow('Dry run — no files will be written.'));
    console.log();
    printPlan(config);
    return;
  }

  // ── Scaffold ─────────────────────────────────────────────────────────

  const spinner = ora('Scaffolding project...').start();

  try {
    await scaffoldTier(tier, process.cwd(), config, TEMPLATES_DIR);

    // Generate dynamic files
    await generateClaudeMd(config, process.cwd());
    await generateReadme(config, process.cwd());

    spinner.succeed('Project scaffolded.');
  } catch (err) {
    spinner.fail('Scaffolding failed.');
    console.error(chalk.red(err.message));
    process.exit(1);
  }

  // ── Summary ──────────────────────────────────────────────────────────

  console.log();
  console.log(chalk.green.bold('✓ Done!'));
  console.log();
  printPlan(config);
  console.log();
  console.log(chalk.bold('Next steps:'));
  console.log(`  1. Review and fill in the ${chalk.cyan('CLAUDE.md')} placeholders`);
  console.log(`  2. Replace ${chalk.cyan('[TYPE_CHECK_COMMAND]')} / ${chalk.cyan('[TEST_COMMAND]')} in ${chalk.cyan('.claude/settings.json')} Stop hook`);
  console.log(`  3. Update ${chalk.cyan('.github/CODEOWNERS')} with real GitHub usernames`);
  if (config.includePreCommit) {
    console.log(`  4. Run ${chalk.cyan('pip install pre-commit && pre-commit install')} to activate secret scanning`);
  }
  console.log(`  5. Open Claude Code and run ${chalk.cyan('/arch-audit')} to verify setup`);
  console.log();
  console.log(chalk.dim('Docs: https://github.com/marcoguillermaz/claude-dev-kit'));
}

function printPlan(config) {
  const tier = config.tier.toUpperCase();
  const tierLabel = { S: 'Fast Lane', M: 'Standard', L: 'Full' }[tier];

  console.log(chalk.bold(`Project:`) + ` ${config.projectName}`);
  console.log(chalk.bold(`Tier:`)    + ` ${tier} — ${tierLabel}`);
  console.log(chalk.bold(`Stack:`)   + ` ${config.techStack}`);
  console.log();
  console.log(chalk.bold('Files that would be created:'));

  const files = getFilePlan(config);
  files.forEach(f => console.log(`  ${chalk.dim('+')} ${f}`));
}

function getFilePlan(config) {
  const tier = config.tier.toUpperCase();
  const base = [
    'CLAUDE.md',
    '.claude/settings.json',
    `.claude/rules/pipeline.md  (Tier ${tier})`,
    '.claude/rules/context-review.md',
    '.claude/rules/security.md',
    '.claude/rules/git.md',
    '.claude/files-guide.md',
    'README.md',
  ];

  if (tier !== 'S') {
    base.push(
      'MEMORY.md',
      'docs/requirements.md',
      'docs/implementation-checklist.md',
      'docs/refactoring-backlog.md',
      'docs/adr/template.md',
    );
  }

  if (tier === 'L') {
    base.push(
      'docs/sitemap.md',
      'docs/dependency-map.md',
    );
  }

  if (config.includeGithub) {
    base.push('.github/PULL_REQUEST_TEMPLATE.md', '.github/CODEOWNERS');
  }

  if (config.includePreCommit) {
    base.push('.pre-commit-config.yaml');
  }

  return base;
}
