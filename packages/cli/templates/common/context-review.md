# Context File Review Checklist

Executed at the end of every block (Phase 8.5 in full pipeline, FL-4 in fast lane).
Each check has a specific, verifiable pass/fail condition.
**The phase is complete only when all checks pass — not when the review "seems thorough".**

---

## C1 — Security: no credentials in auto-memory

**What**: grep for token/secret patterns in the auto-memory MEMORY.md.
**Run**: `grep -in "sk_live_[a-z0-9]\|api_key.*=.*[a-z0-9]\{10,\}\|password.*=.*[a-z0-9]\{8,\}\|token.*=.*[a-z0-9]\{10,\}" ~/.claude/projects/.../memory/MEMORY.md`
**Pass**: 0 matches, or only placeholder strings with no actual values (e.g. `sk_live_...` with no further characters).
**Fail**: redact immediately → replace value with `...see .env.local` → remind user to rotate the exposed credential.
**Note**: property names like `must_change_password`, `api_key: string` in code examples are NOT credentials — the grep targets actual value strings (minimum 8–10 chars after the pattern).

---

## C2 — Language: no non-English prose in context files

**Scope**: every non-code-block line in CLAUDE.md and auto-memory MEMORY.md.
**Allowed**: DB column names, enum values, route paths, UI labels inside quotes, product-specific terms.
**Pass**: 0 matches of non-English explanatory prose.
**Fail**: translate flagged text to English.

---

## C3 — Field name staleness (CLAUDE.md)

**What**: every DB field / config key mentioned in CLAUDE.md must exist in the current schema/codebase.
**Run**: identify the latest migration or config file, confirm every field referenced in CLAUDE.md is current.
**Specific risk**: field renames across blocks. After each block that renames a DB column or config key: immediately update every mention in CLAUDE.md.
**Pass**: all field names match the current state.
**Fail**: update the field name and add the rename to Known Patterns if non-obvious.

---

## C4 — Stale block references (CLAUDE.md + auto-memory)

**What**: references like "(Block N)" or "from Block N" must not describe closed blocks as if they are open or future.
**Run on CLAUDE.md**: `grep -n "Block [0-9]" CLAUDE.md`
**Run on auto-memory**: same grep on `~/.claude/projects/.../memory/MEMORY.md`
**Pass**: every match is either a historical note in past tense ("renamed in Block 3") or references a genuinely open block.
**Fail**: remove forward-looking references for closed blocks; convert to past tense if historical context is useful.

---

## C5 — MEMORY.md qualifier completeness (pipeline.md)

**What**: every mention of "MEMORY.md" in pipeline.md must be unambiguous about which file is meant.
**Run**: `grep -n "MEMORY\.md" .claude/rules/pipeline.md`
**Pass**: every match contains one of: `(project root)`, `auto-memory`, or is a filename reference inside a code block.
**Fail**: add the appropriate qualifier.

---

## C6 — No duplication: auto-memory vs CLAUDE.md

**What**: a pattern in auto-memory that has become a stable project truth belongs in CLAUDE.md, not both.
**Check**: read the relevant sections of auto-memory and CLAUDE.md § Known Patterns side by side.
**Pass**: no entry is substantially identical in both files (same pattern + same fix + same context).
**Fail**: remove from auto-memory; CLAUDE.md is the canonical location for stable patterns.

---

## C7 — Size compliance

**Run**: `wc -l MEMORY.md` (project root) and `wc -l ~/.claude/projects/.../memory/MEMORY.md` (auto-memory)
**Pass**: project-root MEMORY.md < 150 lines. Auto-memory MEMORY.md < 150 lines.
**Fail**: extract oldest or least-referenced patterns into a topic file under `.claude/` and replace with a link.

---

## C8 — files-guide.md path accuracy

**What**: every file path listed in the "Automatically loaded" tree must exist on disk and be correct.
**Run**: for each path in the tree, verify existence with Glob or Bash `ls`.
**Also check**: the `.claude/CLAUDE.local.md` description must match what the file actually contains (if it exists).
**Pass**: all paths resolve; description matches reality.
**Fail**: correct the path or update the description.

---

## C9 — Active plan currency (project-root MEMORY.md)

**What**: the Active plan table must reflect the actual state of the project at the time of the current commit.
**Check each row**:
- Status `🔄 in progress` → is it genuinely still in progress, or completed in this block?
- Status `✅` → was it committed and verifiable in the implementation checklist?
- Description → does it accurately describe what happened, not what was planned?
**Pass**: every row is accurate as of the last `git push`.
**Fail**: update status and/or description before closing the session.

---

## C10 — Dead file references (cross-doc)

**What**: file paths referenced in context docs must exist on disk. Any `docs/*.md` or `.claude/*.md` path mentioned in CLAUDE.md or pipeline.md that no longer exists is a silent broken pointer.
**Run**: `grep -oE "docs/[a-zA-Z0-9/_-]+\.md|\.claude/[a-zA-Z0-9/_-]+\.md" CLAUDE.md .claude/rules/pipeline.md docs/refactoring-backlog.md 2>/dev/null`
For each path found, verify it exists.
**Pass**: all referenced paths resolve.
**Fail**: remove or update the stale reference before closing.

---

## C11 — Refactoring backlog: completed items

**What**: items in `docs/refactoring-backlog.md` that correspond to work completed in the current block must be removed. Completed items inflate the backlog and dilute attention on real open issues.
**Run**: read the current block's Log row in `docs/implementation-checklist.md`. Grep `docs/refactoring-backlog.md` for any ID or topic matching completed work.
**Pass**: no completed item remains open.
**Fail**: remove from priority index AND delete the corresponding detail section.

---

## Execution order and completion condition

Run C1 → C2 → C3 → C4 → C5 → C6 → C7 → C8 → C9 → C10 → C11 in sequence.
Apply any fix before moving to the next check.
**The phase is complete when C1–C11 have all passed.** Then run `/compact`.

> If a check reveals a pattern worth adding to CLAUDE.md or auto-memory, add it before C6 (duplication check) so the dedup pass catches any overlap.
