# Claude Code + Project — Cheat Sheet

> Quick reference for commands, pipeline shortcuts, and available skills.

---

## Claude Code — Session

| Command | Action |
|---|---|
| `/clear` | Clear conversation context |
| `/compact [note]` | Compact conversation (CLAUDE.md survives) |
| `/model <name>` | Switch model: `sonnet`, `opus`, `haiku` |
| `/memory` | View/edit CLAUDE.md and auto-memory |
| `/resume` | Resume a previous session |

---

## Pipeline shortcuts

| Situation | Action |
|---|---|
| Starting a new block | `git checkout -b feature/block-name` |
| Quick fix (≤3 files) | `git checkout -b fix/description` — use Fast Lane |
| Session interrupted | Check `.claude/session/` for recovery file |
| Context window ~50% | Run `/compact` before continuing |
| End of block | Run context review (C1–C12) then `/compact` |

---

## Audit skills

Run these on demand. Each skill reads the codebase, produces a structured report, and appends findings to `docs/refactoring-backlog.md`.

| Skill | What it checks | When to run |
|---|---|---|
| `/security-audit` | Auth guards, input validation, sensitive data in responses, HTTP headers | Before production deploy; after adding new API routes |
| `/skill-dev` | Coupling, duplication, dead code, magic strings, oversized components | Before major refactoring; quarterly review |
| `/skill-db` | Missing indexes, access control gaps, constraint completeness, N+1 queries | After migration waves; before production releases |
| `/migration-audit` | Migration file safety: lock-heavy DDL, missing rollback, data loss, unsafe ALTER TYPE | After writing a migration, before applying to staging |
| `/api-design` | HTTP verb correctness, URL structure, response shape, error codes, pagination | After adding 3+ new routes; quarterly |
| `/perf-audit` | Server/client boundaries, heavy imports, serial awaits, image optimization, N+1 | Before production releases; after major UI changes |
| `/simplify` | Early returns, nesting depth, local duplication, dead code, magic values | After writing code (Phase 2); on demand |

> **Before first run**: open each SKILL.md and replace the `[PLACEHOLDER]` values with the real paths for this project.
> **Prerequisites for screenshot-based skills**: dev server must be running (check your project's dev command for the URL).

---

## Git workflow

| Action | Command |
|---|---|
| New feature branch | `git checkout -b feature/block-name` |
| New fix branch | `git checkout -b fix/description` |
| Merge to staging | `git checkout staging && git merge feature/name --no-ff && git push` |
| Promote to production | `git checkout main && git merge staging --no-ff && git push` |

---

## Useful checks

```bash
# Verify type safety
[TYPE_CHECK_COMMAND]

# Run tests
[TEST_COMMAND]

# Check what Claude has touched in this session
cat ~/.claude/audit/[PROJECT_NAME].jsonl | tail -20 | jq .

# Validate Claude setup
npx mg-claude-dev-kit doctor
```
