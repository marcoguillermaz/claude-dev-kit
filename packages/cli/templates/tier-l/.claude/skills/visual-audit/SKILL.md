---
name: visual-audit
description: Visual audit - typography, spacing, colour discipline, dark-mode polish, info density. Scores pages on 10 aesthetic dimensions via Playwright screenshots.
user-invocable: true
model: opus
context: fork
argument-hint: [quick|full] [target:page:<route>|target:role:<role>|target:section:<section>]
allowed-tools: Read, Glob, Grep, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_wait_for, mcp__playwright__browser_resize, mcp__playwright__browser_evaluate
---

**Scope boundary**: this skill covers aesthetic quality only. Accessibility contrast (APCA measurement, WCAG contrast thresholds, axe-core scan) lives in `/accessibility-audit` — run it for any contrast or accessibility concern. Design-token compliance → `/ui-audit`. Viewport fit → `/responsive-audit`.

## Step 0 — Mode + target detection

Parse `$ARGUMENTS`:

**Mode** (controls page roster breadth):
- `quick` → 5 key pages only
- `full` → all routes from sitemap, both themes
- No mode keyword → **standard** — all routes from `[SITEMAP_OR_ROUTE_LIST]` (light + dark)
- `critique` → deep-dive on a single `target:page:` (required). Skips scoring table; produces Gestalt + hierarchy diagnosis + concrete redesign proposals per Critical/Major finding, invoking `/frontend-design` for before/after. Must be paired with `target:page:<route>`.

**Target** (filters the page roster):
- `target:role:<role_name>` → routes accessible to that role only
- `target:section:<name>` → routes whose path contains `<name>`
- No target → NO filter — use ALL pages from the mode roster per `[SITEMAP_OR_ROUTE_LIST]`

Mode and target are **independent** — `quick target:role:<role_name>` means "run quick mode but limit to that role's routes".

**STRICT PARSING — mandatory**: derive mode and target ONLY from the explicit text in `$ARGUMENTS`. Do NOT infer target from conversation context, recent work, active block names, or project memory. If `$ARGUMENTS` contains no `target:` token → apply NO filter (use all pages from the mode roster per `[SITEMAP_OR_ROUTE_LIST]`).

Announce at start:
`Running visual-audit in [STANDARD | QUICK | FULL] mode — scope: [FULL | target: <resolved description>]`

---

## Step 1 — Load context (parallel)

Read in parallel:
1. `[SITEMAP_OR_ROUTE_LIST]` — route inventory, role mapping, key components per page
2. Global styles file (e.g., `[GLOBAL_STYLES_FILE]`) — token definitions (brand colour, base scale, semantic tokens)
3. Theme styles file (e.g., `[THEME_STYLES_FILE]`) — color scale for light/dark

Hold in working memory:
- Brand color token and its approximate hue (for V4 colour discipline checks)
- Base scale: from lightest to darkest
- Semantic token map: card background, muted background, foreground text, muted foreground text, border, brand accent
- List of all routes with their roles and key component files

Apply target filter from Step 0 to the route list from sitemap. The filtered list is the **working roster** for all subsequent steps.

---

## Step 2 — Pre-flight check

Navigate to `[DEV_URL]`. If not reachable:
> ❌ Dev server not running. Start with `[DEV_COMMAND]`, then re-run `/visual-audit`.

Record the base URL that responded — use it for all subsequent navigations.

---

## Step 3 — Visual evaluation framework

Apply these 11 dimensions to every screenshot captured.

| Dim | Name | What to look for | Target score |
|---|---|---|---|
| **V1** | Typographic hierarchy | H1 vs body weight contrast; label vs value distinction; font size spread; muted-foreground on secondary text. **Quantitative anchor**: ≤ 5 distinct font sizes in use (from computed check); 2 font weights (semibold for headings, regular for body). Flag if computed check reveals > 5 sizes. | ≥ 4 |
| **V2** | Spatial rhythm | Consistent padding inside similar components; visual breathing room; margin harmony between sections; card internal padding uniformity. **Quantitative anchor**: padding values should be multiples of 4px (8px preferred). Flag non-grid values (14px, 6px, 10px) from the 3-element spot check in computed checks. | ≥ 4 |
| **V3** | Visual focal point | Primary CTA is the most prominent element; user's eye is guided to the most important content; no competing elements of equal weight | ≥ 4 |
| **V4** | Colour discipline | Brand colour used sparingly and intentionally; status colours follow semantic convention (green=done, amber=pending, red=destructive); no arbitrary colour decoration; brand accent token reserved for primary CTAs not row-level buttons. Evaluate in both themes. *(Contrast thresholds moved to `/accessibility-audit` C1-C3.)* | ≥ 4 |
| **V5** | Information density | Appropriate density for the page type (list = dense, form = airy); tables scannable at a glance; no cognitive overload; no empty visual regions | ≥ 3 |
| **V7** | Micro-polish | Hover/focus states visible; transitions not jarring; empty states and skeletons look professional; icon–text alignment clean; status badges correct size relative to surrounding text. **Timing anchor**: transitions < 100ms are imperceptible (no feedback value); > 400ms feels sluggish. Flag when computed check reveals out-of-range transition durations on interactive elements. | ≥ 3 |
| **V9** | Gestalt compliance | Evaluate 4 Gestalt principles: (1) **Proximity** — related elements grouped with tighter spacing than unrelated ones; flag if label↔value gap ≥ gap between distinct sections; (2) **Figure/ground** — content distinguishable from chrome without effort; flag dark mode text indistinguishable from bg; (3) **Similarity** — components with same function look the same cross-section; flag Badge same state with different colour/size on different pages; (4) **Continuity** — lists, columns, card grids guide the eye linearly; flag variable card sizes or inconsistent column widths. **Score anchors**: 5 = all 4 respected; 3 = 1-2 localised violations; 1 = disorienting layout. | ≥ 4 |
| **V10** | Typographic quality | From code inspection + computed check: flag `lineHeight/fontSize` ratio < 1.4 or > 1.8 on body/label text; flag negative `letterSpacing` on font < 14px; flag paragraph or td width > 680px (≈75 chars). **Score anchors**: 5 = all in range; 3 = 1 value out of range; 1 = text in conditions that impair legibility. | ≥ 4 |
| **V11** | Interaction state design | From code inspection (Step 5a) + screenshots: for every interactive element, verify: (1) hover — bg change ≥ 10 lightness points or border appearance; (2) focus-visible — ring visible on all backgrounds including bg-brand contexts; (3) active/pressed — visually distinct from hover; (4) disabled — desaturated colour + opacity, not just opacity; (5) loading skeleton — shape matches expected content layout. **Score anchors**: 5 = all 5 states designed; 3 = 2-3 states absent or indistinguishable; 1 = no interaction feedback. | ≥ 3 |

Score scale: **1** = poor · **2** = needs work · **3** = acceptable · **4** = good · **5** = excellent

**Scoring rules:**
- Score 1–2 on any dimension → Critical finding
- Score 3 on V1, V3, V4, V9, V10 → Major finding (highest visual impact)
- Score 3 on V2, V5, V6, V7, V11 → Minor finding
- Write one concrete, actionable observation per dimension per page (not just a number)
- **Never write a vague observation like "good overall"** — every line must name what specifically works or what specifically is wrong

**Code-grounded scoring**: after reading a page's component files (Step 5a), if a muted foreground token is used on a subtitle in the code but the screenshot shows it rendered too light, flag it. Conversely, if the brand accent token appears on a row-level button in the code, flag it even if the screenshot looks acceptable — it's a systematic violation.

---

## Step 4 — Page roster

### Standard mode (default) and Full mode

Both derive the working roster from `[SITEMAP_OR_ROUTE_LIST]` already loaded in Step 1. Use **all routes with a page file** (exclude auth callback routes — they are route handlers with no renderable UI). Group by section:

- Pre-auth (login, pending, change-password, onboarding)
- Common routes (all roles)
- Multi-role routes
- Restricted routes

**How to pick the role/credential for each route**: use the "Roles" column from the route inventory. For routes accessible by multiple roles, default to the role that sees the most UI. For routes with explicit role variants, screenshot each variant separately under its own label.

Announce total route count at start: "Standard mode — N routes from route inventory."

`full` keyword is retained as an explicit synonym for scripting/pipeline use — behaviour is identical to standard.

### Quick mode (4-5 representative pages — use when speed matters)

Pick 4-5 routes that cover: (1) first impression / auth page, (2) primary dashboard, (3) key data table or list, (4) admin or restricted area. Use `[SITEMAP_OR_ROUTE_LIST]` to select.

### Critique mode

Single route only — requires `target:page:<route>`. See Step 0.

---

## Step 5 — Screenshot session

### 5a — Per-page code inspection (MANDATORY before each screenshot)

Specifically note:
- Which design tokens / CSS classes are used on the main container, headings, primary CTA buttons
- Whether the brand accent token appears on any row-level or inline button (→ V4 flag)
- Whether semantic tokens (foreground, muted foreground, card background) are used consistently
- Whether empty state, loading, and error states are handled in the component
- **Empty state quality** (→ V7/V11): does the empty state have a CTA guiding to the next action (not just a generic "no records" message)? Is the empty state text role-aware? Does the error state name the specific problem and suggest a recovery action?
- **Interaction states** (→ V11): for every custom interactive element, verify hover/focus/active/disabled/loading states are explicitly defined in the component code

This code context MUST inform the scoring in Step 6 — reference it explicitly when writing observations.

### 5b — Login helper
```
1. browser_navigate [base_url]/login
2. browser_wait_for: input[type=email] visible
3. browser_type email field → [credential]
4. browser_type password field → [test password from TEST_ACCOUNTS]
5. browser_click submit button
6. browser_wait_for: url contains /  (not /login)
7. Confirm sidebar role matches expected role
```

Credentials:

### 5c — Per-page capture loop

For each page in roster:

1. Read page + component files (Step 5a) BEFORE navigating
2. Switch role if needed (navigate to login page, sign out, re-login with the appropriate credential)
3. `browser_navigate` to route
4. `browser_wait_for` network idle or main content visible (2000ms max)
5. **DOM preflight validation** — run this evaluate before any screenshot:
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

   // Spacing grid — spot check 3 heterogeneous elements (V2 extended)
   const checkEls = [
     document.querySelector('[data-slot="card"]'),
     document.querySelector('td'),
     document.querySelector('[data-slot="dialog-content"]') || document.querySelector('form')
   ].filter(Boolean);
   const paddings = checkEls.map(el => ({
     tag: el.tagName, pad: parseInt(getComputedStyle(el).paddingTop)
   }));
   const misaligned = paddings.filter(({pad}) => pad % 4 !== 0);

   // Transition timing — check interactive elements
   const transitions = [...document.querySelectorAll('button, a[href], [role="button"]')]
     .map(el => getComputedStyle(el).transitionDuration)
     .filter(d => d && d !== '0s')
     .map(d => parseFloat(d) * 1000); // convert to ms

   return {
     fontSizeCount: fontSizes.length,
     fontSizes,
     paddingSpotCheck: paddings,
     paddingMisaligned: misaligned,
     transitionCount: transitions.length,
     transitionsOutOfRange: transitions.filter(ms => ms > 0 && (ms < 100 || ms > 400))
   };
   ```
   Record results. Use to inform V1 (font scale), V2 (padding spot-check + misaligned), V7 (transition timing). *(Contrast measurement moved to `/accessibility-audit` Step 3.)*

7. **Light mode screenshot**: ensure sidebar theme toggle shows "Light mode" (click to switch if needed)

8. **Dark mode**: click sidebar theme toggle → `browser_wait_for` 500ms → capture screenshot. *(Dark-mode contrast measurement moved to `/accessibility-audit`.)*

9. **Immediately analyse** both screenshots + computed data against V1-V7, V9-V11 using the code context from Step 5a

> Do not batch all screenshots then analyse. Analyse immediately after each pair — avoids context overload and produces sharper observations.

### 5d — Theme toggle interaction
The sidebar theme toggle (Switch component at bottom of sidebar) controls light/dark.
- In light mode: Switch is unchecked, label shows "Light mode"
- In dark mode: Switch is checked, label shows "Dark mode"
- Click the row containing the Switch to toggle (the full div is the click target)

---

## Step 6 — Per-page analysis

For each page, produce:

```
### [P##] — [Route] ([Role])

**Code context**: [key classes observed in code that informed scoring — 2-3 bullet points]

**Computed data**:
- Font sizes: [N distinct values — list]
- Padding spot-check: [{tag: tagName, pad: Npx}] · Misaligned: [list or "none"]
- Transitions out of range: [list ms values, or "none"]

| Dim | Score | Observation | Action needed |
|---|---|---|---|
| V1 Typographic hierarchy | N/5 | [specific observation — reference fontSizeCount from computed data] | [fix or "none"] |
| V2 Spatial rhythm | N/5 | [specific observation — reference paddingMisaligned from computed data] | [fix or "none"] |
| V3 Visual focal point | N/5 | [specific observation] | [fix or "none"] |
| V4 Colour discipline | N/5 | [specific observation — note if brand accent on row buttons] | [fix or "none"] |
| V5 Information density | N/5 | [specific observation] | [fix or "none"] |
| V6 Dark-mode polish | N/5 | [specific observation from dark screenshot — reference score anchors; note OKLCH hue shifts, washed-out tones, badge legibility] | [fix or "none"] |
| V7 Micro-polish | N/5 | [specific observation — reference transitionsOutOfRange; note empty state CTA quality from Step 5a] | [fix or "none"] |
| V9 Gestalt compliance | N/5 | [proximity grouping, figure/ground distinction, similarity across sections, continuity of lists/grids — specific observation] | [fix or "none"] |
| V10 Typographic quality | N/5 | [line-height ratio, letter-spacing on small fonts, line length on text/td — reference computed data if available] | [fix or "none"] |
| V11 Interaction state design | N/5 | [hover/focus/active/disabled/loading states — reference code inspection from Step 5a] | [fix or "none"] |

**Page score**: [sum]/50 — [label: Excellent ≥40 | Good 30-39 | Needs work 20-29 | Poor <20]
**Critical findings on this page**: [list or "none"]
```

---

## Step 7 — Cross-page pattern analysis

After all pages, identify:

1. **Recurring weaknesses**: dimensions that score ≤ 3 on ≥ 3 pages → systemic issue
2. **Best-in-class pages**: the 2 pages with highest scores → what patterns make them work?
3. **Worst offenders**: the 2 pages with lowest scores → highest ROI for improvement
4. **Theme gap**: average V6 score vs average of V1–V5 → if V6 is ≥ 1 point lower, dark mode needs dedicated attention
5. **Typography discipline**: pages where fontSizeCount > 5 → systemic type scale violation; pages where V10 scores ≤ 3 → line-height or line-length issues
6. **Gestalt patterns**: pages where V9 scores ≤ 3 → proximity or similarity violations across sections
7. **Interaction debt**: pages where V11 scores ≤ 3 → missing hover/focus/loading states (cross-reference with V7)
8. **Code pattern violations**: list any systematic code patterns observed across pages that cause visual problems (e.g., "brand accent on row buttons appears on 4 pages: [list]")

---

## Step 8 — Report

```
## Visual Audit — [DATE] — [MODE] — [TARGET]
### Reference: [SITEMAP_OR_ROUTE_LIST] · [GLOBAL_STYLES_FILE] · [THEME_STYLES_FILE]
### Scope: aesthetic quality · typography · spacing · visual hierarchy · colour · dark mode · polish
### Out of scope: token compliance → /ui-audit | Accessibility + contrast → /accessibility-audit | UX flows → /ux-audit | Responsiveness → /responsive-audit

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
| V9 Gestalt compliance | N.N/5 | ↑/→/↓ |
| V10 Typographic quality | N.N/5 | ↑/→/↓ |
| V11 Interaction state design | N.N/5 | ↑/→/↓ |
| **Total** | **N.N/5** | |

---

### Per-page results

| Page | Route | Score | Weakest dim | Critical? |
|---|---|---|---|---|
| P01 Login | /login | N/50 | V[N] | yes/no |
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

| Violation | Pages | PERMANENT RULE | Fix |
|---|---|---|---|
| [e.g. brand accent on row buttons] | [list] | Row-level buttons use variant="outline" | Replace with variant="outline" |

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

1. [Page]: score N/50 — [top 3 fixes that would most improve it]
2. [Page]: score N/50 — [top 3 fixes]
```

---

## Step 9 — Improvement offer

After the report:

> "Do you want me to go deeper or generate concrete visual proposals? I can:
>
> - **Critique mode**: `/visual-audit critique target:page:<route>` — deep-dive on a single page: Gestalt + hierarchy diagnosis + concrete redesign proposals with before/after via `/frontend-design`
> - **Standalone mockup**: invoke `/frontend-design` to generate an improved alternative (standalone HTML, faithful to the project's tokens)
> - **Targeted fix**: apply improvements that don't require design decisions (e.g., padding spacing, font weights, missing tokens)
> - **Dark mode pass**: focus exclusively on improving the dark theme across all pages
> - **Gestalt pass**: in-depth V9 analysis on all pages with concrete fixes for proximity and similarity violations

For contrast verification and WCAG coverage, run `/accessibility-audit` separately — it owns both APCA measurement and the full WCAG 2.2 scan."

**Do NOT apply visual changes without confirmation.** Many of the fixes touch spacing and typography — they affect multiple components and require design decision, not just code.

---

## Step 10 — Screenshot cleanup

After the report is delivered and the improvement offer is presented, clean up the temp directory:
```bash
```

Run this unconditionally at session end — screenshots are only needed during analysis and must not persist.

---

## Notes for interpretation

- **V4 brand colour overuse**: if the brand accent token appears on row-level buttons (not just primary CTAs), flag it even if each individual use seems minor. This is a PERMANENT RULE violation.
- **V7 micro-polish on mobile**: not in scope for this skill — use `/responsive-audit` for that.
- **Screenshots must be analysed fresh** — do not rely on memory from previous sessions. If a screenshot shows unexpected content (wrong role, empty state when data expected), note it and analyse what's visible.
- **Preflight failures**: if more than 2 pages fail preflight, stop and report the issue before continuing — likely a dev server or auth problem, not a page-specific issue.
- **Score denominator is /50** (10 dimensions × 5). Bucket labels: Excellent ≥40 | Good 30-39 | Needs work 20-29 | Poor <20. Previous /55 baseline is no longer comparable — contrast is now scored by `/accessibility-audit`.

---

## Stack adaptation (fill after scaffold)

<!-- Fill these values for your stack, then remove this comment block. -->
<!-- Values left as placeholders will trigger warnings in `cdk doctor`. -->

| Key | Your value | Examples |
|---|---|---|
| Global styles file | `[GLOBAL_STYLES_FILE]` | `app/globals.css`, `src/styles/global.css`, `assets/main.scss` |
| Theme styles file | `[THEME_STYLES_FILE]` | `app/themes.css`, `src/styles/themes.css`, `tailwind.config.ts` |
| Brand accent token | *(document your design system's brand token name)* | `bg-brand`, `bg-primary`, `--color-accent` |
| Semantic token names | *(document your card/muted/foreground tokens)* | `bg-card` / `bg-muted` / `text-foreground` / `text-muted-foreground` |
