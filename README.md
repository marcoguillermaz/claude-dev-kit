# claude-dev-kit

[![npm version](https://img.shields.io/npm/v/mg-claude-dev-kit.svg)](https://www.npmjs.com/package/mg-claude-dev-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 22](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![CI](https://github.com/marcoguillermaz/claude-dev-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/marcoguillermaz/claude-dev-kit/actions/workflows/ci.yml)
[![464 integration checks](https://img.shields.io/badge/integration-464%20checks-blue.svg)](#testing)

> Governance layer for Claude Code.
> Claude generates. Your team decides.

Claude Code is a powerful CLI that reads, writes, and reasons about your entire codebase. Without shared process, it makes autonomous decisions that are hard to track and harder to review.

**claude-dev-kit** scaffolds a structured, reviewable development process on top of Claude Code. It enforces one non-negotiable rule mechanically: Claude cannot declare a task complete until your tests pass. Everything else scales with your needs.

---

## Quick Start

```bash
npx mg-claude-dev-kit init
```

The wizard detects your project state and guides you through setup. Three paths available:

| Path | Use when |
|---|---|
| **Existing project** | Add structure to a project that already has code |
| **New project** | Starting from scratch |
| **From existing docs** | Share repos or docs - Claude reads them and populates everything |

After init, open Claude Code and start working. The scaffold is active immediately.

---

## What it does

### Tiered pipelines matched to risk

| Tier | Pipeline | Best for |
|---|---|---|
| **0 - Discovery** | Stop hook only | First exploration - zero process |
| **S - Fast Lane** | 4 steps, scope-confirm | Single dev, low risk, quick fixes |
| **M - Standard** | 8 phases, 2 STOP gates | Feature blocks, 1-2 collaborators |
| **L - Full** | 14 phases, 4 STOP gates | Team projects, complex domain changes |

Start at Tier 0. Move up when you need more structure: `npx mg-claude-dev-kit upgrade --tier=m`

### 12 audit skills

Executable multi-step programs that run inside Claude Code. Not prompt instructions - structured audit workflows with model routing (haiku for mechanical checks, sonnet for analysis).

| Skill | Tiers | Purpose |
|---|---|---|
| `/arch-audit` | S M L | Governance files vs Anthropic docs. Auto-fixes deprecations. |
| `/security-audit` | S M L | Auth, input validation, RLS, CVE scan. 3-path: WEB / NATIVE / HYBRID. |
| `/perf-audit` | S M L | Bundle size, serial awaits, query efficiency. 8-stack patterns. |
| `/skill-dev` | S M L | Coupling, duplication, dead code, debt-density. |
| `/simplify` | S M L | Early returns, nesting, dead code. Applies changes directly. |
| `/commit` | S M L | Conventional Commits - auto-detects type, scope, description. |
| `/api-design` | M L | URL naming, HTTP verbs, response envelope, pagination. |
| `/skill-db` | M L | Schema normalization, indexes, N+1 queries, RLS. |
| `/visual-audit` | M L | Typography, APCA contrast, spacing, dark-mode. |
| `/ux-audit` | M L | ISO 9241-11, Nielsen heuristics, user confidence. |
| `/responsive-audit` | M L | Layout at 320-1024px, tap targets, WCAG. |
| `/ui-audit` | M L | Design token compliance, component adoption, accessibility. |

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
npx mg-claude-dev-kit doctor                  # validate setup (19 checks)
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
node packages/cli/test/integration/run.js    # 464 integration checks
node --test packages/cli/test/unit/*.test.js   # 243 unit tests
```

Covers: file structure per tier, Stop hook presence, pipeline gate counts, placeholder resolution, skill pruning, security variant selection, native stack adaptation, rubric scoring, full CLI execution via `--answers` fixtures.

---

## Requirements

- Node.js >= 22
- [Claude Code CLI](https://claude.ai/code)
- Git

---

## Documentation

| Document | Audience | Content |
|---|---|---|
| [Operational Guide](docs/operational-guide.md) | Teams adopting CDK | Full reference: installation, tiers, workflow, governance, FAQ |
| [Custom Skills Guide](docs/custom-skills.md) | Developers extending CDK | SKILL.md format, frontmatter schema, authoring patterns |
| [Product Brief](docs/product-brief.md) | Stakeholders | Strategic positioning, target users, scope |
| [Quality Rubric](docs/workspace-quality-rubric.md) | Teams evaluating workspaces | 8-dimension scoring (D1-D8, 0-100%) |

---

## Roadmap

See [GitHub Milestones](https://github.com/marcoguillermaz/claude-dev-kit/milestones) for the 12-month plan.

**Current**: v1.9.1 - skill registry, incremental adoption (`add skill`/`add rule`), custom skills convention, Tier S file reduction, Tier M pipeline fix.

**Next**: agent-to-skill conversion, skill scaffolder CLI, Anthropic drift tracker.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and PR guidelines.

To report a security issue, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
