---
name: skill-dev
description: Code quality and technical debt audit. Identifies coupling, duplication, dead code, pattern inconsistencies, magic values, missing or premature abstractions, TypeScript type safety gaps (any, suppressions, floating promises), React antipatterns (useEffect misuse, derived state in effect), silent failure patterns, and structural quality issues (over-large components, prop drilling, client/server boundaries, utility consolidation). Uses docs/sitemap.md as structural guide. Outputs findings to docs/backlog-refinement.md.
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:section:<section>|target:page:<route>]
---

You are performing a code quality and technical debt audit of the project codebase.

**Critical constraints**:
- `docs/sitemap.md` is the authoritative inventory of every page and component. Use it to build your file target list. Do NOT scan the filesystem freely.
- Do NOT make code changes. Audit only.
- Do NOT report issues already in `docs/refactoring-backlog.md` — check for duplicates first.
- All new findings go to `docs/backlog-refinement.md`.

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:<name>` | Focus on components and routes belonging to that section |
| `target:page:<route>` | Focus on the page file and its direct component dependencies |
| No argument | Full audit — all files from sitemap |

Announce: `Running skill-dev — scope: [FULL | target: <resolved>]`
Apply the target filter to the file list in Step 1.

---

## Configuration (adapt before first run)

> Replace these placeholders:
> - `[COMPONENTS_PATH]` — e.g. `components/`, `src/components/`, `app/`
> - `[SHARED_LIB_PATH]` — e.g. `lib/`, `src/utils/`, `shared/`
> - `[FEATURE_NAMING]` — how feature folders are named in this project (e.g. `features/auth/`, `app/(auth)/`)

---

## Step 1 — Read structural guides

Read in order:
1. `docs/sitemap.md` — build target file list (pages + key components per route + lib files referenced)
2. `docs/refactoring-backlog.md` — note existing entries to avoid duplicates
3. `docs/backlog-refinement.md` — note existing entries to avoid duplicates

Output: structured file list (pages + components + lib utilities). Do not proceed until complete.

---

## Step 2 — Delegate pattern checks to Explore subagent

Launch a **single Explore subagent** (model: haiku) with the full file list from Step 1:

"Run all 10 checks below on ONLY the provided files. For each check: state total match count, list every match as `file:line — excerpt`, state PASS or FAIL.

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
Also flag hardcoded numeric literals in business logic (e.g. withholding rates, page sizes, timeout durations, amount thresholds). Exclude: test files, CSS px values, HTTP status codes.

**CHECK D5 — Pattern inconsistencies**
Pattern: the same operation done in materially different ways in different files.
Grep: look for 2+ different patterns for: (a) error handling in async functions, (b) data fetching approach, (c) form submission handling. Flag inconsistencies.

**CHECK D6 — Components over 250 lines**
Pattern: component files exceeding 250 lines are candidates for decomposition.
For each file in the list: count lines. Flag files > 250 lines with their line count.

**CHECK D7 — TODO/FIXME/HACK comments**
Grep: `\bTODO\b|\bFIXME\b|\bHACK\b|\bXXX\b` across all files in scope.
Flag: each match with context.

**CHECK D8 — TypeScript type safety suppressions and `any` usage**
Pattern A — Directive suppressions:
Grep: `@ts-ignore|@ts-expect-error|@ts-nocheck` across all files.
`@ts-ignore` is highest severity — it suppresses errors silently even if the error disappears. `@ts-expect-error` is acceptable if it has a description comment explaining why. Flag both.
Pattern B — Explicit `any`:
Grep: `:\s*any\b|as\s+any\b|<any>|Promise<any>` in non-test `.ts` and `.tsx` files.
Exclude: type definition files (`*.d.ts`) and documented intentional workarounds listed in CLAUDE.md Known Patterns.
Flag: each remaining `any` usage. A typed alternative almost always exists.
Pattern C — Floating Promises (unhandled async):
Grep in component files: lines starting async calls (`fetch(`, router navigation, DB client calls) NOT preceded by `await` and NOT assigned to a variable or chained to `.then(` or `.catch(`.
Flag: async calls without await or error handling in component event handlers — these are silent fire-and-forget operations that can fail without user feedback.

**CHECK D9 — useEffect antipatterns**
Pattern A — Derived state stored in state + updated via useEffect:
Grep: `useState` followed within 10 lines by `useEffect(() => { set` — state that is immediately updated in an effect is usually derivable during render (use `useMemo` or compute inline).
Flag: components that `useState` for a value and then have a `useEffect` whose ONLY purpose is to call the matching `setState` based on props or other state.
Pattern B — Event handler logic inside useEffect:
Grep: `useEffect` containing side effects that were triggered by a user action (toast notifications, navigation, emails). These belong in the event handler, not in an effect.
Pattern C — Missing dependency array (effect runs on every render):
Grep: `useEffect\(\s*(?:async\s*)?\(\s*\)\s*=>` followed by closing `\}\)` without a dependency array `[` before `)`.
Flag: `useEffect` calls without a dependency array — they run on every render and are almost always bugs or performance issues.
Expected: 0 matches for A and C. B requires judgment — flag candidates.

**CHECK D10 — Silent failure patterns**
Pattern A — Empty or near-empty catch blocks:
Grep: `catch\s*\([^)]*\)\s*\{\s*\}|catch\s*\([^)]*\)\s*\{\s*\/\/`
Flag: catch blocks that swallow errors silently with no recovery or user feedback.
Pattern B — console.log in production code:
Grep: `console\.log\(|console\.warn\(|console\.error\(` in `app/` and `lib/` equivalent directories (excluding test files).
Expected: 0 matches outside intentional error boundaries. `console.error` in catch blocks is acceptable if also returning an error response."

---

## Step 3 — Structural judgment checks (main context)

These require reading and reasoning, not just pattern matching:

**J1 — Over-large components**
Identify the 3 largest components by line count or by most listed sub-responsibilities in the sitemap. Read each candidate file.
Flag components that are:
- Over 300 lines AND have 4+ distinct responsibilities (fetch, state management, form handling, display)
- Exhibit "divergent change" — if you'd need to change two unrelated concerns in the same file, it should be split
- Exhibit "feature envy" — a component that uses more data/methods from another domain than its own

**J2 — Prop drilling depth**
For each multi-step form, wizard, or deeply nested component: read the top-level component. Count how many props are passed down 3+ levels without being consumed at intermediate levels. Flag if prop count > 5 at depth > 2.
Also check for "data clumps" — groups of 3+ related variables always passed together as separate props (should be an object type).

**J3 — Client/server boundary placement** *(skip if project has no client/server split)*
Check 1 — 'use client' (or equivalent) at page/layout level when only a subcomponent needs it:
If a page or layout file is marked as a client component but only uses client-specific features in one subcomponent, it should instead split the interactive part into a named client component and keep the page as a server component. Marking the whole page as a client component forces ALL its imports into the client bundle.
Check 2 — Context providers placed too high in the component tree when they could be lower.
Check 3 — Files with server secrets (non-public env vars) imported into client-side files — these should have a server-only guard or be split.
Flag each issue with: file path, current placement, recommended refactor.

**J4 — Utility consolidation**
Read the shared utility directory listing (`[SHARED_LIB_PATH]`). Flag any utilities that appear to have overlapping purposes (e.g. two date formatting helpers, two notification builder functions, duplicate validation helpers).
Flag if overlapping utilities exist and have not been consolidated.

**J5 — Type definition consolidation**
Read the project's types file(s) (e.g. `lib/types.ts`, `src/types/`). Flag:
- Types defined inline in component files that are used in 3+ places (should be in a shared types file)
- Response types that duplicate generated/source types (should extend the generated types instead)
- Duplicate `interface` or `type` definitions for the same concept across different files

---

## Step 4 — Produce report and update backlog

### Output format

```
## Skill-Dev Audit — [DATE]
### Scope: [N] files from sitemap.md
### Sources: Refactoring.Guru code smells, typescript-eslint rules, React "You Might Not Need an Effect"

### Pattern Checks (Explore agent)
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| D1 | Cross-module coupling | N | Medium | ✅/⚠️ |
| D2 | Duplicated constant maps | N | Medium | ✅/⚠️ |
| D3 | Dead exports | N | Low | ✅/⚠️ |
| D4 | Magic strings + numbers | N | Medium | ✅/⚠️ |
| D5 | Pattern inconsistencies | N | Medium | ✅/⚠️ |
| D6 | Components >250 lines | N | Medium | ✅/⚠️ |
| D7 | TODO/FIXME comments | N | Low | ✅/⚠️ |
| D8 | @ts-ignore + any + floating promises | N | High | ✅/⚠️ |
| D9 | useEffect antipatterns | N | Medium | ✅/⚠️ |
| D10 | Empty catch + console.log | N | Medium | ✅/⚠️ |

### Structural Checks (main context)
| # | Check | Verdict | Notes |
|---|---|---|---|
| J1 | Over-large components | ✅/⚠️ | |
| J2 | Prop drilling + data clumps | ✅/⚠️ | |
| J3 | Client/server boundary | ✅/⚠️ | |
| J4 | Utility consolidation | ✅/⚠️ | |
| J5 | Type definition consolidation | ✅/⚠️ | |

### Findings requiring action ([N] total)
[file:line — check# — issue — suggested fix for each]
```

### Write to backlog

For each finding with severity Medium or above, append to `docs/backlog-refinement.md`:
- Assign ID: `DEV-[n]` (increment from last DEV entry)
- Add row to priority index table
- Add full detail section

### Severity guide

- **Critical**: `@ts-ignore` on a security or data path (D8); floating promise in an auth or data-write event handler (D8)
- **High**: `any` usage in shared lib utilities; `useEffect` with no dependency array (D9C); empty catch on a DB write (D10); N+1 in a hot path (D3)
- **Medium**: `useEffect` derived-state antipattern (D9A); over-large component >300 lines with 4+ responsibilities (J1); client component marker at page level when only a subcomponent needs it (J3); magic business-rule numbers (D4); console.log in production (D10); data clumps >3 always-grouped props (J2)
- **Low**: TODO comments; minor coupling; consolidation opportunities; magic enum strings with existing type definitions; single dead export

After producing the report, ask: "Do you want me to implement the High/Critical fixes identified?"
