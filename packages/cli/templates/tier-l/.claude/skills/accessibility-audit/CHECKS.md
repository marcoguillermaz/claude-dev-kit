# Accessibility Audit — Check Reference

Reference file loaded by `/accessibility-audit`. Contains severity classifications, WCAG references, APCA thresholds, and known false positive guidance.

---

## Static checks severity guide

| Check | Severity | WCAG | Summary |
|---|---|---|---|
| A1 | Critical | 4.1.2 | Icon-only interactive elements missing accessible name |
| A2 | Critical | 2.4.3 | Positive tabindex breaks natural tab order |
| A3 | High | 2.4.7 | Focus outline suppressed without visible alternative |
| A4 | Medium | 1.1.1 | Raster image missing alt attribute |
| A5 | Critical | 1.3.1, 3.3.2, 4.1.2 | Form control without associated label |
| A6 | High | 1.4.11 | Focus indicator too thin (< 2px, fails 3:1 non-text contrast) |
| A7 | Critical | 2.1.1 | Click handler on non-interactive element without keyboard support |
| A8 | High | 2.1.1 | Navigation trigger not keyboard-reachable at all breakpoints |

---

## APCA contrast thresholds (source: APCA / WCAG 3 working draft)

| Lc value | Use case |
|---|---|
| **Lc 75** | Preferred body text |
| **Lc 60** | Minimum body text |
| **Lc 45** | Label / large text (≥ 24px or bold ≥ 18px) |
| **Lc 15** | Non-text (borders, icons, dividers) |

---

## Live check severity guide

| Check | Severity | Target |
|---|---|---|
| **C1** | High (below Lc 45); Critical (below Lc 30) | Muted text on card/surface background, both themes |
| **C2** | High | Primary CTA text on brand background |
| **C3** | Medium | Border / icon contrast vs card background (must reach Lc 15) |

---

## axe-core severity mapping

| ID | axe impact | Report severity |
|---|---|---|
| **X1** | `critical` or `serious` | Critical |
| **X2** | `moderate` | High |
| **X3** | `minor` | Medium |

---

## Known false positives to suppress (document, not fix)

- `color-contrast` on muted text inside a portal overlay — axe measures the portal layer, not the semantic background. Verify manually against Step 3 C1 data.
- `aria-hidden-focus` inside a closed Dialog/Sheet — headless UI libraries with composition patterns (e.g. `asChild`, render props, `inert` attribute) manage focus internally. Verify library version before flagging.

---

## Overall severity classification

- **Critical**: keyboard trap or missing accessible name on interactive element (A1, A2, A5, A7); axe `critical`/`serious` (X1); APCA body text below Lc 30 (C1).
- **High**: focus indicator degraded (A3, A6); nav trigger unreachable (A8); axe `moderate` (X2); APCA below Lc 45 (C1, C2).
- **Medium**: decorative image missing alt (A4); axe `minor` (X3); non-text contrast below Lc 15 (C3).
