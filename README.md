# claude-dev-kit

[![npm version](https://img.shields.io/npm/v/mg-claude-dev-kit.svg)](https://www.npmjs.com/package/mg-claude-dev-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 22](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![CI](https://github.com/marcoguillermaz/claude-dev-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/marcoguillermaz/claude-dev-kit/actions/workflows/ci.yml)
[![979 integration checks](https://img.shields.io/badge/integration-979%20checks-blue.svg)](#testing)

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
npx mg-claude-dev-kit doctor                  # validate setup (26 checks)
npx mg-claude-dev-kit doctor --report         # JSON output for CI
npx mg-claude-dev-kit doctor --ci             # silent, exit 1 on failure
npx mg-claude-dev-kit upgrade                 # update template files
npx mg-claude-dev-kit upgrade --tier=m        # promote to higher tier
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
node packages/cli/test/integration/run.js    # 979 integration checks
node --test packages/cli/test/unit/*.test.js   # 332 unit tests
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

**Current**: v1.14.0 ships the Q2 #7 bundle (Issue #66, ICE 245): three new skills, portfolio from 17 to 20. `/api-contract-audit` parses OpenAPI specs against runtime code and flags drift before clients notice (endpoints present in spec without handler, schema field mismatches, status-code divergence, breaking changes vs the previous committed spec via `git show HEAD~1`, security-scheme alignment, Richardson Maturity grading L0 to L3). Auto-gen coverage spans FastAPI, NestJS, Express with swagger-jsdoc, Next.js 13+ route handlers, and Django REST Framework. `/infra-audit` checks five layers, but only when markers exist (no N/A noise): GitHub Actions for pwn-request and secret-logging patterns, Dockerfile for root user and unpinned images, Kubernetes manifests for privileged containers and host-namespace breakouts, Terraform for IAM wildcards and state files committed to git, GitLab CI for equivalent script-injection vectors. The infra surface is stack-agnostic: it sits apart from backend language. `/compliance-audit` ships with the GDPR profile active: data-subject rights (delete, export, rectify), consent capture and lawful basis, PII identification with special-category encryption check (Article 9), logging hygiene, retention policy, sub-processor transparency. SOC 2 and HIPAA sit scaffolded in `PROFILES.md` as future markers, with their check taxonomies and backlog prefixes reserved, waiting on real enterprise validation before going live in v1.15+. `/api-contract-audit` attaches to Phase 5d Track B; `/compliance-audit` sits alongside it; `/infra-audit` joins Track C (renamed "Test + doc + infra audit"). Integration: 979 checks (+84 across three scenario suites); unit: 332 tests.

**Next**: Q2 #6 CONTRIBUTING.md overhaul (ICE 256, currently Partial) or Q2 #8 external review prompt template update (ICE 162). Q2 #3 VitePress docs site (ICE 432) stays deferred.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and PR guidelines.

To report a security issue, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
