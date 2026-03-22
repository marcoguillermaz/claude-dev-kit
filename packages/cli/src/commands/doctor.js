import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const checks = [
  {
    id: 'claude-cli',
    label: 'Claude Code CLI installed',
    check: () => {
      try {
        execSync('claude --version', { stdio: 'pipe' });
        return { pass: true };
      } catch {
        return { pass: false, fix: 'Install Claude Code: https://claude.ai/code' };
      }
    },
  },
  {
    id: 'claude-md',
    label: 'CLAUDE.md present',
    check: (cwd) => {
      const exists = fs.existsSync(path.join(cwd, 'CLAUDE.md'));
      return {
        pass: exists,
        fix: 'Run `claude-dev-kit init` to scaffold CLAUDE.md',
      };
    },
  },
  {
    id: 'claude-md-size',
    label: 'CLAUDE.md under 200 lines',
    check: (cwd) => {
      const p = path.join(cwd, 'CLAUDE.md');
      if (!fs.existsSync(p)) return { pass: true, skip: true };
      const lines = fs.readFileSync(p, 'utf8').split('\n').length;
      return {
        pass: lines <= 200,
        info: `${lines} lines`,
        fix: 'Trim CLAUDE.md to under 200 lines. Move stable patterns to .claude/rules/ with path-scoped files.',
      };
    },
  },
  {
    id: 'settings-json',
    label: '.claude/settings.json present',
    check: (cwd) => {
      const exists = fs.existsSync(path.join(cwd, '.claude', 'settings.json'));
      return {
        pass: exists,
        fix: 'Run `claude-dev-kit init` or copy from the template.',
      };
    },
  },
  {
    id: 'pipeline-md',
    label: '.claude/rules/pipeline.md present',
    check: (cwd) => {
      const exists = fs.existsSync(path.join(cwd, '.claude', 'rules', 'pipeline.md'));
      return {
        pass: exists,
        fix: 'Run `claude-dev-kit init` to scaffold the pipeline.',
      };
    },
  },
  {
    id: 'security-rules',
    label: '.claude/rules/security.md present',
    check: (cwd) => {
      const exists = fs.existsSync(path.join(cwd, '.claude', 'rules', 'security.md'));
      return {
        pass: exists,
        warn: true,
        fix: 'Copy security.md from the claude-dev-kit template.',
      };
    },
  },
  {
    id: 'gitignore-env',
    label: '.env files in .gitignore',
    check: (cwd) => {
      const p = path.join(cwd, '.gitignore');
      if (!fs.existsSync(p)) return { pass: false, fix: 'Create a .gitignore file that excludes .env files.' };
      const content = fs.readFileSync(p, 'utf8');
      const covered = content.includes('.env') || content.includes('.env.local');
      return {
        pass: covered,
        fix: 'Add `.env*` to .gitignore to prevent accidental credential commits.',
      };
    },
  },
  {
    id: 'no-secrets-claude-md',
    label: 'No secrets in CLAUDE.md',
    check: (cwd) => {
      const p = path.join(cwd, 'CLAUDE.md');
      if (!fs.existsSync(p)) return { pass: true, skip: true };
      const content = fs.readFileSync(p, 'utf8');
      const patterns = [/sk_live_\w{10,}/, /sbp_\w{10,}/, /re_[a-zA-Z0-9]{10,}/, /password\s*[:=]\s*["'][^"']{6,}/i];
      const hit = patterns.some((r) => r.test(content));
      return {
        pass: !hit,
        fix: 'Remove credentials from CLAUDE.md immediately and rotate the exposed secret.',
      };
    },
  },
  {
    id: 'stop-hook',
    label: 'Stop hook configured (test gate)',
    check: (cwd) => {
      const p = path.join(cwd, '.claude', 'settings.json');
      if (!fs.existsSync(p)) return { pass: false, warn: true, fix: 'Add a Stop hook to settings.json to enforce test-passing before task completion.' };
      try {
        const settings = JSON.parse(fs.readFileSync(p, 'utf8'));
        const hasStop = settings?.hooks?.Stop?.length > 0;
        return {
          pass: hasStop,
          warn: true,
          fix: 'Add a Stop hook that runs your test command. Claude cannot declare completion until tests pass.',
        };
      } catch {
        return { pass: false, fix: 'settings.json is not valid JSON.' };
      }
    },
  },
  {
    id: 'stop-hook-placeholder',
    label: 'Stop hook uses a real test command (no unfilled placeholder)',
    check: (cwd) => {
      const p = path.join(cwd, '.claude', 'settings.json');
      if (!fs.existsSync(p)) return { pass: true, skip: true };
      try {
        const settings = JSON.parse(fs.readFileSync(p, 'utf8'));
        const stopHooks = settings?.hooks?.Stop || [];
        if (stopHooks.length === 0) return { pass: true, skip: true };
        const hasPlaceholder = stopHooks.some((entry) =>
          (entry?.hooks || []).some(
            (h) => typeof h.command === 'string' && h.command.includes('[TEST_COMMAND]')
          )
        );
        return {
          pass: !hasPlaceholder,
          fix: 'The Stop hook still contains [TEST_COMMAND] placeholder. Edit .claude/settings.json and replace it with your actual test command (e.g. "npm test").',
        };
      } catch {
        return { pass: true, skip: true };
      }
    },
  },
  {
    id: 'codeowners',
    label: '.github/CODEOWNERS includes .claude/',
    check: (cwd) => {
      const p = path.join(cwd, '.github', 'CODEOWNERS');
      if (!fs.existsSync(p)) return { pass: false, warn: true, fix: 'Create .github/CODEOWNERS and add /.claude/ with tech lead as required reviewer.' };
      const content = fs.readFileSync(p, 'utf8');
      return {
        pass: content.includes('.claude/'),
        warn: true,
        fix: 'Add `/.claude/ @tech-lead` to CODEOWNERS — Claude config changes should require human review.',
      };
    },
  },
];

export async function doctor() {
  const cwd = process.cwd();
  console.log();
  console.log(chalk.bold('claude-dev-kit doctor') + chalk.dim(` — ${cwd}`));
  console.log();

  let passed = 0;
  let warned = 0;
  let failed = 0;

  for (const item of checks) {
    const result = item.check(cwd);

    if (result.skip) continue;

    if (result.pass) {
      const info = result.info ? chalk.dim(` (${result.info})`) : '';
      console.log(`  ${chalk.green('✓')} ${item.label}${info}`);
      passed++;
    } else if (result.warn) {
      console.log(`  ${chalk.yellow('⚠')} ${item.label}`);
      console.log(`    ${chalk.dim(result.fix)}`);
      warned++;
    } else {
      console.log(`  ${chalk.red('✗')} ${item.label}`);
      console.log(`    ${chalk.dim(result.fix)}`);
      failed++;
    }
  }

  console.log();
  const total = passed + warned + failed;
  console.log(
    chalk.bold(`Results: `) +
    chalk.green(`${passed} passed`) + ' · ' +
    (warned > 0 ? chalk.yellow(`${warned} warnings`) : chalk.dim(`0 warnings`)) + ' · ' +
    (failed > 0 ? chalk.red(`${failed} failed`) : chalk.dim(`0 failed`))
  );

  if (failed > 0) {
    console.log();
    console.log(chalk.red('Fix the failing checks before starting development.'));
    process.exit(1);
  }

  if (warned > 0) {
    console.log();
    console.log(chalk.yellow('Address warnings to reach full governance coverage.'));
  }

  console.log();
}
