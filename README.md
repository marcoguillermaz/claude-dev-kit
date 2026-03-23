# claude-dev-kit

[![npm version](https://img.shields.io/npm/v/mg-claude-dev-kit.svg)](https://www.npmjs.com/package/mg-claude-dev-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js ≥ 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![CI](https://github.com/marcoguillermaz/claude-dev-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/marcoguillermaz/claude-dev-kit/actions/workflows/ci.yml)

> Scaffold for legible, reviewable AI-assisted development.
> From first exploration to production-grade delivery - one scaffold, four tiers.

---

## Who is this for?

### Builder PM or tech lead exploring Claude Code

You want to build end-to-end with Claude Code — or evaluate it for your team. You don't need a full pipeline yet. You need to get started, understand what the tool can do, and have a process you can actually review.

**`npx mg-claude-dev-kit init`** → choose **Discovery** → 3 files, 5 minutes, working.

### Team already shipping with Claude Code

You're using Claude Code but the process is ad-hoc. Claude makes autonomous decisions you can't always trace. You want a structured, reviewable workflow without inventing one from scratch.

**`npx mg-claude-dev-kit init`** → choose your tier (S / M / L) → full development scaffold.

---

## Quickstart

```bash
npx mg-claude-dev-kit init
```

The wizard asks one routing question first:

```
? How familiar is your team with Claude Code?
  ▸ Just starting out — show me what's possible  (Discovery tier)
    We use it and want guardrails                (Tier S / M / L)
```

Three init paths to choose from:

| Path | Use when |
|---|---|
| **Greenfield** | Starting a new project from scratch |
| **From context** | You have existing repos or docs — Claude reads them and populates your project files |
| **In-place** | You're already inside a project — adds structure without overwriting anything |

### Validate your setup

```bash
npx mg-claude-dev-kit doctor          # interactive report
npx mg-claude-dev-kit doctor --report # JSON output for CI pipelines
npx mg-claude-dev-kit doctor --ci     # silent mode: exit 1 if any check fails
```

11 checks: Claude CLI, CLAUDE.md present + size, settings.json, Stop hook configured + no unfilled placeholder, pipeline.md, security.md, .env in .gitignore, no secrets in CLAUDE.md, CODEOWNERS.

`--report` outputs machine-readable JSON — consumable by CI pipelines and external audit systems. Each check returns `id`, `status` (pass / warn / fail / skip), and `fix` message.

### Keep up to date

```bash
npx mg-claude-dev-kit upgrade
```

Updates non-destructive files (context-review, security rules, git rules) to the latest template.
Files with your customizations (CLAUDE.md, pipeline.md, settings.json) are flagged for manual review.

### Upgrade your tier

```bash
npx mg-claude-dev-kit upgrade --tier=s   # add Fast Lane pipeline
npx mg-claude-dev-kit upgrade --tier=m   # add Standard pipeline + docs
npx mg-claude-dev-kit upgrade --tier=l   # add Full pipeline + audit skills
```

Upgrade is non-destructive — adds new files without overwriting your existing ones.

---

## Tiers

| Tier | Pipeline | Gates | Best for |
|---|---|---|---|
| **0 — Discovery** | Stop hook only | — | First exploration — zero process assumptions |
| **S — Fast Lane** | 4 steps, 1 compact scope-confirm | — | Low blast radius, single dev, reversible in minutes |
| **M — Standard** | 8 phases, 2 STOP gates + Phase 8.5 | 2 | Single feature, moderate impact, 1–2 collaborators |
| **L — Full** | 11 phases, 4 STOP gates + Phase 8.5 + R1–R4 | 4 | High blast radius, team, complex domain, shared systems |

**Spec-driven mode (Tier M / L)**: at the start of every block, Claude auto-selects the working mode based on block signals and declares it with a one-line rationale. You can override before the STOP gate. **Spec-first (Mode A)** — auto-selected when Tier 2 sweep triggers or the block has unclear shape: Claude generates `docs/specs/[block-name].md` — goal, EARS-format acceptance criteria, in-scope / out-of-scope — before writing a single line of code. The STOP gate becomes a spec review. **Scope-confirm (Mode B)** — auto-selected for Tier 1 scope (refactors, bug fixes, isolated changes): the existing structured sweep, then proceed.

**E2E / UAT testing (Tier M / L)**: at init time you can provide an optional E2E test command (Playwright/Cypress). When configured, Phase 4 activates per block only when the scope gate confirms critical UI flows are in scope **and the user explicitly lists the UAT scenarios to test** (numbered, 1–5 journeys). Claude implements exactly those scenarios — it does not invent test cases. If not configured or no UI flows declared, Phase 4 is skipped automatically.

**The one constraint every tier shares**: Claude cannot declare a task complete until your tests pass. Enforced by a Stop hook in `.claude/settings.json` — not just an instruction.

**Every tier also shares**: a weekly arch-audit reminder (SessionStart hook checks if `/arch-audit` was run in the last 7 days), audit logging of all file changes, and branch discipline rules.

---

## What gets created

### Tier 0 — Discovery

```
your-project/
├── CLAUDE.md              ← project context: stack, commands, conventions
├── GETTING_STARTED.md     ← your team's guide to the first session
└── .claude/
    ├── settings.json      ← Stop hook: tests must pass before Claude declares done
    └── session/           ← session recovery files (gitignored)
```

### Tier S / M / L

```
your-project/
├── CLAUDE.md                       ← project context (<200 lines, committed)
├── FIRST_SESSION.md                ← first session guide for your team (M/L only, remove after)
├── MEMORY.md                       ← shared lessons and active plan (M/L only)
├── CONTEXT_IMPORT.md               ← discovery bridge file (from-context / in-place only)
│
├── .claude/
│   ├── settings.json               ← permissions + governance hooks
│   ├── rules/
│   │   ├── pipeline.md             ← development workflow (tier-appropriate)
│   │   ├── context-review.md       ← end-of-block compliance checklist
│   │   ├── security.md             ← path-scoped: API/auth files only
│   │   └── git.md                  ← commit format, branch rules
│   ├── agents/                     ← custom agent definitions (M/L)
│   │   ├── dependency-scanner.md   ← Phase 1: parallel dependency scan (M/L)
│   │   └── context-reviewer.md     ← Phase 8.5: C1-C3 grep checks (L only)
│   ├── skills/                     ← audit skills: /security-audit /skill-dev /skill-db ... (M/L)
│   ├── files-guide.md              ← reference: what every file does
│   └── session/                    ← session recovery files (gitignored)
│
├── docs/
│   ├── adr/template.md             ← ADR template with AI Coding Guidance section
│   ├── requirements.md             ← product spec (M/L)
│   ├── implementation-checklist.md ← block progress (M/L)
│   ├── refactoring-backlog.md      ← tech debt tracker (M/L)
│   └── specs/                      ← per-block spec documents (M/L, spec-first mode)
│       └── archive/                ← implemented specs moved here at block close
│
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md    ← with AI disclosure checklist
│   └── CODEOWNERS                  ← .claude/ → tech lead review required
│
├── .pre-commit-config.yaml         ← gitleaks + AI commit audit
└── README.md                       ← generated from wizard answers
```

---

## Multi-agent orchestration (Tier M / L)

Two custom agent definitions are scaffolded in `.claude/agents/`. They run as connected sub-processes invoked by Claude during specific pipeline phases — not as standalone tools.

| Agent | Tier | Phase | Role |
|---|---|---|---|
| `dependency-scanner` | M L | Phase 1 | Runs all 6 dependency checks in parallel (route hrefs, import consumers, shared type consumers, test references, FK references, access control policies). Returns a structured report with exact file paths. Runs with `Glob`, `Grep`, `Read` only — no write access. |
| `context-reviewer` | L | Phase 8.5 | Handles grep-only checks C1–C3 (credential patterns, Italian prose, field name staleness) in a single call. C4–C11 (judgment-required) remain in the main session. |

**Design principle**: agents are used only where the work is genuinely parallelisable and read-only. Phase 2 (implementation) and all document-update phases remain monolithic — sequential, traceable, human-reviewable.

---

## Audit skills (Tier M / L)

Slash-command skills scaffolded in `.claude/skills/`. Run any time — no pipeline phase required.

| Command | Tier | What it audits | Checks |
|---|---|---|---|
| `/arch-audit` | S M L | Claude Code governance files vs. latest Anthropic docs. Auto-fixes deprecations. | Steps 1–6 |
| `/security-audit` | M L | API routes, auth guards, input validation, response shapes, HTTP headers | A1–A5, R1–R3 |
| `/skill-dev` | M L | Coupling, duplication, dead code, magic values, oversized components | D1–D7, A1–A3 |
| `/skill-db` | M L | Schema normalization, indexes, access control, N+1 queries, migration quality | S1–S6, Q1–Q3 |
| `/api-design` | M L | URL naming, HTTP verbs, response envelope consistency, status codes, pagination | N1–N5, R1–R3 |
| `/perf-audit` | M L | Rendering boundaries, bundle size, heavy imports, serial awaits, over-fetching | P1–P5, Q1–Q3 |
| `/responsive-audit` | M L | Layout correctness at 375px / 768px / 1024px via Playwright screenshots | R1–R6 |
| `/ux-audit` | M L | Task completion, interaction consistency, feedback, navigation, cognitive load | D1–D6 per flow |
| `/visual-audit` | M L | Typography, spacing, hierarchy, colour discipline, dark-mode polish, micro-polish | V1–V7 per page |

**Notes:**
- `/arch-audit` is available in all tiers (S/M/L) — it audits the governance layer itself, not your product code.
- `/responsive-audit`, `/ux-audit`, `/visual-audit` require the dev server running on localhost and the Playwright MCP server configured.
- All code-audit skills are **audit-only** — no code is modified. Findings go to `docs/backlog-refinement.md`.
- Before first run: fill in the `## Configuration` placeholders in each `SKILL.md` (paths, test accounts, route lists).

Full check-by-check reference: [`docs/operational-guide.docs`](docs/operational-guide.docs) § Audit skills.

---

## Context Import — how Claude populates your files

When you use **From context** or **In-place** mode, the CLI generates `CONTEXT_IMPORT.md` in your project root.

On the first Claude Code session, Claude reads this file and runs a structured Discovery Workflow:

1. Reads each source repository (README, package.json, folder structure 1–2 levels deep)
2. Reads any source documents (PDFs, Markdown, TXT)
3. Extracts: tech stack, key commands, folder conventions, naming conventions, RBAC, state machines
4. Populates `CLAUDE.md`, `docs/requirements.md`, pipeline placeholders
5. Presents a discovery summary and asks targeted gap questions
6. Marks `CONTEXT_IMPORT.md` as `COMPLETE`

After that, the file is a historical record and Claude does not re-run discovery.

---

## Process controls

### The one hard constraint every tier shares

**Stop hook** — Claude cannot declare a task complete until tests pass:
```json
"Stop": [{ "hooks": [{ "type": "command",
  "command": "npm test || echo '{\"decision\": \"block\", \"reason\": \"Tests must pass first.\"}'"
}] }]
```

This is present in **every tier**, including Tier 0. It is the only mechanically enforced control — not an instruction, a hard block.

### Additional controls (Tier S–L)

**Audit log** — every tool use appended to `~/.claude/audit/project.jsonl`.

**Weekly arch-audit reminder** — `SessionStart` hook checks timestamp; if `/arch-audit` hasn't run in 7 days, prints a reminder at session open. Keeps governance files aligned with Anthropic releases.

**PostCompact reminder** — if `.claude/CLAUDE.local.md` exists, Claude is reminded to re-read it after every `/compact`. Prevents active overrides from being silently lost.

**InstructionsLoaded logging** — raw hook payload appended to `/tmp/claude-instructions-YYYYMMDD.log` for debugging which context files were loaded.

**LLM security review** (Tier L) — Haiku checks every session close for hardcoded secrets and missing auth.

**AI commit attribution** — every Claude-assisted commit tagged: `Co-authored-by: Claude <noreply@anthropic.com>`

### Path-scoped rules

Security rules load only when Claude works on API/auth files — zero context cost during UI work:
```yaml
---
paths: ["src/api/**", "lib/auth*"]
---
# These rules are invisible when not relevant
```

---

## Philosophy

**Claude generates, humans decide.**

Every meaningful action has a visible gate:
- Tests must pass before Claude can declare completion (Stop hook — every tier)
- Requirements reviewed before implementation starts (STOP gate — Tier M/L)
- Scope defined before implementation starts — spec document or structured sweep (Phase 1 mode selection — Tier M/L)
- AI-generated code tagged in git history (attribution — Tier S/M/L)
- Changes to Claude's own config require human review (CODEOWNERS — Tier S/M/L)
- Context files audited at every block close (C1–C11 — Tier M/L)

**Interaction Protocol**: all non-trivial requests follow a plan-then-confirm cycle. Claude lists every intended action and waits for an explicit execution keyword (`Execute` · `Proceed` · `Confirmed`) before proceeding. Read-only operations (`Read`, `Grep`, `git status`) are always free.

The goal is not to limit Claude — it's to keep humans in the loop at the moments that matter.

---

## ADRs with AI Coding Guidance

ADRs include a section written specifically for Claude:

```markdown
## AI Coding Guidance
When generating API handlers: always use `createError()` in `lib/errors.ts`.
Never return raw caught exceptions.
```

Architectural decisions become persistent constraints Claude respects across sessions — without bloating CLAUDE.md.

---

## Requirements

- Node.js ≥ 18
- [Claude Code CLI](https://claude.ai/code)
- Git
- `gh` CLI (optional — needed for cloning private repos in From context mode)

---

## Documentation

Full operational guide for your team: [`docs/operational-guide.docs`](docs/operational-guide.docs)

---

## Status

`v1.1.0` — spec-driven mode (Mode A / Mode B) added to Tier M/L Phase 1. Published on npm. Four-tier system stable. Multi-agent orchestration. Three-path init stable.

**v1.1.0 changes**: spec-driven mode selection at Phase 1 (Tier M/L) — per block, Claude asks whether to use Spec-first (generates `docs/specs/[block-name].md` with EARS acceptance criteria before implementation) or Scope-confirm (existing structured sweep). `docs/specs/archive/` tracks implemented specs. Bug fix: `pipeline.md` was never copied to tier S/M/L scaffold (critical scaffold regression).

**v0.5.3 changes**: critical fix — Stop hook was missing from Tier S `settings.json`, breaking the core governance contract ("tests must pass in every tier"). Now enforced in all four tiers.

**v0.5.2 changes**: UAT scenario definition at scope gate — when Phase 4 E2E activates, the user must explicitly list numbered user journeys (1–5 scenarios) at Phase 1. Claude implements exactly those scenarios, never invents test cases. Phase 4 renamed "UAT / E2E tests" across Tier M/L pipelines.

**v0.5.1 changes**: interactive tier selector (3 diagnostic questions → auto-suggest tier with explanation), conditional Phase 4 E2E testing in Tier M/L (opt-in via init wizard, per-block scope gate confirmation), `npx mg-claude-dev-kit doctor` now checks Stop hook for unfilled `[TEST_COMMAND]` placeholder, `FIRST_SESSION.md` scaffolded for Tier M/L (team guide to first block cycle).

**v0.5.3 changes**: critical fix — Stop hook was missing from Tier S `settings.json`, breaking the core governance contract ("tests must pass in every tier"). Now enforced in all four tiers.

**v0.5.2 changes**: UAT scenario definition at scope gate — when Phase 4 E2E activates, the user must explicitly list numbered user journeys (1–5 scenarios) at Phase 1. Claude implements exactly those scenarios, never invents test cases. Phase 4 renamed "UAT / E2E tests" across Tier M/L pipelines.

**v0.5.1 changes**: interactive tier selector (3 diagnostic questions → auto-suggest tier with explanation), conditional Phase 4 E2E testing in Tier M/L (opt-in via init wizard, per-block scope gate confirmation), `npx mg-claude-dev-kit doctor` now checks Stop hook for unfilled `[TEST_COMMAND]` placeholder, `FIRST_SESSION.md` scaffolded for Tier M/L (team guide to first block cycle).

**v0.5.0 changes**: session recovery (`.claude/session/`), scope gate with Tier 1/2 sweep auto-selection, Interaction Protocol in CLAUDE.md templates, three new settings hooks (arch-audit reminder, InstructionsLoaded, PostCompact), Phase 8.5 mandatory closing message, Phase 8 3-commit sequence, Phase 5b/5c/5d block-scoped quality audits (Tier L), Structural Requirements Changes pipeline R1–R4 (Tier L), Fast Lane session file + escalation rule + scope-confirm gate, evolved C1–C11 context review with explicit grep commands.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and PR guidelines.

To report a security issue, see [SECURITY.md](SECURITY.md) — do not open a public issue.

## License

MIT
