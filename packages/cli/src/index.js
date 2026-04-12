#!/usr/bin/env node

import { program } from 'commander';
import { init } from './commands/init.js';
import { doctor } from './commands/doctor.js';
import { upgrade } from './commands/upgrade.js';
import { addSkill, addRule } from './commands/add.js';
import { newSkill } from './commands/new-skill.js';
import chalk from 'chalk';

program
  .name('claude-dev-kit')
  .description('Scaffold for legible, reviewable AI-assisted development')
  .version('1.6.1');

program
  .command('init')
  .description('Initialize a new project with a legible, reviewable development scaffold')
  .option('--tier <tier>', 'Skip tier selection prompt (s, m, or l)')
  .option('--dry-run', 'Show what would be created without writing any files')
  .option(
    '--answers <json>',
    'Bypass interactive prompts with JSON answers (for automation and testing)',
  )
  .action(init);

program
  .command('doctor')
  .description('Validate the Claude Code setup in the current project')
  .option('--report', 'Output machine-readable JSON compliance report (for CI)')
  .option('--ci', 'Silent mode: exit 1 if any check fails, no interactive output')
  .action(doctor);

program
  .command('upgrade')
  .description('Update template files to the latest claude-dev-kit version')
  .option('--dry-run', 'Show what would change without writing any files')
  .action(upgrade);

const add = program.command('add').description('Add a single skill or rule to the current project');

add
  .command('skill <name>')
  .description('Install a skill (e.g. arch-audit, security-audit, api-design)')
  .option('--force', 'Overwrite if the skill already exists')
  .option('--dry-run', 'Show what would be created without writing files')
  .action(addSkill);

add
  .command('rule <name>')
  .description('Install a rule (e.g. git, output-style, security)')
  .option(
    '--stack <stack>',
    'Tech stack for security variant (swift, kotlin, rust, dotnet, java, go)',
  )
  .option('--force', 'Overwrite if the rule already exists')
  .option('--dry-run', 'Show what would be created without writing files')
  .action(addRule);

const newCmd = program.command('new').description('Create a new custom resource from scratch');

newCmd
  .command('skill')
  .description('Create a custom skill with an interactive wizard')
  .option('--name <name>', 'Skill name (auto-prepends custom- if missing)')
  .option('--dry-run', 'Show what would be created without writing files')
  .option('--answers <json>', 'Bypass prompts with JSON answers (for testing)')
  .action(newSkill);

program.on('command:*', () => {
  console.error(chalk.red(`Unknown command: ${program.args.join(' ')}`));
  console.log(`Run ${chalk.cyan('claude-dev-kit --help')} for available commands.`);
  process.exit(1);
});

program.parse();
