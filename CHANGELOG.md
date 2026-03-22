# Changelog

All notable changes to claude-dev-kit are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
