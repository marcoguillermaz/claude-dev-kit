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
# In an existing project directory or a new empty folder:
npx claude-dev-kit init
```

The wizard asks 8 questions and produces a ready-to-use scaffold.

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
├── MEMORY.md                       ← shared lessons (M/L only)
│
├── .claude/
│   ├── settings.json               ← permissions + governance hooks
│   ├── rules/
│   │   ├── pipeline.md             ← development workflow (tier-appropriate)
│   │   ├── context-review.md       ← end-of-block compliance checklist
│   │   ├── security.md             ← path-scoped: API/auth files only
│   │   └── git.md                  ← commit format, branch rules
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

---

## Status

`v0.1.0` — private. Templates stable, CLI functional. Publishing to npm pending.

## License

MIT
