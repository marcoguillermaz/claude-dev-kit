---
name: responsive-audit
description: Verify that app pages render correctly across mobile, tablet, and desktop breakpoints. Uses docs/sitemap.md as the route inventory. Takes Playwright screenshots at 320px / 375px / 768px / 1024px. Produces a PASS/WARN/FAIL report per route × breakpoint with WCAG 1.4.10 reflow and 1.4.4 resize text compliance. Requires the dev server running on localhost.
user-invocable: true
model: opus
context: fork
argument-hint: [quick|full|wcag] [target:page:<route>|target:role:<role>|target:section:<section>]
allowed-tools: Read, Glob, Grep, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_resize, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_type, mcp__playwright__browser_click, mcp__playwright__browser_wait_for, mcp__playwright__browser_evaluate
---

## Configuration (fill in before first run)

> Replace these placeholders:
> - `[DEV_URL]` — e.g. `http://localhost:3000`
> - `[LOGIN_ROUTE]` — your login page path, e.g. `login`, `signin`, `auth/login`
> - `[SITEMAP_OR_ROUTE_LIST]` — e.g. `docs/sitemap.md` or `docs/routes.md`
> - `[MOBILE_ROUTES]` — comma-separated routes to test in quick mode (pick 4–6 most-used)
> - `[TEST_ACCOUNTS]` — one or more `email / password` pairs per role (from your project's test accounts)
> - `[SCOPE_NOTE]` — which roles/pages are in scope vs excluded

---

## Step 0 — Mode + target detection

Parse `$ARGUMENTS`:

**Mode** (controls breakpoints, route breadth, and WCAG checks):
- `quick` (or empty) → BP1 (375px) only, key routes per role. No WCAG checks.
- `full` → all breakpoints (375px + 768px + 1024px), all routes in sitemap. No WCAG checks.
- `wcag` → adds BP0 (320px) to the active breakpoint set + WCAG 1.4.4 resize text step (Step 5b). Stackable: `full wcag` = all breakpoints + WCAG compliance checks.

**Target** (filters the route list — applied on top of mode):
- `target:page:/some-route` → only that exact route
- `target:role:<role>` → that role's accessible routes only
- `target:section:<name>` → routes whose path contains `<name>`
- No target → all routes from the mode roster

Mode and target are **independent** — `full wcag target:section:invoices` = all breakpoints + WCAG, invoice routes only.

**STRICT PARSING — mandatory**: derive mode and target ONLY from the explicit text in `$ARGUMENTS`. Do NOT infer target from conversation context, recent work, active block names, or project memory. If `$ARGUMENTS` contains no `target:` token → apply NO filter (all routes from sitemap per the selected mode).

Announce at start:
`Running responsive-audit in [QUICK | FULL | WCAG] mode — scope: [FULL | target: <resolved description>]`

---

## Step 0.5 — Screenshot directory setup

Before any navigation, create the temp screenshot directory:
```bash
mkdir -p /tmp/responsive-audit
```
All screenshots during this session go into `/tmp/responsive-audit/`. This keeps screenshots out of the project directory and simplifies cleanup.

---

## Step 1 — Load reference

Read `[SITEMAP_OR_ROUTE_LIST]`. Extract:
- All routes marked for responsive testing (if your sitemap has an Audit or R column, use it)
- Test account credentials (from a "Test accounts" section if present)
- Any responsive notes per page (tabs, modal states, breakpoint-specific behaviour)
- Which routes have calendar grids or dense multi-column layouts
- Which routes have data tables

Apply target filter from Step 0 to produce the **working route list**.

Group routes by which session/role is needed to access them.

---

## Step 1.5 — Static pre-checks

Run **before** launching the browser. These are zero-cost static checks that catch common responsive patterns:

**S1 — Viewport unit font trap**
```
Pattern: text-\[[0-9.]+vw\]|font-size.*[0-9]vw|fontSize.*vw
Scope: adapt to your project's source and style files (e.g. `src/**/*.css`, `styles/**/*.scss`)
```
Flag any element with a `vw`-based font size without a `calc()` fallback.
`font-size: Xvw` alone disables user zoom — WCAG 1.4.4 violation.
Expected: 0 matches. Any match is Medium severity.

**S2 — overflow:hidden on html/body**
```
Pattern: (html|body).*overflow.*hidden|overflow.*hidden.*(html|body)
Scope: global CSS file, root layout file
```
Flag any `overflow: hidden` applied directly to `<html>` or `<body>`.
This masks horizontal scroll symptoms instead of fixing them and breaks `position: sticky`.
Expected: 0 matches. Any match is Medium severity.

**S3 — Images without max-width constraint**
```
Pattern: <img(?![^>]*(?:max-width|object-fit|width="100%"))
Scope: your template/view files — adapt extension to your framework (e.g. `.html`, `.erb`, `.jinja`, `.vue`)
```
Flag raw `<img>` tags without responsive width classes. All images should use a framework image component or have `max-width: 100%` / equivalent.
Expected: 0 matches. Any match is Low severity.

Log results as "Static pre-checks: S1 [PASS/FAIL N] · S2 [PASS/FAIL N] · S3 [PASS/FAIL N]" before proceeding.

---

## Step 2 — Pre-flight check

Navigate to `[DEV_URL]`. If not reachable:
> ❌ Dev server not running. Start it then re-run `/responsive-audit`.

Record the base URL.

---

## Step 3 — Breakpoint definitions

| ID | Width | Height | Label | When active |
|---|---|---|---|---|
| BP0 | 320px | 568px | WCAG Reflow (iPhone 5) | `wcag` mode only |
| BP1 | 375px | 812px | Mobile S (iPhone SE) | Always (quick + full + wcag) |
| BP2 | 768px | 1024px | Tablet (iPad) | `full` + `wcag full` only |
| BP3 | 1024px | 768px | Laptop S | `full` + `wcag full` only |

Quick mode: BP1 only.
Full mode: BP1 + BP2 + BP3.
WCAG mode (any): prepends BP0 to the active set.

**WCAG reference:**
- BP0 (320px) = WCAG 2.2 SC 1.4.10 Reflow threshold — vertical-scrolling content must not require horizontal scroll at 320 CSS pixel width
- BP1 (375px) = real device baseline — not a WCAG threshold but the most common small mobile viewport

---

## Step 4 — Route matrix

Apply the working route list from Step 1 (already filtered by target).

The definitive route list and per-route notes come from `[SITEMAP_OR_ROUTE_LIST]`. For each route: check sitemap sub-hierarchies for tabs, sections, and components to verify at each breakpoint.

> **Fill in test credentials below before running:**

### Session 1 — [Primary role]
Login with `[email]` / `[password]`.
Include all routes accessible to this role.

### Session 2 — [Secondary role] (if applicable)
Login with `[email]` / `[password]`.
Include all routes accessible to this role.

### Shared routes (test with first session — already logged in)
Routes accessible to multiple roles — verify once with the first session.

---

## Step 5 — Screenshot loop

For each session × route × breakpoint:

1. `browser_resize(width, height)` — set viewport
2. `browser_navigate(url)`
3. Wait 1500ms or until main content visible
4. **DOM preflight validation** — run before any screenshot:
   ```js
   ({
     loaded: document.readyState === 'complete',
     hasMain: (document.querySelector('main')?.innerText?.length ?? 0) > 30,
     noError: !document.title.toLowerCase().includes('error') &&
               !document.body.innerText.includes('Application error') &&
               !document.body.innerText.includes('500'),
     vpWidth: window.innerWidth
   })
   ```
   If `hasMain === false` OR `noError === false`:
   > ⚠️ Route [route] @ BP[N] failed preflight. Skipping — record as WARN in report.
   If `vpWidth` does not match the requested width: log the discrepancy and proceed anyway.
5. `browser_take_screenshot` — save with label `responsive/[route-slug]-[role]-[bp]`
6. **Overflow check** (run immediately after screenshot):
   ```js
   (() => {
     const htmlW = document.documentElement.scrollWidth;
     const vpW = window.innerWidth;
     const tables = Array.from(document.querySelectorAll('table'));
     const tableOverflows = tables.map(t => ({
       el: t.className.split(' ').slice(0,3).join('.'),
       hasScrollWrapper: !!t.closest('[class*="overflow-x"]'),
       overflowPx: Math.max(0, t.scrollWidth - vpW)
     })).filter(t => t.overflowPx > 0);
     return {
       hasHorizontalScroll: htmlW > vpW,
       overflowPx: Math.max(0, htmlW - vpW),
       offendingElements: Array.from(document.querySelectorAll('*'))
         .filter(el => el.scrollWidth > vpW)
         .slice(0, 5)
         .map(el => el.tagName + (el.className ? '.' + el.className.split(' ').slice(0,3).join('.') : '')),
       tableOverflows
     };
   })()
   ```
7. **Tap target check** (BP0 + BP1 only — mobile breakpoints):
   ```js
   (() => {
     const interactives = Array.from(document.querySelectorAll('button, a[href], [role="button"], input, select'));
     const tooSmall = interactives
       .map(el => {
         const r = el.getBoundingClientRect();
         return {
           text: (el.textContent ?? el.getAttribute('aria-label') ?? '').slice(0,30).trim(),
           tag: el.tagName,
           w: Math.round(r.width),
           h: Math.round(r.height),
           ok: r.width >= 44 && r.height >= 44,
           recommended: r.width >= 48 && r.height >= 48
         };
       })
       .filter(x => !x.ok && x.w > 0 && x.h > 0);

     // Spacing check — find pairs of adjacent interactives with gap < 8px
     const rects = interactives.map(el => el.getBoundingClientRect());
     const spacingViolations = [];
     for (let i = 0; i < rects.length; i++) {
       for (let j = i + 1; j < rects.length; j++) {
         const a = rects[i], b = rects[j];
         const hGap = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
         const vGap = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
         const gap = Math.min(hGap === 0 ? Infinity : hGap, vGap === 0 ? Infinity : vGap);
         if (gap < 8 && gap >= 0 && gap !== Infinity) {
           spacingViolations.push({
             a: (interactives[i].textContent ?? '').slice(0,20).trim(),
             b: (interactives[j].textContent ?? '').slice(0,20).trim(),
             gapPx: Math.round(gap)
           });
           if (spacingViolations.length >= 5) break;
         }
       }
       if (spacingViolations.length >= 5) break;
     }

     return { tooSmall, spacingViolations };
   })()
   ```
8. **Sidebar/nav collapse check** (BP0 + BP1 only):
   ```js
   (() => {
     const sidebar = document.querySelector('aside, nav[class*="sidebar"], [data-sidebar], [class*="sidebar"]');
     const sidebarVisible = sidebar
       ? (getComputedStyle(sidebar).display !== 'none' &&
          getComputedStyle(sidebar).visibility !== 'hidden' &&
          getComputedStyle(sidebar).opacity !== '0' &&
          sidebar.getBoundingClientRect().width > 100)
       : null;
     const hamburger = document.querySelector(
       '[aria-label*="menu" i], [aria-label*="nav" i], [aria-controls*="sidebar" i], button[class*="hamburger"], button[class*="mobile-menu"]'
     );
     return {
       sidebarFound: !!sidebar,
       sidebarVisibleAtMobile: sidebarVisible,
       hamburgerFound: !!hamburger,
       hamburgerText: hamburger ? (hamburger.getAttribute('aria-label') ?? hamburger.textContent?.slice(0,20)) : null
     };
   })()
   ```
9. `browser_snapshot` — ARIA snapshot for structural check

### Checks per screenshot

**R1 — Horizontal overflow**
`hasHorizontalScroll === true` → FAIL. Report `overflowPx` px overflow. Report `offendingElements`.
At BP0: any horizontal scroll = WCAG 1.4.10 violation → FAIL (Critical).

**R2 — Table overflow**
From `tableOverflows` array:
- `hasScrollWrapper === false` AND `overflowPx > 0` → FAIL (raw table overflow, no scroll container)
- `hasScrollWrapper === true` AND `overflowPx > 0` → WARN (deliberate scroll container — verify scroll affordance is visible to user)
Report the specific table class and overflow amount.

**R3 — Text truncation (visual check)**
From screenshot: flag ALL of the following:
- Text cut at viewport edge (not intentional `line-clamp`) → FAIL
- Card or tile labels truncated with "..." that obscure identifying information (type name, action label, entity name) → FAIL. The truncation hides operationally critical content — user cannot identify the item.
- Labels that wrap across 2+ lines breaking the label/value pairing visually → WARN
- Any heading or title that wraps to 3+ lines due to font size disproportionate to the viewport width → WARN

Intentional `line-clamp` on long body text (descriptions, notes) is acceptable — only flag when the truncation hides operationally critical content.

**R4 — Tap target size** (BP0 + BP1 only)
From `tooSmall` array: flag elements with `w < 44 OR h < 44`.
Exclude: inline text links inside paragraphs, pagination numbers.
Focus on: nav items, form submit buttons, tab bar items, action buttons in tables.
Note: 44px is the minimum threshold (Apple HIG). Elements between 44–47px pass but do not meet the 48px Material Design 3 recommendation — log as WARN if widespread.

**R5 — Stacked layout**
At BP1: grid/flex containers should collapse to single column at mobile. Check from screenshot — if columns don't stack, flag.

**R6 — Modal/dialog usability**
If a Dialog is triggered: verify it does not overflow the viewport, has visible close affordance, and the confirm button is reachable without scrolling.

**R7 — Calendar grids and dense multi-section layouts**
Applies to routes with calendar or multi-column grid components.
At BP0/BP1: 7-column day grids are high-risk at 320–375px — verify they fit within the viewport without horizontal overflow.
At BP0/BP1: pages with 3+ distinct stacked content sections — verify section headers do not overlap when stacking.

**R8 — Tap target spacing** (BP0 + BP1 only)
From `spacingViolations` array: flag pairs of interactive elements with gap < 8px.
8px minimum spacing between touch targets — Material Design 3 / web.dev standard.
Severity: WARN for occasional violations, FAIL if widespread on a primary flow.

**R9 — Sidebar/nav collapse** (BP0 + BP1 only)
From sidebar check:
- `sidebarFound === true` AND `sidebarVisibleAtMobile === true` → FAIL. Desktop sidebar must collapse at mobile.
- `sidebarFound === true` AND `sidebarVisibleAtMobile === false` AND `hamburgerFound === false` → WARN. Sidebar hidden but no visible mobile nav trigger found — user cannot navigate.
- `sidebarFound === true` AND `sidebarVisibleAtMobile === false` AND `hamburgerFound === true` → PASS.
- `sidebarFound === false` → log as "no sidebar detected" — verify visually from screenshot.

### Visual responsiveness checks (Opus screenshot analysis — BP0 + BP1 only)

Apply to EVERY screenshot at mobile breakpoints. These are pure visual checks — no DOM queries needed. They are page-agnostic and apply equally to dashboards, forms, lists, detail pages, and content pages.

**VR1 — Hero / header section reflow**
If the page has a header or hero section (page title + metadata, profile card, avatar + name + date, greeting banner): does it reflow gracefully at the mobile breakpoint?
Check for:
- Multi-column layout in the header that has not collapsed to vertical stack at mobile
- Secondary elements (date, role badge, metadata) floating without clear visual anchor
- Avatar or icon competing for horizontal space with text content causing awkward wrapping
Severity: FAIL if the header is visually broken or creates a confusing hierarchy. WARN if layout is intact but sub-optimal.

**VR2 — Card content density**
In any card, KPI tile, or list cell: are all labels, values, and subtitles readable at this viewport width?
Check for:
- Labels that are truncated with "..." where the truncated portion contains operationally important information
- Label/value pairs where the value wraps unexpectedly below the label, breaking the intended structure
- Cards so narrow that font-size, padding, and content no longer fit proportionally
Severity: FAIL if content is unreadable or identifying information is lost. WARN if visual polish is degraded.

**VR3 — Typography proportionality**
Is the font size distribution proportional to the mobile viewport?
Check for:
- Any heading that consumes 3+ lines, dominating the viewport and pushing content below fold
- Any body or label text that appears smaller than approximately 14px (too small to read comfortably on mobile)
- Inconsistent text sizes within the same section that break visual rhythm
Severity: WARN.

**VR4 — Primary CTA above fold**
Is the primary action for this page visible within the first viewport height without scrolling?
Exception: pages that are explicitly long-form (wizard steps, long forms) where the CTA at the bottom is expected.
Flag only if the CTA is non-obvious or the page appears to have no visible primary action above fold.
Severity: WARN.

**VR5 — Grid density at mobile**
Any 2-column grid: are each of the cells visually readable? Minimum readable card width at 375px: ~140px.
Check for:
- Cells with labels that wrap or are cut off because the cell is too narrow
- Numeric values or icons that appear crowded within their cell
Severity: FAIL if content is unreadable. WARN if layout is intact but visually crowded.

**VR6 — Content hierarchy at mobile**
Does the page have a clear visual hierarchy at mobile? The most important content should be immediately visible; secondary content below.
Check for:
- Decorative or secondary sections appearing above primary content
- Sections with no visible content (collapsed but no visible affordance to expand)
- Equal visual weight between primary and secondary sections (no clear focus point)
Severity: WARN.

Severity scale for visual checks: **FAIL** = layout is broken or content is unreadable → fix before Phase 6. **WARN** = layout is functional but visually sub-optimal → flag in report, fix in dedicated UI improvement block.

---

## Step 5b — WCAG 1.4.4 Resize Text check (wcag mode only)

**Skip this step if `wcag` flag was not set.**

Select 3 representative routes (one per role or function type): ideally a form-heavy page, a table-heavy page, and a content page.

For each:
1. `browser_resize(1280, 800)` — desktop viewport
2. `browser_navigate(url)`
3. Apply 200% font size via:
   ```js
   document.documentElement.style.fontSize = '200%';
   return { applied: true, rootFontSize: getComputedStyle(document.documentElement).fontSize };
   ```
4. Wait 500ms for reflow
5. Run overflow check (same query as Step 5 item 6)
6. `browser_take_screenshot` — save as `responsive/[route-slug]-resize200`
7. Check:
   - `hasHorizontalScroll === true` → FAIL — WCAG 1.4.4 violation. Content lost or broken at 200% text size.
   - Any interactive element no longer reachable (visually clipped) → FAIL
   - Minor reflow/wrap changes → PASS (expected and acceptable)
8. Reset: `document.documentElement.style.fontSize = ''`

Log results in the WCAG compliance section of the report.

---

## Step 6 — Session management

### Login helper (reuse across steps)
```
1. browser_navigate [DEV_URL]/[LOGIN_ROUTE]
2. If already at /: check sidebar/header for correct role indicator
   - If wrong role: find sign-out in nav → click → confirm if prompted → wait for /[LOGIN_ROUTE]
3. browser_type [email field] [email]
4. browser_type [password field] [password]
5. browser_click [submit button]
6. browser_wait_for url = [DEV_URL]/
```

### Role switch
1. `browser_navigate [DEV_URL]/[LOGIN_ROUTE]`
2. If redirected to `/`: look for sign-out in nav → click → confirm → wait for `/[LOGIN_ROUTE]`
3. Login with target credentials

---

## Step 7 — Report

```
## Responsive Audit — [DATE] — [MODE] — [TARGET]
### Breakpoints tested: [BP0 320px (WCAG) · ] BP1 375px [· BP2 768px · BP3 1024px]

### Static pre-checks
| Check | Result | Detail |
|---|---|---|
| S1 — vw font trap | PASS/FAIL N | [matches if any] |
| S2 — overflow:hidden on html/body | PASS/FAIL N | [matches if any] |
| S3 — Images without max-width | PASS/FAIL N | [matches if any] |

### Route matrix

| Route | Role | BP0 320px | BP1 375px | BP2 768px | BP3 1024px | Issues |
|---|---|---|---|---|---|---|
| [route from sitemap] | [role] | WCAG✅/❌ | PASS/WARN/FAIL | PASS/WARN/FAIL | PASS/WARN/FAIL | [description] |
| ... | | | | | | |

Legend: PASS = no issues · WARN = minor (scroll container present, 44-47px targets, preflight skipped) · FAIL = broken (overflow, truncation, unusable layout) · WCAG✅ = passes 1.4.10 reflow · WCAG❌ = fails 1.4.10
VR checks: apply visual analysis (VR1–VR6) to all BP0 and BP1 screenshots.

### Violations detail

For each WARN or FAIL:
- **Route**: [url] — **Role**: [role] — **Breakpoint**: [bp]
- **Check**: R[N] or VR[N] — [check name]
- **Detail**: [description — for R1/R2: include overflowPx and offendingElements; for R8: gap values; for VR checks: describe exactly what was observed in the screenshot]
- **Screenshot**: [filename]
- **Fix hint**: [suggested fix]

### WCAG compliance (wcag mode only)

| Criterion | Check | Routes tested | Result |
|---|---|---|---|
| 1.4.10 Reflow | No horizontal scroll at 320px | All BP0 routes | PASS/FAIL N |
| 1.4.4 Resize Text | No content loss at 200% zoom | [3 routes sampled] | PASS/FAIL N |

### Clean routes
[List of PASS routes with one-line confirmation]

### Skipped routes
[List routes skipped due to missing test accounts or preflight failures]

### Responsive score
- Total routes tested: N
- PASS: N (N%) · WARN: N · FAIL: N
- Critical (WCAG 1.4.10 violations at BP0): N
- Static pre-check issues: S1 N · S2 N · S3 N
```

---

## Step 8 — Final offer

After the report, offer to implement the responsive fixes found:

- **All at once** — apply every FAIL and WARN fix in one pass
- **By breakpoint**: mobile (BP0+BP1) · tablet (BP2) · laptop (BP3)
- **By check**: overflow (R1+R2) · tap target (R4+R8) · layout stacking (R5) · sidebar collapse (R9) · modal (R6) · calendar/grid (R7)
- **By section**: use `target:section:<name>` on the next run to scope fixes to a specific area
- **WCAG compliance pass**: fix all 1.4.10 and 1.4.4 violations found in `wcag` mode

**Do NOT apply any changes until confirmed.**

---

## Step 9 — Screenshot cleanup

After the report is delivered and the improvement offer is presented, clean up the temp directory:
```bash
rm -rf /tmp/responsive-audit
```
Run this unconditionally at session end.**
