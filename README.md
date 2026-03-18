# claude-dev-kit

> Governance layer for Claude Code.
> From "just exploring" to production-grade AI-assisted development — one scaffold, four tiers.

---

## Who is this for?

### Team just discovering Claude Code

You've heard about Claude Code and want to try it on a real project. You don't need a pipeline yet — you need to get started and understand what the tool can do.

**`npx claude-dev-kit init`** → choose **Discovery** → 3 files, 5 minutes, working.

### Team already using Claude Code

You're shipping with Claude Code but the process is ad-hoc. Claude makes autonomous decisions you can't always review. You want structure without slowing down.

**`npx claude-dev-kit init`** → choose your tier (S / M / L) → full governance scaffold.

---

## Quickstart

```bash
npx claude-dev-kit init
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
| **In-place** | You're already inside a project — adds governance without overwriting anything |

### Validate your setup

```bash
npx claude-dev-kit doctor
```

10 checks: Claude CLI, CLAUDE.md size, settings.json, Stop hook, CODEOWNERS, secret hygiene.

### Keep up to date

```bash
npx claude-dev-kit upgrade
```

Updates non-destructive files (context-review, security rules, git rules) to the latest template.
Files with your customizations (CLAUDE.md, pipeline.md, settings.json) are flagged for manual review.

### Upgrade your tier

```bash
npx claude-dev-kit upgrade --tier=s   # add Fast Lane pipeline
npx claude-dev-kit upgrade --tier=m   # add Standard pipeline + docs
npx claude-dev-kit upgrade --tier=l   # add Full governance + audit skills
```

Upgrade is non-destructive — adds new files without overwriting your existing ones.

---

## Tiers

| Tier | Pipeline | Files created | Best for |
|---|---|---|---|
| **0 — Discovery** | None (Stop hook only) | 3 files | Team discovering Claude Code for the first time |
| **S — Fast Lane** | 4 steps, no gates | Minimal | Bugfix, hotfix, ≤3 files |
| **M — Standard** | 6 phases, 2 STOP gates | Core docs | Feature block, 1–2 weeks |
| **L — Full** | 9 phases, 4 STOP gates | Full suite | Long-running project, team, complex domain |

**The one constraint every tier shares**: Claude cannot declare a task complete until your tests pass. This is enforced by a Stop hook in `.claude/settings.json` — not just an instruction.

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
│   └── refactoring-backlog.md      ← tech debt tracker (M/L)
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

## Governance model

### The one constraint that matters most

**Stop hook** — Claude cannot declare a task complete until tests pass:
```json
"Stop": [{ "hooks": [{ "type": "command",
  "command": "npm test || echo '{\"decision\": \"block\", \"reason\": \"Tests must pass first.\"}'"
}] }]
```

This is present in **every tier**, including Tier 0. It is the single most important governance control.

### Additional controls (Tier S–L)

**Audit log** — every tool use is appended to `~/.claude/audit/project.jsonl`.

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
- AI-generated code tagged in git history (attribution — Tier S/M/L)
- Changes to Claude's own config require human review (CODEOWNERS — Tier S/M/L)

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

`v0.4.0` — public. Four-tier system stable. Multi-agent orchestration (dependency-scanner + context-reviewer). Three-path init stable. Publishing to npm pending.

## License

MIT
