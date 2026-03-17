import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateClaudeMd } from '../generators/claude-md.js';
import { generateReadme } from '../generators/readme.js';
import { scaffoldTier } from '../scaffold/index.js';
import { printPlan, printNextSteps } from '../utils/print-plan.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../../templates');

export async function initGreenfield(options) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: path.basename(process.cwd()),
      validate: (v) => v.trim().length > 0 || 'Required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Short description (one line):',
      validate: (v) => v.trim().length > 0 || 'Required',
    },
    {
      type: 'list',
      name: 'tier',
      message: 'Pipeline tier:',
      when: !options.tier,
      choices: [
        { name: 'S — Fast Lane    (bugfixes, ≤3 files, no gates)', value: 's' },
        { name: 'M — Standard     (feature blocks, 5 phases, 1–2 week changes)', value: 'm' },
        { name: 'L — Full         (complex domain, long-running, full governance)', value: 'l' },
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
      default: (a) => ({ 'node-ts': 'npx vitest run', 'node-js': 'npm test', python: 'pytest', go: 'go test ./...', other: 'npm test' })[a.techStack] || 'npm test',
    },
    {
      type: 'input',
      name: 'typeCheckCommand',
      message: 'Type check command (leave blank if none):',
      when: (a) => a.techStack === 'node-ts',
      default: 'npx tsc --noEmit',
    },
    {
      type: 'input',
      name: 'devCommand',
      message: 'Dev server command:',
      default: (a) => ({ 'node-ts': 'npm run dev', 'node-js': 'npm run dev', python: 'uvicorn main:app --reload', go: 'go run .', other: 'npm run dev' })[a.techStack] || 'npm run dev',
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

  const config = { ...answers, tier: options.tier || answers.tier, mode: 'greenfield' };

  if (options.dryRun) {
    console.log();
    console.log(chalk.yellow('Dry run — no files will be written.'));
    console.log();
    printPlan(config);
    return;
  }

  const spinner = ora('Scaffolding project...').start();
  try {
    await scaffoldTier(config.tier, process.cwd(), config, TEMPLATES_DIR);
    await generateClaudeMd(config, process.cwd());
    await generateReadme(config, process.cwd());
    spinner.succeed('Done.');
  } catch (err) {
    spinner.fail('Scaffolding failed.');
    console.error(chalk.red(err.message));
    process.exit(1);
  }

  console.log();
  console.log(chalk.green.bold('✓ Greenfield scaffold complete'));
  console.log();
  printPlan(config);
  console.log();
  console.log(chalk.bold('Next steps:'));
  printNextSteps(config);
  console.log();
  console.log(chalk.dim('Docs: https://github.com/marcoguillermaz/claude-dev-kit'));
}
