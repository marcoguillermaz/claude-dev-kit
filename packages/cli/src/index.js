#!/usr/bin/env node

import { program } from 'commander';
import { init } from './commands/init.js';
import { doctor } from './commands/doctor.js';
import { upgrade } from './commands/upgrade.js';
import chalk from 'chalk';

program
  .name('claude-dev-kit')
  .description('Governance-first project scaffold for Claude Code')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new project with Claude Code governance scaffold')
  .option('--tier <tier>', 'Skip tier selection prompt (s, m, or l)')
  .option('--dry-run', 'Show what would be created without writing any files')
  .action(init);

program
  .command('doctor')
  .description('Validate the Claude Code setup in the current project')
  .action(doctor);

program
  .command('upgrade')
  .description('Update template files to the latest claude-dev-kit version')
  .option('--dry-run', 'Show what would change without writing any files')
  .action(upgrade);

program.on('command:*', () => {
  console.error(chalk.red(`Unknown command: ${program.args.join(' ')}`));
  console.log(`Run ${chalk.cyan('claude-dev-kit --help')} for available commands.`);
  process.exit(1);
});

program.parse();
