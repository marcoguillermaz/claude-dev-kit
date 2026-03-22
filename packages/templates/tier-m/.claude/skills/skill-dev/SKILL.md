---
name: skill-dev
description: Code quality and technical debt audit. Identifies coupling, duplication, dead code, pattern inconsistencies, magic values, and missing or premature abstractions. Uses docs/sitemap.md as structural guide. Outputs findings to docs/backlog-refinement.md.
user-invocable: true
model: sonnet
context: fork
---

You are performing a code quality and technical debt audit of the project codebase.

**Critical constraints**:
- `docs/sitemap.md` is the authoritative inventory of every page and component. Use it to build your file target list. Do NOT scan the filesystem freely.
- Do NOT make code changes. Audit only.
- Do NOT report issues already in `docs/refactoring-backlog.md` — check for duplicates first.
- All new findings go to `docs/backlog-refinement.md`.

---

## Configuration (adapt before first run)

> Replace these placeholders:
> - `[COMPONENTS_PATH]` — e.g. `components/`, `src/components/`, `app/`
> - `[SHARED_LIB_PATH]` — e.g. `lib/`, `src/utils/`, `shared/`
> - `[FEATURE_NAMING]` — how feature folders are named in this project (e.g. `features/auth/`, `app/(auth)/`)

---

## Step 1 — Read structural guides

Read in order:
1. `docs/sitemap.md` — build target file list (pages + key components per route)
2. `docs/refactoring-backlog.md` — note existing entries to avoid duplicates
3. `docs/backlog-refinement.md` — note existing entries to avoid duplicates

Output: structured file list. Do not proceed until complete.

---

## Step 2 — Delegate pattern checks to Explore subagent

Launch a **single Explore subagent** (model: haiku) with the full file list from Step 1:

"Run all 7 checks below on ONLY the provided files. For each check: state total match count, list every match as `file:line — excerpt`, state PASS or FAIL.

**CHECK D1 — Cross-module direct imports (coupling)**
Pattern: feature components importing directly from other feature folders, bypassing shared lib or index.
Grep: `import.*from.*'[COMPONENTS_PATH]` lines. Flag any import where the importing file's feature folder differs from the imported file's feature folder AND the import does not go through a shared path.

**CHECK D2 — Duplicated inline constant maps**
Pattern: the same lookup object (color maps, status maps, label maps) defined more than once in different files.
Grep: for object literals with 3+ key-value pairs that appear in 2+ files. Flag duplicates — they should be extracted to `[SHARED_LIB_PATH]`.

**CHECK D3 — Dead exports**
Pattern: exported functions/components/constants that are never imported anywhere.
Grep: for each `export function|export const|export class` in the file list, check if the export name appears in an import statement in any other file. Flag unexported items.

**CHECK D4 — Magic strings and numbers**
Pattern: string literals and numeric literals used directly in logic, not assigned to a named constant.
Grep: string comparisons (`=== 'someValue'`) where the value is a domain concept (status, role, type). Flag literals that should be named constants or enums.

**CHECK D5 — Pattern inconsistencies**
Pattern: the same operation done in materially different ways in different files.
Grep: look for 2+ different patterns for: (a) error handling in async functions, (b) data fetching approach, (c) form submission handling. Flag inconsistencies.

**CHECK D6 — Components over 250 lines**
Pattern: component files exceeding 250 lines are candidates for decomposition.
For each file in the list: count lines. Flag files > 250 lines with their line count.

**CHECK D7 — `@ts-ignore` and `any` type usage**
Pattern: suppressed TypeScript errors indicate unresolved type issues.
Grep: `@ts-ignore`, `@ts-expect-error`, `: any`, `as any`. List every occurrence with file and line."

---

## Step 3 — Abstraction review (main context)

For the 5 largest components identified in D6:

**A1 — Prop drilling depth**: check if props are passed through 3+ component levels without being used by intermediate components. These should be candidates for context or composition.

**A2 — Premature abstraction**: check for utility functions used only once (single consumer). These add indirection without benefit — inline them.

**A3 — Missing abstraction**: check for patterns repeated 3+ times inline (e.g. the same fetch + error handling block). These should be extracted.

---

## Step 4 — Produce report and update backlog

Output format:

```
## Code Quality Audit — [DATE]

### Pattern Checks
| Check | Matches | Verdict |
|---|---|---|
| D1 Cross-module coupling | N | ✅/❌ |
| D2 Duplicated maps | N | ✅/❌ |
| D3 Dead exports | N | ✅/❌ |
| D4 Magic strings/numbers | N | ✅/❌ |
| D5 Pattern inconsistencies | N | ✅/❌ |
| D6 Components >250 lines | N | ✅/❌ |
| D7 @ts-ignore / any | N | ✅/❌ |

### Abstraction Review
| Check | Verdict | Notes |
|---|---|---|
| A1 Prop drilling | ✅/❌ | |
| A2 Premature abstraction | ✅/❌ | |
| A3 Missing abstraction | ✅/❌ | |

### High priority findings (N)
[file — issue — impact — fix]

### Medium priority findings (N)
[file — issue — fix]
```

For each High finding, append to `docs/backlog-refinement.md`:
- ID: `DEV-[n]`
- Priority index entry + full detail section

### Priority guide
- **High**: coupling between feature modules; duplicated domain logic; component >500 lines
- **Medium**: magic strings in business logic; duplicated map with 3+ consumers; prop drilling >3 levels
- **Low**: single @ts-ignore; single dead export; minor inconsistency
