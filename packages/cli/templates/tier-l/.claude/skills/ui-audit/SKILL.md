---
name: ui-audit
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:page:<route>|target:role:<role>|target:section:<section>]
allowed-tools: mcp__playwright__browser_navigate, mcp__playwright__browser_evaluate
---

**Critical constraint**: `docs/sitemap.md` is the authoritative inventory of every page file and key component. Read it first and derive the file target list from it. Do NOT run free-form `grep -r` across all of `app/` or `components/` — scope every check to the files listed in the sitemap.

**Two execution modes**:
- **Static mode** (dev server not running): Steps 1–3 only. Can run concurrently with Playwright-based skills per pipeline.md.
- **Full mode** (dev server running): Steps 1–4 including axe-core browser scan. Must run sequentially (Playwright MCP session shared).

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

"Run all 17 checks below. For each check: report the total match count, list every match as `file:line — excerpt`, and state PASS (0 matches) or FAIL (N matches). If a check returns 0 matches, explicitly state '0 matches — PASS'. Do not skip any check.

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

**CHECK 11 — Icon-only buttons missing aria-label** [Severity: Critical]
Pattern: lines containing `size="icon"` or `size={'icon'}` that do NOT also contain `aria-label`
Method: grep for `size="icon"|size=\{'icon'\}`, then filter to keep only lines that do NOT contain `aria-label`.
Also check: `IconButton` and `Button` with only an icon child (no visible text) — grep for `<Button[^>]*>\s*<[A-Z][a-zA-Z]+Icon` or `<Button[^>]*>\s*{[^}]*Icon` without `aria-label` on the same or preceding line.
Expected: 0 matches. Icon-only buttons must always have aria-label.

**CHECK 12 — overflow-x-auto on table wrappers (PERMANENT RULE violation)** [Severity: Critical]
Pattern: `overflow-x-auto`
Exclude: lines containing `<pre`, `<code`, `// `, `{/*`
Expected: 0 matches in non-pre containers. Table wrappers must use `overflow-hidden`, not `overflow-x-auto`.

**CHECK 13 — Positive tabindex (WCAG 2.4.3 violation)** [Severity: Critical]
Pattern: `tabIndex=[1-9]|tabindex="[1-9]`
Exclude: lines with `//`, `{/*`
Expected: 0 matches. Positive tabindex breaks natural tab order. Only `tabIndex={0}` or `tabIndex={-1}` are valid.

**CHECK 14 — outline-none without focus ring (Tailwind v4 forced-color regression)** [Severity: High]
Pattern: lines containing `outline-none` that do NOT also contain at least one of: `focus-visible:ring`, `focus:ring`, `focus-visible:outline`, `focus:outline`
Method: grep for `outline-none`, then filter out lines that also contain any of the above focus restoration patterns.
Expected: 0 matches. In Tailwind v4, `outline-none` strips the focus indicator in forced-color / high-contrast mode. Replace with `outline-hidden` for decorative suppression, or add explicit `focus-visible:ring-*` compensation.

**CHECK 15 — Deprecated opacity utility syntax (Tailwind v4 breaking change)** [Severity: High]
Pattern: `bg-opacity-|text-opacity-|border-opacity-|divide-opacity-|placeholder-opacity-|ring-opacity-`
Exclude: lines with `//`, `{/*`
Expected: 0 matches. Tailwind v4 removed these utilities. Use slash syntax: `bg-black/50`, `text-foreground/80`, etc.

**CHECK 16 — Native <img> tag (use Next.js <Image>)** [Severity: Medium]
Pattern: `<img\s`
Exclude: lines containing `//`, `{/*`, `alt=`, `.svg`, `data:`, `role="presentation"`
Flag: any `<img` that does not appear to be a decorative/SVG use.
Expected: 0 matches. All raster images must use `<Image>` from `next/image` for optimization and LCP.

**CHECK 17 — Form inputs without accessible labels** [Severity: Critical]
Method: for each match, check within ±5 lines for a `<Label` containing `htmlFor` matching the input's `id`. If no `<Label htmlFor` and no `aria-label`/`aria-labelledby` on the component line: flag it.
Note: inputs inside `<FormField>` (react-hook-form pattern) with a sibling `<FormLabel>` are valid — exclude lines inside a `<FormField>` wrapper.
Expected: 0 matches. Every form control must have an accessible name."

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

**S4 — Responsive sidebar trigger accessibility**
Read `app/(app)/layout.tsx`.
Verify: SidebarTrigger is reachable on BOTH mobile (in mobile header) and desktop (always accessible, not hidden when sidebar is open).
Flag if trigger is inside an `md:hidden` wrapper with no desktop alternative.

**S5 — w-fit on table container wrappers**
For each file in scope that contains `<Table`, check whether its immediate parent container (Card, div) uses `w-fit`. Files that contain `<Table` but no `w-fit` anywhere → flag.
Expected: all table wrappers use `w-fit` or `w-auto`.

**S6 — Tailwind v4 bare `ring` on focus styles**
Grep the scoped files for `focus:ring[^-]|focus-visible:ring[^-]` (bare `ring` without an explicit size modifier like `ring-2`).
In Tailwind v4, the default `ring` changed from 3px to 1px. A bare `focus-visible:ring` that was relying on the 3px default is now too thin to meet WCAG 1.4.11 (3:1 non-text contrast for focus indicators).
Flag any bare `ring` usage on interactive elements. Recommend `ring-2` or `ring-[3px]` explicitly.
Severity: Medium.

**S7 — onClick on non-interactive elements**
Grep the scoped files for `<div.*onClick|<span.*onClick|<li.*onClick`.
For each match, verify the element also has `role="button"` (or equivalent) AND `onKeyDown` (or `onKeyPress`).
Missing either = keyboard users cannot activate the element (WCAG 2.1.1).
Exclude: lines inside `{/* ... */}` comments, or where the element is a Radix `asChild` wrapper.
Severity: Critical if the element is a primary action, High otherwise.

**S8 — 'use client' placement depth**
Read `app/(app)/layout.tsx`.
Verify: `'use client'` is NOT present at the top of layout.tsx (it is a Server Component by design).
Severity: Medium (performance — prevents RSC streaming).

---

## Step 4 — Browser accessibility scan (conditional — Playwright MCP)

**First: check if dev server is reachable.**
Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
- If response is NOT 200 or 302: output `⚠️ Browser scan skipped — dev server not running on localhost:3000. Re-run after starting npm run dev for full axe-core coverage.` Then skip to Step 5.
- If response is 200 or 302: proceed.

**Select 3 representative pages** from the target scope (resolved from sitemap.md):
1. The dashboard or root route (`/`)
2. One data-list page (first `full-list` route in scope)
3. One form/write page (first `form` or `wizard` route in scope, or a detail page with edit capability)

**For each page, execute the following sequence:**

```
1. mcp__playwright__browser_navigate to http://localhost:3000/<route>
   (If redirected to /login: read test account credentials from the "Test accounts" section

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
- `color-contrast` on `text-muted-foreground` within Radix Portal overlay — axe measures the portal layer, not the semantic background. Verify manually.
- `aria-hidden-focus` inside closed Dialog/Sheet — Radix manages this via `inert` attribute in v1.1+. Verify version before flagging.

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
| 11 | Icon buttons missing aria-label | N | Critical | ✅/❌ |
| 12 | overflow-x-auto on table wrappers | N | Critical | ✅/❌ |
| 13 | Positive tabindex | N | Critical | ✅/❌ |
| 14 | outline-none without focus ring | N | High | ✅/❌ |
| 15 | Deprecated opacity syntax | N | High | ✅/❌ |
| 16 | Native <img> tag | N | Medium | ✅/❌ |
| 17 | Form inputs without labels | N | Critical | ✅/❌ |

### Supplemental Checks
| # | Check | Verdict | Notes |
|---|---|---|---|
| S2 | NotificationBell placement | ✅/❌ | |
| S3 | Sign-out semantic color | ✅/❌ | |
| S4 | Sidebar trigger accessibility | ✅/❌ | |
| S5 | Table container w-fit | ✅/❌ | |
| S6 | Bare ring on focus styles | ✅/❌ | |
| S7 | onClick on non-interactive elements | ✅/❌ | |
| S8 | 'use client' placement depth | ✅/❌ | |

### Browser Accessibility Scan (axe-core)
[Only if Step 4 ran — otherwise: "Skipped — dev server not running"]
| Page | Critical | Serious | Moderate | Minor | Passes |
|---|---|---|---|---|---|
| / | N | N | N | N | N |
| /[list-page] | N | N | N | N | N |
| /[form-page] | N | N | N | N | N |

Top violations:
[id — description — N nodes — example HTML]

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
Axe-core pages scanned: N (or: skipped)
```

If all checks pass: output `UI Audit CLEAN — [DATE]. No violations found.`

---

## Execution notes

- Do NOT make any code changes during this skill. Audit only.
- Do NOT re-read files already in context from Step 1.
- The Explore agent in Step 2 handles all grep work. Do not duplicate searches in the main context.
- **Pipeline integration**: for Critical findings, ask the user: "Vuoi che implementi i fix identificati?" before touching any file. Medium/Low findings go directly to `docs/refactoring-backlog.md` without asking.
- **Concurrent execution**: when invoked from pipeline.md Phase 5d, this skill runs concurrently with the first Playwright-based skill ONLY in Static mode (Step 4 skipped). If the dev server is running and Step 4 executes, the Playwright MCP session is in use — do not overlap.
- **axe-core false positives**: document suppressed false positives explicitly in the report. Do not flag known Radix-managed patterns (inert Dialog children, Portal color-contrast measurements) as violations without manual verification.
