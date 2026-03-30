---
name: visual-audit
description: Evaluate the aesthetic quality and visual polish of app pages. Takes live screenshots via Playwright, analyses each on 11 visual dimensions (typography, spacing, hierarchy, colour, density, dark-mode, micro-polish, contrast/legibility, Gestalt compliance, typographic quality, interaction states), runs computed browser checks (font scale, 8px grid, transition timing, contrast), and produces a scored report with concrete improvement suggestions. Use /skill-dev for code quality, /ux-audit for UX flows, /responsive-audit for breakpoints.
user-invocable: true
model: sonnet
context: fork
argument-hint: [quick|full] [target:page:<route>|target:role:<role>|target:section:<section>]
allowed-tools: Read, Glob, Grep, mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_wait_for, mcp__playwright__browser_resize, mcp__playwright__browser_evaluate
---

## Configuration (fill in before first run)

> Replace these placeholders:
> - `[DEV_URL]` — e.g. `http://localhost:3000`
> - `[DESIGN_TOKENS_FILE]` — path to your CSS/TS tokens file, e.g. `app/globals.css`, `styles/tokens.css`
> - `[THEME_FILE]` — path to your dark/light theme definitions (may be the same as tokens file)
> - `[TEST_ACCOUNTS]` — email/password pairs per role
> - `[ROUTE_ROSTER]` — fill in the page roster table in Step 4 with your app's key pages

---

## Step 0 — Mode + target detection

Parse `$ARGUMENTS`:

**Mode** (controls page roster breadth):
- `quick` → 5 key pages only
- `full` → all routes from sitemap, both themes
- No mode keyword → **standard** (10 pages, light + dark)

**Target** (filters the page roster):
- `target:page:/some-route` → only that exact route
- `target:role:<role>` → all pages accessible to that role
- `target:section:<name>` → routes whose path contains `<name>`
- No target → no filter (use all pages from the mode roster)

Mode and target are **independent** — `quick target:role:admin` means "run quick mode but limit to admin routes".

Announce at start:
`Running visual-audit in [STANDARD | QUICK | FULL] mode — scope: [FULL | target: <resolved description>]`

---

## Step 1 — Load context (parallel)

Read in parallel:
1. `docs/sitemap.md` or `[SITEMAP_OR_ROUTE_LIST]` — route inventory, role mapping, key components per page
2. `[DESIGN_TOKENS_FILE]` — extract brand color token, semantic token map
3. `[THEME_FILE]` — extract light/dark color scales

Hold in working memory:
- Brand color token and its approximate hue (for V4 colour discipline checks)
- Semantic token map: background, card, muted, foreground, muted-foreground, border
- Whether a dark mode is supported
- List of all routes with their roles and key component files

Apply target filter from Step 0 to the route list. The filtered list is the **working roster** for all subsequent steps.

---

## Step 2 — Pre-flight check

Navigate to `[DEV_URL]`. If not reachable:
> ❌ Dev server not running. Start it then re-run `/visual-audit`.

Record the base URL that responded — use it for all subsequent navigations.

---

## Step 3 — Visual evaluation framework

Apply these 11 dimensions to every screenshot captured.

| Dim | Name | What to look for | Target score |
|---|---|---|---|
| **V1** | Typographic hierarchy | H1 vs body weight contrast; label vs value distinction; font size spread; secondary text uses muted color. **Quantitative anchor**: ≤ 5 distinct font sizes (from computed check); 2 font weights (semibold headings, regular body). Flag if computed check reveals > 5 sizes. | ≥ 4 |
| **V2** | Spatial rhythm | Consistent padding inside similar components; visual breathing room; margin harmony between sections; card internal padding uniformity. **Quantitative anchor**: padding values should be multiples of 4px (8px preferred). Flag non-grid values (14px, 6px, 10px) when identified by computed check. | ≥ 4 |
| **V3** | Visual focal point | Primary CTA is the most prominent element; user's eye is guided to the most important content; no competing elements of equal weight | ≥ 4 |
| **V4** | Colour discipline | Brand colour used sparingly and intentionally; status colours follow semantic convention (green=done, amber=pending, red=destructive); no arbitrary colour decoration; brand reserved for primary CTAs not row-level buttons. **APCA anchors** (WCAG 3 working draft): body text on card background should achieve APCA Lc ≥ 60; label/muted text ≥ Lc 45 for large font; non-text contrast (borders, icons) ≥ Lc 15. Evaluate in both themes. | ≥ 4 |
| **V5** | Information density | Appropriate density for the page type (list = dense, form = airy); tables scannable at a glance; no cognitive overload; no empty visual regions | ≥ 3 |
| **V6** | Dark-mode polish | Dark theme looks intentional, not inverted; borders visible without being harsh; badge colours adapt; no washed-out text; card backgrounds distinguishable from page background | ≥ 4 |
| **V7** | Micro-polish | Hover/focus states visible; transitions not jarring; empty states and skeletons look professional; icon–text alignment clean. **Timing anchor**: transitions < 100ms are imperceptible; > 400ms feels sluggish. Flag when computed check reveals out-of-range transition durations on interactive elements. | ≥ 3 |
| **V8** | Contrast & legibility | Computed contrast ratios for key text elements against their backgrounds in both light and dark themes. References APCA thresholds: Lc 75 preferred for body text, Lc 60 minimum, Lc 45 for large/label text, Lc 15 for non-text (borders, icons). Specifically checks muted foreground text on card backgrounds — a common silent failure in dark mode. Uses computed style values from browser_evaluate. | ≥ 4 |
| **V9** | Gestalt compliance | 4 Gestalt principles: **Proximity** — label↔value gap must be visually smaller than section gap; **Figure/ground** — content distinguishable from chrome (background, borders, sidebars) in both themes; **Similarity** — same-function components (all primary CTAs, all status badges) must be visually identical cross-section; **Continuity** — lists and columns guide the eye linearly without visual interruption. | ≥ 3 |
| **V10** | Typographic quality | 3 checks: **Line height** — `lineHeight/fontSize` ratio must be 1.4–1.8 on body and label text (below 1.4 = cramped, above 1.8 = floaty); **Letter spacing** — no negative `letterSpacing` on text smaller than 14px (negative tracking on small text reduces legibility); **Line length** — paragraphs and table cells must be ≤ 680px wide (≈ 75 characters, optimal readability limit). | ≥ 3 |
| **V11** | Interaction state design | 5 mandatory interaction states — every interactive element must have: **hover** (background change ≥ 10 lightness points OR border appearance); **focus-visible** (visible focus ring on ALL backgrounds including brand-colored buttons); **active/pressed** (visually distinct from hover state); **disabled** (desaturated + opacity reduction — not opacity alone); **loading skeleton** (shape matches the expected content layout). | ≥ 4 |

Score scale: **1** = poor · **2** = needs work · **3** = acceptable · **4** = good · **5** = excellent

**Scoring rules:**
- Score 1–2 on any dimension → Critical finding
- Score 3 on V1, V3, V4, V8 → Major finding (highest visual and accessibility impact)
- Score 3 on V2, V5, V6, V7 → Minor finding
- Write one concrete, actionable observation per dimension per page (not just a number)
- **Never write a vague observation like "good overall"** — every line must name what specifically works or what specifically is wrong

**V9-V11 scoring notes**:
- V9 Gestalt: score 3 is acceptable for internal tools — flag each violated principle separately rather than averaging
- V10 Typography: line height and line length violations are observable via computed check; negative letter-spacing requires visual confirmation
- V11 Interaction states: a missing focus-visible ring on brand-colored elements is the most common failure — pay special attention to primary CTA buttons in both themes

**Code-grounded scoring**: after reading a page's component files (Step 5a), if you see a class on a subtitle in the code but the screenshot shows it rendered too light, flag it. Conversely, if a brand-accent color appears on a row-level button in the code, flag it even if the screenshot looks acceptable — it is a systematic violation.

---

## Step 4 — Page roster

> **Configure this table for your project.** Replace the examples with your actual routes.
> Aim for 8–12 pages covering your most-used and most visually complex routes.

### Standard mode roster

| # | Route | Role | Priority | What to focus on |
|---|---|---|---|---|
| P01 | `/login` | — | High | First impression, brand presence, form clarity |
| P02 | `/` | [main role] | High | Dashboard hierarchy, widget balance, CTA prominence |
| P03 | `/[list-page]` | [role] | High | List density, status badge clarity, filter chips |
| P04 | `/[form-page]` | [role] | High | Form airy-ness, field grouping, submit weight |
| P05 | `/[detail-page]` | [role] | Medium | Content hierarchy, back navigation |
| … | … | … | … | … |

### Quick mode (5 pages): P01, P02, P03, P04, [one more high-priority page]

### Full mode: all routes from `docs/sitemap.md`, grouped by role.

### Roster currency check (run before starting any mode)
Cross-reference the Standard roster above against `docs/sitemap.md`. Flag any route present in the sitemap but absent from the Standard roster with:
> ⚠️ Roster gap: `/[route]` exists in sitemap but is not in the Standard roster. Add it to the next roster update or include it manually in Full mode.

---

## Step 5 — Screenshot session

### 5a — Per-page code inspection (MANDATORY before each screenshot)

Before navigating to each page, read its primary page file AND the 1–2 most important component files.

Specifically note:
- Which CSS/Tailwind classes are used on the main container, headings, primary CTA buttons
- Whether any brand-accent color appears on row-level or inline buttons (→ V4 flag)
- Whether semantic tokens (foreground, muted-foreground, card backgrounds) are used consistently
- Whether empty state, loading, and error states are handled in the component

This code context MUST inform the scoring in Step 6 — reference it explicitly when writing observations.

### 5b — Login helper

```
1. browser_navigate [DEV_URL]/login
2. browser_wait_for: email input visible
3. browser_type email field → [credential]
4. browser_type password field → [password]
5. browser_click submit button
6. browser_wait_for: url no longer contains /login
7. Confirm role indicator in sidebar/header matches expected role
```

### 5c — Per-page capture loop

For each page in roster:

1. Read page + component files (Step 5a) BEFORE navigating
2. Switch role if needed (navigate to /login, sign out, re-login)
3. `browser_navigate` to route
4. `browser_wait_for` network idle or main content visible (2000ms max)
5. **DOM preflight validation** — run before any screenshot:
   ```js
   ({
     loaded: document.readyState === 'complete',
     hasMain: (document.querySelector('main')?.innerText?.length ?? 0) > 30,
     noError: !document.title.toLowerCase().includes('error') &&
               !document.body.innerText.includes('Application error') &&
               !document.body.innerText.includes('500')
   })
   ```
   If `hasMain === false` OR `noError === false`:
   > ⚠️ Page [route] failed preflight: [which flag was false]. Skipping screenshot — investigate page state before retrying.
   Do NOT analyse an empty or errored page — flag it and continue to the next page.

6. **Computed checks** (run in light mode after preflight passes):
   ```js
   // Typography scale — count distinct font sizes
   const fontSizes = [...new Set(
     [...document.querySelectorAll('h1,h2,h3,h4,p,td,th,label,span,a')]
       .map(el => parseFloat(getComputedStyle(el).fontSize))
       .filter(Boolean)
   )].sort((a, b) => a - b);

   // Spacing grid — spot check 3 distinct card-like containers (not just 1)
   const cardCandidates = [...document.querySelectorAll(
     '[data-slot="card"], [class*="rounded"][class*="border"], main > section, main > div > div'
   )].filter(el => el.getBoundingClientRect().height > 40).slice(0, 3);
   const cardPaddings = cardCandidates.map(card => ({
     paddingTop: parseInt(getComputedStyle(card).paddingTop),
     isGridAligned: parseInt(getComputedStyle(card).paddingTop) % 4 === 0
   }));
   const cardPad = cardPaddings[0]?.paddingTop ?? null;

   // Transition timing — check interactive elements
   const transitions = [...document.querySelectorAll('button, a[href], [role="button"]')]
     .map(el => getComputedStyle(el).transitionDuration)
     .filter(d => d && d !== '0s')
     .map(d => parseFloat(d) * 1000); // convert to ms

   // Contrast spot check — muted text on card background (light mode)
   const mutedEl = document.querySelector('[class*="muted-foreground"]') ||
                   document.querySelector('[class*="text-muted"]');
   const mutedColor = mutedEl ? getComputedStyle(mutedEl).color : null;
   const cardBg = cardCandidates[0] ? getComputedStyle(cardCandidates[0]).backgroundColor : null;

   return {
     fontSizeCount: fontSizes.length,
     fontSizes,
     cardPaddingTopPx: cardPad,
     cardPaddingSpotCheck: cardPaddings, // array of 3 samples
     cardPaddingIsGridAligned: cardPad !== null ? cardPad % 4 === 0 : null,
     transitionCount: transitions.length,
     transitionsOutOfRange: transitions.filter(ms => ms > 0 && (ms < 100 || ms > 400)),
     mutedForegroundColor: mutedColor,
     cardBackgroundColor: cardBg
   };
   ```
   Record results. Use to inform V1 (font scale), V2 (grid alignment), V7 (transition timing), V8 (contrast).

7. **Light mode screenshot**: ensure the theme toggle shows light mode (switch if needed)
   - `browser_take_screenshot` → label `visual-[P##]-light`

8. **Dark mode** (if supported): toggle theme → `browser_wait_for` 500ms
   - Run the contrast portion of computed checks again in dark mode:
     ```js
     const mutedEl = document.querySelector('[class*="muted-foreground"]') ||
                     document.querySelector('[class*="text-muted"]');
     const card = document.querySelector('[data-slot="card"], [class*="rounded"][class*="border"], main > div');
     return {
       mutedForegroundColor: mutedEl ? getComputedStyle(mutedEl).color : null,
       cardBackgroundColor: card ? getComputedStyle(card).backgroundColor : null,
       bodyColor: getComputedStyle(document.body).color,
       bodyBg: getComputedStyle(document.body).backgroundColor
     };
     ```
   - `browser_take_screenshot` → label `visual-[P##]-dark`

9. **Immediately analyse** both screenshots + computed data against V1–V11 using the code context from Step 5a

> Do not batch all screenshots then analyse. Analyse immediately after each pair — avoids context overload and produces sharper observations.

### 5d — Theme toggle interaction
Note the theme toggle location in your app here: `[THEME_TOGGLE_LOCATION]` (e.g. "sidebar bottom", "header right", "settings page").
If dark mode is not supported, skip V6 and note it in the report.

---

## Step 6 — Per-page analysis

For each page, produce:

```
### [P##] — [Route] ([Role])

**Code context**: [key classes observed in code that informed scoring — 2-3 bullet points]

**Computed data**:
- Font sizes: [N distinct values — list]
- Card padding: [Npx — grid-aligned: yes/no]
- Transitions out of range: [list ms values, or "none"]
- Muted foreground (light): [rgb value]
- Card background (light): [rgb value]
- Muted foreground (dark): [rgb value]
- Card background (dark): [rgb value]

| Dim | Score | Observation | Action needed |
|---|---|---|---|
| V1 Typographic hierarchy | N/5 | [specific observation — reference fontSizeCount from computed data] | [fix or "none"] |
| V2 Spatial rhythm | N/5 | [specific observation — reference cardPaddingIsGridAligned] | [fix or "none"] |
| V3 Visual focal point | N/5 | [specific observation] | [fix or "none"] |
| V4 Colour discipline | N/5 | [specific observation — note if brand color on row buttons; note APCA-level concern if muted text appears low-contrast] | [fix or "none"] |
| V5 Information density | N/5 | [specific observation] | [fix or "none"] |
| V6 Dark-mode polish | N/5 | [specific observation from dark screenshot] | [fix or "none"] |
| V7 Micro-polish | N/5 | [specific observation — reference transitionsOutOfRange from computed data] | [fix or "none"] |
| V8 Contrast & legibility | N/5 | [specific observation — reference computed muted/card color pairs for both themes; flag if muted text appears to fall below Lc 45 anchor] | [fix or "none"] |
| V9 Gestalt compliance | N/5 | [observe: Proximity — label↔value gaps vs section gaps; Figure/ground — content vs chrome distinction; Similarity — consistent same-function elements; Continuity — linear eye guide] | [fix or "none"] |
| V10 Typographic quality | N/5 | [observe: line height ratio from computed; negative letterSpacing on small text; paragraph/td width vs 680px] | [fix or "none"] |
| V11 Interaction states | N/5 | [observe: hover bg change; focus-visible ring on brand buttons; active/pressed distinct from hover; disabled desaturated+opacity; loading skeleton shape] | [fix or "none"] |

**Page score**: [sum]/55 — [label: Excellent ≥44 | Good 33–43 | Needs work 22–32 | Poor <22]
**Critical findings on this page**: [list or "none"]
```

---

## Step 7 — Cross-page pattern analysis

After all pages, identify:

1. **Recurring weaknesses**: dimensions that score ≤ 3 on ≥ 3 pages → systemic issue
2. **Best-in-class pages**: the 2 pages with highest scores → what patterns make them work?
3. **Worst offenders**: the 2 pages with lowest scores → highest ROI for improvement
4. **Theme gap**: average V6 score vs average of V1–V5 → if V6 is ≥ 1 point lower, dark mode needs dedicated attention
5. **Contrast gap**: average V8 score vs V6 → if V8 is lower in dark mode, token values need review
6. **Typography discipline**: pages where fontSizeCount > 5 → systemic type scale violation
7. **Code pattern violations**: list any systematic code patterns observed across pages that cause visual problems (e.g., "brand-accent on row buttons appears on N pages: [list]")
8. **V9 Gestalt consistency**: check if Gestalt violations (especially Similarity — same-function elements inconsistent) recur across multiple pages → systemic pattern to address globally
9. **V11 Interaction states**: if focus-visible ring missing on brand-colored elements across multiple pages → likely a global CSS gap, not per-page issue

---

## Step 8 — Report

```
## Visual Audit — [DATE] — [MODE] — [TARGET]
### Reference: docs/sitemap.md · [DESIGN_TOKENS_FILE] · [THEME_FILE]
### Scope: aesthetic quality · typography · spacing · visual hierarchy · colour · dark mode · polish · contrast
### Out of scope: token compliance → /ui-audit | UX flows → /ux-audit | Responsiveness → /responsive-audit

---

### Overall score

| Dimension | Avg score | Trend |
|---|---|---|
| V1 Typographic hierarchy | N.N/5 | ↑/→/↓ |
| V2 Spatial rhythm | N.N/5 | ↑/→/↓ |
| V3 Visual focal point | N.N/5 | ↑/→/↓ |
| V4 Colour discipline | N.N/5 | ↑/→/↓ |
| V5 Information density | N.N/5 | ↑/→/↓ |
| V6 Dark-mode polish | N.N/5 | ↑/→/↓ |
| V7 Micro-polish | N.N/5 | ↑/→/↓ |
| V8 Contrast & legibility | N.N/5 | ↑/→/↓ |
| V9 Gestalt compliance | N.N/5 | ↑/→/↓ |
| V10 Typographic quality | N.N/5 | ↑/→/↓ |
| V11 Interaction states | N.N/5 | ↑/→/↓ |
| **Total** | **N.N/5** | |

---

### Per-page results

| Page | Route | Score | Weakest dim | Critical? |
|---|---|---|---|---|
| P01 Login | /login | N/55 | V[N] | yes/no |
...

---

### [Per-page analysis blocks from Step 6]

---

### Systemic issues (recurring across ≥ 3 pages)

| Issue | Affected pages | Dimension | Code cause | Suggested global fix |
|---|---|---|---|---|
| [e.g. H1 and subtitle same visual weight] | P02, P04, P07 | V1 | [class observed in code] | [fix] |

---

### Systematic code violations (patterns found in code across multiple pages)

| Violation | Pages | Permanent rule | Fix |
|---|---|---|---|
| [e.g. brand color on row-level buttons] | [list] | Row-level buttons use secondary/outline variant | Replace with outline variant |

---

### Roster gaps (routes in sitemap not in standard roster)
[list new routes flagged in Step 4 roster check, or "None — roster current"]

---

### Priority improvement list

Critical first, then by impact (pages affected × dimension weight):

1. **[CRITICAL]** [page] — [dimension] — [concrete fix]
2. **[MAJOR]** [page] — [dimension] — [concrete fix]
...

---

### Best-in-class patterns (preserve these)

1. [Page]: [what works and why — pattern to replicate elsewhere]
2. [Page]: [what works and why]

---

### Worst offenders (highest ROI)

1. [Page]: score N/55 — [top 3 fixes that would most improve it]
2. [Page]: score N/55 — [top 3 fixes]
```

---

## Step 9 — Improvement offer

After the report, offer to:
- Generate an improved mockup for any page (invoke `/frontend-design`)
- Apply fixes that don't require design decisions (spacing, token replacements, typography weights)
- Run a focused dark-mode pass
- Run a focused contrast pass to verify and correct muted-foreground and border token values in both themes based on V8 results
- Do a deep-dive on a single page with before/after wireframe

**Do NOT apply visual changes without confirmation.** Spacing and typography fixes often affect multiple components and require a design decision.

---

## Interpretation notes

- **V5 density scores of 3 on data-heavy admin/list pages are acceptable** — intentional density is not a flaw. A score of 3 on a form page would be a problem.
- **V4 brand colour overuse**: if the brand colour appears on >30% of interactive elements per page, flag it even if individual uses are correct.
- **V8 computed contrast is indicative, not definitive**: `getComputedStyle` returns resolved CSS values but does not compute APCA Lc scores directly. Use the colour values as evidence to support or flag concerns — the final contrast verdict is qualitative based on what is visible in the screenshot combined with the computed colours.
- **V7 micro-polish on mobile**: not in scope for this skill — use `/responsive-audit` for that.
- **Screenshots must be analysed fresh** — do not rely on memory from previous sessions. If a screenshot shows unexpected content (wrong role, empty state when data expected), note it and analyse what is visible.
- **Preflight failures**: if more than 2 pages fail preflight, stop and report the issue before continuing — likely a dev server or auth problem, not a page-specific issue.
- **V11 focus-visible ring on brand backgrounds**: this is the single most common V11 failure. A focus ring that is visible on white backgrounds may be invisible on a brand-colored primary button. Always test with keyboard navigation in the screenshot to confirm.
- **Score denominator is /55** (11 dimensions × 5) — update any stored baselines accordingly.
