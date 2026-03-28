---
name: ui-audit
description: Full UI quality audit. Covers design system token compliance, accessibility (WCAG 2.2 static + axe-core live scan), CSS framework breaking-change detection, keyboard/interaction patterns, form label completeness, empty states, table rules, loading state coverage. Uses docs/sitemap.md as authoritative file inventory. Static mode runs concurrently with Playwright skills; full mode (dev server up) adds axe-core browser scan.
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:page:<route>|target:role:<role>|target:section:<section>]
allowed-tools: mcp__playwright__browser_navigate, mcp__playwright__browser_evaluate
---

You are performing a comprehensive UI quality audit of this project's frontend.

**Critical constraint**: `docs/sitemap.md` is the authoritative inventory of every page file and key component. Read it first and derive the file target list from it. Do NOT run free-form searches across all source directories — scope every check to the files listed in the sitemap.

**Two execution modes**:
- **Static mode** (dev server not running): Steps 1–3 only. Can run concurrently with Playwright-based skills per pipeline.md.
- **Full mode** (dev server running): Steps 1–4 including axe-core browser scan. Must run sequentially (Playwright MCP session shared).

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:page:/some-route` | Restrict scope to that exact route and its key components |
| `target:role:<role-name>` | Restrict to all routes accessible by that role |
| `target:section:<section-name>` | Restrict to routes whose path contains that section name |
| No target argument | Full audit — all routes in sitemap |

Announce at start: `Running ui-audit — scope: [FULL | target resolved to: N pages]`

Apply the resolved target to Steps 1–3 below — include only the matching page and component files.

---

## Step 1 — Read sitemap and build target lists

Read `docs/sitemap.md`. Extract (filtered by target scope from Step 0):

**A — Page files**: every path in the "Page file" column.

**B — Component groups by layout type** (derived from the "Key components" column — do not hardcode):
- `full-list` pages: routes with DataTable or list-style key components
- `detail` pages: routes with `/[id]` in the path
- `form / wizard` pages: routes with Form, wizard, or onboarding components
- `tabs` pages: routes with Tabs in key components
- `dashboard`: the root index page
- `feed`: content/activity routes
- `calendar / grid` pages: routes with calendar or grid components in key components

**C — Key component files**: for each page, note the "Key components" column and map to actual files under your components directory. These are the component files to include in grep checks.

Output: structured lists A, B, C. Do not proceed to Step 2 until these are complete.

---

## Step 2 — Delegate grep checks to Explore agent

Launch a **single Explore subagent** (model: haiku) with the following instructions and the exact file lists from Step 1. Pass all file paths explicitly — do not ask the agent to discover them.

> **Ripgrep note**: all patterns below are written for ripgrep (the `rg` command). Use `|` (not `\|`) for alternation. Character classes like `[2-9]` work as-is. Use `--multiline` / `-U` only when explicitly noted.

### Instructions for the Explore agent:

"Run all 17 checks below. For each check: report the total match count, list every match as `file:line — excerpt`, and state PASS (0 matches) or FAIL (N matches). If a check returns 0 matches, explicitly state '0 matches — PASS'. Do not skip any check.

File scope: use ONLY the page files and component files provided. Do not search outside this list.

---

**CHECK 1 — Grids without responsive prefix** [Severity: High]
Find lines containing `grid-cols-[2-9]` (any column count 2–9) that do NOT also contain at least one of: `sm:grid-cols`, `md:grid-cols`, `lg:grid-cols`, `xl:grid-cols`.
Method: grep for `grid-cols-[2-9]` across all files in scope, then filter out lines that contain any responsive prefix. Report only the lines that survive the filter.
Expected: 0 matches.

**CHECK 2 — Hardcoded color values instead of design token variables** [Severity: High]
Pattern: `bg-blue-|text-blue-|border-blue-`
Exclude: lines starting with `//`, lines containing `focus:`, `ring-`, `via-`, `aria-`
Expected: 0 matches. Any match is a design system violation — use your [DESIGN_SYSTEM_NAME] semantic color tokens instead.

**CHECK 3 — Hardcoded gray on structural containers** [Severity: Medium]
Pattern (ripgrep OR syntax): `bg-gray-[789][0-9]|bg-gray-[89][0-9]{2}|bg-gray-950`
Exclude lines that contain: `dark:`, `hover:`, `border-`, `//`, `focus:`, `to-`, `from-`
Expected: 0 on structural elements. Note: `bg-gray-100` and `bg-gray-200` (light mode badge pairs) are exempt — only flag dark gray values (700+).

**CHECK 4 — Required field asterisks using hardcoded color instead of semantic token** [Severity: Medium]
Pattern: `text-red-500`
Exclude: lines with `//`, `border-`, `hover:`, `ring-`, `focus:`
Expected: 0 matches. All required-field asterisks must use your design system's destructive/error semantic token (e.g. `text-destructive`).

**CHECK 5 — Duplicate CSS class tokens** [Severity: Low]
Pattern: look for any word repeated twice in the same className string, specifically `dark:[a-z-]+-[0-9]+ dark:[a-z-]+-[0-9]+` where the two tokens are identical.
Flag lines where the same utility class appears twice.
Expected: 0 matches.

**CHECK 6 — Bare empty states (no EmptyState component)** [Severity: High]
Pattern: lines containing `<p` AND a "no items found" / "empty" message with a className including `text-center` or `text-muted-foreground`
Exclude: lines containing `EmptyState`, `toast`, `aria-`, `placeholder=`, `title=`
Expected: 0 matches. All empty states must use a shared EmptyState component.

**CHECK 7 — Back links in detail pages missing block display** [Severity: Low]
Scope: only the 'detail' layout pages from the sitemap.
Pattern: back navigation links — check that the containing Link has `block` in its className.
Expected: every back link has `block` in className.

**CHECK 8 — Status badges with hardcoded colors** [Severity: Medium]
Scope: only the 'detail' and 'feed' layout pages.
Pattern: `bg-green-|bg-yellow-|bg-orange-|text-green-|text-yellow-` on badge/span elements
Expected: 0 matches. All status badges must use semantic tokens or a shared StatusBadge component.

**CHECK 9 — Tab bars missing whitespace-nowrap** [Severity: Medium]
Scope: only the 'tabs' layout pages from the sitemap.
Pattern: check tab link elements for presence of `whitespace-nowrap`.
Expected: all tab links have whitespace-nowrap to prevent wrapping on mobile.

**CHECK 10 — Table elements with w-full (layout violation)** [Severity: Critical]
Pattern: find lines in the scope files that match BOTH of these conditions on the same line:
  - Contains `<Table` (a Table component opening tag)
  - Contains `w-full`
Additionally: find any `<Table` element lines that contain neither `w-auto` nor `w-fit`.
Flag: any `<Table` with `w-full`, and any `<Table` with no explicit width class.
Expected: 0 matches. `<Table>` must always have `w-auto`.

**CHECK 11 — Icon-only buttons missing aria-label** [Severity: Critical]
Pattern: lines containing `size="icon"` or `size={'icon'}` that do NOT also contain `aria-label`
Method: grep for `size="icon"|size=\{'icon'\}`, then filter to keep only lines that do NOT contain `aria-label`.
Also check: `IconButton` and `Button` with only an icon child (no visible text) — grep for `<Button[^>]*>\s*<[A-Z][a-zA-Z]+Icon` or `<Button[^>]*>\s*{[^}]*Icon` without `aria-label` on the same or preceding line.
Expected: 0 matches. Icon-only buttons must always have aria-label.

**CHECK 12 — overflow-x-auto on table wrappers (layout violation)** [Severity: Critical]
Pattern: `overflow-x-auto`
Exclude: lines containing `<pre`, `<code`, `// `, `{/*`
Expected: 0 matches in non-pre containers. Table wrappers must use `overflow-hidden`, not `overflow-x-auto`.

**CHECK 13 — Positive tabindex (WCAG 2.4.3 violation)** [Severity: Critical]
Pattern: `tabIndex=[1-9]|tabindex="[1-9]`
Exclude: lines with `//`, `{/*`
Expected: 0 matches. Positive tabindex breaks natural tab order. Only `tabIndex={0}` or `tabIndex={-1}` are valid.

**CHECK 14 — outline-none without focus ring (forced-color regression)** [Severity: High]
Pattern: lines containing `outline-none` that do NOT also contain at least one of: `focus-visible:ring`, `focus:ring`, `focus-visible:outline`, `focus:outline`
Method: grep for `outline-none`, then filter out lines that also contain any of the above focus restoration patterns.
Expected: 0 matches. `outline-none` strips the focus indicator in forced-color / high-contrast mode. Replace with `outline-hidden` for decorative suppression, or add explicit `focus-visible:ring-*` compensation.
Note: this is a framework-version-specific concern — verify against your CSS framework's changelog for your version.

**CHECK 15 — Deprecated opacity utility syntax** [Severity: High]
Pattern: `bg-opacity-|text-opacity-|border-opacity-|divide-opacity-|placeholder-opacity-|ring-opacity-`
Exclude: lines with `//`, `{/*`
Expected: 0 matches. These utilities were removed in Tailwind v4. Use slash syntax: `bg-black/50`, `text-foreground/80`, etc.
Note: framework-version-specific — verify against your CSS framework's changelog.

**CHECK 16 — Native <img> tag** [Severity: Medium]
Pattern: `<img\s`
Exclude: lines containing `//`, `{/*`, `alt=`, `.svg`, `data:`, `role="presentation"`
Flag: any `<img` that does not appear to be a decorative/SVG use.
Expected: 0 matches. All raster images should use your framework's optimized image component for optimization and LCP performance.

**CHECK 17 — Form inputs without accessible labels** [Severity: Critical]
Pattern: lines containing `<Input|<Textarea|<Select` (UI component library form components) that do NOT also contain `aria-label` or `aria-labelledby` or `id=` (indicating a Label htmlFor association is possible).
Method: for each match, check within ±5 lines for a `<Label` containing `htmlFor` matching the input's `id`. If no `<Label htmlFor` and no `aria-label`/`aria-labelledby` on the component line: flag it.
Note: inputs inside form field wrappers (e.g. react-hook-form `<FormField>`) with a sibling label component are valid — exclude lines inside such wrappers.
Expected: 0 matches. Every form control must have an accessible name."

---

## Step 3 — Supplemental checks (run in main context, not delegated)

These require judgment, not just pattern matching:

**S1 — Loading state coverage**
From the sitemap "loading" column, identify any route marked as missing a loading state.
Cross-reference with your project's loading boundary file conventions (e.g. framework-specific loading state files — check your framework's routing docs for the exact convention).
Flag any route with significant data loading that lacks a loading state.
Severity: High for routes with DB queries, Medium for static/client-only routes.

**S2 — Primary navigation component accessibility**
Read your main layout and navigation component files.
Verify: the primary navigation element (sidebar, nav bar, drawer) appears exactly once in the rendered DOM per viewport (no duplication across breakpoints).
Known issue pattern: collapsible sidebars with breakpoint visibility classes can cause double rendering if not properly guarded.

**S3 — Responsive navigation trigger accessibility**
Read your app layout file.
Verify: the navigation trigger (hamburger, sidebar open button) is reachable on BOTH mobile (in mobile header) and desktop (always accessible, not hidden when nav is open).
Flag if trigger is inside a mobile-only wrapper with no desktop alternative.

**S4 — Bare `ring` on focus styles** [Severity: Medium]
Grep the scoped files for `focus:ring[^-]|focus-visible:ring[^-]` (bare `ring` without an explicit size modifier like `ring-2`).
A bare `focus-visible:ring` that relies on the framework default may be too thin to meet WCAG 1.4.11 (3:1 non-text contrast for focus indicators).
Flag any bare `ring` usage on interactive elements. Recommend an explicit size modifier like `ring-2` or `ring-[3px]`.
Note: framework-version-specific — verify against your CSS framework's changelog.

**S5 — onClick on non-interactive elements**
Grep the scoped files for `<div.*onClick|<span.*onClick|<li.*onClick`.
For each match, verify the element also has `role="button"` (or equivalent) AND `onKeyDown` (or `onKeyPress`).
Missing either = keyboard users cannot activate the element (WCAG 2.1.1).
Exclude: lines inside `{/* ... */}` comments, or where the element is a component library `asChild` wrapper.
Severity: Critical if the element is a primary action, High otherwise.

**S6 — Table container width wrappers**
For each file in scope that contains `<Table`, check whether its immediate parent container uses `w-fit` or `w-auto`. Files that contain `<Table` but no `w-fit` or `w-auto` anywhere → flag.
Expected: all table wrappers use `w-fit` or `w-auto`.

**S7 — Focus ring visibility on interactive components**
Check the first 3 key components from the sitemap for the target scope: if any primary interactive component has `outline-none` or `outline-0` without a compensating `focus-visible:ring-*`, flag it.
Severity: High (WCAG 2.4.7).

**S8 — Client boundary placement depth**
Read your app layout file.
Verify: client-side directive (e.g. `'use client'` in React/Next.js) is NOT present at the top of layout-level files (they should be Server Components by design).
Then check the first 3 key components from the sitemap for the target scope: if any page-level component carries a client directive AND contains no hooks or browser APIs, flag it — the client boundary is unnecessarily high.
Severity: Medium (performance — prevents server-side streaming/rendering benefits).

---

## Step 4 — Browser accessibility scan (conditional — Playwright MCP)

**First: check if dev server is reachable.**
Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
- If response is NOT 200 or 302: output `Browser scan skipped — dev server not running on localhost:3000. Re-run after starting the dev server for full axe-core coverage.` Then skip to Step 5.
- If response is 200 or 302: proceed.

**Select 3 representative pages** from the target scope (resolved from sitemap.md):
1. The dashboard or root route (`/`)
2. One data-list page (first `full-list` route in scope)
3. One form/write page (first `form` or `wizard` route in scope, or a detail page with edit capability)

**For each page, execute the following sequence:**

```
1. mcp__playwright__browser_navigate to http://localhost:3000/<route>
   (If redirected to a login page: authenticate first using your project's test credentials,
    then navigate to the target route)

2. mcp__playwright__browser_evaluate:
   // Inject axe-core from CDN
   await new Promise((resolve, reject) => {
     const s = document.createElement('script');
     s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js';
     s.onload = resolve;
     s.onerror = reject;
     document.head.appendChild(s);
   });
   // Run WCAG 2a / 2aa / 2.1aa / 2.2aa tags
   const results = await axe.run(document, {
     runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
     reporter: 'v2'
   });
   return {
     violations: results.violations.map(v => ({
       id: v.id,
       impact: v.impact,
       description: v.description,
       nodes: v.nodes.length,
       example: v.nodes[0]?.html?.slice(0, 120)
     })),
     passes: results.passes.length,
     incomplete: results.incomplete.length
   };
```

3. Record violations grouped by impact: critical → serious → moderate → minor.
```

**Severity mapping for pipeline.md**:
- `critical` / `serious` axe violations → **Critical** (fix before Phase 6)
- `moderate` axe violations → **High** (flag in Phase 6 checklist)
- `minor` axe violations → **Medium** (append to `docs/refactoring-backlog.md` with `UI-[n]` prefix)

**Known false-positives to suppress** (document, not fix):
- `color-contrast` on muted/secondary text within portal overlay elements — accessibility tooling measures the portal layer, not the semantic background. Verify manually.
- `aria-hidden-focus` inside closed modal/sheet components — component libraries like Radix manage this via `inert` attribute in recent versions. Verify your library version before flagging.

---

## Step 5 — Produce audit report

Output in this exact format:

```
## UI Audit — [DATE]
### Scope: [N] page files from sitemap.md + [N] component files
### Target: [FULL | target:<value>]
### Mode: [Static | Full (axe-core scan included)]

### Grep Checks
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| 1 | Grids without responsive prefix | N | High | PASS/FAIL |
| 2 | Hardcoded color values (non-token) | N | High | PASS/FAIL |
| 3 | Hardcoded gray structural | N | Medium | PASS/FAIL |
| 4 | Hardcoded error color on required fields | N | Medium | PASS/FAIL |
| 5 | Duplicate CSS tokens | N | Low | PASS/FAIL |
| 6 | Bare empty states | N | High | PASS/FAIL |
| 7 | Back links missing block | N | Low | PASS/FAIL |
| 8 | Status badges hardcoded colors | N | Medium | PASS/FAIL |
| 9 | Tab bars missing whitespace-nowrap | N | Medium | PASS/FAIL |
| 10 | Table w-full violation | N | Critical | PASS/FAIL |
| 11 | Icon buttons missing aria-label | N | Critical | PASS/FAIL |
| 12 | overflow-x-auto on table wrappers | N | Critical | PASS/FAIL |
| 13 | Positive tabindex | N | Critical | PASS/FAIL |
| 14 | outline-none without focus ring | N | High | PASS/FAIL |
| 15 | Deprecated opacity syntax | N | High | PASS/FAIL |
| 16 | Native img tag | N | Medium | PASS/FAIL |
| 17 | Form inputs without labels | N | Critical | PASS/FAIL |

### Supplemental Checks
| # | Check | Verdict | Notes |
|---|---|---|---|
| S1 | Loading state coverage | PASS/FAIL | [missing routes if any] |
| S2 | Primary nav component duplication | PASS/FAIL | |
| S3 | Nav trigger accessibility | PASS/FAIL | |
| S4 | Bare ring on focus styles | PASS/FAIL | |
| S5 | onClick on non-interactive elements | PASS/FAIL | |
| S6 | Table container width wrappers | PASS/FAIL | |
| S7 | Focus ring visibility | PASS/FAIL | |
| S8 | Client boundary placement depth | PASS/FAIL | |

### Browser Accessibility Scan (axe-core)
[Only if Step 4 ran — otherwise: "Skipped — dev server not running"]
| Page | Critical | Serious | Moderate | Minor | Passes |
|---|---|---|---|---|---|
| / | N | N | N | N | N |
| /[list-page] | N | N | N | N | N |
| /[form-page] | N | N | N | N | N |

Top violations:
[id — description — N nodes — example HTML]

### Failures requiring action ([N] total — by severity)

**Critical ([N])** — fix before Phase 6:
[file:line — check# — excerpt — recommended fix]

**High ([N])** — flag in Phase 6 checklist:
[file:line — check# — excerpt — recommended fix]

**Medium/Low ([N])** — append to docs/refactoring-backlog.md:
[file:line — check# — excerpt — recommended fix]

### Passing checks ([N] total)
[check numbers with 0 matches confirmed]

### Coverage
Page files checked: N/N from sitemap.md
Component files checked: N
Axe-core pages scanned: N (or: skipped)
```

If all checks pass: output `UI Audit CLEAN — [DATE]. No violations found.`

---

## Execution notes

- Do NOT make any code changes during this skill. Audit only.
- Do NOT re-read files already in context from Step 1.
- The Explore agent in Step 2 handles all grep work. Do not duplicate searches in the main context.
- If `docs/sitemap.md` is not present, ask the user to create it or point to the equivalent route inventory document for this project.
- **Pipeline integration**: for Critical findings, ask the user: "Do you want me to implement the identified fixes?" before touching any file. Medium/Low findings go directly to `docs/refactoring-backlog.md` without asking.
- **Concurrent execution**: when invoked from pipeline.md Phase 5d, this skill runs concurrently with the first Playwright-based skill ONLY in Static mode (Step 4 skipped). If the dev server is running and Step 4 executes, the Playwright MCP session is in use — do not overlap.
- **axe-core false positives**: document suppressed false positives explicitly in the report. Do not flag known component-library-managed patterns (inert modal children, portal color-contrast measurements) as violations without manual verification.
- **Framework-version-specific checks** (14, 15, S4): verify against your CSS framework's changelog before treating as failures. These are written for Tailwind v4 conventions but the underlying WCAG principles apply universally.
