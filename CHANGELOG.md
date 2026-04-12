# Changelog

All notable changes to claude-dev-kit are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — v1.9.1

### Added
- `add skill <name>` command - install a single skill without full scaffold (12 skills available)
- `add rule <name>` command - install a single rule with stack-specific security variants (`--stack swift|kotlin|rust|dotnet|java|go`)
- `custom-*` skill convention - user-created skills preserved across `upgrade` and `init` operations
- `docs/custom-skills.md` - SKILL.md authoring guide (frontmatter schema, model selection, body patterns)
- `skill-registry.js` - single source of truth for skill applicability rules (12 entries, 3 query functions)
- `.github/FUNDING.yml` - GitHub Sponsors enabled
- `.github/ISSUE_TEMPLATE/skill_request.md` - issue template for new skill requests (tier, stack, install condition)
- `.github/ISSUE_TEMPLATE/config.yml` - issue chooser; blank issues disabled, support redirected to Discussions Q&A
- `.github/workflows/discussion-monitor.yml` - weekly cron: finds unanswered Q&A discussions (>14 days), creates summary issue
- GitHub Project board populated with Q1-Q2 roadmap deliverables (14 issues across 2 milestones)
- Skill `description` field in all 12 SKILL.md frontmatter files (max 250 chars, used by Claude for auto-invocation)

### Changed
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
