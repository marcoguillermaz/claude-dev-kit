# Visual Audit — Scoring Dimensions

Reference file loaded by `/visual-audit` Step 3. Contains the full rubric for all 10 visual dimensions.

---

## Dimension definitions

| Dim | Name | What to look for | Target score |
|---|---|---|---|
| **V1** | Typographic hierarchy | H1 vs body weight contrast; label vs value distinction; font size spread; muted-foreground on secondary text. **Quantitative anchor**: ≤ 5 distinct font sizes in use (from computed check); 2 font weights (semibold for headings, regular for body). Flag if computed check reveals > 5 sizes. | ≥ 4 |
| **V2** | Spatial rhythm | Consistent padding inside similar components; visual breathing room; margin harmony between sections; card internal padding uniformity. **Quantitative anchor**: padding values should be multiples of 4px (8px preferred). Flag non-grid values (14px, 6px, 10px) from the 3-element spot check in computed checks. | ≥ 4 |
| **V3** | Visual focal point | Primary CTA is the most prominent element; user's eye is guided to the most important content; no competing elements of equal weight | ≥ 4 |
| **V4** | Colour discipline | Brand colour used sparingly and intentionally; status colours follow semantic convention (green=done, amber=pending, red=destructive); no arbitrary colour decoration; brand accent token reserved for primary CTAs not row-level buttons. Evaluate in both themes. *(Contrast thresholds moved to `/accessibility-audit` C1-C3.)* | ≥ 4 |
| **V5** | Information density | Appropriate density for the page type (list = dense, form = airy); tables scannable at a glance; no cognitive overload; no empty visual regions | ≥ 3 |
| **V6** | Dark-mode polish | Dark mode legibility comparable to light mode; no washed-out colours (brand accent appearing grey, muted surfaces indistinguishable from background); badges and status indicators legible against dark surfaces; icons and illustrations do not disappear; no unexpected hue shifts in semantic tokens. Evaluate dark theme screenshot after toggle. **Score anchors**: 5 = dark mode visually equal to light; 3 = 1-2 legibility issues; 1 = dark mode unusable. | ≥ 3 |
| **V7** | Micro-polish | Hover/focus states visible; transitions not jarring; empty states and skeletons look professional; icon–text alignment clean; status badges correct size relative to surrounding text. **Timing anchor**: transitions < 100ms are imperceptible (no feedback value); > 400ms feels sluggish. Flag when computed check reveals out-of-range transition durations on interactive elements. | ≥ 3 |
| **V9** | Gestalt compliance | Evaluate 4 Gestalt principles: (1) **Proximity** — related elements grouped with tighter spacing than unrelated ones; flag if label↔value gap ≥ gap between distinct sections; (2) **Figure/ground** — content distinguishable from chrome without effort; flag dark mode text indistinguishable from bg; (3) **Similarity** — components with same function look the same cross-section; flag Badge same state with different colour/size on different pages; (4) **Continuity** — lists, columns, card grids guide the eye linearly; flag variable card sizes or inconsistent column widths. **Score anchors**: 5 = all 4 respected; 3 = 1-2 localised violations; 1 = disorienting layout. | ≥ 4 |
| **V10** | Typographic quality | From code inspection + computed check: flag `lineHeight/fontSize` ratio < 1.4 or > 1.8 on body/label text; flag negative `letterSpacing` on font < 14px; flag paragraph or td width > 680px (≈75 chars). **Score anchors**: 5 = all in range; 3 = 1 value out of range; 1 = text in conditions that impair legibility. | ≥ 4 |
| **V11** | Interaction state design | From code inspection (Step 5a) + screenshots: for every interactive element, verify: (1) hover — bg change ≥ 10 lightness points or border appearance; (2) focus-visible — ring visible on all backgrounds including brand-coloured surfaces; (3) active/pressed — visually distinct from hover; (4) disabled — desaturated colour + opacity, not just opacity; (5) loading skeleton — shape matches expected content layout. **Score anchors**: 5 = all 5 states designed; 3 = 2-3 states absent or indistinguishable; 1 = no interaction feedback. | ≥ 3 |

Score scale: **1** = poor · **2** = needs work · **3** = acceptable · **4** = good · **5** = excellent

---

## Scoring rules

- Score 1–2 on any dimension → Critical finding
- Score 3 on any dimension → Minor finding (acceptable, not blocking)
- Score ≥ 4 → no finding required
- Write one concrete, actionable observation per dimension per page (not just a number)
- **Never write a vague observation like "good overall"** — every line must name what specifically works or what specifically is wrong

---

## Code-grounded scoring

After reading a page's component files (Step 5a), if a muted foreground token is used on a subtitle in the code but the screenshot shows it rendered too light, flag it. Conversely, if the brand accent token appears on a row-level button in the code, flag it even if the screenshot looks acceptable — it's a systematic violation.

---

## Interpretation notes

- **V4 brand colour overuse**: if the brand accent token appears on row-level or repetitive buttons (not just primary CTAs), flag it even if each individual use seems minor. This is a systematic design violation.
- **V7 micro-polish on mobile**: not in scope for this skill — use `/responsive-audit` for that.
- **Screenshots must be analysed fresh** — do not rely on memory from previous sessions. If a screenshot shows unexpected content (wrong role, empty state when data expected), note it and analyse what's visible.
- **Preflight failures**: if more than 2 pages fail preflight, stop and report the issue before continuing — likely a dev server or auth problem, not a page-specific issue.
- **Score denominator is /50** (10 dimensions × 5). Bucket labels: Excellent ≥40 | Good 30-39 | Needs work 20-29 | Poor <20.
