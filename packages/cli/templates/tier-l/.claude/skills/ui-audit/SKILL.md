---
name: ui-audit
description: Audit UI for design token compliance and component adoption. Static grep-based analysis against the sitemap's page and component files.
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:page:<route>|target:role:<role>|target:section:<section>]
allowed-tools: Read, Glob, Grep
---

**Critical constraint**: `[SITEMAP_OR_ROUTE_LIST]` is the authoritative inventory of every page file and key component. Read it first and derive the file target list from it. Do NOT run free-form `grep -r` across source directories — scope every check to the files listed in the sitemap.

**Scope boundary**: this skill covers design-token compliance and component adoption only. Accessibility (aria, tabindex, focus, labels, axe-core WCAG scan, APCA contrast) lives in `/accessibility-audit` — run it alongside `/ui-audit` for any UI change.

Static-only skill — no dev server required. Can run concurrently with browser-based skills per pipeline.md.

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:<name>` | Restrict to routes whose path contains `<name>` |
| No target argument | Full audit — ALL routes in `[SITEMAP_OR_ROUTE_LIST]` |

**STRICT PARSING — mandatory**: derive target ONLY from the explicit text in `$ARGUMENTS`. Do NOT infer target from conversation context, recent work, active block names, or project memory. If `$ARGUMENTS` contains no `target:` token → full audit, all routes.

Announce at start: `Running ui-audit — scope: [FULL | target resolved to: N pages]`

Apply the resolved target to Steps 1–3 below — include only the matching page and component files.

---

## Step 1 — Read sitemap and build target lists

Read `[SITEMAP_OR_ROUTE_LIST]`. Extract (filtered by target scope from Step 0):

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

**CHECK 1 — Multi-column layouts without responsive breakpoints** [Severity: High]
Find elements using a multi-column grid or flexbox layout (2+ columns) that do NOT include a responsive breakpoint.
Adapt the grep pattern to your styling approach:
- Utility CSS (Tailwind): `grid-cols-[2-9]` without `sm:grid-cols`, `md:grid-cols`, etc.
- CSS modules / styled-components: look for `grid-template-columns` with fixed column count and no `@media` query in the same rule
- Inline styles: `gridTemplateColumns` with hardcoded value
Expected: 0 matches — all multi-column layouts should have responsive breakpoints.

**CHECK 2 — Hardcoded color values instead of design tokens** [Severity: High]
Find elements using hardcoded color values instead of the design system's semantic tokens.
Adapt the grep pattern to your styling approach:
- Utility CSS (Tailwind): `bg-blue-|text-blue-|border-blue-|bg-red-|text-red-` (raw color scale instead of semantic tokens like `bg-primary`, `text-destructive`)
- CSS modules: `color: #[0-9a-f]|background: #[0-9a-f]` (hex literals instead of `var(--color-primary)`)
- Styled-components: hardcoded hex/rgb values instead of theme tokens
Exclude: focus/hover states, comments, gradient stops
Expected: 0 matches. All color usage should go through design system tokens.

**CHECK 3 — Hardcoded dark colors on structural containers** [Severity: Medium]
Find structural containers (cards, panels, sections) using hardcoded dark color values instead of semantic surface tokens.
Adapt the pattern to your styling approach — the goal is to find containers with hardcoded dark backgrounds that will break in light/dark mode switching.
Expected: 0 on structural elements.

**CHECK 4 — Error/required indicators using hardcoded color** [Severity: Medium]
Find required-field asterisks or error indicators using hardcoded color values instead of the design system's semantic error/destructive token.
Adapt the pattern to your styling approach (e.g. hardcoded red instead of semantic `destructive`/`error` token).
Expected: 0 matches. All error indicators must use semantic tokens.

**CHECK 5 — Duplicate style tokens** [Severity: Low]
Find lines where the same style class, utility, or token appears twice in the same element declaration.
Expected: 0 matches.

**CHECK 6 — Bare empty states (no shared EmptyState component)** [Severity: High]
Pattern: lines containing empty-state messages (e.g. "No records", "Nothing found", "No results") rendered as bare `<p>` or `<div>` elements with centered text styling.
Exclude: lines using a dedicated EmptyState component, toast, or placeholder attributes.
Expected: 0 matches. All empty states must use a dedicated shared component for visual consistency.

**CHECK 7 — Back links in detail pages missing proper display** [Severity: Low]
Scope: only the 'detail' layout pages from the sitemap.
Pattern: back navigation links (e.g. `← Back`, `← Return`) — check that the link renders as a block element for proper touch target sizing.
Expected: every back link is a block-level element.

**CHECK 8 — Status badges with hardcoded colors** [Severity: Medium]
Find status badge/tag/chip elements using hardcoded color values instead of semantic tokens or a shared StatusBadge component.
Expected: 0 matches. All status indicators must use semantic tokens or a centralized badge component.

**CHECK 9 — Tab bars missing text wrapping prevention** [Severity: Medium]
Scope: only tab/navigation bar layouts from the sitemap.
Pattern: check tab link elements for presence of no-wrap styling (e.g. `whitespace-nowrap`, `white-space: nowrap`).
Expected: all tab links prevent text wrapping for mobile overflow behavior.

**CHECK 10 — Table elements with full-width styling** [Severity: Critical]
Find table component instances that use full-width styling (e.g. `w-full`, `width: 100%`).
Also flag table instances with no explicit width constraint.
Expected: 0 matches. Tables should use content-fit or auto width, not full-width — full-width tables cause horizontal overflow issues.

**CHECK 11** — moved to `/accessibility-audit` as A1 (icon-only buttons missing aria-label).

**CHECK 12 — Horizontal overflow on table wrappers** [Severity: Critical]
Find table wrapper elements using `overflow-x-auto` or `overflow-x: auto`.
Exclude: code blocks (`<pre`, `<code`), comments
Expected: 0 matches in non-code containers. Table wrappers should use `overflow-hidden` to prevent layout shifts.

**CHECK 13** — moved to `/accessibility-audit` as A2 (positive tabindex, WCAG 2.4.3).

**CHECK 14** — moved to `/accessibility-audit` as A3 (outline-none without focus-ring compensation).

**CHECK 15 — Deprecated or legacy styling syntax** [Severity: High]
Find usage of deprecated styling APIs or syntax that will break in newer versions of the design system / CSS framework.
Adapt the pattern to your styling approach:
- Tailwind: `bg-opacity-|text-opacity-|border-opacity-` (removed in v4 — use slash syntax: `bg-black/50`)
- CSS: `-webkit-` prefixed properties that have unprefixed equivalents
- Styled-components: `attrs` patterns deprecated in v6
Expected: 0 matches.

**CHECK 16** — moved to `/accessibility-audit` as A4 (native `<img>` without alt).

**CHECK 17** — moved to `/accessibility-audit` as A5 (form inputs without accessible labels)."

---

## Step 3 — Supplemental checks (run in main context, not delegated)

These require judgment, not just pattern matching:

Severity: High for routes with DB queries, Medium for static/client-only routes.

**S2 — NotificationBell placement**
Read sidebar/navigation and layout components.
Verify: notification indicator appears exactly once in the rendered DOM per viewport (no duplication).
Known issue: collapsible sidebar + responsive header can cause double rendering.

**S3 — Sign-out button semantic color**
Read sidebar/navigation component lines containing "sign out" or "logout".
Verify: uses semantic destructive/danger token, not hardcoded color values.
Expected: semantic destructive token with hover variant.

**S4** — moved to `/accessibility-audit` as A8 (sidebar/nav trigger keyboard accessibility).

**S5 — Content-fit width on table container wrappers**
For each file in scope that contains a table component, check whether its immediate parent container uses content-fit width (e.g. `w-fit`, `width: fit-content`). Files with a table but no width constraint on the wrapper → flag.
Expected: all table wrappers use content-fit or auto width.

**S6** — moved to `/accessibility-audit` as A6 (bare focus ring without explicit size, WCAG 1.4.11).

**S7** — moved to `/accessibility-audit` as A7 (onClick on non-interactive elements, WCAG 2.1.1).

**S8 — Client-side boundary placement depth** *(frameworks with server/client split only — e.g. Next.js, Nuxt, SvelteKit. Skip for SPAs and non-SSR projects.)*
Read the main layout file.
Verify: client-side directive is NOT present at the root layout level (it should remain a server component by design).
Severity: Medium (performance — prevents server rendering optimization).

---

## Step 4 — Produce audit report

Output in this exact format:

```
## UI Audit — [DATE]
### Scope: [N] page files from [SITEMAP_OR_ROUTE_LIST] + [N] component files
### Target: [FULL | target:<value>]

> For accessibility checks (axe-core WCAG scan, APCA contrast, aria/tabindex/label patterns), run `/accessibility-audit`.

### Grep Checks
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| 1 | Multi-column without responsive breakpoints | N | High | ✅/❌ |
| 2 | Hardcoded colors instead of tokens | N | High | ✅/❌ |
| 3 | Hardcoded dark structural colors | N | Medium | ✅/❌ |
| 4 | Error indicators with hardcoded color | N | Medium | ✅/❌ |
| 5 | Duplicate style tokens | N | Low | ✅/❌ |
| 6 | Bare empty states | N | High | ✅/❌ |
| 7 | Back links missing block display | N | Low | ✅/❌ |
| 8 | Status badges with hardcoded colors | N | Medium | ✅/❌ |
| 9 | Tab bars missing no-wrap | N | Medium | ✅/❌ |
| 10 | Table full-width violation | N | Critical | ✅/❌ |
| 12 | Horizontal overflow on table wrappers | N | Critical | ✅/❌ |
| 15 | Deprecated/legacy styling syntax | N | High | ✅/❌ |

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
Page files checked: N/N from [SITEMAP_OR_ROUTE_LIST]
Component files checked: N
```

If all checks pass: output `UI Audit CLEAN — [DATE]. No violations found.`

---

## Execution notes

- Do NOT make any code changes during this skill. Audit only.
- Do NOT re-read files already in context from Step 1.
- The Explore agent in Step 2 handles all grep work. Do not duplicate searches in the main context.
- **Pipeline integration**: for Critical findings, ask the user: "Should I implement the identified fixes?" before touching any file. Medium/Low findings go directly to `docs/refactoring-backlog.md` without asking.
- **Concurrent execution**: when invoked from pipeline.md Phase 5d Track A, this skill launches concurrently with the first browser-based skill. It is fully static — no dev server required.
- **Complementary skill**: run `/accessibility-audit` alongside `/ui-audit` for any UI change. It owns axe-core WCAG 2.2 scan, APCA contrast, and the static a11y patterns formerly numbered here as CHECK 11/13/14/16/17 and S4/S6/S7.
