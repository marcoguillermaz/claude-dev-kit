# Changelog

All notable changes to claude-dev-kit are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

> Bundle note: trimmed to the last three releases for review compactness.

## [1.16.0] — 2026-04-25

### Added

- **`team-settings.json` governance file** (Q3 #3, Issue #94, ICE 175): opt-in `.claude/team-settings.json` for team-wide CLI policy. Schema v1: `minTier` (s | m | l), `allowedSkills`, `blockedSkills`, `requiredSkills`. Empty/absent file = unrestricted (full backward compatibility).
- **CLI enforcement** across `init`, `upgrade`, and `add skill`. `init` refuses scaffolds that violate `minTier` and explains the violation. `upgrade` refuses on `minTier` violation in an existing scaffold and suggests `init --tier=<min>` to promote. `add skill` refuses skills that are blocked or absent from the `allowedSkills` whitelist (`custom-*` skills bypass the whitelist by design).
- **Doctor check `team-settings-compliance`** (warn-level): flags `minTier` violations on the current scaffold, blocked skills present in `.claude/skills/`, missing `requiredSkills`, and reports schema parse errors with the exact field. Doctor check count: 27 → 28.
- **Schema validation** with descriptive errors: malformed JSON, unknown `minTier` value, non-array skill lists, non-string skill entries, and `allowedSkills ∩ blockedSkills` overlap (mutual exclusion).
- **Helpers** in `packages/cli/src/utils/team-settings.js`: `readTeamSettings`, `validateTeamSettings`, `violatesMinTier`, `isSkillBlocked`, `isSkillAllowed`, `getRequiredSkills`. CLI-side wrappers in `team-settings-cli.js` (`loadTeamSettingsOrExit`, `enforceTeamSettingsTier`).
- **Integration scenario `scenarioTeamSettings`** in `test/integration/run.js`: 10 assertions covering absent file (skip), `minTier` violation (doctor warn + upgrade refuse), blocked skill add (refuse), allowed-list whitelist refuse, missing required skill (doctor warn), allowed/blocked overlap (doctor warn), malformed JSON (upgrade exit), and `custom-*` semantics (whitelist bypass + blocklist enforcement).
- **Unit tests** in `test/unit/team-settings.test.js`: 22 cases covering parser, validator, mutual exclusion, `violatesMinTier` precedence, `isSkillBlocked`/`isSkillAllowed` semantics including `custom-*` bypass, and `getRequiredSkills` array immutability.

### Changed

- Doctor JSON `--report` now includes `info` on `warn` and `fail` results (previously only on `pass`). Existing checks gain diagnostic context in CI output without behavior change.
- Integration test count: 990 → 1000 (+10 from `scenarioTeamSettings`).
- Unit test count: 343 → 365 (+22 from `team-settings.test.js`).

### Notes

- v1.16.0 enforcement is **CDK-only**. Skill restrictions and model selection are not translated to native `permissions.allow/deny` in `.claude/settings.json` because Claude Code's `Skill()` permission rule is not part of the documented public schema. Generation of native rules will land once the upstream contract is verified, tracked for v1.17+. Until then, governance is enforced when the user runs the CDK CLI; Claude Code sessions can still invoke skills directly.
- `init-from-context` does not enforce `team-settings.json`. The target directory is greenfield (newly created), so a parent `team-settings.json` does not propagate by design.

---

## [1.15.0] — 2026-04-25

### Added

- **`upgrade --anthropic` flag** (Q3 #2, Issue #93, ICE 210): refreshes files that encode Anthropic spec / best practices, separately from the standard `upgrade` flow. Default behavior is dry-run with a colourized unified diff (via the `diff` npm package) so the contributor reviews the change before committing it. `--apply` writes the new content with a timestamped backup file (`<original>.bak.<ISO-timestamp>`) for the previous version. Combinable with the standard upgrade in a single invocation.
- **`ANTHROPIC_FILES` registry** in `packages/cli/src/commands/upgrade.js`: a list of templates that are 1:1 copied to a scaffold (no placeholder interpolation, no flag-based section stripping) and therefore safe to compare raw. v1.15.0 scope is one file: `.claude/skills/arch-audit/advanced-checks.md`. Files that pass through the scaffold transformation pipeline (`pipeline-standards.md`, `claudemd-standards.md`, `arch-audit/SKILL.md`) stay in `REVIEW_REQUIRED` until a transformation-aware compare is implemented in a future release.
- **Helper exports** from `upgrade.js`: `backupPath(originalPath, now)` and `detectScaffoldedTier(cwd)`. Used by both the upgrade command and the new doctor check.
- **Doctor check `anthropic-files-current`**: warns when any of the `ANTHROPIC_FILES` differs from the installed CDK template. Doctor check count: 26 → 27.
- **Integration scenario `scenarioUpgradeAnthropic`** in `test/integration/run.js`: scaffolds tier-m and tier-s projects, exercises the dry-run / `--apply` / `.bak` / no-tier-detected paths, and cross-checks the doctor `anthropic-files-current` status before and after refresh. ~11 new integration assertions.
- **Unit tests** in `test/unit/upgrade-anthropic.test.js`: 11 cases for `ANTHROPIC_FILES` registry shape, `backupPath` ISO timestamp formatting, and `detectScaffoldedTier` against tier S / M / L / unrecognized H1 / missing pipeline.md.

### Changed

- New dependency `diff` (^9.0.0) added to `packages/cli/package.json`. Unified-diff generation is cross-platform (no shell-out to system `diff`).
- Integration test count: 979 → 990 (+11 from `scenarioUpgradeAnthropic`).
- Unit test count: 332 → 343 (+11 from `upgrade-anthropic.test.js`).

### Notes

- The v1.15.0 `--anthropic` scope is intentionally narrow. It establishes the contract — flag, dry-run, backup, doctor wiring — on a single file that the scaffold copies 1:1 from the template. Expanding the registry to files that go through `interpolate()` or section stripping requires a transformation-aware compare (likely re-running the scaffold pipeline against the user's current config), tracked for v1.16+.

### Documentation

Rolled in from PR #114 (originally merged docs-only without version bump):

- **CONTRIBUTING.md overhaul** (Q2 #6, ICE 256): full restructure to 11 sections aligned to v1.14.0 state. Closes the "Partial" status from PR #46 (2026-04-02).
  - Refreshed test counts (979 integration, 332 unit) and removed the stale "(currently 19)" doctor-check reference.
  - Expanded project structure with `docs/`, `scripts/`, recent utilities (`skill-frontmatter.js`, `doctor-cross-file.js`, `constants.js`, `stack-commands.js`).
  - New section "Design principles": mechanical over judgment-heavy, stack-aware depth, agnostic-only patterns in templates, byte-identical Tier M/L, 500-line `SKILL.md` body budget, spec-compliant `allowed-tools` syntax.
  - New section "Process governance" exposes R1 (`/commit` skill mandatory) and R2 (`/humanize` on user-facing GitHub prose) publicly. Documents atomic-commits-per-skill convention with the per-commit `skill-registry.test.js` length-assertion bump pattern. Notes prettier-before-staging and mid-feature `wc -l` budget checkpoints.
  - New section "Adding a new skill" with a 9-step inline walkthrough: registry entry shape, frontmatter schema, sibling files (`PATTERNS.md` / `REPORT.md` / `PROFILES.md` / `advanced-checks.md`), Tier M/L copy verification, cheatsheet row, pipeline.md Track A/B/C invocation, integration scenario via `assertSkillPresent` helper, backlog ID prefix selection, documentation touch points. Includes minimal but compilable code examples.
  - New section "Testing strategy" describes the unit/integration two-layer setup, fixture conventions, the custom `pass()`/`fail()` reporter, output-dir gitignore.
  - New section "How PRs are reviewed" with explicit must-have / nice-to-have / auto-reject criteria.
  - New section "For maintainers" at end of document: release process (tag, humanized GitHub Release, issue close, roadmap sync, GitHub Project Status update), npm publish guidance, `gh auth` switching protocol, branch protection notes, pre-release smoke-test protocol.
  - Welcoming intro paragraph framing the moat principle (mechanical > judgment-heavy) for first-time contributors.
  - 387 lines (was 116).

---

## [1.14.0] — 2026-04-25

### Added

- **Three new skills** (Issue #66, Tier M/L) — closes the Q2 #7 bundle:
  - **`/api-contract-audit`** — requires `hasApi: true`. Static OpenAPI contract audit. Eight checks AC1-AC8: endpoint drift (spec vs code set-diff), schema drift (field-level compare of Zod / Pydantic / io-ts / class-validator against spec), status-code mismatch, breaking-change detection vs previous spec (`git show HEAD~1:<spec-path>` diff; required field removed, enum value removed, path removed, type change = Critical), versioning consistency, security scheme alignment, deprecation markers, Richardson Maturity Model scoring L0-L3 (HATEOAS detected via `_links` / `rel` / `href` / HAL / JSON:API patterns in response schema). Framework auto-gen: FastAPI (`/openapi.json` endpoint or decorator parsing), NestJS (`@ApiProperty` decorators), Express + swagger-jsdoc (JSDoc annotations), Next.js 13+ route handlers (`app/api/*/route.ts` + Zod inference), Django REST Framework (`drf-spectacular` / `drf-yasg`). Patterns in sibling `PATTERNS.md`. Backlog prefix `API-`. Runs in Phase 5d Track B.
  - **`/infra-audit`** — universal (no `requires`). Static infra-security audit across five layers, each running only if its markers are detected: **GitHub Actions** (GHA-1..7: pwn-request, secret logging, unpinned actions, permissions overreach, self-hosted runner on public PR, untrusted input in run, workflow modification permission); **Dockerfile** (D-1..6: latest tag, root user, ADD with URL, unpinned base image, secret in build arg, apt without cleanup); **Kubernetes** (K-1..7: runAsNonRoot missing, allowPrivilegeEscalation, privileged container, hostNetwork/hostPID/hostIPC, writable rootfs, secret as env var, imagePullPolicy mismatch); **Terraform** (T-1..6: IAM wildcard action, IAM wildcard resource, public S3, state in git, module without version pin, hardcoded secret); **GitLab CI** (GL-1..4: secret logging, unpinned image, unprotected runner, script injection). Patterns in sibling `PATTERNS.md`. Backlog prefix `INFRA-`. Runs in Phase 5d Track C on every block. Stack-agnostic.
  - **`/compliance-audit`** — universal (no `requires`). Static compliance audit with regulatory profiles. v1.14 ships the **GDPR profile active** (10 checks G1-G10 across 4 pillars: data-subject rights delete/export/rectify, lawful basis + consent, PII identification + encryption-at-rest for Article 9 special-category + logging hygiene, retention + sub-processors). Output includes a mechanical **GDPR readiness tier** (foundational / operational / mature); explicit caveat that the tier is mechanical and does not constitute legal attestation. **SOC 2 and HIPAA profiles scaffolded** in sibling `PROFILES.md` as future-markers with check IDs `SOC2-1..10` / `HIPAA-1..10`, reserved backlog prefixes, and enablement blockers documented (SOC 2: pattern validation against a real enterprise audit engagement; HIPAA: PHI vocabulary validation in a healthcare-domain project). Backlog prefix `GDPR-` (SOC 2 / HIPAA reserved). Runs in Phase 5d Track B. Stack-agnostic.
- New skill scaffolded in `packages/cli/templates/tier-m/.claude/skills/` and `tier-l/.claude/skills/` for each of the three skills (byte-identical across tiers):
  - `api-contract-audit/` — SKILL.md (279 body lines) + PATTERNS.md (framework auto-gen + route discovery + schema extraction + L3 HATEOAS detection)
  - `infra-audit/` — SKILL.md (185 body lines) + PATTERNS.md (5 layer sections)
  - `compliance-audit/` — SKILL.md (285 body lines) + PROFILES.md (GDPR active + SOC 2 / HIPAA future-marker scaffolding)
- Three registry entries in `skill-registry.js`: `api-contract-audit` (`minTier: 'm'`, `requires: { hasApi: true }`, `cheatsheet: true`); `infra-audit` (`minTier: 'm'`, `requires: {}`, `cheatsheet: true`); `compliance-audit` (`minTier: 'm'`, `requires: {}`, `cheatsheet: true`).
- Cheatsheet rows for all three skills in tier-M and tier-L `cheatsheet.md`.
- Three integration scenarios in `test/integration/run.js` — `scenarioApiContractAuditPresent`, `scenarioInfraAuditPresent`, `scenarioComplianceAuditPresent` — plus a shared `assertSkillPresent()` helper. Each verifies tier pruning (absent on tier S), presence (SKILL.md + siblings on tier M/L), cheatsheet row presence, pipeline.md invocation, `allowed-tools` spec compliance, and body size budget. `scenarioApiContractAuditPresent` additionally verifies `hasApi: false` pruning; `scenarioComplianceAuditPresent` additionally verifies `PROFILES.md` scaffolds SOC 2 / HIPAA as future-markers.

### Changed

- `pipeline.md` Track B in tier-M/L renamed `Track B - API/DB audit` → `Track B - API/DB + compliance audit`, with `/api-contract-audit` and `/compliance-audit` added to the invocation list.
- `pipeline.md` Track C in tier-M/L renamed `Track C - Test + doc audit` → `Track C - Test + doc + infra audit`, with `/infra-audit` added to the invocation list.
- `README.md` skill count `17 audit skills` → `20 audit skills`; three rows added to the skills table; Current/Next roadmap rewritten; Testing section updated to `979 integration checks` and `332 unit tests`; shields.io badge updated to `979 checks`.
- `docs/operational-guide.md` audit-skill table updated with three new rows; Phase 5d Track B renamed "API/DB + compliance audit"; Phase 5d Track C renamed "Test + doc + infra audit"; three full skill detail sections added after `/doc-audit`.
- Integration test count: 895 → 979 (+84 across three scenario suites).
- `CLAUDE.md` line-count regression guard in `scenarioPlaceholderNoiseReduction` loosened from `< 85` to `< 90` to accommodate three additional Active Skills rows.
- `skill-registry.test.js` entry-count assertion updated from 19 to 22.

---
