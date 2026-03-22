---
name: visual-audit
description: Evaluate the aesthetic quality and visual polish of app pages. Takes live screenshots via Playwright, analyses each on 7 visual dimensions (typography, spacing, hierarchy, colour, density, dark-mode, micro-polish), and produces a scored report with concrete improvement suggestions. Use /skill-dev for code quality, /ux-audit for UX flows, /responsive-audit for breakpoints.
user-invocable: true
model: sonnet
context: fork
argument-hint: [quick|full|page:<route>|role:<role>]
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

## Mode detection

Check `$ARGUMENTS`:
- Empty / not provided → **standard mode** — 10 key pages, light + dark mode
- `quick` → 5 pages only (fill in quick list in Step 4)
- `full` → all routes from sitemap, both themes
- `page:<route>` → single page deep-analysis
- `role:<role>` → all pages for a given role

Announce at start: `Running visual-audit in [STANDARD | QUICK | FULL | PAGE:<route> | ROLE:<role>] mode.`

---

## Step 1 — Load context (parallel)

Read in parallel:
1. `docs/sitemap.md` or `[SITEMAP_OR_ROUTE_LIST]` — route inventory, role mapping
2. `[DESIGN_TOKENS_FILE]` — extract brand color token, semantic token map
3. `[THEME_FILE]` — extract light/dark color scales

Hold in working memory:
- Brand color token and its approximate hue
- Semantic token map: background, card, muted, foreground, muted-foreground, border
- Whether a dark mode is supported

---

## Step 2 — Pre-flight check

Navigate to `[DEV_URL]`. If not reachable:
> ❌ Dev server not running. Start it then re-run `/visual-audit`.

---

## Step 3 — Visual evaluation framework

Apply these 7 dimensions to every screenshot captured.

| Dim | Name | What to look for | Target score |
|---|---|---|---|
| **V1** | Typographic hierarchy | H1 vs body weight contrast; label vs value distinction; font size spread | ≥ 4 |
| **V2** | Spatial rhythm | Consistent padding inside similar components; visual breathing room; margin harmony | ≥ 4 |
| **V3** | Visual focal point | Primary CTA is most prominent; eye is guided to most important content; no competing equal-weight elements | ≥ 4 |
| **V4** | Colour discipline | Brand colour used sparingly; status colours follow semantic convention (green=done, amber=pending, red=destructive); no arbitrary colour decoration | ≥ 4 |
| **V5** | Information density | Appropriate density for page type (list = dense, form = airy); scannable at a glance; no cognitive overload | ≥ 3 |
| **V6** | Dark-mode polish | Dark theme looks intentional, not inverted; borders visible without being harsh; badge colours adapt; no washed-out text | ≥ 4 |
| **V7** | Micro-polish | Hover/focus states visible; transitions not jarring; empty states and skeletons look professional; icon–text alignment clean | ≥ 3 |

Score scale: **1** = poor · **2** = needs work · **3** = acceptable · **4** = good · **5** = excellent

**Scoring rules:**
- Score 1–2 on any dimension → Critical finding
- Score 3 on V1, V3, V4 → Major finding (highest visual impact)
- Score 3 on V2, V5, V6, V7 → Minor finding
- One concrete, actionable observation per dimension per page (not just a score)

---

## Step 4 — Page roster

> **Configure this table for your project.** Replace the examples with your actual routes.
> Aim for 8–12 pages covering your most-used and most visually complex routes.

### Standard mode roster

| # | Route | Role | Priority | Focus |
|---|---|---|---|---|
| P01 | `/login` | — | High | First impression, brand presence, form clarity |
| P02 | `/` | [main role] | High | Dashboard hierarchy, CTA prominence |
| P03 | `/[list-page]` | [role] | High | List density, status badge clarity |
| P04 | `/[form-page]` | [role] | High | Form airy-ness, field grouping, submit weight |
| P05 | `/[detail-page]` | [role] | Medium | Content hierarchy, back navigation |
| … | … | … | … | … |

### Quick mode (5 pages): P01, P02, P03, P04, [one more high-priority page]

---

## Step 5 — Screenshot session

### Login helper

```
1. browser_navigate [DEV_URL]/login
2. browser_wait_for: email input visible
3. browser_type email field → [credential]
4. browser_type password field → [password]
5. browser_click submit button
6. browser_wait_for: url no longer contains /login
7. Confirm role indicator in sidebar/header matches expected role
```

### Per-page capture loop

For each page in roster:

1. Switch role if needed (navigate to /login, sign out, re-login)
2. `browser_navigate` to route
3. `browser_wait_for` main content visible (1500ms max)
4. **Light mode**: take screenshot → save as `visual-[P##]-light.png`
5. **Dark mode** (if supported): toggle theme → wait 500ms → screenshot → save as `visual-[P##]-dark.png`
6. Read both screenshots (Claude Vision)
7. **Immediately analyse** both on V1–V7 before moving to the next page

> Do not batch all screenshots then analyse. Analyse immediately after each pair.

### Theme toggle
If your app has a theme toggle (button, switch, or system preference): interact with it between light and dark screenshots. Note its location in the UI here: `[THEME_TOGGLE_LOCATION]` (e.g. "sidebar bottom", "header right", "settings page").

If dark mode is not supported, skip V6 and note it in the report.

---

## Step 6 — Per-page analysis

```
### [P##] — [Route] ([Role])

| Dim | Score | Observation | Action needed |
|---|---|---|---|
| V1 Typographic hierarchy | N/5 | [specific observation] | [fix or "none"] |
| V2 Spatial rhythm | N/5 | [specific observation] | [fix or "none"] |
| V3 Visual focal point | N/5 | [specific observation] | [fix or "none"] |
| V4 Colour discipline | N/5 | [specific observation] | [fix or "none"] |
| V5 Information density | N/5 | [specific observation] | [fix or "none"] |
| V6 Dark-mode polish | N/5 | [specific observation or "N/A"] | [fix or "none"] |
| V7 Micro-polish | N/5 | [specific observation] | [fix or "none"] |

**Page score**: [sum]/35 — [Excellent ≥28 | Good 21–27 | Needs work 14–20 | Poor <14]
**Critical findings**: [list or "none"]
```

---

## Step 7 — Cross-page pattern analysis

After all pages:

1. **Recurring weaknesses**: dimensions scoring ≤ 3 on ≥ 3 pages → systemic issue
2. **Best-in-class pages**: the 2 highest-scoring pages → what patterns make them work?
3. **Worst offenders**: the 2 lowest-scoring pages → highest ROI for improvement
4. **Theme gap**: if average V6 is ≥ 1 point below average of V1–V5 → dark mode needs dedicated attention

---

## Step 8 — Report

```
## Visual Audit — [DATE] — [MODE]
### Scope: typography · spacing · hierarchy · colour · density · dark mode · polish

---

### Overall score

| Dimension | Avg score |
|---|---|
| V1 Typographic hierarchy | N.N/5 |
| V2 Spatial rhythm | N.N/5 |
| V3 Visual focal point | N.N/5 |
| V4 Colour discipline | N.N/5 |
| V5 Information density | N.N/5 |
| V6 Dark-mode polish | N.N/5 |
| V7 Micro-polish | N.N/5 |
| **Total** | **N.N/5** |

---

### Per-page results

| Page | Route | Score | Weakest dim | Critical? |
|---|---|---|---|---|
| P01 Login | /login | N/35 | V[N] | yes/no |

---

[Per-page analysis blocks from Step 6]

---

### Systemic issues (recurring across ≥ 3 pages)

| Issue | Affected pages | Dimension | Suggested global fix |
|---|---|---|---|
| [e.g. H1 and subtitle same visual weight] | P02, P04, P07 | V1 | Increase H1 weight; subtitle to muted-foreground |

---

### Priority improvement list

1. **[CRITICAL]** [page] — [dimension] — [concrete fix]
2. **[MAJOR]** [page] — [dimension] — [concrete fix]

---

### Best-in-class patterns (preserve these)
1. [Page]: [what works and why]
2. [Page]: [what works and why]

### Worst offenders (highest ROI)
1. [Page]: score N/35 — [top 3 fixes]
2. [Page]: score N/35 — [top 3 fixes]
```

---

After the report, offer to:
- Generate an improved mockup for any page (invoke `/frontend-design`)
- Apply fixes that don't require design decisions (spacing, token replacements, typography weights)
- Run a focused dark-mode pass
- Do a deep-dive on a single page with before/after wireframe

**Do NOT apply visual changes without confirmation.** Spacing and typography fixes often affect multiple components and require a design decision.

---

## Interpretation notes

- **V5 density scores of 3 on data-heavy admin/list pages are acceptable** — intentional density is not a flaw. A score of 3 on a form page would be a problem.
- **V4 brand colour overuse**: if the brand colour appears on >30% of interactive elements per page, flag it even if individual uses are correct.
- **Screenshots must be analysed fresh** — do not rely on memory from previous sessions. If a screenshot shows unexpected content (wrong role, empty state), note it and analyse what's visible.
