---
name: responsive-audit
description: Verify that app pages render correctly across mobile, tablet, and desktop breakpoints. Uses docs/sitemap.md as the route inventory. Takes Playwright screenshots at 375px / 768px / 1024px. Produces a PASS/WARN/FAIL report per route × breakpoint. Requires the dev server running on localhost.
user-invocable: true
model: sonnet
context: fork
argument-hint: [quick|full]
allowed-tools: Read, Glob, Grep, mcp__playwright__browser_navigate, mcp__playwright__browser_resize, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_type, mcp__playwright__browser_click, mcp__playwright__browser_wait_for, mcp__playwright__browser_evaluate
---

## Configuration (fill in before first run)

> Replace these placeholders:
> - `[DEV_URL]` — e.g. `http://localhost:3000`
> - `[SITEMAP_OR_ROUTE_LIST]` — e.g. `docs/sitemap.md` or `docs/routes.md`
> - `[MOBILE_ROUTES]` — comma-separated routes to test in quick mode (pick 4–6 most-used)
> - `[TEST_ACCOUNTS]` — one or more `email / password` pairs per role (from your project's test accounts)
> - `[SCOPE_NOTE]` — which roles/pages are in scope vs excluded (e.g. "Admin excluded — desktop-only")

---

## Mode detection

Check `$ARGUMENTS`:
- Empty / not provided → **quick mode** (375px only, `[MOBILE_ROUTES]`)
- `quick` → same as empty
- `full` → all breakpoints (375px + 768px + 1024px), all routes in sitemap

Announce at start: `Running responsive-audit in [QUICK | FULL] mode.`

---

## Step 1 — Load reference

Read `[SITEMAP_OR_ROUTE_LIST]`. Extract:
- All routes marked for responsive testing (if your sitemap has an Audit or R column, use it)
- Test account credentials (from a "Test accounts" section if present)
- Any responsive notes per page (tabs, modal states, breakpoint-specific behaviour)

Group routes by which session/role is needed to access them.

---

## Step 2 — Pre-flight check

Navigate to `[DEV_URL]`. If not reachable:
> ❌ Dev server not running. Start it then re-run `/responsive-audit`.

---

## Step 3 — Breakpoint definitions

| ID | Width | Height | Label | Priority |
|---|---|---|---|---|
| BP1 | 375px | 812px | Mobile S (iPhone SE) | Critical — always tested |
| BP2 | 768px | 1024px | Tablet (iPad) | Full mode only |
| BP3 | 1024px | 768px | Laptop S | Full mode only |

Quick mode: BP1 only.
Full mode: BP1 + BP2 + BP3.

---

## Step 4 — Screenshot loop

For each route × breakpoint in scope:

1. Login with the appropriate test account (reuse session if same role as previous route)
2. `browser_resize(width, height)` — set viewport
3. `browser_navigate(url)`
4. Wait 1500ms or until main content is visible
5. `browser_take_screenshot` — save as `responsive/[route-slug]-[bp].png`
6. `browser_evaluate` — run overflow check:
   ```js
   (() => {
     const htmlW = document.documentElement.scrollWidth;
     const vpW = window.innerWidth;
     return { hasHorizontalScroll: htmlW > vpW, overflowPx: Math.max(0, htmlW - vpW) };
   })()
   ```
7. `browser_snapshot` — ARIA snapshot for tap target check

### Login helper

```
1. browser_navigate [DEV_URL]/login
2. If already at /: check that current role matches needed role
   - If wrong role: find sign-out → click → confirm → wait for /login
3. browser_type email field [email]
4. browser_type password field [password]
5. browser_click submit button
6. browser_wait_for url = [DEV_URL]/
```

---

## Step 5 — Checks per screenshot

**R1 — Horizontal overflow**
`hasHorizontalScroll === true` → FAIL. Report `overflowPx` px overflow.

**R2 — Table overflow**
If a `<table>` is present: verify its container does not produce horizontal scroll.

**R3 — Text truncation**
Flag text cut off mid-word. Intentional `line-clamp` with ellipsis is acceptable.

**R4 — Tap target size** (BP1 only)
```js
Array.from(document.querySelectorAll('button, a, [role="button"]')).map(el => {
  const r = el.getBoundingClientRect();
  return { text: el.textContent?.slice(0,30), w: Math.round(r.width), h: Math.round(r.height), ok: r.width >= 44 && r.height >= 44 };
}).filter(x => !x.ok && x.w > 0)
```
Flag primary interactive elements with w < 44 OR h < 44 (exclude inline text links).

**R5 — Stacked layout**
At BP1: multi-column grids should collapse to single column. Verify visually from screenshot.

**R6 — Modal/dialog usability**
If a modal is open: verify it does not overflow the viewport and has a visible close affordance.

---

## Step 6 — Report

```
## Responsive Audit — [DATE] — [MODE]
### Breakpoints tested: [BP1 only | BP1 + BP2 + BP3]

### Summary

| Route | BP1 375px | BP2 768px | BP3 1024px | Issues |
|---|---|---|---|---|
| /path | PASS/WARN/FAIL | — | — | [description] |

Legend: PASS = no issues · WARN = minor (tap target slightly small) · FAIL = broken (overflow, truncation, unusable layout)

### Violations detail

For each WARN or FAIL:
- **Route**: [url] — **Breakpoint**: [bp]
- **Check**: R[N] — [check name]
- **Detail**: [description]
- **Fix hint**: [e.g. add overflow-x-hidden, add min-w-0, adjust grid breakpoint]

### Clean routes
[List of PASS routes]

### Score
- Routes tested: N · PASS: N (N%) · WARN: N · FAIL: N
```

---

After the report, ask the user whether to implement the responsive fixes found.

**Do NOT apply any changes until confirmed.**
