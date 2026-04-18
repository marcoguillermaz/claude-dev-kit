# Changelog

All notable changes to claude-dev-kit are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Unreleased] — v1.9.1

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
