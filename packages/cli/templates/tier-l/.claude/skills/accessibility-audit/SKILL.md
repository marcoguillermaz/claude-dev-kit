---
name: accessibility-audit
description: Unified accessibility audit - axe-core WCAG 2.2 scan, APCA contrast measurement, static a11y checks (aria-label, tabindex, form labels, focus visibility, onClick on non-interactive). Static and live modes.
user-invocable: true
model: sonnet
context: fork
argument-hint: [static|full|wcag] [target:route:<path>|target:file:<glob>|target:role:<role>]
allowed-tools: Read, Glob, Grep, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_evaluate, mcp__playwright__browser_wait_for
---

## Configuration (fill in before first run)

> Replace these placeholders:
> - `[DEV_URL]` — e.g. `http://localhost:3000`
> - `[SITEMAP_OR_ROUTE_LIST]` — e.g. `docs/sitemap.md`
> - `[APP_SOURCE_GLOB]` — e.g. `app/**/page.tsx` + `components/**/*.tsx`, `src/**/*.vue`
> - `[DEV_COMMAND]` — e.g. `npm run dev`, `python manage.py runserver`
>
> Then fill in the APCA probe selectors in Step 3 (see Stack adaptation section at end).

Single source of truth for accessibility checks across the project. Combines static grep-based checks (run in all modes) with live browser checks (axe-core WCAG scan + APCA contrast measurement) when a dev server is available.

**Scope boundary**:
- Owns: static a11y patterns (aria, tabindex, labels, focus, keyboard), axe-core WCAG 2.2 scan, APCA contrast computation.
- Not here: design token compliance and component adoption → `/ui-audit`. Typography and aesthetic polish → `/visual-audit`. Viewport-specific a11y (WCAG 1.4.4 resize, 1.4.10 reflow, tap targets) → `/responsive-audit`.

**Two execution modes**:
- **Static mode** (dev server not running): Steps 0-2, 5 only. Can run concurrently with browser-based skills per pipeline.md.
- **Full mode** (dev server running): all steps including APCA contrast + axe-core scan. Sequential — shares the browser MCP session with other live audits.
- **WCAG mode** (`wcag`): same as full, plus axe-core `best-practice` tag.

---

## Step 0 — Target resolution + mode selection

Parse `$ARGUMENTS` for an optional mode keyword and a `target:` token.

| Pattern | Meaning |
|---|---|
| `static` | Force static mode — skip Steps 3-4 even if dev server is available |
| `full` | Force full mode — fail if dev server is unreachable |
| `wcag` | Full mode + axe-core `best-practice` tag (more stringent) |
| No mode keyword | **Auto** — full if dev server responds, else static with a warning |
| `target:route:<path>` | Restrict live scan to a single route (e.g. `target:route:/dashboard`) |
| `target:file:<glob>` | Restrict static checks to matching files (e.g. `target:file:src/**/page.tsx`) |
| `target:role:<role>` | Restrict to routes accessible by that role (from `[SITEMAP_OR_ROUTE_LIST]`) |
| No target argument | Full audit — all page/component files from `[SITEMAP_OR_ROUTE_LIST]` |

**STRICT PARSING — mandatory**: derive mode and target ONLY from explicit text in `$ARGUMENTS`. Do NOT infer from conversation context, recent blocks, or memory. Unknown tokens → treat as absent and announce ignored args in the banner.

Announce: `Running accessibility-audit in [STATIC | FULL | WCAG] mode — scope: [FULL | target: <resolved>]`

---

## Step 1 — Mode detection (if mode is auto)

Run:
```bash
curl -s -o /dev/null -w "%{http_code}" [DEV_URL]
```

- Response 200 or 302 → proceed in **full** mode.
- Anything else → degrade to **static** mode and record in the report: `⚠️ Dev server not reachable at [DEV_URL] — APCA + axe-core checks skipped. Re-run after starting [DEV_COMMAND] for full coverage.`

If mode was forced (`static`/`full`/`wcag`), skip this step — but if `full`/`wcag` was forced and the server is unreachable, fail explicitly: `❌ Mode [full|wcag] requested but dev server not running. Start [DEV_COMMAND] or re-run with "static".`

---

## Step 2 — Static a11y checks (A1-A8)

Read `[SITEMAP_OR_ROUTE_LIST]` (if present) to build the target file list — page files + component files. If no sitemap, fall back to `[APP_SOURCE_GLOB]` filtered by `target:` scope.

Launch a **single Explore subagent** (model: haiku) with the full file list and the check definitions below. Pass file paths explicitly — do not ask the agent to discover them.

> **Ripgrep note**: patterns are written for ripgrep (`rg`). Use `|` for alternation. Character classes work as-is.

### Instructions for the Explore agent

"Run all 8 checks below. For each check: report total match count, list every match as `file:line — excerpt`, and state PASS (0 matches) or FAIL (N matches). If 0 matches, explicitly state '0 matches — PASS'. Do not skip any check.

File scope: use ONLY the files provided.

---

**A1 — Icon-only buttons missing aria-label** [Severity: Critical — WCAG 4.1.2]
Pattern: `size="icon"|size=\{'icon'\}` then filter to lines NOT containing `aria-label`.
Also: `<Button[^>]*>\s*<[A-Z][a-zA-Z]+Icon` or `<Button[^>]*>\s*\{[^}]*Icon` without `aria-label` on the same or preceding line.
Expected: 0 matches. Icon-only interactive elements must have an accessible name.

**A2 — Positive tabindex** [Severity: Critical — WCAG 2.4.3]
Pattern: `tabIndex=[1-9]|tabindex="[1-9]`
Exclude: lines with `//`, `{/*`.
Expected: 0 matches. Positive tabindex breaks natural tab order. Only `tabIndex={0}` or `tabIndex={-1}` are valid.

**A3 — Focus outline suppression without compensation** [Severity: High — WCAG 2.4.7]
Pattern: lines containing `outline-none` or `outline: none` that do NOT also contain a focus-visible ring or outline restoration.
Method: grep for outline suppression, then filter out lines that also contain focus restoration patterns (e.g. `focus-visible:ring`, `focus:ring`, `:focus-visible { outline`).
Expected: 0 matches. Suppressing the focus outline without providing an alternative indicator breaks keyboard navigation in high-contrast mode.

**A4 — Native `<img>` without alt** [Severity: Medium — WCAG 1.1.1]
Pattern: `<img\s`
Exclude: lines containing `//`, `{/*`, `alt=`, `.svg`, `data:`, `role="presentation"`.
Expected: 0 matches. Every raster image must have an `alt` attribute (empty string allowed for decorative use with `role="presentation"`).

**A5 — Form inputs without accessible labels** [Severity: Critical — WCAG 1.3.1, 3.3.2, 4.1.2]
Method: grep `<input`, `<Input`, `<textarea`, `<Textarea`, `<Select`. For each match, check within ±5 lines for a `<Label` containing `htmlFor` matching the input's `id`, OR an `aria-label`/`aria-labelledby` on the element.
Exclude: inputs inside form field wrapper components with a sibling label component — these are valid (e.g. react-hook-form `<FormField>` + `<FormLabel>`).
Expected: 0 matches. Every form control must have an accessible name.

**A6 — Focus indicator too thin** [Severity: High — WCAG 1.4.11]
Pattern: focus ring/outline declarations that rely on a default width without explicit sizing (e.g. bare `focus-visible:ring` without a size like `ring-2`, or `outline-width` under 2px).
Expected: 0 matches on interactive elements. Focus indicators must meet WCAG 1.4.11 (3:1 non-text contrast) — a 1px ring is typically insufficient.

**A7 — onClick on non-interactive elements** [Severity: Critical — WCAG 2.1.1]
Pattern: `<div.*onClick|<span.*onClick|<li.*onClick|<p.*onClick`.
For each match, the element must also have `role="button"` (or equivalent interactive role) AND `onKeyDown` (or `onKeyPress`). Missing either = keyboard users cannot activate it.
Exclude: lines inside `{/* ... */}` comments; Radix `asChild` wrappers.
Expected: 0 matches missing keyboard support.

**A8 — Sidebar/nav trigger keyboard accessibility** [Severity: High — WCAG 2.1.1]
Scope: main layout entry point and sidebar/navigation components (e.g. `layout.tsx`, `Sidebar.tsx`).
Verify: the primary sidebar / navigation trigger is reachable on BOTH mobile and desktop — not hidden inside an `md:hidden` wrapper with no desktop alternative.
Flag: `SidebarTrigger` or equivalent wrapped only in `md:hidden` without a matching non-mobile trigger.
Expected: every layout exposes a keyboard-reachable nav trigger at every breakpoint."

---

## Step 3 — APCA contrast measurement (full/wcag mode only — live)

Pick 3 representative pages from the target scope:
1. The dashboard or root route (`/`)
2. One data-list page (first list route in scope)
3. One form/write page (first form or wizard route in scope)

For each page:

```
1. mcp__playwright__browser_navigate → [DEV_URL]/<route>
2. Ensure logged in with the role from the route's sitemap entry (if auth required).
3. browser_wait_for network idle (2000ms max).
4. For each theme (light, dark):
   - Toggle theme via sidebar Switch (or apply class="dark" on <html>).
   - browser_wait_for 500ms.
   - Run the APCA probe below via browser_evaluate.
```

### APCA probe

> **Adapt selectors below** to match your project's design system tokens. The defaults target
> common patterns (muted text, card surface, primary CTA, border). See Stack adaptation section.

```js
// Returns computed color + background for the three C-checks.
// APCA Lc is NOT computed here — we capture the raw rgb pairs and flag qualitatively.
// The skill's report narrates the pair against Lc thresholds documented below.
const byClass = (sel) => document.querySelector(sel);

// Adapt these selectors to your design system (see Stack adaptation section)
const muted = byClass('[MUTED_TEXT_SELECTOR]');
const card = byClass('[CARD_SURFACE_SELECTOR]');
const cta = byClass('[PRIMARY_CTA_SELECTOR]');
const border = byClass('[BORDER_SELECTOR]');

const style = (el) => el ? getComputedStyle(el) : null;
return {
  theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  mutedOnCard: {
    color: muted ? style(muted).color : null,
    background: card ? style(card).backgroundColor : null
  },
  ctaOnBrand: {
    color: cta ? style(cta).color : null,
    background: cta ? style(cta).backgroundColor : null
  },
  borderOnBg: {
    color: border ? style(border).borderColor : null,
    background: card ? style(card).backgroundColor : null
  }
};
```

### APCA thresholds (source: APCA / WCAG 3 working draft)

- **Lc 75** — preferred body text
- **Lc 60** — minimum body text
- **Lc 45** — label / large text (≥ 24px or bold ≥ 18px)
- **Lc 15** — non-text (borders, icons, dividers)

Record each pair. The report narrates against thresholds qualitatively (getComputedStyle returns resolved rgb, not Lc — final verdict combines the rgb with visible contrast in the screenshot when available).

### Check definitions

| ID | Severity | Target |
|---|---|---|
| **C1** | High if body text appears below Lc 45; Critical if below Lc 30 | Muted text on card/surface background, both themes. Silent dark-mode failure point. |
| **C2** | High | Primary CTA text on brand background — frequent regression after token tweaks. |
| **C3** | Medium | Border / icon contrast vs card background — must reach Lc 15. |

---

## Step 4 — axe-core browser scan (full/wcag mode only — live)

For each of the 3 pages from Step 3:

```js
// Inject axe-core from CDN
await new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js';
  s.onload = resolve;
  s.onerror = reject;
  document.head.appendChild(s);
});

// WCAG 2a / 2aa / 2.1aa / 2.2aa (+ best-practice in wcag mode)
const tags = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
// In wcag mode, also push 'best-practice'

const results = await axe.run(document, {
  runOnly: { type: 'tag', values: tags },
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

### Severity mapping

| ID | axe impact | Report severity |
|---|---|---|
| **X1** | `critical` or `serious` | Critical |
| **X2** | `moderate` | High |
| **X3** | `minor` | Medium |

### Known false positives to suppress (document, not fix)

- `color-contrast` on muted text inside a portal overlay — axe measures the portal layer, not the semantic background. Verify manually against Step 3 C1 data.
- `aria-hidden-focus` inside a closed Dialog/Sheet — headless UI libraries (Radix, Headless UI, etc.) manage this via `inert`. Verify library version before flagging.

---

## Step 5 — Report and backlog decision gate

### Output format

```
## Accessibility Audit — [DATE] — [MODE] — [TARGET]

### Executive summary
[2-5 bullets — Critical and High findings only. Write concrete facts: file:line, check ID, impact.
If nothing Critical/High: "No Critical or High findings — a11y posture is clean for the audited scope."
Examples:
- "A5 Critical: 3 form inputs in app/(app)/settings/page.tsx have no accessible label"
- "C1 High: text-muted-foreground on bg-card rgb(…) on dark theme — likely below Lc 45"
- "X1 Critical: 'button-name' axe violation on /dashboard — 2 nodes"]

### A11y maturity assessment
| Dimension | Rating | Notes |
|---|---|---|
| Keyboard access | strong / adequate / weak | [A2, A3, A6, A7, A8 results] |
| Accessible naming | strong / adequate / weak | [A1, A4, A5 results] |
| Contrast posture | strong / adequate / weak | [C1, C2, C3 — or "skipped, static mode"] |
| WCAG conformance | strong / adequate / weak | [axe-core X1/X2/X3 counts, or "skipped"] |
| Coverage | full / partial / static-only | [which steps ran] |

### Per-check verdicts

Static (all modes):
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| A1 | Icon-only buttons missing aria-label | N | Critical | ✅/❌ |
| A2 | Positive tabindex | N | Critical | ✅/❌ |
| A3 | outline-none without focus-ring compensation | N | High | ✅/❌ |
| A4 | Native <img> without alt | N | Medium | ✅/❌ |
| A5 | Form inputs without accessible labels | N | Critical | ✅/❌ |
| A6 | Bare focus ring without explicit size | N | High | ✅/❌ |
| A7 | onClick on non-interactive elements | N | Critical | ✅/❌ |
| A8 | Sidebar/nav trigger accessibility | N | High | ✅/❌ |

Live (full/wcag mode only — else "Skipped — static mode"):
| # | Check | Result | Severity | Verdict |
|---|---|---|---|---|
| C1 | muted-foreground on bg-card (both themes) | [rgb pair / Lc estimate] | High / Critical | ✅/⚠️/❌ |
| C2 | CTA text on brand background | [rgb pair] | High | ✅/❌ |
| C3 | Border / icon vs card bg | [rgb pair] | Medium | ✅/❌ |

axe-core (full/wcag mode only):
| Page | Critical | Serious | Moderate | Minor | Passes |
|---|---|---|---|---|---|
| / | N | N | N | N | N |
| /[list-page] | N | N | N | N | N |
| /[form-page] | N | N | N | N | N |

Top axe violations:
[id — description — N nodes — example HTML]

### Prioritized findings
For each finding with severity Medium or above:
[SEVERITY] [A11Y-?] [check ID] — [file:line or route] — [evidence] — [fix] — [effort: S=<1h / M=half day / L=day+]

### Quick wins
[Findings that meet all three: (a) Medium or High, (b) effort S, (c) single-file fix]
Format: "A11Y-[n]: [one-line description]"
If no quick wins: state explicitly.
```

### Backlog decision gate

Present all findings with severity Medium or above as a numbered decision list, sorted Critical → High → Medium:

```
Found N a11y findings at Medium or above. Which to add to backlog?

[1] [CRITICAL] A11Y-? — [check ID] — file:line — one-line description
[2] [HIGH]     A11Y-? — [check ID] — file:line — one-line description
[3] [MEDIUM]   A11Y-? — [check ID] — file:line — one-line description
...

Reply with numbers to include (e.g. "1 2 4"), "all", or "none".
```

**Wait for explicit user response before writing anything.**

Then write ONLY the approved entries to `docs/refactoring-backlog.md`:
- Assign ID: `A11Y-[n]` (next available after existing A11Y entries)
- Add row to priority index
- Add full detail section with: issue, evidence (file:line or rgb pair), check ID, fix suggestion, effort, WCAG reference

### Severity guide

- **Critical**: keyboard trap or missing accessible name on an interactive element (A1, A2, A5, A7); axe `critical`/`serious` violations (X1); APCA indicates body text falls below Lc 30 (C1).
- **High**: focus indicator degraded (A3, A6); sidebar/nav unreachable at a breakpoint (A8); axe `moderate` (X2); APCA muted text or CTA below Lc 45 (C1, C2).
- **Medium**: decorative image missing alt (A4); axe `minor` (X3); non-text contrast below Lc 15 (C3).

---

## Execution notes

- Do NOT apply a11y fixes during this skill. Audit only.
- The Explore agent in Step 2 handles all static grep work. Do not duplicate searches in the main context.
- **Concurrent execution**: when invoked from pipeline.md Phase 5d Track A, this skill runs sequentially with `/visual-audit` → `/ux-audit` → `/responsive-audit` — they share the browser MCP session. `/ui-audit` still launches concurrently first.
- **Static mode degradation**: if the dev server is unreachable and mode was auto, the report must state explicitly which steps were skipped. Never silently omit checks.
- **axe-core false positives**: document suppressed false positives explicitly in the report. Do not flag patterns managed by headless UI libraries (inert Dialog children, Portal color-contrast measurements) as violations without manual verification.
- **Complementary skills**: `/accessibility-audit` is the single source of truth for accessibility. For design-token compliance and component adoption see `/ui-audit`; for aesthetic contrast and polish see `/visual-audit`; for viewport-specific WCAG checks (1.4.4 resize, 1.4.10 reflow, tap targets) see `/responsive-audit`.

---

## Stack adaptation (fill after scaffold)

| Key | Your value | Examples |
|---|---|---|
| `[DEV_URL]` | | `http://localhost:3000`, `http://127.0.0.1:8080` |
| `[SITEMAP_OR_ROUTE_LIST]` | | `docs/sitemap.md`, `docs/routes.md` |
| `[APP_SOURCE_GLOB]` | | `app/**/page.tsx` + `components/**/*.tsx`, `src/**/*.vue` |
| `[DEV_COMMAND]` | | `npm run dev`, `python manage.py runserver` |
| APCA selectors | | Adapt Step 3 probe to your design system tokens |
| `[MUTED_TEXT_SELECTOR]` | | `[class*="muted-foreground"]`, `.text-secondary` |
| `[CARD_SURFACE_SELECTOR]` | | `[data-slot="card"]`, `.card`, `main > div` |
| `[PRIMARY_CTA_SELECTOR]` | | `button[class*="bg-primary"]`, `.btn-primary` |
| `[BORDER_SELECTOR]` | | `[class*="border-border"]`, `.border` |
