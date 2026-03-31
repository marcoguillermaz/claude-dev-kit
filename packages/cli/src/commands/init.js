import inquirer from 'inquirer';
import chalk from 'chalk';
import { initGreenfield } from './init-greenfield.js';
import { initFromContext } from './init-from-context.js';
import { initInPlace } from './init-in-place.js';

export async function init(options) {
  console.log();
  console.log(chalk.bold('claude-dev-kit') + chalk.dim(' — governance-first Claude Code scaffold'));
  console.log();

  let mode;
  if (options.answers) {
    mode = JSON.parse(options.answers).mode;
  } else {
    ({ mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'How do you want to start?',
        choices: [
          {
            name: 'Greenfield          — new project from scratch, fill in details',
            value: 'greenfield',
          },
          {
            name: 'From context        — provide existing repos/docs, Claude populates your files',
            value: 'from-context',
          },
          {
            name: 'In-place            — add governance to the current directory',
            value: 'in-place',
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
