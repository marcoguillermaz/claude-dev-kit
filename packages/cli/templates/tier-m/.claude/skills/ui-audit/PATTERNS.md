# UI Audit — Pattern Reference

Reference file loaded by `/ui-audit`. Contains framework-specific grep patterns and verification methods for each check. Fill in the patterns for your stack, then remove the placeholder markers.

---

## Platform

`[web | native]`

For hybrid projects (Tauri, Electron, React Native with web views): use `web` if the UI layer is HTML/CSS-based.

---

## Dynamic route detection

`[DYNAMIC_ROUTE_PATTERN]` — pattern to identify single-record/detail pages.

| Stack | Example pattern |
|---|---|
| Next.js | `/[id]`, `/[slug]` in file path |
| SvelteKit | `/[id]` in file path |
| Django | `<int:pk>`, `<slug:slug>` in urls.py |
| Rails | `:id` in routes.rb |
| Native | Detail view controllers / fragments |

---

## Grep patterns per check

Each check in SKILL.md describes WHAT to find (the principle). This table defines HOW to find it in your stack.

> **Regex note**: patterns use ripgrep syntax. Use `|` for alternation. Character classes like `[2-9]` work as-is.

| # | Check | What to find (violation) | What to use instead | Your pattern |
|---|---|---|---|---|
| 1 | Multi-column without breakpoints | Fixed multi-column layout without responsive/adaptive breakpoint | Responsive breakpoint or adaptive size class | `[your pattern]` |
| 2 | Hardcoded colors | Hardcoded color values (hex, rgb, named colors, raw constructors) | Design system semantic token | `[your pattern]` |
| 3 | Hardcoded dark structural colors | Hardcoded dark color on structural container (card, panel, section) | Semantic surface token that adapts to light/dark mode | `[your pattern]` |
| 4 | Error indicators hardcoded | Hardcoded error/required color | Semantic error/destructive token | `[your pattern]` |
| 5 | Duplicate tokens | Same style class/token appearing twice on same element | Single application | `[your pattern]` |
| 6 | Bare empty states | Empty-state message as bare text without shared component | Dedicated empty-state component | `[your pattern]` |
| 8 | Status badges hardcoded | Status badge/chip with hardcoded color | Semantic token or shared badge component | `[your pattern]` |
| 12 | Deprecated syntax | Deprecated styling API or syntax | Current replacement API | `[your pattern]` |

### Empty-state component names (for CHECK 6 exclusion)

List the dedicated empty-state component names in your project so the grep can exclude them:

`[your empty-state component names]`

Examples: React `<EmptyState`, SwiftUI `ContentUnavailableView`, Vue `<EmptyState`, generic `<div class="empty-state"`

---

## Web-only check patterns (skip on native)

| # | Check | What to find | Your pattern |
|---|---|---|---|
| 7 | Back navigation display | Back navigation link not rendered as block element (touch target issue) | `[your pattern]` |
| 9 | Tab bars no-wrap | Tab/nav bar links missing no-wrap styling (text overflow) | `[your pattern]` |
| 10 | Uncontained table full-width | Table with full-width styling without constrained parent | `[your pattern]` |
| 11 | Horizontal overflow | Table wrapper with horizontal overflow but no max-width constraint | `[your pattern]` |

---

## Supplemental check patterns

| # | Check | What to find | Your pattern or method |
|---|---|---|---|
| S1 | Singleton duplication | Singleton UI indicator (badge, avatar) rendered more than once per viewport | `[your verification approach]` |
| S2 | Destructive action color | Destructive action using hardcoded color instead of semantic destructive token | `[your pattern]` |
| S3 | Table container width | Table container wrapper without width constraint | `[your pattern]` |
| S4 | Rendering boundary | Client-side rendering directive at root layout level (SSR only — skip if SPA or native) | `[your pattern or N/A]` |

### SSR framework detection (for S4)

S4 applies only to frameworks with server/client rendering split. List applicable frameworks and their client-side directives:

| Framework | Directive | Applicable? |
|---|---|---|
| Next.js | `"use client"` | Yes |
| Nuxt | `<ClientOnly>` | Yes |
| SvelteKit | N/A (no equivalent directive) | No |
| Angular SSR | N/A | No |
| SPA / CSR-only | N/A | Skip S4 |
| Native | N/A | Skip S4 |
