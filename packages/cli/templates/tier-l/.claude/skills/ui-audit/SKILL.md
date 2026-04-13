---
name: ui-audit
description: Audit UI for design token compliance and component adoption. Static grep-based analysis against the sitemap's page and component files.
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:page:<route>|target:role:<role>|target:section:<section>]
allowed-tools: Read, Glob, Grep
---

**Critical constraint**: `docs/sitemap.md` is the authoritative inventory of every page file and key component. Read it first and derive the file target list from it. Do NOT run free-form `grep -r` across all of `app/` or `components/` — scope every check to the files listed in the sitemap.

**Scope boundary**: this skill covers design-token compliance and component adoption only. Accessibility (aria, tabindex, focus, labels, axe-core WCAG scan, APCA contrast) lives in `/accessibility-audit` — run it alongside `/ui-audit` for any UI change.

Static-only skill — no dev server required. Can run concurrently with Playwright-based skills per pipeline.md.

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:<name>` | Restrict to routes whose path contains `<name>` |
| No target argument | Full audit — ALL routes in sitemap.md |

**STRICT PARSING — mandatory**: derive target ONLY from the explicit text in `$ARGUMENTS`. Do NOT infer target from conversation context, recent work, active block names, or project memory. If `$ARGUMENTS` contains no `target:` token → full audit, all routes in sitemap.

Announce at start: `Running ui-audit — scope: [FULL | target resolved to: N pages]`

Apply the resolved target to Steps 1–3 below — include only the matching page and component files.

---

## Step 1 — Read sitemap and build target lists

Read `docs/sitemap.md`. Extract (filtered by target scope from Step 0):

- `detail` pages: routes with `/[id]` in the path
- `form / wizard` pages: routes with Form, wizard, or onboarding components

Output: structured lists A, B, C. Do not proceed to Step 2 until these are complete.

---

## Step 2 — Delegate grep checks to Explore agent

Launch a **single Explore subagent** (model: haiku) with the following instructions and the exact file lists from Step 1. Pass all file paths explicitly — do not ask the agent to discover them.

> **Ripgrep note**: all patterns below are written for ripgrep (the `rg` command). Use `|` (not `\|`) for alternation. Character classes like `[2-9]` work as-is. Use `--multiline` / `-U` only when explicitly noted.

### Instructions for the Explore agent:

"Run all 12 checks below (numbering preserves gaps — checks 11, 13, 14, 16, 17 moved to `/accessibility-audit`). For each check: report the total match count, list every match as `file:line — excerpt`, and state PASS (0 matches) or FAIL (N matches). If a check returns 0 matches, explicitly state '0 matches — PASS'. Do not skip any check.

File scope: use ONLY the page files and component files provided. Do not search outside this list.

---

**CHECK 1 — Grids without responsive prefix** [Severity: High]
Find lines containing `grid-cols-[2-9]` (any column count 2–9) that do NOT also contain at least one of: `sm:grid-cols`, `md:grid-cols`, `lg:grid-cols`, `xl:grid-cols`.
Method: grep for `grid-cols-[2-9]` across all files in scope, then filter out lines that contain any responsive prefix. Report only the lines that survive the filter.
Expected: 0 matches.

**CHECK 2 — Hardcoded blue color tokens** [Severity: High]
Pattern: `bg-blue-|text-blue-|border-blue-`
Exclude: lines starting with `//`, lines containing `focus:`, `ring-`, `via-`, `aria-`
Expected: 0 matches. Any match is a design system violation.

**CHECK 3 — Hardcoded gray on structural containers** [Severity: Medium]
Pattern (ripgrep OR syntax): `bg-gray-[789][0-9]|bg-gray-[89][0-9]{2}|bg-gray-950`
Exclude lines that contain: `dark:`, `hover:`, `border-`, `//`, `focus:`, `to-`, `from-`
Expected: 0 on structural elements. Note: `bg-gray-100` and `bg-gray-200` (light mode badge pairs) are exempt — only flag dark gray values (700+).

**CHECK 4 — Required field asterisks using text-red-500 instead of text-destructive** [Severity: Medium]
Pattern: `text-red-500`
Exclude: lines with `//`, `border-`, `hover:`, `ring-`, `focus:`
Expected: 0 matches. All required-field asterisks must use `text-destructive`.

**CHECK 5 — Duplicate CSS class tokens** [Severity: Low]
Pattern: look for any word repeated twice in the same className string, specifically `dark:[a-z-]+-[0-9]+ dark:[a-z-]+-[0-9]+` where the two tokens are identical.
Flag lines where the same utility class appears twice.
Expected: 0 matches.

**CHECK 6 — Bare empty states (no EmptyState component)** [Severity: High]
Pattern: lines containing `<p` AND (`Nessun` OR `Nessuna`) with a className including `text-center` or `text-muted-foreground`
Exclude: lines containing `EmptyState`, `toast`, `aria-`, `placeholder=`, `title=`
Expected: 0 matches. All empty states must use the EmptyState component.

**CHECK 7 — Back links in detail pages missing block display** [Severity: Low]
Scope: only the 'detail' layout pages from the sitemap.
Pattern: `← Torna` — check that the containing Link has `block` in its className.
Expected: every back link has `block` in className.

**CHECK 8 — Content status badges with hardcoded colors** [Severity: Medium]
Pattern: `bg-green-|bg-yellow-|bg-orange-|text-green-|text-yellow-` on badge/span elements
Expected: 0 matches. All status badges must use semantic tokens or StatusBadge component.

**CHECK 9 — Tab bars missing whitespace-nowrap** [Severity: Medium]
Scope: only the 'tabs' layout pages from the sitemap.
Pattern: check tab link elements (`className=.*tabCls|rounded-lg.*px-4.*py-2`) for presence of `whitespace-nowrap`.
Expected: all tab links have whitespace-nowrap to prevent wrapping on mobile.

**CHECK 10 — Table elements with w-full (PERMANENT RULE violation)** [Severity: Critical]
Pattern: find lines in the scope files that match BOTH of these conditions on the same line:
  - Contains `<Table` (a Table component opening tag)
  - Contains `w-full`
Additionally: find any `<Table` element lines that contain neither `w-auto` nor `w-fit`.
Flag: any `<Table` with `w-full`, and any `<Table` with no explicit width class.
Expected: 0 matches. `<Table>` must always have `w-auto`.

**CHECK 11** — moved to `/accessibility-audit` as A1 (icon-only buttons missing aria-label).

**CHECK 12 — overflow-x-auto on table wrappers (PERMANENT RULE violation)** [Severity: Critical]
Pattern: `overflow-x-auto`
Exclude: lines containing `<pre`, `<code`, `// `, `{/*`
Expected: 0 matches in non-pre containers. Table wrappers must use `overflow-hidden`, not `overflow-x-auto`.

**CHECK 13** — moved to `/accessibility-audit` as A2 (positive tabindex, WCAG 2.4.3).

**CHECK 14** — moved to `/accessibility-audit` as A3 (outline-none without focus-ring compensation).

**CHECK 15 — Deprecated opacity utility syntax (Tailwind v4 breaking change)** [Severity: High]
Pattern: `bg-opacity-|text-opacity-|border-opacity-|divide-opacity-|placeholder-opacity-|ring-opacity-`
Exclude: lines with `//`, `{/*`
Expected: 0 matches. Tailwind v4 removed these utilities. Use slash syntax: `bg-black/50`, `text-foreground/80`, etc.

**CHECK 16** — moved to `/accessibility-audit` as A4 (native `<img>` without alt).

**CHECK 17** — moved to `/accessibility-audit` as A5 (form inputs without accessible labels)."

---

## Step 3 — Supplemental checks (run in main context, not delegated)

These require judgment, not just pattern matching:

Severity: High for routes with DB queries, Medium for static/client-only routes.

**S2 — NotificationBell placement**
Read `components/Sidebar.tsx` and `app/(app)/layout.tsx`.
Verify: NotificationBell appears exactly once in the rendered DOM per viewport (no duplication).
Known issue: `collapsible="offcanvas"` sidebar + `md:hidden` header can cause double rendering.

**S3 — Sign-out button semantic color**
Read `components/Sidebar.tsx` lines containing "Esci" or "sign" or "red".
Verify: uses `bg-destructive` (semantic) not `bg-red-600` (hardcoded).
Expected: `bg-destructive hover:bg-destructive/90`.

**S4** — moved to `/accessibility-audit` as A8 (sidebar/nav trigger keyboard accessibility).

**S5 — w-fit on table container wrappers**
For each file in scope that contains `<Table`, check whether its immediate parent container (Card, div) uses `w-fit`. Files that contain `<Table` but no `w-fit` anywhere → flag.
Expected: all table wrappers use `w-fit` or `w-auto`.

**S6** — moved to `/accessibility-audit` as A6 (bare focus ring without explicit size, WCAG 1.4.11).

**S7** — moved to `/accessibility-audit` as A7 (onClick on non-interactive elements, WCAG 2.1.1).

**S8 — 'use client' placement depth**
Read `app/(app)/layout.tsx`.
Verify: `'use client'` is NOT present at the top of layout.tsx (it is a Server Component by design).
Severity: Medium (performance — prevents RSC streaming).

---

## Step 4 — Produce audit report

Output in this exact format:

```
## UI Audit — [DATE]
### Scope: [N] page files from sitemap.md + [N] component files
### Target: [FULL | target:<value>]

> For accessibility checks (axe-core WCAG scan, APCA contrast, aria/tabindex/label patterns), run `/accessibility-audit`.

### Grep Checks
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| 1 | Grids without responsive prefix | N | High | ✅/❌ |
| 2 | Hardcoded blue tokens | N | High | ✅/❌ |
| 3 | Hardcoded gray structural | N | Medium | ✅/❌ |
| 4 | text-red-500 asterisks | N | Medium | ✅/❌ |
| 5 | Duplicate CSS tokens | N | Low | ✅/❌ |
| 6 | Bare empty states | N | High | ✅/❌ |
| 7 | Back links missing block | N | Low | ✅/❌ |
| 8 | Content status badges hardcoded | N | Medium | ✅/❌ |
| 9 | Tab bars missing whitespace-nowrap | N | Medium | ✅/❌ |
| 10 | Table w-full violation | N | Critical | ✅/❌ |
| 12 | overflow-x-auto on table wrappers | N | Critical | ✅/❌ |
| 15 | Deprecated opacity syntax | N | High | ✅/❌ |

*(Gaps 11, 13, 14, 16, 17 moved to `/accessibility-audit`.)*

### Supplemental Checks
| # | Check | Verdict | Notes |
|---|---|---|---|
| S2 | NotificationBell placement | ✅/❌ | |
| S3 | Sign-out semantic color | ✅/❌ | |
| S5 | Table container w-fit | ✅/❌ | |
| S8 | 'use client' placement depth | ✅/❌ | |

*(Gaps S4, S6, S7 moved to `/accessibility-audit`.)*

### ❌ Failures requiring action ([N] total — by severity)

**Critical ([N])** — fix before Phase 6:
[file:line — check# — excerpt — recommended fix]

**High ([N])** — flag in Phase 6 checklist:
[file:line — check# — excerpt — recommended fix]

**Medium/Low ([N])** — append to docs/refactoring-backlog.md:
[file:line — check# — excerpt — recommended fix]

### ✅ Passing checks ([N] total)
[check numbers with 0 matches confirmed]

### Coverage
Page files checked: N/N from sitemap.md
Component files checked: N
```

If all checks pass: output `UI Audit CLEAN — [DATE]. No violations found.`

---

## Execution notes

- Do NOT make any code changes during this skill. Audit only.
- Do NOT re-read files already in context from Step 1.
- The Explore agent in Step 2 handles all grep work. Do not duplicate searches in the main context.
- **Pipeline integration**: for Critical findings, ask the user: "Vuoi che implementi i fix identificati?" before touching any file. Medium/Low findings go directly to `docs/refactoring-backlog.md` without asking.
- **Concurrent execution**: when invoked from pipeline.md Phase 5d Track A, this skill launches concurrently with the first Playwright-based skill. It is fully static — no dev server required.
- **Complementary skill**: run `/accessibility-audit` alongside `/ui-audit` for any UI change. It owns axe-core WCAG 2.2 scan, APCA contrast, and the static a11y patterns formerly numbered here as CHECK 11/13/14/16/17 and S4/S6/S7.
