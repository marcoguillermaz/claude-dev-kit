# Context File Review Checklist

Executed at the end of every block (Phase 8.5 in full pipeline, FL-4 in fast lane).
Each check has a specific, verifiable pass/fail condition.
**The phase is complete only when all checks pass — not when the review "seems thorough".**

---

## C1 — Security: no credentials in auto-memory

**Run**: `grep -in "token\|secret\|password\|api_key\|sk_live\|sbp_" ~/.claude/projects/.../memory/MEMORY.md`
**Pass**: 0 matches, or only placeholder strings with no actual values.
**Fail**: redact immediately → replace value with `...see .env.local` → remind user to rotate the exposed credential.

---

## C2 — Language: no non-English prose in context files

**Scope**: every non-code-block line in CLAUDE.md and auto-memory MEMORY.md.
**Allowed**: DB column names, enum values, route paths, UI labels inside quotes.
**Pass**: 0 matches of non-English explanatory prose.
**Fail**: translate flagged text to English.

---

## C3 — Field name staleness (CLAUDE.md)

**What**: every DB field / config key mentioned in CLAUDE.md must exist in the current schema/codebase.
**Run**: identify latest migration or config, confirm any field referenced in CLAUDE.md is current.
**Pass**: all field names match the current state.
**Fail**: update the field name and add the rename to Known Patterns if non-obvious.

---

## C4 — Stale block references (CLAUDE.md + auto-memory)

**What**: references like "(Block N)" must not describe closed blocks as if they are open or future.
**Pass**: every match is either a historical note in past tense or references a genuinely open block.
**Fail**: remove forward-looking references for closed blocks; convert to past tense if historical context is useful.

---

## C5 — MEMORY.md qualifier completeness (pipeline.md)

**What**: every mention of "MEMORY.md" in pipeline.md must be unambiguous about which file is meant.
**Run**: `grep -n "MEMORY\.md" .claude/rules/pipeline.md`
**Pass**: every match contains one of: `(project root)`, `auto-memory`, or is a filename in a code block.
**Fail**: add the appropriate qualifier.

---

## C6 — No duplication: auto-memory vs CLAUDE.md

**What**: a pattern in auto-memory that has become a stable project truth belongs in CLAUDE.md, not both.
**Pass**: no entry is substantially identical in both files.
**Fail**: remove from auto-memory; CLAUDE.md is the canonical location for stable patterns.

---

## C7 — Size compliance

**Run**: `wc -l CLAUDE.md` and `wc -l ~/.claude/projects/.../memory/MEMORY.md`
**Pass**: CLAUDE.md < 200 lines. Auto-memory MEMORY.md < 150 lines.
**Fail**: extract oldest or least-referenced patterns into a topic file and replace with a link.

---

## C8 — files-guide.md path accuracy

**What**: every file path listed in the "Automatically loaded" tree must exist on disk.
**Pass**: all paths resolve.
**Fail**: correct the path or update the description.

---

## C9 — Active plan currency (project-root MEMORY.md)

**What**: the Active plan table must reflect the actual state of the project at the time of the current commit.
**Pass**: every row is accurate as of the last `git push`.
**Fail**: update status and/or description before closing the session.

---

## C10 — Dead file references (cross-doc)

**What**: file paths referenced in context docs must exist on disk.
**Run**: grep for `docs/` and `.claude/` paths in CLAUDE.md and pipeline.md. Verify each exists.
**Pass**: all referenced paths resolve.
**Fail**: remove or update the stale reference before closing.

---

## C11 — Refactoring backlog: completed items

**What**: items in `docs/refactoring-backlog.md` that correspond to work completed in the current block must be removed.
**Pass**: no completed item remains open.
**Fail**: remove from priority index AND delete the corresponding detail section.

---

## Execution order

Run C1 → C11 in sequence. Apply fixes before moving to the next check.
**Complete when all checks pass.** Then run `/compact`.
