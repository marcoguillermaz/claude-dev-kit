---
name: arch-audit
description: Audit the Claude Code governance files against the latest Anthropic documentation and release notes. Run weekly to stay compliant with new Claude Code features, catch deprecations, and keep the context system clean and efficient.
user-invocable: true
model: sonnet
context: fork
---

You are performing a weekly architecture compliance audit for this project's Claude Code governance setup.

Execute all steps below in order.

---

## Configuration (fill in before first run)

> Replace these placeholders with the real paths for this project:
> - `[MEMORY_PATH]` — path to the project's auto-memory file, e.g. `~/.claude/projects/-Users-yourname-Projects-yourproject/memory/MEMORY.md`
> - `[LAST_AUDIT_PATH]` — path to store the last-audit timestamp, e.g. `~/.claude/projects/-Users-yourname-Projects-yourproject/last-audit`

---

## Step 1 — Fetch latest Anthropic documentation (parallel)

Launch a single research agent to fetch ALL of the following URLs and extract key changes:

- https://docs.anthropic.com/en/docs/claude-code/memory
- https://docs.anthropic.com/en/docs/claude-code/settings
- https://docs.anthropic.com/en/docs/claude-code/hooks
- https://docs.anthropic.com/en/docs/claude-code/mcp
- https://docs.anthropic.com/en/docs/claude-code/sub-agents
- https://docs.anthropic.com/en/docs/claude-code/slash-commands
- https://docs.anthropic.com/en/docs/claude-code/changelog
- https://github.com/anthropics/claude-code/releases (latest 5 releases)

From each source extract: new keys/features, deprecations, breaking changes, best practice updates.

---

## Step 2 — Read current governance files (parallel)

Read these files:
- `CLAUDE.md`
- `.claude/rules/pipeline.md`
- `.claude/rules/context-review.md` (if present)
- `.claude/settings.json`
- `.claude/files-guide.md` (if present)
- `[MEMORY_PATH]`

---

## Step 3 — Gap analysis

Compare Step 1 findings against Step 2 state. Classify each gap:

**AUTO-FIX** — apply directly without asking:
- Deprecated keys in `settings.json` with a direct replacement
- New settings keys that are clearly beneficial and low-risk (token efficiency, attribution)
- Stale file paths or descriptions in `files-guide.md`
- New hook events or agent frontmatter fields that improve existing patterns

**RECOMMEND** — list for user review, do not apply:
- Structural changes (splitting files, new directories)
- New features requiring a user decision (sandbox mode, new MCP servers)
- Changes that could affect existing pipeline phase gates
- Anything that changes observable Claude behaviour

---

## Step 4 — Apply AUTO-FIX changes

For each AUTO-FIX: apply the change, note the file and line modified.

---

## Step 5 — Update timestamp

```bash
date +%s > [LAST_AUDIT_PATH]
```

---

## Step 6 — Produce audit report

Output a structured report in this exact format:

```
## Arch Audit — [DATE]
### Claude Code version checked: [version from changelog/releases]

### ✅ Auto-fixed ([N] changes)
- [file]: [what changed and why]

### 📋 Recommendations ([N] items)
- [Priority: High/Medium/Low] [description] — [why it matters]

### ✓ Compliant (no action needed)
- [area]: [brief confirmation]

### Next audit due: [DATE + 7 days]
```

If no gaps are found: output "Architecture fully compliant as of [DATE]. No changes needed." and still update the timestamp.
