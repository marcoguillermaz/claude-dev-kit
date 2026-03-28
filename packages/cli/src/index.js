#!/usr/bin/env node

import { program } from 'commander';
import { init } from './commands/init.js';
import { doctor } from './commands/doctor.js';
import { upgrade } from './commands/upgrade.js';
import { syncFromPilot } from './commands/sync-from-pilot.js';
import chalk from 'chalk';

program
  .name('claude-dev-kit')
  .description('Scaffold for legible, reviewable AI-assisted development')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new project with a legible, reviewable development scaffold')
  .option('--tier <tier>', 'Skip tier selection prompt (s, m, or l)')
  .option('--dry-run', 'Show what would be created without writing any files')
  .option('--answers <json>', 'Bypass interactive prompts with JSON answers (for automation and testing)')
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

program
  .command('sync-from-pilot')
  .description('Extract agnostic governance updates from a pilot project and apply them to CDK templates')
  .requiredOption('--source <path>', 'Path to the pilot project root')
  .option('--tier <tier>', 'Target tier(s) to update: m or l (default: both)')
  .option('--dry-run', 'Show what would change without writing any files')
  .option('--verbose', 'Show skipped files')
  .action(syncFromPilot);

program.on('command:*', () => {
  console.error(chalk.red(`Unknown command: ${program.args.join(' ')}`));
  console.log(`Run ${chalk.cyan('claude-dev-kit --help')} for available commands.`);
  process.exit(1);
});

program.parse();
