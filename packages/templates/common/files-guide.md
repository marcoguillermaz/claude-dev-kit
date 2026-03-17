# Claude Code — Files Guide

Reference guide for understanding each Claude Code file: official purpose, loading behaviour,
and how this project uses them.

---

## Overview

```
Automatically loaded at session start
─────────────────────────────────────
CLAUDE.md                        ← project context (official, committed)
.claude/CLAUDE.local.md          ← personal overrides (official, gitignored)
.claude/rules/pipeline.md        ← workflow rules (auto-loaded from rules dir)
.claude/rules/context-review.md  ← Phase 8.5 compliance checklist (auto-loaded)
.claude/rules/security.md        ← security rules, path-scoped (auto-loaded)
.claude/rules/git.md             ← git conventions (auto-loaded)
.claude/settings.json            ← project tool permissions (official, committed)
.claude/settings.local.json      ← personal config overrides (gitignored)
~/.claude/projects/.../MEMORY.md ← auto-memory (Claude Code system, NOT committed)

Loaded on demand
─────────────────────────────────────
MEMORY.md (project root)         ← shared lessons (read in Phase 0)
docs/requirements.md             ← product spec (read in Phase 1)
docs/implementation-checklist.md ← progress tracker (read in Phase 1)
docs/refactoring-backlog.md      ← tech debt (read in Phase 1)
docs/adr/                        ← architecture decision records (read as needed)
```

---

## CLAUDE.md — Project context

**Official Anthropic feature**: yes — auto-loaded at every session start.

**Target size**: under 200 lines. Longer files reduce adherence — Claude starts ignoring instructions.

**What belongs here**:
- Tech stack and non-obvious architecture choices
- Role/permission model (RBAC, access rules)
- Business workflows and state machines
- Known gotchas that cause bugs if forgotten
- Coding conventions that differ from defaults
- Pointers to other reference documents

**What does NOT belong here**:
- File-by-file codebase descriptions (Claude reads code directly)
- Things Claude can infer from reading the code
- Standard language conventions Claude already knows
- Information that changes every block (use MEMORY.md)

**Anthropic's test for each line**: *"Would removing this cause Claude to make mistakes?"*
If no → cut it.

**CLAUDE.md hierarchy** (all auto-loaded):

| Location | Scope | Committed? |
|---|---|---|
| `~/.claude/CLAUDE.md` | All projects on this machine | No |
| `CLAUDE.md` (project root) | This project, all team members | **Yes** |
| `.claude/CLAUDE.local.md` | This project, personal only | No (gitignored) |
| `subdir/CLAUDE.md` | That subdirectory only | Yes |

---

## .claude/rules/ — Modular rule files

**Official Anthropic feature**: yes — all `.md` files in this directory are auto-loaded.

**Path-scoped rules**: rules files support YAML frontmatter with a `paths` field.
A rule with `paths: ["src/api/**/*.ts"]` consumes **zero context tokens** when Claude
is working on UI files. Use this aggressively — it allows specificity without bloat.

```yaml
---
paths:
  - "src/api/**/*.ts"
---
# Rules that only apply to API files
All endpoints must validate input. Never return raw errors.
```

**This project uses**:
- `pipeline.md` — the development workflow (phases, gates, cross-cutting rules)
- `context-review.md` — the Phase 8.5 compliance checklist (C1–C11)
- `security.md` — security rules, path-scoped to API/auth files
- `git.md` — git conventions, commit format, branch rules

---

## .claude/settings.json — Tool permissions and hooks

**Official Anthropic feature**: yes — auto-loaded at every session start.

**Key sections**:
- `permissions.allow/deny` — which Bash commands run without prompting
- `hooks` — shell commands or LLM prompts triggered at lifecycle events
- `sandbox` — OS-level isolation for Bash commands
- `attribution` — commit message template for AI-generated commits

**Hook events available**:

| Event | Can Block | Primary Use |
|---|---|---|
| `PreToolUse` | Yes | Block dangerous commands; rewrite inputs |
| `PostToolUse` | No | Audit logging; post-write linting |
| `Stop` | Yes | Quality gate before task completion |
| `UserPromptSubmit` | Yes | Block off-topic prompts; inject context |
| `SessionStart` | No | Inject environment-specific context |

**The `Stop` hook is the most impactful governance control**: when configured with a test
command, Claude cannot declare a task complete until all tests pass — without any manual
discipline required.

---

## MEMORY.md — Session memory (two distinct files)

| File | Path | Committed? | Loaded by | Purpose |
|---|---|---|---|---|
| Project `MEMORY.md` | `./MEMORY.md` | ✅ yes | Pipeline Phase 0 (explicit read) | Shared team knowledge: Active plan + Lessons |
| Auto-memory | `~/.claude/projects/.../memory/MEMORY.md` | ❌ no | Claude Code system (injected) | Claude's private persistent patterns |

**Project MEMORY.md** — two sections:
- **Active plan**: current step, status, next action, open questions
- **Lessons/Patterns**: concrete findings from past blocks (bugs, pitfalls, workarounds)

**Rules**:
- Keep under ~150 active lines
- No duplication with CLAUDE.md
- Lessons must be specific: observation + root cause + fix

---

## .github/ — Team collaboration files

- `PULL_REQUEST_TEMPLATE.md` — standard PR format with AI disclosure checklist
- `CODEOWNERS` — maps directories to required reviewers. **`.claude/` should always be owned by the tech lead** — it defines what Claude can do

---

## docs/adr/ — Architecture Decision Records

ADRs capture *why* a decision was made, not just what was decided. In AI-assisted projects
they serve a dual purpose: human documentation + Claude context.

The `## AI Coding Guidance` section in each ADR is specifically written for Claude:
it converts architectural decisions into actionable constraints Claude can follow.

---

## Quick reference — "Where does this information go?"

| Information type | File |
|---|---|
| Tech stack, RBAC, known patterns | `CLAUDE.md` |
| Development pipeline, phase gates | `.claude/rules/pipeline.md` |
| Phase 8.5 compliance checklist | `.claude/rules/context-review.md` |
| Security rules (API/auth specific) | `.claude/rules/security.md` |
| Git conventions | `.claude/rules/git.md` |
| Temporary suspension or personal override | `.claude/CLAUDE.local.md` |
| Tool permission settings | `.claude/settings.json` |
| Current work in progress | `MEMORY.md` → Active plan |
| Bug or pattern discovered during implementation | `MEMORY.md` → Lessons/Patterns |
| Architectural decision + rationale | `docs/adr/NNNN-title.md` |
| Product specification | `docs/requirements.md` |
| Block progress and test results | `docs/implementation-checklist.md` |
| Tech debt and deferred improvements | `docs/refactoring-backlog.md` |
