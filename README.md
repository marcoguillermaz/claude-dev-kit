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

You want to build end-to-end with Claude Code - or evaluate it for your team. You don't need a full pipeline yet. You need to get started, understand what the tool can do, and have a process you can actually review.

**`npx mg-claude-dev-kit init`** → choose **Discovery** → 3 files, 5 minutes, working.

### Team already shipping with Claude Code

You're using Claude Code but the process is ad-hoc. Claude makes autonomous decisions you can't always trace. You want a structured, reviewable workflow without inventing one from scratch.

**`npx mg-claude-dev-kit init`** → choose your tier (S / M / L) → full development scaffold.

---

## Quickstart

```bash
npx mg-claude-dev-kit init
```

The wizard asks about your project state first:

```
? What's the state of this project?
  ▸ Existing project — add CDK to a project that already has code
    New project — starting from scratch, you'll fill in the details
    From existing docs — share your docs and Claude populates everything
```

| Path | Use when |
|---|---|
| **Existing project** | You're already inside a project — adds structure without overwriting anything |
| **New project** | Starting from scratch, fill in the details |
| **From existing docs** | You have existing repos or docs — Claude reads them and populates your project files |

### Automate / CI

Skip all interactive prompts with a pre-filled answers file:

```bash
npx mg-claude-dev-kit init --answers ./my-answers.json
npx mg-claude-dev-kit init-greenfield --answers ./my-answers.json
npx mg-claude-dev-kit init-in-place --answers ./my-answers.json
```

Pass a JSON file with all wizard answers. Nine example fixtures are included in `packages/cli/test/fixtures/wizard-answers/` — copy one as a starting point. Useful for CI pipelines, scripted provisioning, and integration testing.

### Validate your setup

```bash
npx mg-claude-dev-kit doctor          # interactive report
npx mg-claude-dev-kit doctor --report # JSON output for CI pipelines
npx mg-claude-dev-kit doctor --ci     # silent mode: exit 1 if any check fails
```

19 checks: Claude CLI, CLAUDE.md present + size, settings.json, Stop hook configured + no unfilled placeholder, pipeline.md, security.md, .env in .gitignore, no secrets in CLAUDE.md, CODEOWNERS, output-style.md, claudemd-standards.md, pipeline-standards.md, commit skill, skills with allowed-tools frontmatter, context-review.md includes C12.

`--report` outputs machine-readable JSON — consumable by CI pipelines and external audit systems. Each check returns `id`, `status` (pass / warn / fail / skip), and `fix` message.

### Keep up to date

```bash
npx mg-claude-dev-kit upgrade
```

Updates non-destructive files (context-review, security rules, git rules, output-style, claudemd-standards, pipeline-standards) to the latest template.
Files with your customizations (CLAUDE.md, pipeline.md, settings.json, all SKILL.md files) are flagged for manual review.

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
│   │   ├── context-review.md       ← end-of-block compliance checklist (C1–C12)
│   │   ├── security.md             ← path-scoped: API/auth files only
│   │   ├── git.md                  ← commit format, branch rules
│   │   ├── output-style.md         ← communication rules (no openers, plain vocabulary)
│   │   ├── claudemd-standards.md   ← CLAUDE.md hygiene standards (S1–S9)
│   │   └── pipeline-standards.md   ← engineering best practices reference (S1–S8)
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
| `context-reviewer` | L | Phase 8.5 | Handles grep-only checks C1–C3 (credential patterns, unresolved placeholders, field name staleness) in a single call. C4–C12 (judgment-required) remain in the main session. |

**Design principle**: agents are used only where the work is genuinely parallelisable and read-only. Phase 2 (implementation) and all document-update phases remain monolithic — sequential, traceable, human-reviewable.

---

## Audit skills (Tier M / L)

Slash-command skills scaffolded in `.claude/skills/`. Run any time — no pipeline phase required.

| Command | Tier | What it audits | Checks |
|---|---|---|---|
| `/arch-audit` | S M L | Claude Code governance files vs. latest Anthropic docs. Auto-fixes deprecations. | Steps 1–6, C1–C17, P1–P5, T1–T5, PE1–PE12, H1a–H1f |
| `/security-audit` | M L | API routes, auth guards, input validation, response shapes, HTTP headers, CVE scan | A1–A13, R1–R4 |
| `/skill-dev` | M L | Coupling, duplication, dead code, TS suppressions, useEffect antipatterns, debt-density escalation | D1–D10, J1–J5 |
| `/skill-db` | M L | Schema normalization, indexes, access control, N+1 queries, unused indexes, migration quality | S1–S7, Q1–Q5 |
| `/api-design` | M L | URL naming, HTTP verbs, response envelope, status codes, pagination, validation, naming conventions | N1–N13, P1–P4, V1–V3 |
| `/perf-audit` | M L | Rendering boundaries, bundle size, heavy imports, serial awaits, query efficiency, tree-shaking | P1–P5, Q1–Q3 |
| `/responsive-audit` | M L | Layout at 320px/375px/768px/1024px, tap targets, WCAG 1.4.4/1.4.10, VR1–VR6 visual checks | BP0, R1–R9, VR1–VR6 |
| `/ux-audit` | M L | ISO 9241-11, Nielsen's 10 heuristics, Baymard BF1–BF6, user confidence framework C1–C5 | H1–H10, BF1–BF6, D1–D7 |
| `/visual-audit` | M L | Typography, spacing, APCA contrast (Lc 75/60/45/15), dark-mode, Gestalt, typographic quality, interaction states | V1–V11 per page |
| `/commit` | S M L | Conventional Commits 1.0.0 — auto-detects type, scope, description. Three-commit block pattern. | — |
| `/ui-audit` | M L | Design token compliance, component adoption, accessibility, empty states (requires design system) | Checks 1–17, S1–S8 |

**Notes:**
- `/arch-audit` and `/commit` are available in all tiers (S/M/L).
- `/responsive-audit`, `/ux-audit`, `/visual-audit`, `/ui-audit` require the dev server running on localhost and the Playwright MCP server configured.
- `/ui-audit` is only installed when you answer **Yes** to "Do you use a component library or design system?" at init time.
- Skills are conditionally installed based on wizard answers: `hasApi`, `hasDatabase`, `hasFrontend`, `hasDesignSystem`.
- All code-audit skills are **audit-only** — no code is modified. Findings go to `docs/refactoring-backlog.md`.
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
- Context files audited at every block close (C1–C12 — Tier M/L)

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

`v1.6.0` — conditional docs scaffold (sitemap/db-map) + staff-manager→CDK skill sync. Integration tests 186 → 194.

**v1.6.0 changes**: `docs/sitemap.md` and `docs/db-map.md` added as Tier M+L scaffold templates, pruned conditionally when `hasFrontend=false` / `hasDatabase=false` via new `pruneConditionalDocs()`; `printPlan` updated to show these files conditionally and remove phantom `docs/dependency-map.md`. 29 template files upgraded (common rules + 11 skills across Tier M/L, 2 skills in Tier S) via a 4-level agnosticity-filtered sync from an internal pilot project — L1 lexical, L2 structural, L3 CDK File/Placeholder Registry, L3b CDK Pattern Recognition, L4 conditional; domain tokens stripped, CDK Configuration placeholders preserved. +8 integration checks (194 total).

**v1.5.0 changes (Phases 1–4)**: 6 new stacks auto-detected and wizard-ready (Swift, Kotlin, Rust, .NET, Ruby, Java) — IMPROVEMENT-01; all wizard labels, hints, and defaults aligned across tiers and stacks (Phases 1–2); `printPlan` shows skills included/skipped, hides misleading devCommand defaults, detects brew/pip for pre-commit, adapts doctor command to local vs npm context (Phase 3); `--answers <json>` CLI flag bypasses all interactive prompts for automation and testing — 9 fixture JSON files, `scenarioWizardCoverage()` added to integration suite (Phase 4). `CONTEXT_IMPORT.md` excluded from wizard-placeholder check (intentional instruction text, not unfilled values).

**v1.4.0 changes (Phase 0)**: `security-audit` now always installed for Tier M/L — no longer removed when `hasApi=false` (it is a generic security check, not API-specific); `auditModel` wizard choices updated to versioned model IDs (`claude-sonnet-4-6` / `claude-opus-4-6`); PRD question moved immediately after tier selection with inline context explaining feature blocks; `.github/` question now auto-detects `git remote -v` and defaults to N when no GitHub remote found; Tier 0 (Discovery) added to tier picker in both `init-in-place` and `init-greenfield`.

**v1.3.0 changes**: `/arch-audit` expanded from C1–C10 to C1–C17 with two-tier execution (grep-tier haiku batch + judgment-tier main context), PE1–PE12 pipeline compliance, H1a–H1f hook compliance, T4/T5 skill model fitness; `/visual-audit` adds V9 Gestalt compliance, V10 Typographic quality, V11 Interaction state design (score /40 → /55); `/responsive-audit` adds VR1–VR6 visual checks via screenshot analysis; `/skill-dev` adds debt-density escalation + regression risk classification + backlog decision gate; `/api-design` adds N11–N13 naming/resource-modeling, API Maturity Assessment, mode system (audit/remediation/apply); `/perf-audit` adds Performance Maturity Assessment, Quick wins / Strategic refactors sections, mode system; `/security-audit` adds A13 (IDOR), Security Maturity Assessment, AC-1/AC-2 access control table analysis; `/ux-audit` adds D7 user-confidence framework C1–C5 (cancel paths, destructive guards, positive feedback). All `docs/backlog-refinement.md` references normalized to `docs/refactoring-backlog.md`.

**v1.2.0 changes**: 3 new shared rule files (`output-style.md`, `claudemd-standards.md`, `pipeline-standards.md`) in `common/rules/` loaded by tier M/L; 2 new skills (`/commit` for all tiers, `/ui-audit` conditional on design system); 7 wizard feature flags (`hasApi`, `hasDatabase`, `hasFrontend`, `hasDesignSystem`, `auditModel`, `hasPrd`, `hasE2E`) that conditionally install skills and set `Active Skills` section in CLAUDE.md; all 9 existing skills upgraded with deeper checks (APCA contrast, ISO 9241-11, WCAG 1.4.10, Conventional Commits, CVE scanning, unused indexes, structural judgment); context-reviewer agent updated from Italian prose check to unresolved-placeholder check; context-review C12 added (canonical docs currency); doctor expanded from 13 to 19 checks; integration tests 98 → 126.

**v1.1.0 changes**: spec-driven mode selection at Phase 1 (Tier M/L) — per block, Claude asks whether to use Spec-first (generates `docs/specs/[block-name].md` with EARS acceptance criteria before implementation) or Scope-confirm (existing structured sweep). `docs/specs/archive/` tracks implemented specs. Bug fix: `pipeline.md` was never copied to tier S/M/L scaffold (critical scaffold regression).

**v0.5.3 changes**: critical fix — Stop hook was missing from Tier S `settings.json`, breaking the core governance contract ("tests must pass in every tier"). Now enforced in all four tiers.

**v0.5.2 changes**: UAT scenario definition at scope gate — when Phase 4 E2E activates, the user must explicitly list numbered user journeys (1–5 scenarios) at Phase 1. Claude implements exactly those scenarios, never invents test cases. Phase 4 renamed "UAT / E2E tests" across Tier M/L pipelines.

**v0.5.1 changes**: interactive tier selector (3 diagnostic questions → auto-suggest tier with explanation), conditional Phase 4 E2E testing in Tier M/L (opt-in via init wizard, per-block scope gate confirmation), `npx mg-claude-dev-kit doctor` now checks Stop hook for unfilled `[TEST_COMMAND]` placeholder, `FIRST_SESSION.md` scaffolded for Tier M/L (team guide to first block cycle).

**v0.5.0 changes**: session recovery (`.claude/session/`), scope gate with Tier 1/2 sweep auto-selection, Interaction Protocol in CLAUDE.md templates, three new settings hooks (arch-audit reminder, InstructionsLoaded, PostCompact), Phase 8.5 mandatory closing message, Phase 8 3-commit sequence, Phase 5b/5c/5d block-scoped quality audits (Tier L), Structural Requirements Changes pipeline R1–R4 (Tier L), Fast Lane session file + escalation rule + scope-confirm gate, evolved C1–C11 context review with explicit grep commands.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and PR guidelines.

To report a security issue, see [SECURITY.md](SECURITY.md) — do not open a public issue.

## License

MIT
