import inquirer from 'inquirer';
import chalk from 'chalk';
import { initGreenfield } from './init-greenfield.js';
import { initFromContext } from './init-from-context.js';
import { initInPlace } from './init-in-place.js';

export async function init(options) {
  console.log();
  console.log(chalk.bold('claude-dev-kit') + chalk.dim(' — rules, workflows, and pipeline templates for Claude Code'));
  console.log();
  console.log(chalk.dim('  Sets up your project so Claude works consistently from day one.'));
  console.log(chalk.dim('  Takes ~2 minutes. You can edit everything after.'));
  console.log();

  let mode;
  if (options.answers) {
    mode = JSON.parse(options.answers).mode;
  } else {
    ({ mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'What\'s the state of this project?',
        choices: [
          {
            name: 'Existing project — add CDK to a project that already has code',
            value: 'in-place',
          },
          {
            name: 'New project — starting from scratch, you\'ll fill in the details',
            value: 'greenfield',
          },
          {
            name: 'From existing docs — share your docs and Claude populates everything',
            value: 'from-context',
          },
        ],
      },
    ]));
  }

  switch (mode) {
    case 'greenfield':
      return initGreenfield(options);
    case 'from-context':
      return initFromContext(options);
    case 'in-place':
      return initInPlace(options);
  }
}
