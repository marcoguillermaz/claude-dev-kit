# Changelog

All notable changes to claude-dev-kit are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.13.0] — 2026-04-24

### Added

- **New skill `/doc-audit`** (Issue #61, Tier M/L): static documentation drift audit. Seven checks:
  - **D1 Relative-link resolution**: markdown links to local files must resolve. `http(s)://` and anchors excluded.
  - **D2 Code-block syntax**: `json` / `yaml` / `toml` fenced blocks are parsed with a stack-appropriate tool (`node -e`, `python -c yaml.safe_load`, `python -c tomllib`). Blocks containing template markers (`<...>`, `{{...}}`, `[PLACEHOLDER]`) are skipped.
  - **D3 CDK placeholder residuals**: pinned list of the ten scaffold tokens — `[TEST_COMMAND]`, `[FRAMEWORK_VALUE]`, `[LANGUAGE_VALUE]`, `[INSTALL_COMMAND]`, `[DEV_COMMAND]`, `[BUILD_COMMAND]`, `[TYPE_CHECK_COMMAND]`, `[E2E_COMMAND]`, `[ENUM_CASE_CONVENTION]`, `[MIGRATION_COMMAND]`. Every token on the list is grepped against `packages/cli/templates/**` — only tokens the scaffold actually writes are included. Generic `[UPPERCASE]` regex is intentionally avoided.
  - **D4 Slash-command name match**: `/<skill>` mentions cross-verified against `.claude/skills/<skill>/`. CDK CLI verbs (`init`, `upgrade`, `doctor`, `add`, `new`) allowlisted.
  - **D5 Skill-count consistency**: numeric claims (`\d+ skills`) cross-verified against `.claude/skills/` minus `custom-*`.
  - **D6 ADR marker freshness**: if `[ADR_PATH]` set, frontmatter dates older than 180 days without a terminal `status:` flagged.
  - **D7 Stack-specific doc sync**: top-3 stacks only (`node-ts`, `python`, `swift`). Patterns live in a sibling `PATTERNS.md` — Next.js routes, Django URLconf paths, Swift Package.swift products. Other stacks skip D7.
- New skill directory scaffolded in `packages/cli/templates/tier-m/.claude/skills/doc-audit/` and `tier-l/.claude/skills/doc-audit/` (byte-identical across tiers): `SKILL.md` (271 body lines, inside the 500-line guardrail) + `PATTERNS.md` (agnostic D3 list + D7 stack-specific patterns).
- Registry entry in `skill-registry.js`: `minTier: 'm'`, `requires: {}` (universal), `cheatsheet: true`, `excludeNative: false`.
- Cheatsheet row for `/doc-audit` added in both Tier M and Tier L cheatsheet.md.
- Integration scenario `scenarioDocAuditPresent`: scaffolds tier-s/m/l and verifies SKILL.md + PATTERNS.md presence (or pruning on tier-s), cheatsheet row presence, pipeline.md Track C invocation, `allowed-tools` syntax spec-compliance, and SKILL.md body size budget.

### Changed

- `pipeline.md` Track C in both Tier M and Tier L renamed from `Track C - Test suite audit` to `Track C - Test + doc audit`, with `/doc-audit` invocation added alongside `/test-audit`.
- `README.md` skill count reference updated from `16 audit skills` to `17 audit skills`; `/doc-audit` row added to the skills table; Testing section updated to `895 integration checks` and `332 unit tests`; shields.io badge updated to `895 checks`.
- `docs/operational-guide.md` audit-skill table updated with a `/doc-audit` row (universal tier-M/L install, no `requires`); Phase 5d Track C renamed to "Test + doc audit"; full `/doc-audit` skill detail section added after `/test-audit`.
- Integration test count: 864 → 895 (+31 from `scenarioDocAuditPresent`).
- CLAUDE.md line-count regression guard in `scenarioPlaceholderNoiseReduction` loosened from `< 80` to `< 85` to accommodate the extra Active Skills row (one line per new skill in the registry). The guard still catches stripping regressions vs. the ~92-line raw template.
- `skill-registry.test.js` entry-count assertion updated from 18 to 19.

---

## [1.12.0] — 2026-04-24

### Added

- Five new `doctor` cross-file validation checks, all `warn:true` for user-facing scans (hard-fail only in CDK-internal integration tests):
  - `settings-no-placeholders`: flags unfilled `[UPPERCASE_TOKEN]` placeholders in `.claude/settings.json`.
  - `claudemd-stop-hook-test-cmd-match`: confirms the test command in the Stop hook appears in CLAUDE.md Key Commands. Handles both Tier S (`… && exit 0; CMD || echo`) and Tier M/L (`… && exit 0; cd $CLAUDE_PROJECT_DIR && CMD 2>&1 | tail`) hook shapes.
  - `claudemd-skills-directory-parity`: set-diffs `## Active Skills` in CLAUDE.md against `.claude/skills/` directory listing. `custom-*` skills excluded.
  - `pipeline-md-tier-coherence`: self-consistency check between the H1 of `pipeline.md` (Fast Lane / Tier M / Tier L) and the phase-section pattern (`FL-N` vs `Phase N` vs `Phase 1.6`).
  - `security-md-stack-alignment`: detects stack markers in the cwd (`Package.swift`, `build.gradle`, `Cargo.toml`, `go.mod`, `Gemfile`, `pom.xml`, `pyproject.toml`, `tsconfig.json`, `package.json`, `*.csproj`) and verifies `security.md` uses the expected variant (web / native-apple / native-android / systems) via H1 signature with content-marker fallback.
- New shared helper `packages/cli/src/utils/doctor-cross-file.js` with 9 functions (`parseActiveSkills`, `parseStopHookTestCmd`, `claudeMdContainsCommand`, `hasPlaceholder`, `detectPipelineTier`, `detectPhaseCountTier`, `detectSecurityVariant`, `expectedSecurityVariant`, `detectStackSync`). Sync-only companion to the async `detect-stack.js`.
- New unit test suite `test/unit/doctor-cross-file.test.js` — 30 cases covering the 9 helpers + edge cases (placeholder detection, YAML list vs scalar `allowed-tools` forms, H1 signature fallback).
- New integration scenario `scenarioDoctorCrossFileValidation` in `test/integration/run.js`: scaffolds tier-s/m/l, injects stack markers, and exercises both the happy path (all 5 checks pass/skip) and five corruption cases (one per check) that verify the expected drift is detected.

### Changed

- `doctor` runs **26 checks** total (was 21 post-v1.11.0, documented as 19 in stale README/operational-guide). v1.12.0 closes both the legacy doc drift and adds the 5 new checks.
- README check-count reference updated to `(26 checks)`.
- `docs/operational-guide.md` §Runs N checks refreshed to enumerate all 26 with Tier-0 skip note updated to "Checks 12-26".
- Integration test count: 834 → 864 (+30 from 6 assertions × 5 tier rows in `scenarioDoctorCrossFileValidation`).
- Unit test count: 302 → 332 (+30 from `doctor-cross-file` helper cases).

---

## [1.11.0] — 2026-04-24

### Fixed

- `allowed-tools` frontmatter syntax in `skill-review` tier-m/tier-l SKILL.md (`Read, Glob, Grep, Bash` → `Read Glob Grep Bash`). Anthropic spec documents space-separated string or YAML list; the comma-separated form is a scalar value with literal commas (`js-yaml` verified), which under a spec-conformant parser resolves to tool names that do not exist (`Read,`, `Glob,`, `Grep,`) and silently drops pre-authorisation. The remaining 39 SKILL.md were already compliant.
- `arch-audit` × 3 tier (tier-s/m/l) reduced from 508 to 360 body lines by extracting Step 3c (Prompting Guide P1–P5), Step 3d (token/subagent optimization T1–T5), and Step H1 (hook compliance H1a–H1f) into a sibling `advanced-checks.md` (173 lines, level 1 nesting per Anthropic spec). Closes Anthropic best-practice violation (≤ 500 lines) and CDK-C18 in `/arch-audit`.

### Added

- `doctor` check `skill-md-size-budget`: warns when any `.claude/skills/*/SKILL.md` body exceeds `SKILL_MD_MAX_LINES` (500, per Anthropic best practice).
- `doctor` check `skill-allowed-tools-syntax`: warns on comma-separated `allowed-tools` values, preventing regression of the v1.11.0 fix.
- Integration scenario `scenarioSkillMdSpecCompliance`: scaffolds tier-s/m/l and fails if any scaffolded SKILL.md exceeds 500 lines or uses comma syntax. Hard-fails as CDK-internal normative check (distinct from the user `doctor` check which only warns).
- `packages/cli/src/utils/skill-frontmatter.js` helper exposing `parseSkillFile`, `extractFields`, `countBodyLines`, `allowedToolsHasCommas`. Single regex-based YAML parser shared by `doctor`, `new-skill` validation, and integration tests.
- `SKILL_MD_MAX_LINES = 500` constant in `utils/constants.js` (threshold alignment with Anthropic best practice).
- 3 new `advanced-checks.md` reference files in `packages/cli/templates/tier-{s,m,l}/.claude/skills/arch-audit/` (byte-identical across tiers).
- Unit test suite `test/unit/skill-frontmatter.test.js` (10 new cases covering frontmatter parsing, body line counting, and comma detection edge cases).

### Changed

- `new-skill.js:validateSkillMd` migrated from inline regex frontmatter parsing to the shared `parseSkillFile` helper. Removes duplicate regex parser drift risk; behaviour preserved (unit tests unchanged).
- Integration test count: 828 → 834 (6 new checks from `scenarioSkillMdSpecCompliance`, 2 assertions × 3 tiers).
- Unit test count: 292 → 302 (10 new cases for `skill-frontmatter` helper).

---

## [1.10.4] — 2026-04-23

### Added

- Smoke test suite for `detect-stack.js` (20 tests across 2 describe blocks) covering stack identification markers for all 11 supported stacks (package.json ± tsconfig, pyproject.toml, go.mod, Gemfile, pom.xml, build.gradle.kts, build.gradle, Package.swift, .csproj, Cargo.toml) plus `suggestedTier` thresholds for the three calibrated brackets. Prerequisite coverage for the tier-threshold extraction below.

### Fixed

- CLI `--version` now reads from `package.json` at runtime (was hard-coded `1.6.1` — 4 releases of drift vs actual 1.10.3). Identified by `skill-dev` audit (J4).
- Wizard `AUDIT_MODELS` option list no longer offers `claude-opus-4-6` (Legacy per Anthropic models page); replaced with `claude-opus-4-7`. Fixes the root cause for the `operational-guide.md:166` doc drift below.
- `scaffold/index.js` `patchSettingsPermissions` no longer silently swallows malformed settings.json during stack-permission patching — now logs a `console.warn` that names the file, the target stack, and the underlying error. Prevents scaffolds from shipping default JS/Node permissions on native stacks with no user-visible signal. Two new unit tests assert the warning is emitted and the file content is left unchanged.

### Changed

- `CONTRIBUTING.md` test counts refreshed to 828 integration + 270 unit (were 464/243, stale vs `README.md` and `CHANGELOG.md [1.10.3]`).
- `docs/operational-guide.md:166` wizard recommendation for deep-analysis model updated from `claude-opus-4-6` (Legacy per Anthropic models page) to `claude-opus-4-7`.
- `docs/operational-guide.md:43` + `:403` audit skill count aligned to 16 (was 15); added missing `skill-review` to the available-skills enumeration (added in v1.10.0, #58).
- Extracted three policy limits to named constants in `utils/constants.js`: `SKILL_DESC_MAX_CHARS` (250), `CLAUDE_MD_MAX_LINES` (200), `STOP_HOOK_MAX_TIMEOUT_SEC` (600). Removes magic numbers from `new-skill.js` and `doctor.js`.
- Consolidated `NATIVE_STACKS` usage — 7 inline literal arrays in `init-greenfield.js`, `init-in-place.js`, `scaffold/index.js` replaced with the canonical import from `skill-registry.js`. Added `WEB_STACKS` export in the same module and replaced 3 `webStacks` locals.
- Unified `STACK_CMD_DEFAULTS` (claude-md.js) and `stackCommandDefaults` (scaffold/index.js) into a single `STACK_COMMANDS` table in the new `utils/stack-commands.js` module. Install/dev/build/test values were byte-identical; `typeCheck` has two consumer-specific shapes (`typeCheck` for the CLAUDE.md commands block, `typeCheckPlaceholder` for `[TYPE_CHECK_COMMAND]` template interpolation).
- Extracted tier-suggestion thresholds into `utils/tier-suggestion.js`: 3 calibrated brackets (nodeWeb 100/30, medium 80/20, compact 60/15) plus `suggestTier(fileCount, thresholds)` helper. `detect-stack.js` 11 inline ternaries now delegate to the helper; values unchanged, single source of truth.

### Removed

- Unused `AUDIT_MODEL_DEFAULT` constant (0 consumers — confirmed via grep).
- `export` keyword on `scaffoldTier0` — it is only called internally from `scaffoldTier` and not listed in `_testHelpers`, so the public surface shrinks with no external impact.

---

## [1.10.3] — 2026-04-23

### Fixed

- arch-audit H1a grep pattern missed 15 hook events (StopFailure, PostToolUseFailure, SubagentStart/Stop, TaskCreated, PermissionRequest/Denied, TeammateIdle, SessionEnd, FileChanged, CwdChanged, ConfigChange, UserPromptExpansion, Elicitation/Result) — would have falsely flagged StopFailure already in use.
- arch-audit C17 regex false-positive on arch-audit itself (self-referential `mcp__` in grep pattern) — added skip-by-name + `^allowed-tools:` anchor.
- tier-l cheatsheet out of sync with skills dir: 5 skills missing (arch-audit, commit, context-review, dependency-scan, skill-review) — restored to parity with tier-m + added context-review row (tier-l exclusive).
- tier-l settings.json hook `model: "claude-haiku-4-5"` undocumented short-form → alias `haiku` (matches 41 SKILL.md frontmatter convention).
- tier-s settings.json deny missing `Bash(git push origin main*)` — baseline main protection restored.
- tier-l settings.json deny missing `Bash(DROP TABLE*)`, `Bash(TRUNCATE*)` — regression vs tier-m.

### Updated

- arch-audit "new events worth adding" catalogue refreshed with 6 events (UserPromptExpansion, SessionEnd, TeammateIdle, TaskCreated, PostToolUseFailure, PermissionRequest) + note on new `type: "mcp_tool"` hook type (v2.1.118).
- claudemd-standards.md: hook events list v2.1.85 → v2.1.118 (22 → 27 events, `Last verified: 2026-04-23`).

### Unchanged

- No code changes in CLI source — template-only release. Integration 828/828, unit 270/270.

---

## [1.10.2] — 2026-04-19

### Fixed

- Cross-stack audit fixes (14 items from Node-TS + Python senior audits): NT-B1/B2, NT-T1-T5, PY-B1-B3, PY-T3/T4/T6/T7.
- Python, Go, Ruby now scaffold with stack-specific commands instead of npm fallbacks (PY-B1).
- `frameworkValue()` returns per-stack examples: FastAPI/Django/Flask for Python, Gin/Echo for Go, Rails/Sinatra for Ruby (NT-B1).
- Em-dash replaced with hyphen across all 107 template .md files per `output-style.md` rule (NT-B2).
- Phase 3b RLS generalized to "row-level access control (database-level RLS or application-level guards)" (NT-T3).

### Added

- 5 stack-conditional placeholders: `[VALIDATION_LIBRARIES]`, `[TEST_CLEANUP_PATTERN]`, `[COMMIT_EXAMPLES]`, `[BUILD_ARTIFACTS]`, `[ENVIRONMENT_SETUP]`.
- Python permissions extended: pytest, mypy, uvicorn, alembic in allow list; `alembic downgrade base` in deny (PY-B2/B3).
- Deny list hardening: `DROP DATABASE*` and `npm publish*` added to all tier settings.json (PY-T4).
- `SEC-` prefix added to severity handling in pipeline.md (NT-T5).
- `docs/sitemap.md` and `docs/db-map.md` added to files-guide.md "Loaded on demand" section.
- arch-audit skill aligned to Opus 4.7 (released April 16, 2026): new model IDs, retiring Claude 4.0 IDs, 4 new hook events, 5 new hook capabilities, settings awareness for `xhigh`/`autoMode`/`sandbox`.
- `.claude/rules/` and `.claude/settings.json` removed from git tracking (workspace config, not product).
- Unit tests: 270 (was 267). Integration checks: 828 (unchanged).

---

## [1.10.1] — 2026-04-18

### Fixed

- Native stack scaffolding gaps found via Swift validation: `swift run` default for GUI apps, `# not configured` in pipeline prose, dependency-scan `true is false` interpolation, staff-manager contamination, `Color.red` pilot example.
- Doctor command: timeout check at both outer and inner hook levels.
- Cheatsheet gap: 4 skills (responsive/visual/ux/ui-audit) now listed in cheatsheet templates with conditional pruning via `cheatsheet: true` in skill-registry.
- Tier-L template sync: 3 missing docs files (implementation-checklist, refactoring-backlog, requirements) copied from tier-M.
- Dead code: 7 orphan `replace()` calls removed from `interpolate()` (HAS_API, HAS_DATABASE, HAS_FRONTEND, HAS_E2E, AUDIT_MODEL, DESIGN_SYSTEM_NAME, HAS_PRD) — no template contained these placeholders.

### Added

- `scripts/lint-templates.mjs` — static analysis: banned patterns, wizard placeholder coverage, tier M/L file sync. Zero warnings, zero false positives.
- Content assertion tests for 3 golden-file stacks: Swift (20 checks), Node-TS (22 checks), Python (22 checks).
- Cross-stack invariant tests: 10 stacks × 6 invariants = 60 assertions.
- Integration checks: 828 (was 536). Unit tests: 267 (was 281 — 14 removed for dead code).
- 29 integration scenarios (was 27).

---

## [1.10.0] — 2026-04-17

### Added

- `/skill-review` skill (Tier M lite, Tier L full) — quality review pipeline for skill portfolios. Includes 5 supporting documents: REVIEW_FRAMEWORK.md, SEVERITY_SCALE.md, SPEC_SNAPSHOT.md, SKILLS_INVENTORY.md, CALIBRATION_KIT.md. Tier M skips Phase 4 (external LLM) and Phase 9 (midpoint drift). Tier L runs full pipeline.
- 19 reference files across 15 skills: PATTERNS.md (10), CHECKS.md (2), REPORT.md (6), DIMENSIONS.md (1) — stack-scaffolded patterns separated from skill body logic.

### Changed

- Pipeline v2 body purity: all 17 SKILL.md files reworked — framework-specific patterns (grep commands, CSS utilities, Tailwind classes, SwiftUI literals) extracted from bodies into reference files. Bodies contain only universal principles. Net -2009 lines.
- Configuration sections added to security-audit (`[SITEMAP_OR_ROUTE_LIST]`), perf-audit (`[PERF_TOOL]`, `[PROFILER_COMMAND]`), skill-dev (`[LINT_COMMAND]`).
- skill-dev: scope filter for stack-specific check exclusion, refactoring-backlog.md fallback for missing file, D8 native stack clarification.
- Skill registry: 18 entries (added skill-review).
- `add skill` command: 18 skills available.
- Cross-validated by 4 LLMs (GPT-4.1, Gemini 2.5 Pro, Mistral Large, Sonar Pro) + 36 behavioral fixture cases across 6 high-risk skills.
- Integration checks: 536 (was 533).

---

## [Pre-1.10.0 development log] — targeted v1.9.1, shipped as part of v1.10.0

### Added

- `/test-audit` skill (Tier M/L, universal - no `requires`) - static test-suite quality audit. Parses coverage reports in 5 supported formats (lcov.info, Istanbul JSON, Cobertura XML, go coverage.out, tarpaulin JSON; xcresult optional via `xcrun xccov`). Pyramid shape classification (unit/integration/e2e) by path convention + framework imports. 8 anti-pattern checks (T1-T8): `.only`/`fit`/`fdescribe` committed, skipped tests, `.todo` placeholders, empty test bodies, tests without assertions, hardcoded sleeps, debug output in tests, multi-file `.only` broken CI. Backlog prefix `TEST-`. New Pipeline Phase 5d Track C runs for every block after Phase 3 is green. Critical findings (`.only` committed, 0% coverage on a file changed in the block) block Phase 6. Stack-aware across all 11 supported stacks; checks without a stack-specific pattern return `N/A - skipped for <stack>`. Flaky-test detection deferred; v1 is static-only (#58)
- `/accessibility-audit` skill (Tier M/L, `hasFrontend=true`) - unified accessibility surface. Three modes: `static` (A1-A8 grep patterns: aria-label on icon buttons, positive tabindex, outline-none regression, img alt, form labels, focus ring size, onClick on non-interactive, nav keyboard access); `full` (adds APCA contrast probes C1-C3 via Playwright, both themes); `wcag` (adds axe-core 4.9.1 scan with `wcag2a + wcag2aa + wcag21aa + wcag22aa` tags, plus `best-practice`). Backlog prefix `A11Y-`. Pipeline Phase 5d Track A execution order: `/ui-audit` (static, concurrent) → `/accessibility-audit` → `/visual-audit` → `/ux-audit` → `/responsive-audit` (#60)
- `/migration-audit` skill (Tier M/L, `hasDatabase=true`) - stack-aware static analysis of migration files. Detects Prisma, Drizzle, Supabase CLI, raw SQL; Rails/Django/Alembic/Flyway detected but pending support. 8 check families (M1-M8): lock-heavy DDL, missing rollback, unsafe backfills, constraint sequencing, data loss, unsafe type changes, unindexed FKs, ordering integrity. Backlog prefix `MIG-`. Pipeline Phase 5d Track B now runs `/migration-audit` when migrations are applied (#59)
- `new skill` command - interactive wizard to scaffold custom skills with valid frontmatter, test fixture, and CLAUDE.md registration (#55)
- `claudemd-update.js` shared utility - extracted CLAUDE.md Active Skills registration for reuse across commands
- `.github/drift-tracker/` - weekly GitHub Action that scrapes Anthropic docs for native features overlapping with CDK, opens `anthropic-drift` issues when overlap detected (#56)
- `add skill <name>` command - install a single skill without full scaffold (18 skills available)
- `add rule <name>` command - install a single rule with stack-specific security variants (`--stack swift|kotlin|rust|dotnet|java|go`)
- `custom-*` skill convention - user-created skills preserved across `upgrade` and `init` operations
- `docs/custom-skills.md` - SKILL.md authoring guide (frontmatter schema, model selection, body patterns)
- `skill-registry.js` - single source of truth for skill applicability rules (18 entries, 3 query functions)
- `.github/FUNDING.yml` - GitHub Sponsors enabled
- `.github/ISSUE_TEMPLATE/skill_request.md` - issue template for new skill requests (tier, stack, install condition)
- `.github/ISSUE_TEMPLATE/config.yml` - issue chooser; blank issues disabled, support redirected to Discussions Q&A
- `.github/workflows/discussion-monitor.yml` - weekly cron: finds unanswered Q&A discussions (>14 days), creates summary issue
- GitHub Project board populated with Q1-Q2 roadmap deliverables (14 issues across 2 milestones)
- Skill `description` field in all 18 SKILL.md frontmatter files (max 250 chars, used by Claude for auto-invocation)

### Fixed

- Hook `timeout` values corrected from milliseconds to seconds per Anthropic JSON schema (Tier M: 300000→300, Tier L: 600000→600)
- Doctor check #18 threshold corrected from 600000 to 600 (seconds, not milliseconds)
- Doctor check #18 fix message now suggests correct value (`"timeout": 300`)

### Changed

- `/ui-audit` scope narrowed to design-system compliance only. Extracted to `/accessibility-audit`: CHECK 11 (icon-only aria-label), CHECK 13 (positive tabindex), CHECK 14 (outline-none), CHECK 16 (img alt), CHECK 17 (form labels), S4 (nav keyboard), S6 (focus ring), S7 (onClick non-interactive), and Step 4 (axe-core WCAG scan). `/ui-audit` is now static-only (no Playwright). Check numbering preserves gaps to avoid breaking external references (#60)
- `/visual-audit` narrowed from 11 to 10 dimensions. V8 (Contrast & legibility) and APCA Lc anchors in V4 extracted to `/accessibility-audit` (C1-C3). Page score denominator changed from `/55` to `/50`; bucket thresholds recalibrated proportionally (Excellent ≥40 / Good 30-39 / Needs work 20-29 / Poor <20). Scoring rules updated: `Score 3 on V1/V3/V4/V9/V10 → Major` (V8 removed) (#60)
- `/skill-db` scope narrowed to live SQL verification (schema quality S1-S6 + N+1 query patterns Q1-Q3). Migration file analysis extracted to `/migration-audit` - single source of truth for migration safety across all database stacks. Pipeline Phase 5d Track B splits migration audit (`/migration-audit`) from schema audit (`/skill-db`). Affects projects invoking `/skill-db` for migration checks (#59)
- Agents converted to on-demand skills: `dependency-scanner` → `/dependency-scan`, `context-reviewer` → `/context-review` — eliminates `.claude/agents/` directory from all templates (#62)
- `pruneSkills()` rewritten from 37 to 5 lines (delegates to skill registry)
- `pruneCheatsheet()` rewritten from 15 to 9 lines (delegates to skill registry)
- `injectActiveSkills()` rewritten from 28 to 10 lines (delegates to skill registry)
- `NATIVE_STACKS` consolidated from 5 duplicate declarations to 1 export in skill-registry.js
- `FIRST_SESSION.md` moved from project root to `.claude/FIRST_SESSION.md` with auto-deletion in pipeline Phase 8
- Tier S file count reduced: 4 informational files skipped (files-guide, adr-template, pipeline-standards, claudemd-standards)
- Post-init message simplified from 5-6 steps to 2-3
- `upgrade` command now detects and reports custom skills as "preserved"
- `operational-guide.docs` renamed to `operational-guide.md`
- README rewritten in product-led style (badges, quick start, feature matrix, architecture diagram)
- CONTRIBUTING.md updated with skill registry workflow and `add` commands

### Fixed

- `responsive-audit` was not excluded for native stacks in `injectActiveSkills()` - CLAUDE.md listed it but the directory didn't exist for Swift/Kotlin/Rust projects
- Tier M pipeline Phase 8.5 referenced non-existent `context-reviewer` agent - changed to inline grep
- (CodeQL High) `init-in-place.js` incomplete URL substring sanitization - `remotes.includes('github.com')` replaced with regex domain match
- (CodeQL Medium) `add.test.js` shell injection risk - `execSync` template literal replaced with `execFileSync` + args array
- (CodeQL Medium) `review-wizard-output.js` no-op `.replace('─', '─')` removed
- (CodeQL Medium) `ci.yml` and `claude-dev-kit-verify.yml` missing `permissions:` blocks - added `contents: read` (least privilege)
- `security-audit` skill was gated on `hasApi: true` in skill registry - native apps (Swift, Kotlin, Rust) never received it despite having NS1-NS6 native security checks
- `arch-audit` SKILL.md description exceeded 250-char limit (255 chars) - trimmed to 211
- `doctor` now checks Stop hook timeout presence (check #18) and deny list duplicates (check #19)

### Evaluated (decisions documented, no code change)

- P5 Tier L: frozen - maintain functional, no new investment until real adoption signal
- P6 Agents: agent-to-skill conversion scheduled for next cycle (saves 27K tokens/session)
- P7 MCP: incremental adoption - GitHub MCP Q2, ecosystem reassessment Q4

---

## [1.0.0] — 2026-03-22

### Changed — Scope and positioning

- Primary target redefined: Builder PM and tech lead (people with enough technical background to work end-to-end with Claude Code). Not a generic "Product Trio."
- Tier boundaries reframed around blast radius and collaborator count, not file count or duration
- "Governance layer" positioning removed throughout — replaced with "scaffold for legible, reviewable AI-assisted development"
- CLI description, template files, pipeline criteria all updated to match

### Added — Enforcement layer

- `.github/workflows/claude-dev-kit-verify.yml` — CI template that verifies scaffold integrity on every PR (Stop hook configured, no unfilled placeholder, CLAUDE.md present, CODEOWNERS present)

### Added — `doctor` compliance reporting

- `--report` flag: machine-readable JSON output (`timestamp`, `cwd`, `summary`, per-check `status`/`fix`) consumable by CI pipelines and external audit systems
- `--ci` flag: silent mode, exits 1 on any failure — for GitHub Actions

---

## [0.5.3] — 2026-03-15

### Fixed — Critical

- Stop hook was missing from Tier S `settings.json`, breaking the core contract ("tests must pass in every tier"). Now enforced in all four tiers.

---

## [0.5.2] — 2026-03-10

### Added

- UAT scenario definition at scope gate: when Phase 4 E2E activates, the user must explicitly list numbered user journeys (1–5 scenarios) at Phase 1. Claude implements exactly those scenarios — it does not invent test cases.
- Phase 4 renamed "UAT / E2E tests" across Tier M/L pipelines.

---

## [0.5.1] — 2026-03-05

### Added

- Interactive tier selector: 3 diagnostic questions → auto-suggest tier with explanation
- Conditional Phase 4 E2E testing in Tier M/L (opt-in via init wizard, per-block scope gate confirmation)
- `doctor` now checks Stop hook for unfilled `[TEST_COMMAND]` placeholder (11th check)
- `FIRST_SESSION.md` scaffolded for Tier M/L — team guide to first block cycle

---

## [0.5.0] — 2026-02-20

### Added

- Session recovery (`.claude/session/`)
- Scope gate with Tier 1/2 EARS sweep auto-selection
- Interaction Protocol in CLAUDE.md templates
- Three new settings hooks: arch-audit reminder, InstructionsLoaded logging, PostCompact reminder
- Phase 8.5 mandatory closing message
- Phase 8 3-commit sequence
- Phase 5b/5c/5d block-scoped quality audits (Tier L)
- Structural Requirements Changes pipeline R1–R4 (Tier L)
- Fast Lane session file, escalation rule, scope-confirm gate
- C1–C11 context review with explicit grep commands
- Multi-agent orchestration: `dependency-scanner` (Tier M/L) and `context-reviewer` (Tier L)

---

## [0.1.0] — 2026-01-15

### Added

- Initial release: four-tier scaffold system (Discovery / Fast Lane / Standard / Full)
- Three init paths: Greenfield, From context, In-place
- `doctor` command with 10 checks
- `upgrade` command (non-destructive tier promotion)
- 9 audit skills for Tier M/L
- Pre-commit hooks, CODEOWNERS, PR template scaffolding
