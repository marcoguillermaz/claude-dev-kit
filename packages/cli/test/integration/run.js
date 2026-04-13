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
  'FRAMEWORK_VALUE',
  'LANGUAGE_VALUE',
  'API_TESTS_PATH',
  'MIGRATION_COMMAND',
  'PERF_TOOL',
  'PROFILER_COMMAND',
  'LINT_COMMAND',
  'SECURITY_CHECKLIST_ITEMS',
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
  const config = {
    ...BASE,
    tier: '0',
    isDiscovery: true,
    includePreCommit: false,
    includeGithub: false,
  };
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
  assertDirExists(dir, '.claude/session');

  // Rules
  assertExists(dir, '.claude/rules/pipeline.md');
  assertExists(dir, '.claude/rules/context-review.md');
  assertExists(dir, '.claude/rules/git.md');
  assertExists(dir, '.claude/rules/security.md');

  // Skills (Tier S: arch-audit, commit, simplify, skill-dev, perf-audit, security-audit)
  assertExists(dir, '.claude/skills/arch-audit/SKILL.md');
  assertExists(dir, '.claude/skills/commit/SKILL.md');
  assertExists(dir, '.claude/skills/simplify/SKILL.md');
  assertExists(dir, '.claude/skills/skill-dev/SKILL.md');
  assertExists(dir, '.claude/skills/perf-audit/SKILL.md');
  assertExists(dir, '.claude/skills/security-audit/SKILL.md');
  assertNotExists(dir, '.claude/agents');

  // Tier S must NOT have M/L-only skills
  assertNotExists(dir, '.claude/skills/api-design/SKILL.md');
  assertNotExists(dir, '.claude/skills/skill-db/SKILL.md');
  assertNotExists(dir, '.claude/skills/migration-audit/SKILL.md');
  assertNotExists(dir, '.claude/skills/responsive-audit/SKILL.md');

  // Active Skills section in CLAUDE.md
  const claudeS = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  if (claudeS.includes('## Active Skills')) {
    pass('Tier S: Active Skills section present in CLAUDE.md');
  } else {
    fail('Tier S: Active Skills section missing from CLAUDE.md');
  }
  if (
    claudeS.includes('/skill-dev') &&
    claudeS.includes('/perf-audit') &&
    claudeS.includes('/security-audit') &&
    claudeS.includes('/simplify')
  ) {
    pass('Tier S: Active Skills lists promoted skills');
  } else {
    fail('Tier S: Active Skills missing promoted skills');
  }
  if (!claudeS.includes('/api-design') && !claudeS.includes('/skill-db')) {
    pass('Tier S: Active Skills does not list M/L-only skills');
  } else {
    fail('Tier S: Active Skills incorrectly lists M/L-only skills');
  }

  // Optional inclusions
  assertExists(dir, '.github/PULL_REQUEST_TEMPLATE.md');
  assertExists(dir, '.github/CODEOWNERS');
  assertExists(dir, '.pre-commit-config.yaml');

  // Tier S skips informational docs (P2 — reduce file count)
  assertNotExists(dir, '.claude/files-guide.md');
  assertNotExists(dir, 'docs/adr/template.md');
  assertNotExists(dir, 'docs/pipeline-standards.md');
  assertNotExists(dir, 'docs/claudemd-standards.md');

  // Tier S must NOT have M/L-only files
  assertNotExists(dir, '.claude/FIRST_SESSION.md');
  assertNotExists(dir, 'MEMORY.md');
  assertNotExists(dir, 'docs/sitemap.md');
  assertNotExists(dir, 'docs/db-map.md');

  assertStopHookPresent(dir);
  assertStopHookResolved(dir);
  assertNoUnfilledWizardPlaceholders(dir);
}

async function scenarioTierS_minimal() {
  section('Tier S — Greenfield (minimal: no precommit, no github)');
  const config = {
    ...BASE,
    tier: 's',
    isDiscovery: false,
    includePreCommit: false,
    includeGithub: false,
  };
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
  const config = {
    ...BASE,
    tier: 'm',
    isDiscovery: false,
    e2eCommand: 'npx playwright test',
    hasE2E: true,
  };
  const dir = await scaffold('tier-m', 'm', config);

  // Core
  assertExists(dir, 'CLAUDE.md');
  assertExists(dir, 'README.md');
  assertExists(dir, '.claude/FIRST_SESSION.md');
  assertExists(dir, 'MEMORY.md');
  assertExists(dir, '.claude/settings.json');
  assertExists(dir, '.claude/rules/pipeline.md');

  // New shared rule files (tier M/L)
  assertExists(dir, '.claude/rules/output-style.md');
  assertExists(dir, 'docs/claudemd-standards.md');
  assertExists(dir, 'docs/pipeline-standards.md');

  // Docs
  assertExists(dir, 'docs/requirements.md');
  assertExists(dir, 'docs/implementation-checklist.md');
  assertExists(dir, 'docs/refactoring-backlog.md');
  assertExists(dir, 'docs/adr/template.md');
  assertExists(dir, 'docs/sitemap.md');
  assertExists(dir, 'docs/db-map.md');

  // Pipeline skills (M has dependency-scan, not context-review)
  assertExists(dir, '.claude/skills/dependency-scan/SKILL.md');
  assertNotExists(dir, '.claude/skills/context-review/SKILL.md');

  // Skills (M has full set — all flags enabled in BASE)
  assertExists(dir, '.claude/skills/arch-audit/SKILL.md');
  assertExists(dir, '.claude/skills/security-audit/SKILL.md');
  assertExists(dir, '.claude/skills/skill-dev/SKILL.md');
  assertExists(dir, '.claude/skills/skill-db/SKILL.md');
  assertExists(dir, '.claude/skills/migration-audit/SKILL.md');
  assertExists(dir, '.claude/skills/api-design/SKILL.md');
  assertExists(dir, '.claude/skills/perf-audit/SKILL.md');
  assertExists(dir, '.claude/skills/simplify/SKILL.md');
  assertExists(dir, '.claude/skills/commit/SKILL.md');
  assertExists(dir, '.claude/skills/ui-audit/SKILL.md');

  assertStopHookPresent(dir);
  assertStopHookResolved(dir);
  assertNoUnfilledWizardPlaceholders(dir);
}

async function scenarioTierL() {
  section('Tier L — Greenfield (Full)');
  const config = {
    ...BASE,
    tier: 'l',
    isDiscovery: false,
    e2eCommand: 'npx playwright test',
    hasE2E: true,
  };
  const dir = await scaffold('tier-l', 'l', config);

  // Core
  assertExists(dir, 'CLAUDE.md');
  assertExists(dir, '.claude/FIRST_SESSION.md');
  assertExists(dir, 'MEMORY.md');
  assertExists(dir, '.claude/settings.json');
  assertExists(dir, '.claude/rules/pipeline.md');

  // New shared rule files (tier M/L)
  assertExists(dir, '.claude/rules/output-style.md');
  assertExists(dir, 'docs/claudemd-standards.md');
  assertExists(dir, 'docs/pipeline-standards.md');

  // Conditional docs (all flags enabled in BASE)
  assertExists(dir, 'docs/sitemap.md');
  assertExists(dir, 'docs/db-map.md');

  // Both pipeline skills
  assertExists(dir, '.claude/skills/dependency-scan/SKILL.md');
  assertExists(dir, '.claude/skills/context-review/SKILL.md');

  // Full skill set (all flags enabled in BASE)
  assertExists(dir, '.claude/skills/arch-audit/SKILL.md');
  assertExists(dir, '.claude/skills/security-audit/SKILL.md');
  assertExists(dir, '.claude/skills/skill-dev/SKILL.md');
  assertExists(dir, '.claude/skills/skill-db/SKILL.md');
  assertExists(dir, '.claude/skills/migration-audit/SKILL.md');
  assertExists(dir, '.claude/skills/api-design/SKILL.md');
  assertExists(dir, '.claude/skills/perf-audit/SKILL.md');
  assertExists(dir, '.claude/skills/simplify/SKILL.md');
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

    if (raw.includes('stop_hook_active')) {
      pass(`Tier ${tier}: stop_hook_active guard present in Stop hook`);
    } else {
      fail(`Tier ${tier}: stop_hook_active guard missing from Stop hook`);
    }
  }
}

async function scenarioArchAuditTimestamp() {
  section('Arch audit — timestamp system');

  for (const tier of ['s', 'm', 'l']) {
    const config = {
      ...BASE,
      tier,
      isDiscovery: false,
      includePreCommit: false,
      includeGithub: false,
    };
    const scenarioDir = path.join(OUTPUT_DIR, `arch-audit-ts-tier-${tier}`);
    await fs.ensureDir(scenarioDir);
    await scaffoldTier(tier, scenarioDir, config, TEMPLATES_DIR);

    const settingsPath = path.join(scenarioDir, '.claude/settings.json');
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      if (raw.includes('.claude/session/last-arch-audit')) {
        pass(`Tier ${tier}: SessionStart reads from .claude/session/last-arch-audit`);
      } else {
        fail(
          `Tier ${tier}: SessionStart still uses external ~/.claude/projects/ path for last-audit`,
        );
      }
    }

    const skillPath = path.join(scenarioDir, '.claude/skills/arch-audit/SKILL.md');
    if (fs.existsSync(skillPath)) {
      const skillRaw = fs.readFileSync(skillPath, 'utf8');
      if (skillRaw.includes('last-arch-audit')) {
        pass(`Tier ${tier}: arch-audit Step 5 writes last-arch-audit timestamp`);
      } else {
        fail(`Tier ${tier}: arch-audit Step 5 bash block is empty — timestamp never written`);
      }
    }
  }
}

async function scenarioPerfAuditPlaceholders() {
  section('perf-audit — placeholder resolution + applicability guard');

  for (const tier of ['m', 'l']) {
    const config = { ...BASE, tier, isDiscovery: false, hasFrontend: true, hasApi: true };
    const scenarioDir = path.join(OUTPUT_DIR, `perf-audit-tier-${tier}`);
    await fs.ensureDir(scenarioDir);
    await scaffoldTier(tier, scenarioDir, config, TEMPLATES_DIR);

    const skillPath = path.join(scenarioDir, '.claude/skills/perf-audit/SKILL.md');
    if (!fs.existsSync(skillPath)) {
      fail(`Tier ${tier}: perf-audit/SKILL.md missing`);
      continue;
    }
    const raw = fs.readFileSync(skillPath, 'utf8');

    for (const placeholder of [
      '[FRAMEWORK]',
      '[SITEMAP_OR_ROUTE_LIST]',
      '[API_ROUTES_PATH]',
      '[BUNDLE_TOOL]',
    ]) {
      if (raw.includes(placeholder)) {
        fail(`Tier ${tier}: perf-audit contains unresolved placeholder ${placeholder}`);
      } else {
        pass(`Tier ${tier}: perf-audit placeholder ${placeholder} resolved`);
      }
    }

    if (raw.includes('Applicability check')) {
      pass(`Tier ${tier}: perf-audit Applicability check present`);
    } else {
      fail(`Tier ${tier}: perf-audit Applicability check missing`);
    }
  }
}

async function scenarioSkillDevApplicabilityCheck() {
  section('skill-dev — applicability guard present (tier M/L)');

  for (const tier of ['m', 'l']) {
    const config = { ...BASE, tier, isDiscovery: false };
    const scenarioDir = path.join(OUTPUT_DIR, `skill-dev-applicability-tier-${tier}`);
    await fs.ensureDir(scenarioDir);
    await scaffoldTier(tier, scenarioDir, config, TEMPLATES_DIR);

    const skillPath = path.join(scenarioDir, '.claude/skills/skill-dev/SKILL.md');
    if (!fs.existsSync(skillPath)) {
      fail(`Tier ${tier}: skill-dev/SKILL.md missing`);
      continue;
    }
    const raw = fs.readFileSync(skillPath, 'utf8');

    if (raw.includes('Applicability check')) {
      pass(`Tier ${tier}: skill-dev Applicability check present`);
    } else {
      fail(`Tier ${tier}: skill-dev Applicability check missing`);
    }

    if (raw.includes('CHECK D9') && raw.includes('React only')) {
      pass(`Tier ${tier}: skill-dev skip list includes D9 (useEffect — React only)`);
    } else {
      fail(`Tier ${tier}: skill-dev skip list missing D9 annotation`);
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

  // Conditional docs must be absent (no frontend, no database)
  assertNotExists(dir, 'docs/sitemap.md');
  assertNotExists(dir, 'docs/db-map.md');

  // Skills that must be absent (hasApi=false → api-design pruned; hasDatabase=false → skill-db + migration-audit pruned)
  assertNotExists(dir, '.claude/skills/api-design/SKILL.md');
  assertExists(dir, '.claude/skills/security-audit/SKILL.md');
  assertNotExists(dir, '.claude/skills/skill-db/SKILL.md');
  assertNotExists(dir, '.claude/skills/migration-audit/SKILL.md');
  assertNotExists(dir, '.claude/skills/responsive-audit/SKILL.md');
  assertNotExists(dir, '.claude/skills/visual-audit/SKILL.md');
  assertNotExists(dir, '.claude/skills/ux-audit/SKILL.md');
  assertNotExists(dir, '.claude/skills/ui-audit/SKILL.md');

  // Skills that must always be present
  assertExists(dir, '.claude/skills/arch-audit/SKILL.md');
  assertExists(dir, '.claude/skills/skill-dev/SKILL.md');
  assertExists(dir, '.claude/skills/perf-audit/SKILL.md');
  assertExists(dir, '.claude/skills/commit/SKILL.md');
}

async function scenarioTierSSkillPruning() {
  section('Tier S skill pruning — hasApi=false keeps security-audit (stack-agnostic)');
  const config = {
    ...BASE,
    tier: 's',
    isDiscovery: false,
    hasApi: false,
    hasDatabase: false,
    hasFrontend: false,
  };
  const dir = await scaffold('tier-s-pruned', 's', config);

  // security-audit must be present regardless of hasApi (has native security path)
  assertExists(dir, '.claude/skills/security-audit/SKILL.md');

  // Universal skills must remain
  assertExists(dir, '.claude/skills/arch-audit/SKILL.md');
  assertExists(dir, '.claude/skills/skill-dev/SKILL.md');
  assertExists(dir, '.claude/skills/perf-audit/SKILL.md');
  assertExists(dir, '.claude/skills/simplify/SKILL.md');
  assertExists(dir, '.claude/skills/commit/SKILL.md');

  // Active Skills must list security-audit
  const claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  if (claude.includes('/security-audit')) {
    pass('Tier S pruned: Active Skills lists security-audit (stack-agnostic)');
  } else {
    fail('Tier S pruned: Active Skills should list security-audit even when hasApi=false');
  }

  // Active Skills must list universal skills
  if (
    claude.includes('/skill-dev') &&
    claude.includes('/perf-audit') &&
    claude.includes('/simplify')
  ) {
    pass('Tier S pruned: Active Skills lists universal skills');
  } else {
    fail('Tier S pruned: Active Skills missing universal skills');
  }
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
  section('New rule files — output-style in tier S; standards docs skipped for S, present in M');
  const config = { ...BASE, tier: 's', isDiscovery: false };
  const dir = await scaffold('tier-s-rules', 's', config);

  // output-style.md stays in .claude/rules/ (operational rule — all tiers)
  assertExists(dir, '.claude/rules/output-style.md');
  // Standards reference docs skipped for Tier S (P2 — reduce file count)
  assertNotExists(dir, 'docs/claudemd-standards.md');
  assertNotExists(dir, 'docs/pipeline-standards.md');

  // Verify Tier M still gets standards docs
  const configM = { ...BASE, tier: 'm', isDiscovery: false };
  const dirM = await scaffold('tier-m-rules', 'm', configM);
  assertExists(dirM, '.claude/rules/output-style.md');
  assertExists(dirM, 'docs/claudemd-standards.md');
  assertExists(dirM, 'docs/pipeline-standards.md');
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
    {
      stack: 'swift',
      testCmd: 'swift test',
      devCmd: 'swift run',
      buildCmd: 'swift build -c release',
      installCmd: 'swift package resolve',
      label: 'Swift / macOS',
    },
    {
      stack: 'kotlin',
      testCmd: './gradlew test',
      devCmd: './gradlew run',
      buildCmd: './gradlew build',
      installCmd: './gradlew dependencies',
      label: 'Kotlin / Android',
    },
    {
      stack: 'rust',
      testCmd: 'cargo test',
      devCmd: 'cargo run',
      buildCmd: 'cargo build --release',
      installCmd: 'cargo build',
      label: 'Rust',
    },
    {
      stack: 'dotnet',
      testCmd: 'dotnet test',
      devCmd: 'dotnet run',
      buildCmd: 'dotnet build',
      installCmd: 'dotnet restore',
      label: '.NET / C#',
    },
    {
      stack: 'ruby',
      testCmd: 'bundle exec rspec',
      devCmd: 'bundle exec rails server',
      buildCmd: 'bundle exec rake assets:precompile',
      installCmd: 'bundle install',
      label: 'Ruby',
    },
    {
      stack: 'java',
      testCmd: 'mvn test',
      devCmd: 'mvn exec:java',
      buildCmd: 'mvn package',
      installCmd: 'mvn install',
      label: 'Java',
    },
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

async function scenarioNativeStackCommandDefaults() {
  section('Native stack command defaults — no npm fallback when commands omitted');

  // Simulates detection failure: no commands supplied → should resolve to native defaults, not npm.
  const nativeDefaults = [
    { stack: 'swift', test: 'xcodebuild test', install: '# no install step' },
    { stack: 'kotlin', test: './gradlew test', install: '# no install step' },
    { stack: 'rust', test: 'cargo test', install: '# no install step' },
    { stack: 'dotnet', test: 'dotnet test', install: 'dotnet restore' },
    { stack: 'java', test: 'mvn test', install: 'mvn install' },
  ];

  for (const { stack, test: expectedTest, install: expectedInstall } of nativeDefaults) {
    const config = {
      ...BASE,
      tier: 'm',
      techStack: stack,
      testCommand: '',
      devCommand: '',
      buildCommand: '',
      installCommand: '',
      typeCheckCommand: '',
      isDiscovery: false,
    };
    const dir = await scaffold(`native-cmd-defaults-${stack}`, 'm', config);
    const claudeMd = path.join(dir, 'CLAUDE.md');
    if (!fs.existsSync(claudeMd)) {
      fail(`native-cmd-defaults[${stack}]: CLAUDE.md missing`);
      continue;
    }
    const content = fs.readFileSync(claudeMd, 'utf8');

    if (
      !content.includes('npm test') &&
      !content.includes('npm install') &&
      !content.includes('npm run')
    ) {
      pass(`native-cmd-defaults[${stack}]: no npm commands in CLAUDE.md`);
    } else {
      fail(`native-cmd-defaults[${stack}]: npm command found in CLAUDE.md for native stack`);
    }

    if (content.includes(expectedTest)) {
      pass(`native-cmd-defaults[${stack}]: test command = ${expectedTest}`);
    } else {
      fail(`native-cmd-defaults[${stack}]: expected test command "${expectedTest}" not found`);
    }

    if (content.includes(expectedInstall)) {
      pass(`native-cmd-defaults[${stack}]: install command = ${expectedInstall}`);
    } else {
      fail(
        `native-cmd-defaults[${stack}]: expected install command "${expectedInstall}" not found`,
      );
    }
  }
}

async function scenarioWizardCoverage() {
  section('Wizard coverage — full CLI execution via --answers');

  const CLI = path.resolve(__dirname, '../../src/index.js');
  const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/wizard-answers');

  const fixtures = fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith('.json'))
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

async function scenarioSecurityVariants() {
  section('Security rule variants — stack-aware security.md selection');

  const variants = [
    {
      stack: 'swift',
      hasApi: true,
      expected: 'Native Apple',
      label: 'swift → native-apple',
      denyIncludes: 'xcodebuild archive',
    },
    {
      stack: 'kotlin',
      hasApi: true,
      expected: 'Native Android',
      label: 'kotlin → native-android',
      denyIncludes: 'gradlew publish',
    },
    {
      stack: 'rust',
      hasApi: false,
      expected: 'Systems & Backend',
      label: 'rust (no API) → systems',
      denyIncludes: 'cargo publish',
    },
    {
      stack: 'go',
      hasApi: false,
      expected: 'Systems & Backend',
      label: 'go (no API) → systems',
      denyIncludes: null,
    },
    {
      stack: 'rust',
      hasApi: true,
      expected: 'Security Rules\n',
      label: 'rust (with API) → web',
      denyIncludes: 'cargo publish',
    },
    {
      stack: 'node-ts',
      hasApi: true,
      expected: 'Security Rules\n',
      label: 'node-ts → web',
      denyIncludes: null,
    },
  ];

  for (const { stack, hasApi, expected, label, denyIncludes } of variants) {
    const config = {
      ...BASE,
      tier: 'm',
      techStack: stack,
      hasApi,
      isDiscovery: false,
    };
    const dir = await scaffold(
      `security-variant-${stack}-${hasApi ? 'api' : 'noapi'}`,
      'm',
      config,
    );
    const securityPath = path.join(dir, '.claude', 'rules', 'security.md');

    if (!fs.existsSync(securityPath)) {
      fail(`security-variant[${label}]: security.md missing`);
      continue;
    }

    const content = fs.readFileSync(securityPath, 'utf8');
    if (content.includes(expected)) {
      pass(`security-variant[${label}]: correct variant`);
    } else {
      fail(`security-variant[${label}]: expected "${expected}" in security.md`);
    }

    // Verify no other security variant files leaked into output
    const rulesDir = path.join(dir, '.claude', 'rules');
    const ruleFiles = fs.readdirSync(rulesDir);
    const securityFiles = ruleFiles.filter((f) => f.startsWith('security'));
    if (securityFiles.length === 1 && securityFiles[0] === 'security.md') {
      pass(`security-variant[${label}]: no variant files leaked`);
    } else {
      fail(`security-variant[${label}]: unexpected security files: ${securityFiles.join(', ')}`);
    }

    // Verify stack-specific deny entries in settings.json
    if (denyIncludes) {
      const settingsPath = path.join(dir, '.claude', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const denyList = (settings.permissions?.deny || []).join(' ');
      if (denyList.includes(denyIncludes)) {
        pass(`security-variant[${label}]: deny includes ${denyIncludes}`);
      } else {
        fail(`security-variant[${label}]: deny missing ${denyIncludes}`);
      }
    }

    // security-audit is always present (stack-agnostic, has native security path)
    assertExists(dir, '.claude/skills/security-audit/SKILL.md');
  }
}

async function scenarioPlaceholderNoiseReduction() {
  section('Placeholder noise reduction — unfilled sections stripped from CLAUDE.md');

  // Tier M — RBAC, Key Workflows, Known Patterns stripped
  const configM = { ...BASE, tier: 'm', isDiscovery: false };
  const dirM = await scaffold('noise-reduction-tier-m', 'm', configM);
  const claudeM = fs.readFileSync(path.join(dirM, 'CLAUDE.md'), 'utf8');

  for (const stripped of ['## RBAC / Roles', '## Key Workflows', '## Known Patterns']) {
    if (!claudeM.includes(stripped)) {
      pass(`Tier M: section "${stripped}" stripped`);
    } else {
      fail(`Tier M: section "${stripped}" should be stripped`);
    }
  }

  for (const kept of [
    '## Overview',
    '## Tech Stack',
    '## Key Commands',
    '## Coding Conventions',
    '## Interaction Protocol',
    '## Reference Documents',
    '## Environment',
  ]) {
    if (claudeM.includes(kept)) {
      pass(`Tier M: section "${kept}" preserved`);
    } else {
      fail(`Tier M: section "${kept}" should be preserved`);
    }
  }

  // Tier L — additionally strips Navigation by Role
  const configL = {
    ...BASE,
    tier: 'l',
    isDiscovery: false,
    e2eCommand: 'npx playwright test',
    hasE2E: true,
  };
  const dirL = await scaffold('noise-reduction-tier-l', 'l', configL);
  const claudeL = fs.readFileSync(path.join(dirL, 'CLAUDE.md'), 'utf8');

  for (const stripped of [
    '## RBAC / Roles',
    '## Key Workflows',
    '## Navigation by Role',
    '## Known Patterns',
  ]) {
    if (!claudeL.includes(stripped)) {
      pass(`Tier L: section "${stripped}" stripped`);
    } else {
      fail(`Tier L: section "${stripped}" should be stripped`);
    }
  }

  for (const kept of [
    '## Overview',
    '## Tech Stack',
    '## Key Commands',
    '## Interaction Protocol',
    '## Reference Documents',
    '## Environment',
  ]) {
    if (claudeL.includes(kept)) {
      pass(`Tier L: section "${kept}" preserved`);
    } else {
      fail(`Tier L: section "${kept}" should be preserved`);
    }
  }

  // Verify CLAUDE.md line count reduced (raw template ~92 lines with injections, stripped should be < 80)
  const lineCountM = claudeM.split('\n').length;
  if (lineCountM < 80) {
    pass(`Tier M: CLAUDE.md line count reduced (${lineCountM} lines)`);
  } else {
    fail(`Tier M: CLAUDE.md still ${lineCountM} lines — expected < 80 after stripping`);
  }

  // Tier S — Known Patterns stripped (only section applicable)
  const configS = { ...BASE, tier: 's', isDiscovery: false };
  const dirS = await scaffold('noise-reduction-tier-s', 's', configS);
  const claudeS = fs.readFileSync(path.join(dirS, 'CLAUDE.md'), 'utf8');

  if (!claudeS.includes('## Known Patterns')) {
    pass('Tier S: section "## Known Patterns" stripped');
  } else {
    fail('Tier S: section "## Known Patterns" should be stripped');
  }

  // Native stack (swift, hasApi=false) — web convention stripped, no [HAS_API] literal
  const configNative = {
    ...BASE,
    tier: 'm',
    isDiscovery: false,
    techStack: 'swift',
    hasApi: false,
    hasDatabase: false,
    hasFrontend: false,
    hasDesignSystem: false,
  };
  const dirNative = await scaffold('noise-reduction-native', 'm', configNative);
  const claudeNative = fs.readFileSync(path.join(dirNative, 'CLAUDE.md'), 'utf8');

  if (!claudeNative.includes('Every API route')) {
    pass('Native: "Every API route" convention stripped');
  } else {
    fail('Native: "Every API route" convention should be stripped when hasApi=false');
  }

  // No [HAS_API] literal should appear in any scaffolded skill file
  const skillFiles = walkFiles(path.join(dirNative, '.claude', 'skills'));
  let hasApiLiteral = false;
  for (const f of skillFiles) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('[HAS_API]')) {
      hasApiLiteral = true;
      fail(`[HAS_API] placeholder found in ${path.relative(dirNative, f)}`);
    }
  }
  if (!hasApiLiteral) {
    pass('Native: no [HAS_API] placeholder in skill files');
  }
}

async function scenarioInPlaceClaudeMdGeneration() {
  section('In-place — generateClaudeMd runs when no pre-existing CLAUDE.md');

  const dir = path.join(OUTPUT_DIR, 'in-place-claudemd-gen');
  await fs.ensureDir(dir);

  // No pre-existing CLAUDE.md — scaffold should generate a processed one
  const config = {
    ...BASE,
    tier: 'm',
    isDiscovery: false,
    mode: 'in-place',
    techStack: 'swift',
    hasApi: false,
    hasDatabase: false,
    hasFrontend: false,
    hasDesignSystem: false,
    testCommand: 'xcodebuild test -scheme TestProject',
  };
  await scaffoldTierSafe('m', dir, config, TEMPLATES_DIR);

  // Simulate what init-in-place.js does: call generateClaudeMd when no pre-existing CLAUDE.md
  await generateClaudeMd(config, dir);

  const claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');

  // Active Skills section must be present
  if (claude.includes('## Active Skills')) {
    pass('in-place gen: Active Skills section present');
  } else {
    fail('in-place gen: Active Skills section missing');
  }

  // Unfilled sections must be stripped
  for (const stripped of ['## RBAC / Roles', '## Key Workflows', '## Known Patterns']) {
    if (!claude.includes(stripped)) {
      pass(`in-place gen: "${stripped}" stripped`);
    } else {
      fail(`in-place gen: "${stripped}" should be stripped`);
    }
  }

  // Web-centric convention must be stripped for hasApi=false
  if (!claude.includes('Every API route')) {
    pass('in-place gen: "Every API route" convention stripped for native');
  } else {
    fail('in-place gen: "Every API route" convention should be stripped when hasApi=false');
  }

  // Native stack: Auth/Storage/Email placeholders removed
  if (!claude.includes('**Auth**:')) {
    pass('in-place gen: Auth placeholder removed for native');
  } else {
    fail('in-place gen: Auth placeholder should be removed for native stack');
  }

  // Deploy should have native default
  if (claude.includes('_native distribution_')) {
    pass('in-place gen: Deploy has native default');
  } else {
    fail('in-place gen: Deploy should show native distribution for native stack');
  }
}

async function scenarioCheatsheetPruning() {
  section('Cheatsheet pruning — removed skills stripped from cheatsheet');

  const config = { ...BASE, tier: 'm', isDiscovery: false, hasApi: false, hasDatabase: false };
  const dir = await scaffold('cheatsheet-pruning', 'm', config);

  const cheatPath = path.join(dir, '.claude', 'cheatsheet.md');
  if (!fs.existsSync(cheatPath)) {
    fail('cheatsheet pruning: cheatsheet.md missing');
    return;
  }
  const cheat = fs.readFileSync(cheatPath, 'utf8');

  if (!cheat.includes('/api-design')) {
    pass('cheatsheet: /api-design row removed (hasApi=false)');
  } else {
    fail('cheatsheet: /api-design row should be removed when hasApi=false');
  }

  if (!cheat.includes('/skill-db')) {
    pass('cheatsheet: /skill-db row removed (hasDatabase=false)');
  } else {
    fail('cheatsheet: /skill-db row should be removed when hasDatabase=false');
  }

  if (!cheat.includes('/migration-audit')) {
    pass('cheatsheet: /migration-audit row removed (hasDatabase=false)');
  } else {
    fail('cheatsheet: /migration-audit row should be removed when hasDatabase=false');
  }

  if (cheat.includes('/security-audit')) {
    pass('cheatsheet: /security-audit row present (stack-agnostic, not API-gated)');
  } else {
    fail('cheatsheet: /security-audit row should be present regardless of hasApi');
  }

  // Doc reference must be correct
  if (cheat.includes('refactoring-backlog.md')) {
    pass('cheatsheet: correct doc reference (refactoring-backlog.md)');
  } else {
    fail('cheatsheet: wrong doc reference — expected refactoring-backlog.md');
  }

  if (!cheat.includes('backlog-refinement.md')) {
    pass('cheatsheet: old doc reference (backlog-refinement.md) absent');
  } else {
    fail('cheatsheet: old doc reference backlog-refinement.md still present');
  }
}

async function scenarioNativeSkillAdaptation() {
  section('Native skill adaptation — perf-audit, skill-dev, security-audit for non-web stacks');

  const stacks = [
    { stack: 'swift', perfTool: 'Instruments', lintCmd: 'swiftlint', secChecklist: 'Keychain API' },
    {
      stack: 'kotlin',
      perfTool: 'Android Studio',
      lintCmd: 'detekt',
      secChecklist: 'Android Keystore',
    },
    { stack: 'rust', perfTool: 'cargo bench', lintCmd: 'clippy', secChecklist: 'unsafe block' },
    { stack: 'go', perfTool: 'pprof', lintCmd: 'staticcheck', secChecklist: 'Goroutine leak' },
    {
      stack: 'python',
      perfTool: 'cProfile',
      lintCmd: 'ruff',
      secChecklist: 'Pickle deserialization',
    },
    { stack: 'ruby', perfTool: 'stackprof', lintCmd: 'rubocop', secChecklist: 'Mass assignment' },
    { stack: 'java', perfTool: 'JProfiler', lintCmd: 'spotbugs', secChecklist: 'Deserialization' },
    {
      stack: 'dotnet',
      perfTool: 'dotTrace',
      lintCmd: 'dotnet format',
      secChecklist: 'Configuration secrets',
    },
  ];

  for (const { stack, perfTool, lintCmd, secChecklist } of stacks) {
    // security-audit is always present (stack-agnostic)
    const config = {
      ...BASE,
      tier: 'm',
      techStack: stack,
      hasApi: true,
      hasDatabase: true,
      hasFrontend: false,
      hasDesignSystem: false,
      isDiscovery: false,
    };
    const dir = await scaffold(`native-skill-${stack}`, 'm', config);

    // perf-audit: native path present with resolved tool placeholders
    const perfPath = path.join(dir, '.claude', 'skills', 'perf-audit', 'SKILL.md');
    if (fs.existsSync(perfPath)) {
      const perf = fs.readFileSync(perfPath, 'utf8');

      if (perf.includes('Step 6') && perf.includes('Native/Backend Performance Audit')) {
        pass(`native-skill[${stack}]: perf-audit has native path (Step 6)`);
      } else {
        fail(`native-skill[${stack}]: perf-audit missing native path`);
      }

      if (perf.includes(perfTool)) {
        pass(`native-skill[${stack}]: perf-audit [PERF_TOOL] resolved to ${perfTool}`);
      } else {
        fail(`native-skill[${stack}]: perf-audit [PERF_TOOL] not resolved — expected ${perfTool}`);
      }

      if (!perf.includes('[PERF_TOOL]') && !perf.includes('[PROFILER_COMMAND]')) {
        pass(`native-skill[${stack}]: perf-audit no unresolved placeholders`);
      } else {
        fail(`native-skill[${stack}]: perf-audit has unresolved placeholders`);
      }

      // Must NOT exit for native stacks anymore
      if (!perf.includes('output the following and stop')) {
        pass(`native-skill[${stack}]: perf-audit no exit guard for native`);
      } else {
        fail(`native-skill[${stack}]: perf-audit still exits for native stacks`);
      }
    } else {
      fail(`native-skill[${stack}]: perf-audit/SKILL.md missing`);
    }

    // skill-dev: language-specific checks present with resolved lint command
    const devPath = path.join(dir, '.claude', 'skills', 'skill-dev', 'SKILL.md');
    if (fs.existsSync(devPath)) {
      const dev = fs.readFileSync(devPath, 'utf8');

      if (dev.includes('DL1') && dev.includes('Language-specific')) {
        pass(`native-skill[${stack}]: skill-dev has DL1 language-specific checks`);
      } else {
        fail(`native-skill[${stack}]: skill-dev missing DL1 checks`);
      }

      if (dev.includes(lintCmd)) {
        pass(`native-skill[${stack}]: skill-dev [LINT_COMMAND] resolved to ${lintCmd}`);
      } else {
        fail(`native-skill[${stack}]: skill-dev [LINT_COMMAND] not resolved — expected ${lintCmd}`);
      }

      if (!dev.includes('[LINT_COMMAND]')) {
        pass(`native-skill[${stack}]: skill-dev no unresolved [LINT_COMMAND]`);
      } else {
        fail(`native-skill[${stack}]: skill-dev has unresolved [LINT_COMMAND]`);
      }
    } else {
      fail(`native-skill[${stack}]: skill-dev/SKILL.md missing`);
    }

    // security-audit: native checklist present with resolved items
    const secPath = path.join(dir, '.claude', 'skills', 'security-audit', 'SKILL.md');
    if (fs.existsSync(secPath)) {
      const sec = fs.readFileSync(secPath, 'utf8');

      if (sec.includes('Step 3e') && sec.includes('Native application security')) {
        pass(`native-skill[${stack}]: security-audit has native supplement (Step 3e)`);
      } else {
        fail(`native-skill[${stack}]: security-audit missing native supplement`);
      }

      if (sec.includes(secChecklist)) {
        pass(
          `native-skill[${stack}]: security-audit checklist resolved — contains ${secChecklist}`,
        );
      } else {
        fail(
          `native-skill[${stack}]: security-audit checklist not resolved — expected ${secChecklist}`,
        );
      }

      if (!sec.includes('[SECURITY_CHECKLIST_ITEMS]')) {
        pass(`native-skill[${stack}]: security-audit no unresolved [SECURITY_CHECKLIST_ITEMS]`);
      } else {
        fail(`native-skill[${stack}]: security-audit has unresolved [SECURITY_CHECKLIST_ITEMS]`);
      }
    } else {
      fail(`native-skill[${stack}]: security-audit/SKILL.md missing`);
    }
  }

  // Additional: verify node-ts (web stack) still gets web path, no exit
  const webConfig = { ...BASE, tier: 'm', isDiscovery: false };
  const webDir = await scaffold('native-skill-web-baseline', 'm', webConfig);
  const webPerf = fs.readFileSync(
    path.join(webDir, '.claude', 'skills', 'perf-audit', 'SKILL.md'),
    'utf8',
  );
  if (webPerf.includes('Step 1') && webPerf.includes('Step 6')) {
    pass('web-baseline: perf-audit has both web (Step 1) and native (Step 6) paths');
  } else {
    fail('web-baseline: perf-audit missing expected paths');
  }
}

// ── Rubric scoring ──────────────────────────────────────────────────────────

const rubricDims = {};

function rubricPass(dim, label) {
  if (!rubricDims[dim]) rubricDims[dim] = { passed: 0, failed: 0 };
  rubricDims[dim].passed++;
  pass(`rubric ${dim}: ${label}`);
}

function rubricFail(dim, label) {
  if (!rubricDims[dim]) rubricDims[dim] = { passed: 0, failed: 0 };
  rubricDims[dim].failed++;
  fail(`rubric ${dim}: ${label}`);
}

function computeDScore(dim) {
  const d = rubricDims[dim];
  if (!d || d.passed + d.failed === 0) return 0;
  const rate = d.passed / (d.passed + d.failed);
  if (rate >= 1.0) return 3;
  if (rate >= 0.66) return 2;
  if (rate >= 0.33) return 1;
  return 0;
}

function resetRubricDims() {
  for (const k of Object.keys(rubricDims)) delete rubricDims[k];
}

async function scenarioRubricScore() {
  section('Rubric scoring — D2/D5/D7/D8 for 3 representative stacks');

  const rubricConfigs = [
    {
      name: 'node-ts',
      config: { ...BASE, tier: 'm', techStack: 'node-ts', isDiscovery: false },
      isNative: false,
      expectedFramework: null, // node-ts uses wizard default
      hasApi: true,
    },
    {
      name: 'swift',
      config: {
        ...BASE,
        tier: 'm',
        techStack: 'swift',
        isDiscovery: false,
        hasApi: false,
        hasFrontend: false,
        hasDatabase: false,
        hasDesignSystem: false,
        installCommand: '# no install step',
        devCommand: 'swift run',
        buildCommand: 'xcodebuild build',
        testCommand: 'xcodebuild test',
      },
      isNative: true,
      expectedFramework: 'N/A',
      hasApi: false,
    },
    {
      name: 'python',
      config: { ...BASE, tier: 'm', techStack: 'python', isDiscovery: false },
      isNative: false,
      expectedFramework: null,
      hasApi: true,
    },
  ];

  const weights = { D2: 1.0, D5: 1.0, D7: 2.0, D8: 1.0 };
  const maxWeighted = Object.values(weights).reduce((a, b) => a + b * 3, 0); // 15

  for (const { name, config, isNative, expectedFramework, hasApi } of rubricConfigs) {
    resetRubricDims();
    const dir = await scaffold(`rubric-${name}`, 'm', config);
    const claudeMd = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');

    // ── D2: Commands & conventions ──────────────────────────────────────
    const commandPlaceholders = [
      '[INSTALL_COMMAND]',
      '[DEV_COMMAND]',
      '[BUILD_COMMAND]',
      '[TEST_COMMAND]',
      '[TYPE_CHECK_COMMAND]',
    ];
    const hasCommandPlaceholder = commandPlaceholders.some((p) => claudeMd.includes(p));
    if (!hasCommandPlaceholder) {
      rubricPass('D2', `[${name}] no command placeholders in CLAUDE.md`);
    } else {
      rubricFail('D2', `[${name}] command placeholder found in CLAUDE.md`);
    }

    if (isNative) {
      // Extract Key Commands block
      const cmdMatch = claudeMd.match(/```bash([\s\S]*?)```/);
      const cmdBlock = cmdMatch ? cmdMatch[1] : '';
      if (!cmdBlock.includes('npm ')) {
        rubricPass('D2', `[${name}] no npm in Key Commands for native stack`);
      } else {
        rubricFail('D2', `[${name}] npm found in Key Commands for native stack`);
      }
    }

    if (!hasApi) {
      if (!claudeMd.includes('Every API route')) {
        rubricPass('D2', `[${name}] no "Every API route" convention when hasApi=false`);
      } else {
        rubricFail('D2', `[${name}] "Every API route" convention present when hasApi=false`);
      }
    }

    // ── D5: Skill relevance ─────────────────────────────────────────────
    if (claudeMd.includes('## Active Skills')) {
      rubricPass('D5', `[${name}] Active Skills section present`);
    } else {
      rubricFail('D5', `[${name}] Active Skills section missing`);
    }

    // Extract skill names from Active Skills section
    const activeMatch = claudeMd.match(/## Active Skills\n([\s\S]*?)(?:\n## |\n$|$)/);
    const activeBlock = activeMatch ? activeMatch[1] : '';
    const listedSkills = [...activeBlock.matchAll(/`\/([a-z-]+)`/g)].map((m) => m[1]);

    // Every listed skill must exist on disk
    for (const skill of listedSkills) {
      const skillPath = path.join(dir, '.claude', 'skills', skill, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        rubricPass('D5', `[${name}] listed skill /${skill} exists on disk`);
      } else {
        rubricFail('D5', `[${name}] listed skill /${skill} missing from disk`);
      }
    }

    // No pruned skill should be listed (security-audit is always present — not API-gated)
    if (!hasApi) {
      if (!activeBlock.includes('/api-design')) {
        rubricPass('D5', `[${name}] no API-only skills listed when hasApi=false`);
      } else {
        rubricFail('D5', `[${name}] API-only skill listed when hasApi=false`);
      }
    }

    // Cheatsheet consistency
    const cheatPath = path.join(dir, '.claude', 'cheatsheet.md');
    if (fs.existsSync(cheatPath)) {
      const cheat = fs.readFileSync(cheatPath, 'utf8');
      let cheatClean = true;
      if (!hasApi && cheat.includes('/api-design')) cheatClean = false;
      if (config.hasDatabase === false && cheat.includes('/skill-db')) cheatClean = false;
      if (config.hasDatabase === false && cheat.includes('/migration-audit')) cheatClean = false;
      if (cheatClean) {
        rubricPass('D5', `[${name}] cheatsheet has no phantom skill rows`);
      } else {
        rubricFail('D5', `[${name}] cheatsheet lists pruned skills`);
      }
    }

    // ── D7: Safety & guardrails ─────────────────────────────────────────
    const settingsPath = path.join(dir, '.claude', 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

      // Stop hook
      const hooks = settings.hooks;
      if (hooks && hooks.Stop && Array.isArray(hooks.Stop) && hooks.Stop.length > 0) {
        rubricPass('D7', `[${name}] Stop hook present`);
      } else {
        rubricFail('D7', `[${name}] Stop hook missing`);
      }

      // Stop hook resolved
      const hookStr = JSON.stringify(hooks);
      if (!hookStr.includes('[TEST_COMMAND]')) {
        rubricPass('D7', `[${name}] Stop hook test command resolved`);
      } else {
        rubricFail('D7', `[${name}] Stop hook has unresolved [TEST_COMMAND]`);
      }

      // Deny list
      const deny = settings.permissions && settings.permissions.deny;
      if (Array.isArray(deny) && deny.length > 0) {
        rubricPass('D7', `[${name}] permissions.deny non-empty`);
      } else {
        rubricFail('D7', `[${name}] permissions.deny empty or missing`);
      }

      if (Array.isArray(deny) && deny.some((d) => d.includes('push --force'))) {
        rubricPass('D7', `[${name}] deny blocks force-push`);
      } else {
        rubricFail('D7', `[${name}] deny missing force-push block`);
      }

      if (Array.isArray(deny) && deny.some((d) => d.includes('push origin main'))) {
        rubricPass('D7', `[${name}] deny blocks push to main`);
      } else {
        rubricFail('D7', `[${name}] deny missing push-to-main block`);
      }
    } else {
      rubricFail('D7', `[${name}] settings.json missing`);
    }

    // Security rule file
    if (fs.existsSync(path.join(dir, '.claude', 'rules', 'security.md'))) {
      rubricPass('D7', `[${name}] security.md rule file present`);
    } else {
      rubricFail('D7', `[${name}] security.md rule file missing`);
    }

    // ── D8: Cross-file coherence ────────────────────────────────────────
    // Test command coherence: CLAUDE.md Key Commands vs Stop hook
    const cmdBlockMatch = claudeMd.match(/```bash([\s\S]*?)```/);
    const cmdBlockText = cmdBlockMatch ? cmdBlockMatch[1] : '';
    const testCmd = config.testCommand;
    if (cmdBlockText.includes(testCmd)) {
      rubricPass('D8', `[${name}] test command in CLAUDE.md matches config`);
    } else {
      rubricFail('D8', `[${name}] test command mismatch in CLAUDE.md`);
    }

    // Framework value resolved
    if (expectedFramework) {
      if (claudeMd.includes(expectedFramework)) {
        rubricPass('D8', `[${name}] Framework value resolved (${expectedFramework})`);
      } else {
        rubricFail('D8', `[${name}] Framework value not resolved`);
      }
    } else {
      // For non-native: just check it's not a placeholder
      if (!claudeMd.includes('[FRAMEWORK_VALUE]')) {
        rubricPass('D8', `[${name}] Framework placeholder resolved`);
      } else {
        rubricFail('D8', `[${name}] Framework placeholder unresolved`);
      }
    }

    // Cheatsheet doc reference
    if (fs.existsSync(cheatPath)) {
      const cheat = fs.readFileSync(cheatPath, 'utf8');
      if (!cheat.includes('backlog-refinement.md')) {
        rubricPass('D8', `[${name}] cheatsheet has correct doc reference`);
      } else {
        rubricFail('D8', `[${name}] cheatsheet has stale backlog-refinement.md reference`);
      }
    }

    // No [HAS_API] literal in skills
    const skillsDir = path.join(dir, '.claude', 'skills');
    const skillFiles = fs.existsSync(skillsDir) ? walkFiles(skillsDir) : [];
    const hasApiLiteral = skillFiles.some((f) => {
      if (!f.endsWith('.md')) return false;
      return fs.readFileSync(f, 'utf8').includes('[HAS_API]');
    });
    if (!hasApiLiteral) {
      rubricPass('D8', `[${name}] no [HAS_API] literal in skill files`);
    } else {
      rubricFail('D8', `[${name}] [HAS_API] literal found in skill files`);
    }

    // ── Aggregate ───────────────────────────────────────────────────────
    const scores = {};
    let weightedTotal = 0;
    for (const dim of ['D2', 'D5', 'D7', 'D8']) {
      scores[dim] = computeDScore(dim);
      weightedTotal += scores[dim] * weights[dim];
    }
    const pct = Math.round((weightedTotal / maxWeighted) * 100);
    console.log(
      `  ${c.cyan('◆')} Rubric [${name}]: D2=${scores.D2} D5=${scores.D5} D7=${scores.D7} D8=${scores.D8} → ${weightedTotal}/${maxWeighted} (${pct}%)`,
    );

    // Quality floor: every dimension must score ≥ 2
    for (const dim of ['D2', 'D5', 'D7', 'D8']) {
      if (scores[dim] < 2) {
        fail(`rubric floor: [${name}] ${dim} scored ${scores[dim]} (minimum 2)`);
      }
    }
  }
}

// ── new skill scaffolder ────────────────────────────────────────────────────

async function scenarioNewSkillScaffolder() {
  section('new skill scaffolder — end-to-end');

  const dir = path.join(OUTPUT_DIR, 'new-skill');
  await fs.ensureDir(path.join(dir, '.claude'));
  await fs.writeFile(
    path.join(dir, 'CLAUDE.md'),
    '# Test\n\n## Active Skills\n- `/arch-audit`\n\n## Environment\nNode 22\n',
  );

  const CLI = path.resolve(__dirname, '../../src/index.js');
  const answers = JSON.stringify({
    name: 'deploy',
    description: 'Deploy the application to staging and run smoke tests.',
    model: 'haiku',
    userInvocable: true,
    effort: 'medium',
    usesPlaywright: false,
    stepCount: 3,
  });

  try {
    execFileSync('node', [CLI, 'new', 'skill', '--answers', answers], {
      cwd: dir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (e) {
    fail('new skill command', e.stderr || e.message);
    return;
  }

  // Verify SKILL.md created
  const skillPath = path.join(dir, '.claude', 'skills', 'custom-deploy', 'SKILL.md');
  if (fs.existsSync(skillPath)) {
    pass('new skill: SKILL.md created');
  } else {
    fail('new skill: SKILL.md not created');
    return;
  }

  // Verify test-skill.js created
  const testPath = path.join(dir, '.claude', 'skills', 'custom-deploy', 'test-skill.js');
  if (fs.existsSync(testPath)) {
    pass('new skill: test-skill.js created');
  } else {
    fail('new skill: test-skill.js not created');
  }

  // Verify frontmatter
  const content = fs.readFileSync(skillPath, 'utf8');
  const hasFrontmatter = content.startsWith('---\n') && content.includes('\n---\n');
  if (hasFrontmatter) pass('new skill: valid frontmatter delimiters');
  else fail('new skill: missing frontmatter');

  if (content.includes('name: custom-deploy')) pass('new skill: name field correct');
  else fail('new skill: name field incorrect');

  if (content.includes('context: fork')) pass('new skill: context is fork');
  else fail('new skill: context not fork');

  if (content.includes('model: haiku')) pass('new skill: model field correct');
  else fail('new skill: model field incorrect');

  // Verify description under 250 chars
  const descMatch = content.match(/^description:\s*(.+)/m);
  if (descMatch && descMatch[1].length <= 250) pass('new skill: description under 250 chars');
  else fail('new skill: description over 250 chars or missing');

  // Verify step structure
  if (content.includes('## Step 1') && content.includes('## Step 3 - Produce report'))
    pass('new skill: step structure correct');
  else fail('new skill: step structure incorrect');

  // Verify CLAUDE.md registration
  const claudeMd = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  if (claudeMd.includes('/custom-deploy')) pass('new skill: registered in CLAUDE.md');
  else fail('new skill: not registered in CLAUDE.md');

  // Verify custom- prefix was auto-applied (input was "deploy", output is "custom-deploy")
  if (fs.existsSync(path.join(dir, '.claude', 'skills', 'custom-deploy')))
    pass('new skill: custom- prefix auto-applied');
  else fail('new skill: custom- prefix not applied');

  // Test with Playwright answers
  const playwrightAnswers = JSON.stringify({
    name: 'visual-check',
    description: 'Run visual regression checks with Playwright screenshots.',
    model: 'opus',
    userInvocable: true,
    effort: 'high',
    usesPlaywright: true,
    allowedTools: 'mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot',
    stepCount: 2,
  });

  try {
    execFileSync('node', [CLI, 'new', 'skill', '--answers', playwrightAnswers], {
      cwd: dir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (e) {
    fail('new skill (playwright)', e.stderr || e.message);
    return;
  }

  const pwContent = fs.readFileSync(
    path.join(dir, '.claude', 'skills', 'custom-visual-check', 'SKILL.md'),
    'utf8',
  );
  if (pwContent.includes('allowed-tools:')) pass('new skill: Playwright allowed-tools present');
  else fail('new skill: Playwright allowed-tools missing');

  if (pwContent.includes('mcp__playwright__browser_navigate'))
    pass('new skill: Playwright tools listed');
  else fail('new skill: Playwright tools not listed');
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
  await scenarioArchAuditTimestamp();
  await scenarioPerfAuditPlaceholders();
  await scenarioSkillDevApplicabilityCheck();
  await scenarioPipelineGateCount();
  await scenarioSkillPruning();
  await scenarioTierSSkillPruning();
  await scenarioUiAuditPruning();
  await scenarioCommitSkillAllTiers();
  await scenarioNewRuleFiles();
  await scenarioNewStacks();
  await scenarioNativeStackCommandDefaults();
  await scenarioSecurityVariants();
  await scenarioPlaceholderNoiseReduction();
  await scenarioInPlaceClaudeMdGeneration();
  await scenarioCheatsheetPruning();
  await scenarioNativeSkillAdaptation();
  await scenarioWizardCoverage();
  await scenarioRubricScore();
  await scenarioNewSkillScaffolder();

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log();
  console.log(c.bold('─────────────────────────────────'));
  console.log(
    `${c.green(`✓ ${passed} passed`)}  ${failed > 0 ? c.red(`✗ ${failed} failed`) : c.dim(`✗ ${failed} failed`)}  ${c.yellow(`⚠ ${warned} warned`)}`,
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
