/**
 * claude-dev-kit — Integration test suite
 *
 * Tests the scaffold layer directly (bypasses Inquirer).
 * Validates file structure, placeholder resolution, and Stop hook presence
 * across all tier/mode combinations.
 *
 * Usage:
 *   node packages/cli/test/integration/run.js
 *   node packages/cli/test/integration/run.js --verbose
 *
 * Output dir: packages/cli/test/integration/output/  (gitignored)
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { scaffoldTier, scaffoldTierSafe } from '../../src/scaffold/index.js';
import { generateClaudeMd } from '../../src/generators/claude-md.js';
import { generateReadme } from '../../src/generators/readme.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const VERBOSE = process.argv.includes('--verbose');

// ── Colours (no dependency on chalk to keep the script standalone) ──────────

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ── Test state ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let warned = 0;
const failures = [];

function pass(label) {
  passed++;
  if (VERBOSE) console.log(`  ${c.green('✓')} ${c.dim(label)}`);
}

function fail(label, detail = '') {
  failed++;
  const msg = detail ? `${label} — ${detail}` : label;
  failures.push(msg);
  console.log(`  ${c.red('✗')} ${label}${detail ? c.dim(' — ' + detail) : ''}`);
}

function warn(label, detail = '') {
  warned++;
  if (VERBOSE) console.log(`  ${c.yellow('⚠')} ${label}${detail ? c.dim(' — ' + detail) : ''}`);
}

// ── Assertions ───────────────────────────────────────────────────────────────

function assertExists(dir, relPath) {
  const full = path.join(dir, relPath);
  if (fs.existsSync(full)) {
    pass(`exists: ${relPath}`);
  } else {
    fail(`missing: ${relPath}`);
  }
}

function assertNotExists(dir, relPath) {
  const full = path.join(dir, relPath);
  if (!fs.existsSync(full)) {
    pass(`absent: ${relPath}`);
  } else {
    fail(`should be absent: ${relPath}`);
  }
}

// Placeholders the wizard MUST resolve. Any of these left unfilled = real bug.
const WIZARD_PLACEHOLDERS = [
  'PROJECT_NAME',
  'TECH_STACK_SUMMARY',
  'TEST_COMMAND',
  'TYPE_CHECK_COMMAND',
  'BUILD_COMMAND',
  'DEV_COMMAND',
  'INSTALL_COMMAND',
  'TECH_LEAD',
  'BACKEND_LEAD',
  'SECURITY_REVIEWER',
  'E2E_COMMAND',
  'AUDIT_MODEL',
  'DESIGN_SYSTEM_NAME',
];
// All other placeholders (skill config, ADR template, state machines, etc.)
// are intentionally left for the user/Claude to fill in at first session.

function assertNoUnfilledWizardPlaceholders(dir) {
  const allFiles = walkFiles(dir);
  const hits = [];

  for (const f of allFiles) {
    // CONTEXT_IMPORT.md intentionally references these patterns as instructions
    // for Claude to fill in pipeline.md — not actual unfilled wizard placeholders
    if (path.basename(f) === 'CONTEXT_IMPORT.md') continue;

    const ext = path.extname(f);
    if (!['.md', '.json', '.yaml', '.yml', ''].includes(ext)) continue;
    const content = fs.readFileSync(f, 'utf8');
    const found = WIZARD_PLACEHOLDERS.filter((p) => content.includes(`[${p}]`));
    if (found.length > 0) {
      hits.push({ file: path.relative(dir, f), placeholders: found.map((p) => `[${p}]`) });
    }
  }

  if (hits.length === 0) {
    pass('wizard placeholders all resolved');
  } else {
    for (const h of hits) {
      fail(`wizard placeholder not resolved in ${h.file}`, h.placeholders.join(', '));
    }
  }
}

function assertStopHookPresent(dir) {
  const settingsPath = path.join(dir, '.claude', 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    fail('Stop hook check — .claude/settings.json missing');
    return;
  }
  const raw = fs.readFileSync(settingsPath, 'utf8');
  if (raw.includes('"Stop"')) {
    pass('Stop hook present in settings.json');
  } else {
    fail('Stop hook missing from settings.json');
  }
}

function assertStopHookResolved(dir) {
  const settingsPath = path.join(dir, '.claude', 'settings.json');
  if (!fs.existsSync(settingsPath)) return;
  const raw = fs.readFileSync(settingsPath, 'utf8');
  if (raw.includes('[TEST_COMMAND]')) {
    fail('Stop hook contains unfilled [TEST_COMMAND] placeholder');
  } else {
    pass('Stop hook [TEST_COMMAND] resolved');
  }
}

function assertFileUnchanged(dir, relPath, originalContent) {
  const full = path.join(dir, relPath);
  if (!fs.existsSync(full)) {
    fail(`safe-mode: file disappeared: ${relPath}`);
    return;
  }
  const current = fs.readFileSync(full, 'utf8');
  if (current === originalContent) {
    pass(`safe-mode: existing file preserved: ${relPath}`);
  } else {
    fail(`safe-mode: existing file was overwritten: ${relPath}`);
  }
}

function assertDirExists(dir, relPath) {
  const full = path.join(dir, relPath);
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
    pass(`dir exists: ${relPath}`);
  } else {
    fail(`missing dir: ${relPath}`);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function walkFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

async function scaffold(scenarioName, tier, config, safe = false) {
  const dir = path.join(OUTPUT_DIR, scenarioName);
  await fs.ensureDir(dir);
  const fn = safe ? scaffoldTierSafe : scaffoldTier;
  await fn(tier, dir, config, TEMPLATES_DIR);
  await generateClaudeMd(config, dir);
  if (!config.isDiscovery) await generateReadme(config, dir);
  return dir;
}

function section(title) {
  console.log();
  console.log(c.bold(c.cyan(`▶ ${title}`)));
}

// ── Base configs ─────────────────────────────────────────────────────────────

const BASE = {
  projectName: 'Test Project',
  description: 'Integration test scaffold',
  techStack: 'node-ts',
  testCommand: 'npx vitest run',
  typeCheckCommand: 'npx tsc --noEmit',
  devCommand: 'npm run dev',
  buildCommand: 'npm run build',
  installCommand: 'npm install',
  e2eCommand: '',
  includePreCommit: true,
  includeGithub: true,
  techLead: 'tech-lead',
  backendLead: 'backend-lead',
  securityReviewer: 'security-reviewer',
  mode: 'greenfield',
  // Feature flags (default: all enabled — full install)
  hasApi: true,
  hasDatabase: true,
  hasFrontend: true,
  hasDesignSystem: true,
  designSystemName: 'Test UI',
  auditModel: 'claude-sonnet-4-6',
  hasPrd: false,
  hasE2E: false,
};

// ── Scenarios ────────────────────────────────────────────────────────────────

async function scenarioTier0() {
  section('Tier 0 — Discovery');
  const config = { ...BASE, tier: '0', isDiscovery: true, includePreCommit: false, includeGithub: false };
  const dir = await scaffold('tier-0', '0', config);

  assertExists(dir, 'CLAUDE.md');
  assertExists(dir, 'GETTING_STARTED.md');
  assertExists(dir, '.claude/settings.json');
  assertDirExists(dir, '.claude/session');

  // Tier 0 must NOT have pipeline or governance files
  assertNotExists(dir, '.claude/rules/pipeline.md');
  assertNotExists(dir, 'README.md');
  assertNotExists(dir, '.github');
  assertNotExists(dir, '.pre-commit-config.yaml');

  assertStopHookPresent(dir);
  assertStopHookResolved(dir);
  assertNoUnfilledWizardPlaceholders(dir);
}

async function scenarioTierS_full() {
  section('Tier S — Greenfield (full: precommit + github)');
  const config = { ...BASE, tier: 's', isDiscovery: false };
  const dir = await scaffold('tier-s-full', 's', config);

  // Core files
  assertExists(dir, 'CLAUDE.md');
  assertExists(dir, 'README.md');
  assertExists(dir, '.claude/settings.json');
  assertExists(dir, '.claude/files-guide.md');
  assertDirExists(dir, '.claude/session');

  // Rules
  assertExists(dir, '.claude/rules/pipeline.md');
  assertExists(dir, '.claude/rules/context-review.md');
  assertExists(dir, '.claude/rules/git.md');
  assertExists(dir, '.claude/rules/security.md');

  // Skills (arch-audit only in Tier S)
  assertExists(dir, '.claude/skills/arch-audit/SKILL.md');
  assertNotExists(dir, '.claude/skills/security-audit/SKILL.md');
  assertNotExists(dir, '.claude/agents');

  // Optional inclusions
  assertExists(dir, '.github/PULL_REQUEST_TEMPLATE.md');
  assertExists(dir, '.github/CODEOWNERS');
  assertExists(dir, '.pre-commit-config.yaml');
  assertExists(dir, 'docs/adr/template.md');

  // Tier S must NOT have M/L-only files
  assertNotExists(dir, 'FIRST_SESSION.md');
  assertNotExists(dir, 'MEMORY.md');

  assertStopHookPresent(dir);
  assertStopHookResolved(dir);
  assertNoUnfilledWizardPlaceholders(dir);
}

async function scenarioTierS_minimal() {
  section('Tier S — Greenfield (minimal: no precommit, no github)');
  const config = { ...BASE, tier: 's', isDiscovery: false, includePreCommit: false, includeGithub: false };
  const dir = await scaffold('tier-s-minimal', 's', config);

  assertExists(dir, 'CLAUDE.md');
  assertExists(dir, '.claude/settings.json');
  assertExists(dir, '.claude/rules/pipeline.md');

  assertNotExists(dir, '.github');
  assertNotExists(dir, '.pre-commit-config.yaml');

  assertStopHookPresent(dir);
  assertNoUnfilledWizardPlaceholders(dir);
}

async function scenarioTierM() {
  section('Tier M — Greenfield (Standard)');
  const config = { ...BASE, tier: 'm', isDiscovery: false, e2eCommand: 'npx playwright test', hasE2E: true };
  const dir = await scaffold('tier-m', 'm', config);

  // Core
  assertExists(dir, 'CLAUDE.md');
  assertExists(dir, 'README.md');
  assertExists(dir, 'FIRST_SESSION.md');
  assertExists(dir, 'MEMORY.md');
  assertExists(dir, '.claude/settings.json');
  assertExists(dir, '.claude/rules/pipeline.md');

  // New shared rule files (tier M/L)
  assertExists(dir, '.claude/rules/output-style.md');
  assertExists(dir, '.claude/rules/claudemd-standards.md');
  assertExists(dir, '.claude/rules/pipeline-standards.md');

  // Docs
  assertExists(dir, 'docs/requirements.md');
  assertExists(dir, 'docs/implementation-checklist.md');
  assertExists(dir, 'docs/refactoring-backlog.md');
  assertExists(dir, 'docs/adr/template.md');

  // Agents (M has dependency-scanner, not context-reviewer)
  assertExists(dir, '.claude/agents/dependency-scanner.md');
  assertNotExists(dir, '.claude/agents/context-reviewer.md');

  // Skills (M has full set — all flags enabled in BASE)
  assertExists(dir, '.claude/skills/arch-audit/SKILL.md');
  assertExists(dir, '.claude/skills/security-audit/SKILL.md');
  assertExists(dir, '.claude/skills/skill-dev/SKILL.md');
  assertExists(dir, '.claude/skills/skill-db/SKILL.md');
  assertExists(dir, '.claude/skills/api-design/SKILL.md');
  assertExists(dir, '.claude/skills/perf-audit/SKILL.md');
  assertExists(dir, '.claude/skills/commit/SKILL.md');
  assertExists(dir, '.claude/skills/ui-audit/SKILL.md');

  assertStopHookPresent(dir);
  assertStopHookResolved(dir);
  assertNoUnfilledWizardPlaceholders(dir);
}

async function scenarioTierL() {
  section('Tier L — Greenfield (Full)');
  const config = { ...BASE, tier: 'l', isDiscovery: false, e2eCommand: 'npx playwright test', hasE2E: true };
  const dir = await scaffold('tier-l', 'l', config);

  // Core
  assertExists(dir, 'CLAUDE.md');
  assertExists(dir, 'FIRST_SESSION.md');
  assertExists(dir, 'MEMORY.md');
  assertExists(dir, '.claude/settings.json');
  assertExists(dir, '.claude/rules/pipeline.md');

  // New shared rule files (tier M/L)
  assertExists(dir, '.claude/rules/output-style.md');
  assertExists(dir, '.claude/rules/claudemd-standards.md');
  assertExists(dir, '.claude/rules/pipeline-standards.md');

  // Both agents
  assertExists(dir, '.claude/agents/dependency-scanner.md');
  assertExists(dir, '.claude/agents/context-reviewer.md');

  // Full skill set (all flags enabled in BASE)
  assertExists(dir, '.claude/skills/arch-audit/SKILL.md');
  assertExists(dir, '.claude/skills/security-audit/SKILL.md');
  assertExists(dir, '.claude/skills/skill-dev/SKILL.md');
  assertExists(dir, '.claude/skills/skill-db/SKILL.md');
  assertExists(dir, '.claude/skills/api-design/SKILL.md');
  assertExists(dir, '.claude/skills/perf-audit/SKILL.md');
  assertExists(dir, '.claude/skills/responsive-audit/SKILL.md');
  assertExists(dir, '.claude/skills/ux-audit/SKILL.md');
  assertExists(dir, '.claude/skills/visual-audit/SKILL.md');
  assertExists(dir, '.claude/skills/commit/SKILL.md');
  assertExists(dir, '.claude/skills/ui-audit/SKILL.md');

  assertStopHookPresent(dir);
  assertStopHookResolved(dir);
  assertNoUnfilledWizardPlaceholders(dir);
}

async function scenarioInPlaceSafe() {
  section('In-place — safe mode (existing files not overwritten)');

  const dir = path.join(OUTPUT_DIR, 'in-place-safe');
  await fs.ensureDir(dir);

  // Pre-seed a CLAUDE.md that must survive
  const originalContent = '# My Existing Project\n\nThis must not be overwritten.\n';
  await fs.writeFile(path.join(dir, 'CLAUDE.md'), originalContent);

  const config = { ...BASE, tier: 'm', isDiscovery: false, mode: 'in-place' };
  await scaffoldTierSafe('m', dir, config, TEMPLATES_DIR);

  // Existing file must be unchanged
  assertFileUnchanged(dir, 'CLAUDE.md', originalContent);

  // New files must have been created around it
  assertExists(dir, '.claude/settings.json');
  assertExists(dir, '.claude/rules/pipeline.md');
  assertExists(dir, 'docs/adr/template.md');
}

async function scenarioStopHookContent() {
  section('Stop hook — content correctness');

  // All tiers must have a Stop hook that runs the test command
  for (const tier of ['0', 's', 'm', 'l']) {
    const config = {
      ...BASE,
      tier,
      isDiscovery: tier === '0',
      includePreCommit: false,
      includeGithub: false,
      testCommand: 'npm run test:ci',
    };
    const scenarioDir = path.join(OUTPUT_DIR, `stop-hook-tier-${tier}`);
    await fs.ensureDir(scenarioDir);
    await scaffoldTier(tier, scenarioDir, config, TEMPLATES_DIR);

    const settingsPath = path.join(scenarioDir, '.claude/settings.json');
    if (!fs.existsSync(settingsPath)) {
      fail(`Tier ${tier}: .claude/settings.json missing`);
      continue;
    }

    const raw = fs.readFileSync(settingsPath, 'utf8');

    if (!raw.includes('"Stop"')) {
      fail(`Tier ${tier}: Stop hook absent`);
    } else {
      pass(`Tier ${tier}: Stop hook present`);
    }

    if (raw.includes('[TEST_COMMAND]')) {
      fail(`Tier ${tier}: [TEST_COMMAND] placeholder not resolved`);
    } else {
      pass(`Tier ${tier}: [TEST_COMMAND] resolved`);
    }

    if (raw.includes('npm run test:ci')) {
      pass(`Tier ${tier}: custom testCommand injected`);
    } else {
      warn(`Tier ${tier}: custom testCommand not found in settings.json`);
    }
  }
}

async function scenarioSkillPruning() {
  section('Skill pruning — no API, no DB, no frontend');
  const config = {
    ...BASE,
    tier: 'm',
    isDiscovery: false,
    hasApi: false,
    hasDatabase: false,
    hasFrontend: false,
  };
  const dir = await scaffold('tier-m-pruned', 'm', config);

  // Skills that must be absent
  assertNotExists(dir, '.claude/skills/api-design/SKILL.md');
  // security-audit is always included (generic check, not API-specific)
  assertNotExists(dir, '.claude/skills/skill-db/SKILL.md');
  assertNotExists(dir, '.claude/skills/responsive-audit/SKILL.md');
  assertNotExists(dir, '.claude/skills/visual-audit/SKILL.md');
  assertNotExists(dir, '.claude/skills/ux-audit/SKILL.md');
  assertNotExists(dir, '.claude/skills/ui-audit/SKILL.md');

  // Skills that must always be present
  assertExists(dir, '.claude/skills/arch-audit/SKILL.md');
  assertExists(dir, '.claude/skills/skill-dev/SKILL.md');
  assertExists(dir, '.claude/skills/perf-audit/SKILL.md');
  assertExists(dir, '.claude/skills/commit/SKILL.md');
  assertExists(dir, '.claude/skills/security-audit/SKILL.md');
}

async function scenarioUiAuditPruning() {
  section('Skill pruning — frontend yes, design system no → ui-audit absent');
  const config = {
    ...BASE,
    tier: 'm',
    isDiscovery: false,
    hasFrontend: true,
    hasDesignSystem: false,
  };
  const dir = await scaffold('tier-m-no-design-system', 'm', config);

  // ui-audit requires design system — must be absent
  assertNotExists(dir, '.claude/skills/ui-audit/SKILL.md');

  // Other frontend skills must be present
  assertExists(dir, '.claude/skills/responsive-audit/SKILL.md');
  assertExists(dir, '.claude/skills/visual-audit/SKILL.md');
  assertExists(dir, '.claude/skills/ux-audit/SKILL.md');
}

async function scenarioCommitSkillAllTiers() {
  section('Commit skill — present in tier S');
  const config = { ...BASE, tier: 's', isDiscovery: false };
  const dir = await scaffold('tier-s-commit', 's', config);
  assertExists(dir, '.claude/skills/commit/SKILL.md');
}

async function scenarioNewRuleFiles() {
  section('New rule files — output-style, claudemd-standards, pipeline-standards in tier S');
  const config = { ...BASE, tier: 's', isDiscovery: false };
  const dir = await scaffold('tier-s-rules', 's', config);

  // Tier S also gets the shared rules via common/rules/ copy
  assertExists(dir, '.claude/rules/output-style.md');
  assertExists(dir, '.claude/rules/claudemd-standards.md');
  assertExists(dir, '.claude/rules/pipeline-standards.md');
}

async function scenarioPipelineGateCount() {
  section('Pipeline gate counts per tier');

  // Tier S has scope-confirm (not a STOP gate) — 0 STOP gates by design
  const gateCounts = { m: 2, l: 4 };

  for (const [tier, expectedGates] of Object.entries(gateCounts)) {
    const config = { ...BASE, tier, isDiscovery: false };
    const scenarioDir = path.join(OUTPUT_DIR, `gates-tier-${tier}`);
    await fs.ensureDir(scenarioDir);
    await scaffoldTier(tier, scenarioDir, config, TEMPLATES_DIR);

    const pipelinePath = path.join(scenarioDir, '.claude/rules/pipeline.md');
    if (!fs.existsSync(pipelinePath)) {
      fail(`Tier ${tier}: pipeline.md missing`);
      continue;
    }

    const content = fs.readFileSync(pipelinePath, 'utf8');
    const stopMatches = (content.match(/STOP\s+GATE|STOP gate|\*\*STOP\*\*/gi) || []).length;

    if (stopMatches >= expectedGates) {
      pass(`Tier ${tier}: pipeline has ≥${expectedGates} STOP gate(s) (found ${stopMatches})`);
    } else {
      fail(`Tier ${tier}: expected ≥${expectedGates} STOP gate(s), found ${stopMatches}`);
    }
  }
}

async function scenarioNewStacks() {
  section('New named stacks — placeholder resolution + basic structure');

  const newStacks = [
    { stack: 'swift',  testCmd: 'swift test',          devCmd: 'swift run',              buildCmd: 'swift build -c release', installCmd: 'swift package resolve', label: 'Swift / macOS' },
    { stack: 'kotlin', testCmd: './gradlew test',       devCmd: './gradlew run',           buildCmd: './gradlew build',         installCmd: './gradlew dependencies', label: 'Kotlin / Android' },
    { stack: 'rust',   testCmd: 'cargo test',           devCmd: 'cargo run',              buildCmd: 'cargo build --release',   installCmd: 'cargo build',            label: 'Rust' },
    { stack: 'dotnet', testCmd: 'dotnet test',          devCmd: 'dotnet run',             buildCmd: 'dotnet build',            installCmd: 'dotnet restore',          label: '.NET / C#' },
    { stack: 'ruby',   testCmd: 'bundle exec rspec',    devCmd: 'bundle exec rails server', buildCmd: 'bundle exec rake assets:precompile', installCmd: 'bundle install', label: 'Ruby' },
    { stack: 'java',   testCmd: 'mvn test',             devCmd: 'mvn exec:java',          buildCmd: 'mvn package',             installCmd: 'mvn install',            label: 'Java' },
  ];

  for (const { stack, testCmd, devCmd, buildCmd, installCmd } of newStacks) {
    const config = {
      ...BASE,
      tier: 'm',
      techStack: stack,
      testCommand: testCmd,
      devCommand: devCmd,
      buildCommand: buildCmd,
      installCommand: installCmd,
      typeCheckCommand: '',
      isDiscovery: false,
    };
    const dir = await scaffold(`new-stack-${stack}`, 'm', config);

    assertExists(dir, 'CLAUDE.md');
    assertExists(dir, '.claude/settings.json');
    assertStopHookResolved(dir);
    assertNoUnfilledWizardPlaceholders(dir);
  }
}

async function scenarioWizardCoverage() {
  section('Wizard coverage — full CLI execution via --answers');

  const CLI = path.resolve(__dirname, '../../src/index.js');
  const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/wizard-answers');

  const fixtures = fs.readdirSync(FIXTURES_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  for (const fixtureFile of fixtures) {
    const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, fixtureFile), 'utf8'));
    const label = path.basename(fixtureFile, '.json');
    const dir = path.join(OUTPUT_DIR, `wizard-${label}`);
    await fs.ensureDir(dir);

    const answersJson = JSON.stringify(fixture);

    try {
      execFileSync('node', [CLI, 'init', '--answers', answersJson], {
        cwd: dir,
        stdio: 'pipe',
      });
      pass(`wizard[${label}]: execution succeeded`);
    } catch (err) {
      const detail = err.stderr?.toString().trim().split('\n')[0] || err.message;
      fail(`wizard[${label}]: execution failed`, detail);
      continue;
    }

    assertExists(dir, '.claude/settings.json');
    assertStopHookResolved(dir);
    assertNoUnfilledWizardPlaceholders(dir);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log();
  console.log(c.bold('claude-dev-kit — Integration tests'));
  console.log(c.dim(`Output: ${OUTPUT_DIR}`));
  console.log(c.dim(`Verbose: ${VERBOSE ? 'on' : 'off (use --verbose for full output)'}`));

  // Clean previous output
  await fs.remove(OUTPUT_DIR);
  await fs.ensureDir(OUTPUT_DIR);

  await scenarioTier0();
  await scenarioTierS_full();
  await scenarioTierS_minimal();
  await scenarioTierM();
  await scenarioTierL();
  await scenarioInPlaceSafe();
  await scenarioStopHookContent();
  await scenarioPipelineGateCount();
  await scenarioSkillPruning();
  await scenarioUiAuditPruning();
  await scenarioCommitSkillAllTiers();
  await scenarioNewRuleFiles();
  await scenarioNewStacks();
  await scenarioWizardCoverage();

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log();
  console.log(c.bold('─────────────────────────────────'));
  console.log(
    `${c.green(`✓ ${passed} passed`)}  ${failed > 0 ? c.red(`✗ ${failed} failed`) : c.dim(`✗ ${failed} failed`)}  ${c.yellow(`⚠ ${warned} warned`)}`
  );

  if (failures.length > 0) {
    console.log();
    console.log(c.bold(c.red('Failures:')));
    for (const f of failures) {
      console.log(`  ${c.red('✗')} ${f}`);
    }
  }

  console.log();

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(c.red('\nUnhandled error:'), err.message);
  process.exit(1);
});
