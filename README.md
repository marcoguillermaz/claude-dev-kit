# claude-dev-kit

> Governance-first project scaffold for Claude Code.
> For developers who want to ship with AI without losing sight of what's happening.

---

## What it does

`claude-dev-kit` scaffolds the governance layer around [Claude Code](https://claude.ai/code):

- **Tiered pipeline** — Fast Lane (S), Standard (M), or Full (L). Match process overhead to project complexity.
- **Hooks pre-wired** — Claude cannot complete a task until your tests pass. Every file write is logged.
- **Rules library** — path-scoped security and git rules that load only when relevant, keeping CLAUDE.md lean.
- **ADR template** — architecture decisions with an "AI Coding Guidance" section so Claude respects them.
- **PR template + CODEOWNERS** — AI-assisted commits are tagged and require human review on `.claude/` changes.
- **Pre-commit config** — secret scanning and AI commit audit at the commit boundary.

---

## Quickstart

```bash
npx claude-dev-kit init
```

Three paths to choose from:

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

---

## Tiers

| Tier | Pipeline | Docs scaffolded | Use case |
|---|---|---|---|
| **S — Fast Lane** | 4 steps, no gates | Minimal | Bugfix, hotfix, ≤3 files |
| **M — Standard** | 6 phases, 2 STOP gates | Core docs | Feature block, 1–2 weeks |
| **L — Full** | 9 phases, 4 STOP gates | Full suite | Long-running project, team, complex domain |

---

## What gets created

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

## Audit skills (Tier M / L)

Five slash-command skills are scaffolded in `.claude/skills/`. Run them any time — no pipeline phase required.

| Command | Tier | What it audits | Checks | Backlog ID |
|---|---|---|---|---|
| `/arch-audit` | S M L | Claude Code governance files vs. latest Anthropic docs. Auto-fixes deprecations. | Steps 1–6 | — |
| `/security-audit` | M L | API routes, auth guards, input validation, response shapes, HTTP headers | A1–A5, R1–R3, headers | `SEC-n` |
| `/skill-dev` | M L | Coupling, duplication, dead code, magic values, oversized components, TypeScript suppressions | D1–D7, A1–A3 | `DEV-n` |
| `/skill-db` | M L | Schema normalization, indexes, access control, data types, N+1 queries, migration quality | S1–S6, Q1–Q3, M1–M2 | `DB-n` |
| `/api-design` | M L | URL naming, HTTP verbs, response envelope consistency, status codes, pagination | N1–N5, R1–R3 | `API-n` |
| `/perf-audit` | M L | Rendering boundaries, bundle size, heavy imports, serial awaits, over-fetching | P1–P5, Q1–Q3 | `PERF-n` |
| `/responsive-audit` | M L | Layout correctness at 375px / 768px / 1024px via Playwright screenshots | R1–R6 | — |
| `/ux-audit` | M L | Task completion, interaction consistency, feedback, navigation, cognitive load | D1–D6 per flow | `UX-n` |
| `/visual-audit` | M L | Typography, spacing, hierarchy, colour discipline, dark-mode polish, micro-polish | V1–V7 per page | — |

**Notes:**
- `/arch-audit` is available in all tiers — it audits the governance layer itself, not the product code.
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

### How Claude is controlled

**Stop hook** — Claude cannot declare a task complete until tests pass:
```json
"Stop": [{ "hooks": [{ "type": "command",
  "command": "npm test || echo '{\"decision\": \"block\", \"reason\": \"Tests must pass first.\"}'"
}] }]
```

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

For developers who use Claude Code as a **controlled collaborator**, not an autonomous agent.

**Claude generates, humans decide.** Every meaningful action has a visible gate:
- Requirements reviewed before implementation starts (STOP gate)
- Tests must pass before Claude can declare completion (Stop hook)
- AI-generated code tagged in git history (attribution)
- Changes to Claude's own config require human review (CODEOWNERS)

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

`v0.2.0` — private. Three-path init stable. Templates stable. Publishing to npm pending.

## License

MIT
