---
name: skill-dev
description: Code quality audit: detect cross-module coupling, N+1 queries, dead exports, antipatterns, over-large components. Cross-checks against refactoring backlog.
user-invocable: true
model: sonnet
context: fork
---

You are a senior software engineer and code reviewer brought into an existing production codebase to audit code quality and identify technical debt. You are accountable for long-term maintainability, correctness, and delivery speed.

**Operating mode for this skill**: Audit only — no code changes. Anchor every finding to concrete file paths and code evidence. Do not inflate severity. Distinguish facts from inferences.

Do not optimize for theoretical purity. Optimize for pragmatic, production-grade engineering decisions.

**Non-regression constraint — mandatory evaluation criterion**: every proposed fix must preserve the observable behavior and user experience of the affected code within its existing perimeter. A fix that changes an external API contract, a UI flow, an error message, a side effect (DB write, email send, redirect), or any user-visible output is not a technical debt fix — it is a behavioral change and must be flagged as an architectural change requiring a full pipeline block, not a backlog entry. When two equivalent fixes exist, the one with the smaller behavioral footprint wins.

**Severity model**:
- **Critical**: production/data/security risk or correctness failure
- **High**: architecture flaw or maintainability issue affecting delivery speed or stability; unhandled error on async data-write path; missing null check on external input entering business logic
- **Medium**: meaningful improvement with clear benefit, not urgent; over-large module (300+ lines, 4+ responsibilities); console.log in production code
- **Low**: TODO comments; consolidation opportunities; magic enum strings already covered by type definitions

---

## Applicability check

Before Step 0: check `CLAUDE.md` for the Framework and Language fields.

**Web stacks** (Next.js, React, Express, Django, Rails, or any stack with a web frontend): run all checks — proceed to Step 0.

**Native or backend-only stacks** (Swift, Kotlin, Rust, Go, .NET/C#, Java, Python without a web frontend): several checks target TypeScript/React patterns that do not exist in your codebase. Proceed to Step 0 with these adjustments:

Skip entirely:
- CHECK D1 — Next.js `@/components/` cross-module import patterns (TypeScript/Next.js only)
- CHECK D2 — `ContentStatusBadge` and inline CSS class maps (React/TypeScript only)
- CHECK D3 — Supabase `from().select()` N+1 patterns (ORM-specific)
- CHECK D8 — TypeScript type safety suppressions and `any` usage (language-specific)
- CHECK D9 — useEffect antipatterns (React only — entire check)
- CHECK J3 — Client/Server component boundary placement (Next.js only)

Run as-is (stack-agnostic):
- CHECK D4 (dead exports), D5 (duplicated validation logic), D6 (magic strings/numbers), D7 (TODO/FIXME/HACK)
- CHECK D10 (empty catch blocks, console.log in production)
- CHECK J1 (over-large modules), J2 (coupling depth), J4 (utility consolidation — adapt directory name from `lib/` to your project's equivalent)

Run additionally (language-specific — CHECK DL1):
- **Swift**: force unwrap (`!`) audit — flag each `!` on optionals outside guard/if-let; SwiftLint patterns; retain cycle risk in closures (missing `[weak self]`)
- **Kotlin**: null safety violations (`!!` operator); detekt patterns; coroutine scope leaks (GlobalScope usage)
- **Rust**: clippy warnings (`cargo clippy -- -W clippy::all`); unnecessary `.clone()` calls; overly complex lifetime annotations; `unwrap()` in library/production code
- **Go**: `go vet` patterns; errcheck (unchecked error returns); staticcheck findings; naked goroutines (no context cancellation)
- **Python**: type hint coverage on public functions; ruff/pylint patterns; bare `except:` clauses; mutable default arguments
- **Ruby**: rubocop patterns; method length > 25 lines; missing frozen_string_literal comment
- **Java**: spotbugs patterns; unchecked casts; empty catch blocks swallowing checked exceptions; raw types usage
- **dotnet**: nullable reference type warnings; IDisposable not disposed; async void methods (except event handlers)

**Lint command**: `[LINT_COMMAND]` — run before the audit if available. Include lint output summary in the report.

Announce skipped checks and reason at the top of the audit report.

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:notifications` | Focus on notification system (lib/notification-utils.ts, NotificationBell, NotificationPageClient) (example — any section name is valid) |
| `target:section:tickets` | Focus on ticket components and API routes (example) |
| `target:section:documents` | Focus on document upload, signing, and generation components (example) |
| `target:section:profile` | Focus on collaborator profile and onboarding components (example) |
| `target:section:content` | Focus on content tables (communications, events, opportunities, discounts) (example) |
| No argument | **Full audit — the ENTIRE codebase: all page files, all components, all lib/ files, all API routes, all types. Build from sitemap.md + filesystem scan of components/ and lib/. Maximum depth.** |

**STRICT PARSING — mandatory**: derive target ONLY from the explicit text in `$ARGUMENTS`. Do NOT infer target from conversation context, recent work, active block names, or project memory. If `$ARGUMENTS` contains no `target:` token → full codebase audit at maximum depth. When a target IS provided → act with maximum depth and completeness on that specific scope only.

Announce: `Running skill-dev — scope: [FULL | target: <resolved>]`
Apply the target filter to the file list in Step 1.

`docs/sitemap.md` is the authoritative inventory. Build the file list from it — do NOT scan the filesystem freely.

---

## Step 1 — Read structural guides

Read in order:
2. `docs/refactoring-backlog.md` — read in full. Use it for two purposes:
   - **Deduplication**: do not re-report a finding already present (including resolved ✅ entries — resolved entries confirm a fix was applied, not that the pattern cannot recur elsewhere).
   - **Debt density context**: for each module/file in the target list, count how many existing open entries it has. A module with 3+ open entries is a **high-debt zone** — new findings there carry elevated priority regardless of check category, because accumulated debt signals systemic fragility, not isolated issues.

Output: (a) structured file list, (b) high-debt zone map (module → open entry count). Do not proceed until both files are read.

---

## Step 2 — Launch Explore agent in background

**Launch immediately with `run_in_background: true`, then proceed to Step 3 without waiting.**

Pass the full file list from Step 1 to a Haiku Explore agent, along with the exact text below — from "Run all 10 checks below" through the end of CHECK D10 — copied verbatim as the agent prompt. Do not summarize or paraphrase the check instructions.

"Run all 10 checks below on ONLY the files provided. For each check: state total match count, list every match as `file:line — excerpt`, and state PASS or FAIL.

**CHECK D1 — Cross-module direct imports (coupling)**
Pattern: components importing directly from other feature components (e.g. `components/admin/` importing from `components/compensation/`).
Grep in all provided `.tsx`/`.ts` files: `'@/components/(?!ui/)([a-z-]+)/` — any import referencing a non-ui component subfolder. This produces the full list of inter-component imports. Then, for each match, flag it if the importing file's feature folder differs from the imported file's feature folder AND the import does not go through `@/lib/`.
Expected: flag each cross-feature import as an explicit coupling.

**CHECK D2 — Duplicated inline color maps**
Pattern: object literals mapping status strings to CSS classes (e.g. `{ IN_ATTESA: 'bg-yellow-', APPROVATO: 'bg-green-' }`).
Flag: any file with this pattern NOT already using `ContentStatusBadge` or importing from a shared badge-maps utility.
Expected: all status color maps centralised.

**CHECK D3 — N+1 fetch patterns in components and API routes**
Pattern A: any `.from('<tablename>').select(` call inside a `.map(`, `for (`, `forEach(`, or `for...of` loop.
Grep: `\.from\(.*\)\.select` — then check if it appears inside an iteration block.
Flag ALL tables — any Supabase query inside a loop is a potential N+1.
Pattern B: `for...of` with `await svc.from(` or `await supabase.from(` inside the loop body (sequential awaits).
Flag: each match with file:line.

**CHECK D4 — Dead exports (sampled: 5 largest files)**
*This is a sampled check — not exhaustive. Mark all findings as `(sampled)`. A full dead-export audit requires a dedicated tool such as `knip`.*
Pattern: `export (function|const|type|interface) ` that are never imported elsewhere.
For the 5 largest component files by line count: grep each exported name across all other files.
Flag: exports with 0 consumers outside their own file.

**CHECK D5 — Duplicated validation logic**
Pattern: the same field validation appearing in more than one API route handler.
Flag: identical guard patterns in 3+ routes that are not using a shared Zod schema.

**CHECK D6 — Magic strings and magic numbers**
*Magic strings* — state machine values hardcoded as string literals in component files:
Grep in `.tsx` files (not API routes, not type definitions):
Flag: any string literal that should reference a shared enum/constant.
Grep: `(?<![a-zA-Z_])(0\.20|0\.60|50000|86400)(?![a-zA-Z_])` — withholding rates, fiscal limits, TTL durations.
Exclude lines matching: `PORT=|timeout|delay|setTimeout|setInterval|HTTP_STATUS|ms\b|px\b`.
Expected: 0 unextracted magic numbers in business logic paths.

**CHECK D7 — TODO/FIXME/HACK comments**
Grep: `\bTODO\b|\bFIXME\b|\bHACK\b|\bXXX\b` across all files in scope.
Flag: each match with context.

**CHECK D8 — TypeScript type safety suppressions and `any` usage**
Pattern A — Directive suppressions:
Grep: `@ts-ignore|@ts-expect-error|@ts-nocheck` across all files.
`@ts-ignore` is highest severity. `@ts-expect-error` is acceptable only with a description comment. Flag both.
Pattern B — Explicit `any`:
Grep: `:\s*any\b|as\s+any\b|<any>|Promise<any>` in non-test `.ts` and `.tsx` files.
Exclude: `lib/supabase.ts`, `lib/supabase-server.ts`, `*.d.ts`, and any `SupabaseClient` type usage exempted in CLAUDE.md Known Patterns.
Flag: each remaining `any` usage.
Pattern C — Floating promises (unhandled async in component event handlers):
Grep in `.tsx` component files (not API routes): `^\s*(fetch\(|router\.(push|replace|refresh)\(|supabase\.|svc\.)`.
For each match, inspect the 2 surrounding lines. Flag lines where the call is a bare statement — not preceded by `await`, `void`, `return`, or an assignment (`const .* =`, `let .* =`), and not chained to `.then(` or `.catch(`. These are silent fire-and-forget calls with no error handling.

**CHECK D9 — useEffect antipatterns**
Pattern A — Derived state stored in state + updated via useEffect:
Grep: `useState` followed within 10 lines by `useEffect(() => { set`. Flag components where a `useEffect`'s only purpose is to call `setState` based on props — the value is derivable during render.
Pattern B — Event handler logic inside useEffect:
In each file containing `useEffect(`: read the full body of each useEffect. Flag any useEffect whose body contains `toast`, `router.push`, `router.replace`, `router.refresh`, `showNotification`, `sendEmail`, or `console.log` — regardless of position in the body. These belong in event handlers, not effects.
Pattern C — Missing dependency array:
In each file containing `useEffect(`: verify that every `useEffect(` call has a second argument (dependency array `[...]`). A `useEffect` with only one argument runs on every render and is almost always a bug.
Flag each useEffect call missing the second argument.
Expected: 0 matches for A and C. B requires judgment.

**CHECK D10 — Empty catch blocks and console.log in production**
Pattern A — Empty or near-empty catch blocks:
Grep: `catch\s*\([^)]*\)\s*\{\s*\}|catch\s*\([^)]*\)\s*\{\s*\/\/|catch\s*\([^)]*\)\s*\{\s*console\.log`
Flag: catch blocks that swallow errors silently or log them without recovery or user feedback.
Pattern B — console.log in production:
Grep: `console\.log\(|console\.warn\(|console\.error\(` in `app/` and `lib/` (excluding `__tests__/`, `e2e/`, `.test.ts`).
`console.error` in catch blocks is acceptable only if also returning an error response."

---

## Step 3 — Structural judgment checks (runs in parallel with Step 2)

**Begin immediately after launching the Step 2 agent — do not wait for it.**

**J1 — Over-large components**
Flag components that are:
- Over 300 lines AND have 4+ distinct responsibilities (fetch, state, form handling, display)
- Exhibit "divergent change" — compensation logic AND display logic in the same file
- Exhibit "feature envy" — a component that uses more data/methods from another domain than its own

**J2 — Prop drilling depth**

**J3 — Client/server component boundary placement**

Read `app/(app)/layout.tsx` and the 5 most-visited page files from sitemap.md.

Check 1 — `'use client'` at page/layout level when only a subcomponent needs it:

Check 2 — Context providers placed too high:
If a context Provider wraps `<html>` or `<body>`, check if it can be moved lower — high placement prevents Next.js from optimising static Server Component subtrees.

Check 3 — Server secrets imported into `'use client'` files:
Grep: any `'use client'` file importing from a `lib/` file that accesses `process.env` for non-`NEXT_PUBLIC_` variables. These utilities need an `import 'server-only'` guard or must be split.

Check 4 — Missing `'use server'` on Server Actions:
Flag: each exported async function in a non-API file without `'use server'`.

Flag each issue with: file path, current placement, recommended refactor.

**J4 — lib/ utility consolidation**
Read the `lib/` directory listing. Flag any utilities with overlapping purposes (e.g. two date formatting helpers, two notification builder functions, any type constant or badge-map object defined independently in 2+ component files without being extracted to `lib/`).
Specifically verify: `lib/notification-utils.ts` vs `lib/notification-helpers.ts` — confirm if both exist and flag any responsibility overlap.
Do not re-report overlaps already in `docs/refactoring-backlog.md`.

**J5 — Type definition consolidation**
Read `lib/types.ts` (or equivalent). Flag:
- Types defined inline in component files that are used in 3+ places (should live in `lib/types.ts`)
- Response types that duplicate Supabase-generated types (should extend the generated types instead)
- `interface X extends Y` where Y is never used independently (prefer composition or a union type)

---

## Step 4 — Wait for Step 2 agent, then produce combined report

**Wait for the Step 2 Explore agent to complete before proceeding.**

Cross-check all findings from Step 2 (D1–D10) and Step 3 (J1–J5) against `docs/refactoring-backlog.md`. Exclude any finding already documented.

For remaining findings, apply severity modifiers in this exact order:
1. **Base severity** — assign from the check category using the Severity guide at the bottom of this step.
2. **Debt-density escalation** — if the finding's file/module is in the high-debt zone (3+ open entries in `docs/refactoring-backlog.md`), escalate by one level (Low → Medium, Medium → High, High → Critical). Document: `"Debt-density escalation: N open entries in this module."` Do not escalate above Critical.
3. **Regression risk downgrade** — if the `Regression risk` field is Behavior-adjacent, downgrade the severity by one level from the value produced in step 2. The final severity after both modifiers is what gets written to the backlog.

### Output format

```
## Skill-Dev Audit — [today's date in YYYY-MM-DD format]
### Scope: [N] files from sitemap.md
### Sources: Refactoring.Guru smells taxonomy, typescript-eslint rules, Next.js composition patterns, React "You Might Not Need an Effect"

### Pattern Checks (Explore agent)
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| D1 | Cross-module coupling | N | Medium | ✅/⚠️ |
| D2 | Duplicated color maps | N | Medium | ✅/⚠️ |
| D3 | N+1 fetch patterns | N | High | ✅/⚠️ |
| D4 | Dead exports (sampled — 5 largest files) | N | Low | ✅/⚠️ |
| D5 | Duplicated validation | N | Medium | ✅/⚠️ |
| D6 | Magic strings + numbers | N | Medium | ✅/⚠️ |
| D7 | TODO/FIXME comments | N | Low | ✅/⚠️ |
| D8 | @ts-ignore + any + floating promises | N | High | ✅/⚠️ |
| D9 | useEffect antipatterns | N | Medium | ✅/⚠️ |
| D10 | Empty catch + console.log | N | Medium | ✅/⚠️ |

### Language-Specific Checks (native/backend stacks only)
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| DL1 | Language-specific lint + analysis | N | Medium | ✅/⚠️ |

### Structural Checks
| # | Check | Verdict | Notes |
|---|---|---|---|
| J1 | Over-large components | ✅/⚠️ | |
| J2 | Prop drilling + data clumps | ✅/⚠️ | |
| J3 | Client/server boundary | ✅/⚠️ | |
| J4 | lib/ consolidation | ✅/⚠️ | |
| J5 | Type definition consolidation | ✅/⚠️ | |

### Findings requiring action ([N] total)
[Sorted Critical → High → Medium → Low]
[file:line — check# — final-severity — issue — suggested fix for each]
```

### Backlog decision gate

Present all findings with final severity Medium or above as a numbered decision list, sorted Critical → High → Medium:

```
Found N findings at Medium or above. Which to add to backlog?

[1] [CRITICAL] DEV-? — file:line — one-line description
[2] [HIGH]     DEV-? — file:line — one-line description
[3] [MEDIUM]   DEV-? — file:line — one-line description
...

Reply with numbers to include (e.g. "1 2 4"), "all", or "none".
```

**Wait for explicit user response before writing anything.**

Then write ONLY the approved entries to `docs/refactoring-backlog.md`.
- Check existing entries first to avoid duplicates — assign `DEV-[n]` incrementing from the last DEV entry.
- Add row to the Priority Index table.
- Add full detail section using the format:

```
### [ID] — [Title]
**Skill**: /skill-dev
**Severity**: Critical | High | Medium | Low
**File(s)**: path/to/file.ts:line
**Finding**: concrete description anchored to file:line evidence
**Suggested fix**: smallest behavior-preserving change
**Regression risk**: Behavior-preserving | Behavior-adjacent (see constraint above)
**Debt context**: [N open entries in this module — debt-density escalation applied | No prior debt]
**Added**: [today's date in YYYY-MM-DD format]
```

Each entry **must** include a `Regression risk` field:
- **Behavior-preserving** (pure refactoring — no change to external contracts, UI, DB writes, emails, redirects): proceed at the assigned severity.
- **Behavior-adjacent** (fix touches a path that could affect observable output): downgrade severity by one level AND add the note `"Requires dedicated pipeline block — not a fast-lane fix."`. List the existing automated tests that cover the affected path — if none exist, add `"No coverage — regression risk is unverifiable without adding tests first."` and treat as Critical regardless of check category.
- If the fix cannot be proven behavior-preserving from static analysis alone: default to behavior-adjacent.

### Severity guide

- **Critical**: `@ts-ignore` on a security/data path; N+1 in a hot path (list page or dashboard); floating promise on an auth or data-write event handler
- **High**: `any` in shared lib utilities; dead export in shared lib; empty catch on DB write; unhandled error on async data-write path
- **Medium**: over-large module >300 lines with 4+ responsibilities (J1); magic business-rule numbers (D6); console.log in production (D10); data clumps >3 always-grouped props (J2)
- **Low**: TODO comments; minor coupling; consolidation opportunities; magic enum strings already covered by type definitions; D4 sampled dead exports

---

## Execution notes

- Do NOT make any code changes.
- After producing the report, ask: "Should I implement the High/Critical priority fixes identified?"
