/**
 * review-wizard-output.js — Qualitative review of all significant printPlan/printNextSteps combinations.
 *
 * Covers the full branching space of the wizard output layer:
 *   tier (0/S/M/L) × stack (11) × flags (hasApi/hasDatabase/hasFrontend/hasDesignSystem)
 *   × mode (greenfield/in-place) × inclusions (github/precommit) × command edge cases
 *
 * Usage:
 *   node packages/cli/test/review-wizard-output.js
 *   node packages/cli/test/review-wizard-output.js --group=stacks
 *   node packages/cli/test/review-wizard-output.js --group=flags
 *   node packages/cli/test/review-wizard-output.js --group=tiers
 *   node packages/cli/test/review-wizard-output.js --group=native
 *   node packages/cli/test/review-wizard-output.js --group=mode
 *   node packages/cli/test/review-wizard-output.js --group=inclusions
 *   node packages/cli/test/review-wizard-output.js --group=commands
 *   node packages/cli/test/review-wizard-output.js --group=nextsteps
 */

import { printPlan, printNextSteps } from '../src/utils/print-plan.js';

// ── Filter ───────────────────────────────────────────────────────────────────

const GROUP_ARG = process.argv.find((a) => a.startsWith('--group='));
const FILTER = GROUP_ARG ? GROUP_ARG.replace('--group=', '') : null;

// ── Helpers ──────────────────────────────────────────────────────────────────

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
};

let scenarioCount = 0;

function header(group, label) {
  if (FILTER && group !== FILTER) return false;
  scenarioCount++;
  const num = String(scenarioCount).padStart(2, '0');
  console.log('\n' + '═'.repeat(72));
  console.log(c.bold(c.cyan(`  [${num}] ${group.toUpperCase()} — ${label}`)));
  console.log('═'.repeat(72) + '\n');
  return true;
}

function run(group, label, config, { nextSteps = false } = {}) {
  if (!header(group, label)) return;
  printPlan(config);
  if (nextSteps) {
    console.log();
    console.log(c.bold('Next steps:'));
    printNextSteps(config);
  }
}

// ── Base configs ─────────────────────────────────────────────────────────────

const FULL_FLAGS = {
  hasApi: true,
  hasDatabase: true,
  hasFrontend: true,
  hasDesignSystem: true,
  hasE2E: false,
  hasPrd: false,
  includeGithub: true,
  includePreCommit: true,
};

const NO_FLAGS = {
  hasApi: false,
  hasDatabase: false,
  hasFrontend: false,
  hasDesignSystem: false,
  hasE2E: false,
  hasPrd: false,
  includeGithub: false,
  includePreCommit: false,
};

const BASE = {
  projectName: 'test-project',
  mode: 'greenfield',
  techStack: 'node-ts',
  testCommand: 'npx vitest run',
  typeCheckCommand: 'npx tsc --noEmit',
  devCommand: 'npm run dev',
  buildCommand: 'npm run build',
  installCommand: 'npm install',
  e2eCommand: '',
  auditModel: 'claude-sonnet-4-6',
  ...FULL_FLAGS,
};

// ── Group 1: Tier progression — node-ts, greenfield, full flags ───────────────

run(
  'tiers',
  'Tier 0 — Discovery (node-ts, greenfield)',
  {
    ...BASE,
    tier: '0',
    isDiscovery: true,
    includePreCommit: false,
    includeGithub: false,
  },
  { nextSteps: true },
);

run(
  'tiers',
  'Tier S — Fast Lane (node-ts, greenfield, full)',
  {
    ...BASE,
    tier: 's',
  },
  { nextSteps: true },
);

run(
  'tiers',
  'Tier M — Standard (node-ts, greenfield, full)',
  {
    ...BASE,
    tier: 'm',
    e2eCommand: 'npx playwright test',
    hasE2E: true,
    hasPrd: true,
  },
  { nextSteps: true },
);

run(
  'tiers',
  'Tier L — Full (node-ts, greenfield, full)',
  {
    ...BASE,
    tier: 'l',
    e2eCommand: 'npx playwright test',
    hasE2E: true,
    hasPrd: true,
  },
  { nextSteps: true },
);

// ── Group 2: Web stacks — Tier M, greenfield, all flags true ─────────────────

run('stacks', 'node-js — Tier M, full flags', {
  ...BASE,
  tier: 'm',
  techStack: 'node-js',
  testCommand: 'npm test',
  typeCheckCommand: '',
  devCommand: 'npm run dev',
});

run('stacks', 'python — Tier M, full flags', {
  ...BASE,
  tier: 'm',
  techStack: 'python',
  testCommand: 'pytest',
  typeCheckCommand: '',
  devCommand: 'uvicorn main:app --reload',
  buildCommand: '',
  installCommand: 'pip install -r requirements.txt',
  e2eCommand: 'npx playwright test',
  hasE2E: true,
});

run('stacks', 'go — Tier M, full flags', {
  ...BASE,
  tier: 'm',
  techStack: 'go',
  testCommand: 'go test ./...',
  typeCheckCommand: '',
  devCommand: 'go run .',
  buildCommand: 'go build ./...',
  installCommand: 'go mod download',
});

run('stacks', 'ruby — Tier M, full flags', {
  ...BASE,
  tier: 'm',
  techStack: 'ruby',
  testCommand: 'bundle exec rspec',
  typeCheckCommand: '',
  devCommand: 'bundle exec rails server',
  buildCommand: 'bundle exec rake assets:precompile',
  installCommand: 'bundle install',
  e2eCommand: 'npx playwright test',
  hasE2E: true,
});

// ── Group 3: Native stacks — Tier M, realistic flags ─────────────────────────

run('native', 'swift — Tier M, greenfield (no-api, has-db/ui, no-design-sys)', {
  ...BASE,
  tier: 'm',
  techStack: 'swift',
  projectName: 'mac-transcription-collector',
  testCommand: 'swift test',
  typeCheckCommand: '',
  devCommand: 'swift run',
  buildCommand: 'swift build -c release',
  installCommand: 'swift package resolve',
  e2eCommand: 'xcrun xcodebuild test -scheme mac-transcription-collector',
  hasE2E: true,
  hasApi: false,
  hasDatabase: true,
  hasFrontend: true,
  hasDesignSystem: false,
  includeGithub: false,
});

run('native', 'kotlin — Tier M, greenfield (no-api, has-db/ui, no-design-sys)', {
  ...BASE,
  tier: 'm',
  techStack: 'kotlin',
  projectName: 'android-app',
  testCommand: './gradlew test',
  typeCheckCommand: '',
  devCommand: './gradlew run',
  buildCommand: './gradlew build',
  installCommand: './gradlew dependencies',
  e2eCommand: './gradlew connectedAndroidTest',
  hasE2E: true,
  hasApi: false,
  hasDatabase: true,
  hasFrontend: true,
  hasDesignSystem: false,
  includeGithub: false,
});

run('native', 'rust — Tier M, greenfield (CLI: no-api, no-db, no-ui)', {
  ...BASE,
  tier: 'm',
  techStack: 'rust',
  projectName: 'rust-cli-tool',
  testCommand: 'cargo test',
  typeCheckCommand: '',
  devCommand: 'cargo run',
  buildCommand: 'cargo build --release',
  installCommand: 'cargo build',
  e2eCommand: '',
  hasApi: false,
  hasDatabase: false,
  hasFrontend: false,
  hasDesignSystem: false,
});

run('native', 'dotnet — Tier M, greenfield (has-api, has-db, has-ui)', {
  ...BASE,
  tier: 'm',
  techStack: 'dotnet',
  projectName: 'aspnet-app',
  testCommand: 'dotnet test',
  typeCheckCommand: '',
  devCommand: 'dotnet run',
  buildCommand: 'dotnet build',
  installCommand: 'dotnet restore',
  e2eCommand: 'dotnet test --filter Category=UI',
  hasE2E: true,
  hasApi: true,
  hasDatabase: true,
  hasFrontend: true,
  hasDesignSystem: false,
});

run('native', 'java — Tier M, greenfield (has-api, has-db, no-ui — Spring Boot)', {
  ...BASE,
  tier: 'm',
  techStack: 'java',
  projectName: 'spring-boot-api',
  testCommand: 'mvn test',
  typeCheckCommand: '',
  devCommand: 'mvn exec:java',
  buildCommand: 'mvn package',
  installCommand: 'mvn install',
  e2eCommand: 'mvn verify -P integration',
  hasE2E: true,
  hasApi: true,
  hasDatabase: true,
  hasFrontend: false,
  hasDesignSystem: false,
});

run('native', 'other — Tier M, greenfield (all false, no commands)', {
  ...BASE,
  tier: 'm',
  techStack: 'other',
  projectName: 'mixed-project',
  testCommand: '',
  typeCheckCommand: '',
  devCommand: '',
  buildCommand: '',
  installCommand: '',
  e2eCommand: '',
  ...NO_FLAGS,
});

// ── Group 4: Flag matrix — node-ts, Tier M, greenfield ───────────────────────

run('flags', 'all flags TRUE (baseline)', {
  ...BASE,
  tier: 'm',
  e2eCommand: 'npx playwright test',
  hasE2E: true,
  hasPrd: true,
});

run('flags', 'hasApi = false (api-design pruned)', {
  ...BASE,
  tier: 'm',
  hasApi: false,
});

run('flags', 'hasDatabase = false (skill-db pruned)', {
  ...BASE,
  tier: 'm',
  hasDatabase: false,
});

run('flags', 'hasFrontend = false (responsive/visual/ux/ui all pruned)', {
  ...BASE,
  tier: 'm',
  hasFrontend: false,
  hasDesignSystem: false,
});

run('flags', 'hasFrontend = true, hasDesignSystem = false (ui-audit pruned)', {
  ...BASE,
  tier: 'm',
  hasFrontend: true,
  hasDesignSystem: false,
});

run('flags', 'hasApi = false, hasFrontend = false (API + all UI skills pruned)', {
  ...BASE,
  tier: 'm',
  hasApi: false,
  hasFrontend: false,
  hasDesignSystem: false,
});

run('flags', 'all flags FALSE (only core skills remain)', {
  ...BASE,
  tier: 'm',
  ...NO_FLAGS,
  includeGithub: true,
  includePreCommit: true,
});

run('flags', 'hasPrd = true (PRD template in blocks)', {
  ...BASE,
  tier: 'm',
  hasPrd: true,
});

run('flags', 'hasE2E = true (e2eCommand set)', {
  ...BASE,
  tier: 'm',
  e2eCommand: 'npx playwright test',
  hasE2E: true,
});

// ── Group 5: Inclusions matrix ────────────────────────────────────────────────

run('inclusions', 'includeGithub = false, includePreCommit = true', {
  ...BASE,
  tier: 'm',
  includeGithub: false,
  includePreCommit: true,
});

run('inclusions', 'includeGithub = true, includePreCommit = false', {
  ...BASE,
  tier: 'm',
  includeGithub: true,
  includePreCommit: false,
});

run('inclusions', 'includeGithub = false, includePreCommit = false', {
  ...BASE,
  tier: 'm',
  includeGithub: false,
  includePreCommit: false,
});

// ── Group 6: Mode in-place ────────────────────────────────────────────────────

run(
  'mode',
  'node-ts — Tier M, in-place, full flags',
  {
    ...BASE,
    tier: 'm',
    mode: 'in-place',
    e2eCommand: 'npx playwright test',
    hasE2E: true,
  },
  { nextSteps: true },
);

run(
  'mode',
  'swift — Tier M, in-place (no-api, has-db/ui, no-design-sys)',
  {
    ...BASE,
    tier: 'm',
    mode: 'in-place',
    techStack: 'swift',
    projectName: 'mac-transcription-collector',
    testCommand: 'swift test',
    typeCheckCommand: '',
    devCommand: 'swift run',
    buildCommand: 'swift build -c release',
    installCommand: 'swift package resolve',
    e2eCommand: '',
    hasApi: false,
    hasDatabase: true,
    hasFrontend: true,
    hasDesignSystem: false,
    includeGithub: false,
  },
  { nextSteps: true },
);

run('mode', 'python — Tier L, in-place, full flags', {
  ...BASE,
  tier: 'l',
  mode: 'in-place',
  techStack: 'python',
  testCommand: 'pytest',
  typeCheckCommand: '',
  devCommand: 'uvicorn main:app --reload',
  buildCommand: '',
  installCommand: 'pip install -r requirements.txt',
  e2eCommand: 'npx playwright test',
  hasE2E: true,
});

run(
  'mode',
  'rust — Tier S, in-place, no github',
  {
    ...BASE,
    tier: 's',
    mode: 'in-place',
    techStack: 'rust',
    testCommand: 'cargo test',
    typeCheckCommand: '',
    devCommand: 'cargo run',
    buildCommand: 'cargo build --release',
    installCommand: 'cargo build',
    includeGithub: false,
  },
  { nextSteps: true },
);

// ── Group 7: Command edge cases ───────────────────────────────────────────────

run('commands', 'devCommand = "npm run dev" on native stack (should be hidden)', {
  ...BASE,
  tier: 'm',
  techStack: 'swift',
  testCommand: 'swift test',
  typeCheckCommand: '',
  devCommand: 'npm run dev', // ← wrong default, should NOT appear
  buildCommand: 'swift build -c release',
  installCommand: 'swift package resolve',
  hasApi: false,
  hasDatabase: true,
  hasFrontend: true,
  hasDesignSystem: false,
});

run('commands', 'devCommand = "npm run dev" on node-ts (should be shown)', {
  ...BASE,
  tier: 'm',
  techStack: 'node-ts',
  devCommand: 'npm run dev', // ← correct for this stack, SHOULD appear
});

run('commands', 'testCommand empty, devCommand empty, no e2e (other stack)', {
  ...BASE,
  tier: 'm',
  techStack: 'other',
  testCommand: '',
  typeCheckCommand: '',
  devCommand: '',
  buildCommand: '',
  e2eCommand: '',
  hasApi: false,
  hasDatabase: false,
  hasFrontend: false,
  hasDesignSystem: false,
});

run('commands', 'auditModel = claude-opus-4-6 (shown in commands block?)', {
  ...BASE,
  tier: 'm',
  techStack: 'node-ts',
  auditModel: 'claude-opus-4-6',
  hasFrontend: true,
  hasDesignSystem: true,
});

run('commands', 'devCommand = "" on native stack (blank — should show nothing)', {
  ...BASE,
  tier: 'm',
  techStack: 'kotlin',
  testCommand: './gradlew test',
  typeCheckCommand: '',
  devCommand: '', // ← blank, should not show
  buildCommand: './gradlew build',
  installCommand: './gradlew dependencies',
  hasApi: false,
  hasDatabase: true,
  hasFrontend: true,
  hasDesignSystem: false,
});

// ── Group 8: Next steps — all modes ──────────────────────────────────────────

if (!FILTER || FILTER === 'nextsteps') {
  const sep = '\n' + '─'.repeat(72);

  console.log('\n' + '═'.repeat(72));
  console.log(c.bold(c.cyan('  NEXTSTEPS — printNextSteps across all modes and inclusions')));
  console.log('═'.repeat(72));

  const nextCases = [
    {
      label: 'Greenfield Tier S — with precommit + github',
      config: { ...BASE, tier: 's', includePreCommit: true, includeGithub: true },
    },
    {
      label: 'Greenfield Tier S — no precommit, no github',
      config: { ...BASE, tier: 's', includePreCommit: false, includeGithub: false },
    },
    {
      label: 'Greenfield Tier M — with precommit',
      config: { ...BASE, tier: 'm', includePreCommit: true, includeGithub: true },
    },
    {
      label: 'Greenfield Tier M — no precommit',
      config: { ...BASE, tier: 'm', includePreCommit: false },
    },
    {
      label: 'Greenfield Tier L — with precommit',
      config: { ...BASE, tier: 'l', includePreCommit: true, includeGithub: true },
    },
    {
      label: 'In-place Tier M — with precommit',
      config: { ...BASE, tier: 'm', mode: 'in-place', includePreCommit: true },
    },
    {
      label: 'In-place Tier M — no precommit',
      config: { ...BASE, tier: 'm', mode: 'in-place', includePreCommit: false },
    },
    {
      label: 'From-context Tier M',
      config: { ...BASE, tier: 'm', mode: 'from-context', projectName: 'my-project' },
    },
  ];

  for (const { label, config } of nextCases) {
    scenarioCount++;
    console.log(sep);
    console.log(c.bold(`  [${String(scenarioCount).padStart(2, '0')}] ${label}`));
    console.log(sep.replace('─', '─') + '\n');
    printNextSteps(config);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(72));
console.log(
  c.bold(c.green(`  ✓ ${scenarioCount} scenarios rendered`)) +
    (FILTER ? c.dim(` (group: ${FILTER})`) : c.dim(' (all groups)')),
);
console.log(
  c.dim('  Groups: tiers | stacks | native | flags | inclusions | mode | commands | nextsteps'),
);
console.log('═'.repeat(72) + '\n');
