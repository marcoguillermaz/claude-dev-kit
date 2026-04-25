# claude-dev-kit

[![npm version](https://img.shields.io/npm/v/mg-claude-dev-kit.svg)](https://www.npmjs.com/package/mg-claude-dev-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 22](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![CI](https://github.com/marcoguillermaz/claude-dev-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/marcoguillermaz/claude-dev-kit/actions/workflows/ci.yml)
[![1000 integration checks](https://img.shields.io/badge/integration-1000%20checks-blue.svg)](#testing)

> Scaffold for legible, reviewable AI-assisted development.
> Claude generates. Your team decides.

Claude Code is a powerful CLI that reads, writes, and reasons about your entire codebase. Without shared process, it makes autonomous decisions that are hard to track and harder to review.

**claude-dev-kit** scaffolds a structured, reviewable development process on top of Claude Code. It enforces one non-negotiable rule mechanically: Claude cannot declare a task complete until your tests pass. Everything else scales with your needs.

---

## Quick Start

```bash
npx mg-claude-dev-kit init
```

The wizard detects your project state and guides you through setup. Three paths available:

| Path                   | Use when                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| **Existing project**   | Add structure to a project that already has code                 |
| **New project**        | Starting from scratch                                            |
| **From existing docs** | Share repos or docs - Claude reads them and populates everything |

After init, open Claude Code and start working. The scaffold is active immediately.

---

## What it does

### Tiered pipelines matched to risk

| Tier              | Pipeline                | Best for                              |
| ----------------- | ----------------------- | ------------------------------------- |
| **0 - Discovery** | Stop hook only          | First exploration - zero process      |
| **S - Fast Lane** | 4 steps, scope-confirm  | Single dev, low risk, quick fixes     |
| **M - Standard**  | 8 phases, 2 STOP gates  | Feature blocks, 1-2 collaborators     |
| **L - Full**      | 14 phases, 4 STOP gates | Team projects, complex domain changes |

Start at Tier 0. Move up when you need more structure: `npx mg-claude-dev-kit upgrade --tier=m`

### 20 audit skills

Executable multi-step programs that run inside Claude Code. Not prompt instructions - structured audit workflows with model routing (haiku for mechanical checks, sonnet for analysis).

| Skill                  | Tiers | Purpose                                                                                                                                 |
| ---------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/arch-audit`          | S M L | Governance files vs Anthropic docs. Auto-fixes deprecations.                                                                            |
| `/security-audit`      | S M L | Auth, input validation, RLS, CVE scan. 3-path: WEB / NATIVE / HYBRID.                                                                   |
| `/perf-audit`          | S M L | Bundle size, serial awaits, query efficiency. 8-stack patterns.                                                                         |
| `/skill-dev`           | S M L | Coupling, duplication, dead code, debt-density.                                                                                         |
| `/simplify`            | S M L | Early returns, nesting, dead code. Applies changes directly.                                                                            |
| `/commit`              | S M L | Conventional Commits - auto-detects type, scope, description.                                                                           |
| `/api-design`          | M L   | URL naming, HTTP verbs, response envelope, pagination.                                                                                  |
| `/skill-db`            | M L   | Schema normalization, indexes, N+1 queries, RLS.                                                                                        |
| `/migration-audit`     | M L   | Stack-aware migration safety: data loss, rollback, lock-heavy DDL. Prisma/Drizzle/Supabase/SQL.                                         |
| `/visual-audit`        | M L   | Typography, spacing, hierarchy, dark-mode, micro-polish.                                                                                |
| `/ux-audit`            | M L   | ISO 9241-11, Nielsen heuristics, user confidence.                                                                                       |
| `/responsive-audit`    | M L   | Layout at 320-1024px, tap targets, WCAG.                                                                                                |
| `/ui-audit`            | M L   | Design token compliance, component adoption, empty states.                                                                              |
| `/accessibility-audit` | M L   | axe-core WCAG 2.2, APCA contrast, static a11y (aria, tabindex, focus, labels).                                                          |
| `/test-audit`          | M L   | Coverage (lcov/Istanbul/Cobertura/go/tarpaulin/xcresult), pyramid shape, anti-patterns (`.only`, skipped, empty, no-assertion, sleeps). |
| `/doc-audit`           | M L   | Doc drift: link resolution, code-block syntax (json/yaml/toml), CDK placeholder residuals, slash-command name match, skill-count consistency, ADR freshness, stack-sync (Next.js/Django/Swift). |
| `/api-contract-audit`  | M L   | OpenAPI contract drift (endpoints, schemas, status), breaking-change detection vs previous spec, versioning consistency, security scheme alignment, Richardson Maturity L0-L3 scoring. Auto-gen for FastAPI / NestJS / Express+swagger-jsdoc / Next.js route handlers / Django REST. |
| `/infra-audit`         | M L   | Infrastructure security across GitHub Actions (pwn-request, secret logging, pinning, permissions), Dockerfile (root, latest tag, URL add), K8s (runAsNonRoot, privileged, hostNetwork), Terraform (IAM wildcards, state in git), GitLab CI. Stack-agnostic. |
| `/compliance-audit`    | M L   | GDPR profile: data-subject rights (delete, export, rectify), consent, lawful basis, PII identification, encryption-at-rest on special-category, logging hygiene, retention, sub-processors. SOC 2 / HIPAA scaffolded for v1.15+. |
| `/skill-review`        | M L   | Quality review pipeline for skill portfolios. Spec compliance, cross-tier coherence, behavioral fixtures.                               |

Skills are conditionally installed based on your project: `hasApi`, `hasDatabase`, `hasFrontend`, `hasDesignSystem`.

### 11 tech stacks auto-detected

Node.js/TS, Node.js/JS, Python, Go, Swift, Kotlin, Rust, .NET, Ruby, Java - plus generic fallback. Security rules, permissions, and CLAUDE.md fields adapt automatically.

### Incremental adoption

Install individual components without a full scaffold:

```bash
npx mg-claude-dev-kit add skill security-audit   # install one skill
npx mg-claude-dev-kit add rule git                # install one rule
npx mg-claude-dev-kit add rule security --stack swift  # stack-specific variant
```

Custom skills (`custom-*` prefix) are preserved across upgrades. See [Custom Skills Guide](docs/custom-skills.md).

---

## Architecture

```
your-project/
├── CLAUDE.md                    # Project context (<200 lines)
├── .claude/
│   ├── settings.json            # Permissions + Stop hook (mechanical enforcement)
│   ├── rules/
│   │   ├── pipeline.md          # Development workflow (tier-appropriate)
│   │   ├── security.md          # Stack-aware: web / apple / android / systems
│   │   ├── git.md               # Commit format, branch rules
│   │   └── output-style.md      # Communication rules
│   ├── skills/                  # Audit skills (conditional per project)
│   └── session/                 # Session recovery (gitignored)
├── docs/                        # Requirements, specs, backlog (M/L)
├── .github/                     # PR template, CODEOWNERS
└── .pre-commit-config.yaml      # Secret scanning
```

The Stop hook in `settings.json` is the core enforcement mechanism. It blocks Claude from completing any task until tests pass. Present in every tier, including Discovery.

---

## CLI Commands

```bash
npx mg-claude-dev-kit init                    # scaffold wizard
npx mg-claude-dev-kit init --dry-run          # preview without writing
npx mg-claude-dev-kit init --answers file.json  # skip prompts (CI/automation)
npx mg-claude-dev-kit doctor                  # validate setup (28 checks)
npx mg-claude-dev-kit doctor --report         # JSON output for CI
npx mg-claude-dev-kit doctor --ci             # silent, exit 1 on failure
npx mg-claude-dev-kit upgrade                 # update template files
npx mg-claude-dev-kit upgrade --tier=m        # promote to higher tier
npx mg-claude-dev-kit upgrade --anthropic     # show diff for Anthropic-influenced files (dry-run)
npx mg-claude-dev-kit upgrade --anthropic --apply  # write the diff (with .bak backup)
npx mg-claude-dev-kit add skill <name>        # install one skill
npx mg-claude-dev-kit add rule <name>         # install one rule
npx mg-claude-dev-kit new skill               # create a custom skill (wizard)
```

---

## Process controls

**Stop hook** (every tier) - Claude cannot declare done until tests pass:

```json
"Stop": [{ "hooks": [{ "type": "command",
  "command": "npm test || echo '{\"decision\": \"block\", \"reason\": \"Tests must pass.\"}'"
}] }]
```

**STOP gates** (Tier M/L) - Requirements reviewed before implementation. Spec-first or scope-confirm mode auto-selected per block.

**Audit logging** - Every tool use appended to `~/.claude/audit/project.jsonl`.

**AI attribution** - Every Claude-assisted commit tagged with `Co-authored-by`.

**Weekly arch-audit** - SessionStart hook checks if `/arch-audit` ran in the last 7 days.

**CODEOWNERS** - Changes to `.claude/` require tech lead review.

---

## Testing

```bash
node packages/cli/test/integration/run.js    # 1000 integration checks
node --test packages/cli/test/unit/*.test.js   # 365 unit tests
```

Covers: file structure per tier, Stop hook presence, pipeline gate counts, placeholder resolution, skill pruning, security variant selection, native stack adaptation, rubric scoring, cross-stack content invariants (10 stacks), golden-file assertions (Swift, Node-TS, Python), full CLI execution via `--answers` fixtures.

---

## Requirements

- Node.js >= 22
- [Claude Code CLI](https://claude.ai/code)
- Git

---

## Documentation

| Document                                           | Audience                    | Content                                                        |
| -------------------------------------------------- | --------------------------- | -------------------------------------------------------------- |
| [Operational Guide](docs/operational-guide.md)     | Teams adopting CDK          | Full reference: installation, tiers, workflow, governance, FAQ |
| [Custom Skills Guide](docs/custom-skills.md)       | Developers extending CDK    | SKILL.md format, frontmatter schema, authoring patterns        |
| [Product Brief](docs/product-brief.md)             | Stakeholders                | Strategic positioning, target users, scope                     |
| [Quality Rubric](docs/workspace-quality-rubric.md) | Teams evaluating workspaces | 8-dimension scoring (D1-D8, 0-100%)                            |

---

## Roadmap

See [GitHub Milestones](https://github.com/marcoguillermaz/claude-dev-kit/milestones) for the 12-month plan.

**Current**: v1.16.0 ships `team-settings.json` for team-wide CLI governance (Q3 #3, Issue #94, ICE 175). Schema v1: `minTier` (s/m/l), `allowedSkills`, `blockedSkills`, `requiredSkills`. An empty or absent file means no restrictions, so existing setups keep working untouched. Enforcement covers `init` (refuses scaffolds below `minTier`), `upgrade` (refuses promotion-required scaffolds and suggests an alternative), `add skill` (refuses blocked or non-whitelisted skills, with `custom-*` bypassing the whitelist), and a new warn-level doctor check, `team-settings-compliance`. The doctor count moves from 27 to 28. Validation rejects any allowed/blocked overlap as a mutual-exclusion error. Native `Skill()` permission rules don't ship this release: Claude Code's permission grammar for skills isn't part of the documented public schema, so v1.16.0 keeps enforcement strictly CLI-side. Native rule generation is on the table for v1.17+. Integration: 1000 checks (+10 from `scenarioTeamSettings`). Unit: 365 tests (+22 from `team-settings.test.js`).

**Next**: Q3 #4 `cdk sync` for cross-project rules sync (ICE 168), or Q2 #8 external review prompt template update (ICE 162). Q2 #3 VitePress docs site (ICE 432) stays on hold.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and PR guidelines.

To report a security issue, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
