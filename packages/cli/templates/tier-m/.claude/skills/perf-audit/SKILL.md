---
name: perf-audit
description: Performance audit. Checks server/client rendering boundaries, bundle size, unnecessary re-renders, image optimization, N+1 query patterns in API routes, and unbounded data fetching. Internal app — Core Web Vitals public scoring, SEO meta tags, and Lighthouse public metrics are out of scope.
user-invocable: true
model: sonnet
context: fork
---

You are performing a performance audit of the project.

**Scope**: rendering architecture, bundle size, re-renders, image handling, API query efficiency.
**Out of scope**: Lighthouse public scores, Core Web Vitals public metrics, SEO, robots.txt — adapt scope based on whether this is a public or internal app.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/backlog-refinement.md`.**

---

## Configuration (adapt before first run)

> Replace these placeholders:
> - `[FRAMEWORK]` — e.g. `Next.js App Router`, `Remix`, `SvelteKit`, `plain React`
> - `[SITEMAP_OR_ROUTE_LIST]` — e.g. `docs/sitemap.md`
> - `[API_ROUTES_PATH]` — e.g. `app/api/`, `routes/`
> - `[BUNDLE_TOOL]` — e.g. `@next/bundle-analyzer`, `vite-bundle-visualizer`, `webpack-bundle-analyzer`
> - Note: if this is a **public-facing** app, remove the "Out of scope" restriction on Core Web Vitals

---

## Step 1 — Read structural guides

Read `[SITEMAP_OR_ROUTE_LIST]` — note:
- All page routes and their key components
- Server vs client component markers (e.g. `'use client'`)
- Data fetching patterns per route

Read `docs/backlog-refinement.md` to avoid duplicates.

---

## Step 2 — Server/Client rendering boundary audit (Explore subagent)

Launch a **single Explore subagent** (model: haiku) with the full page and component file list:

"Run all 5 checks on the provided files:

**CHECK P1 — Unnecessary 'use client' markers**
Pattern: `'use client'` on a component that does not use: browser APIs, event handlers, useState, useEffect, useContext, or third-party hooks.
Grep: find all `'use client'` declarations. For each: check if the file body contains any of the above patterns. Flag files marked as client components with no client-only code.

**CHECK P2 — Data fetching in client components**
Pattern: `useEffect` with a fetch or DB call inside a client component, when the same data could be fetched server-side.
Grep: `useEffect` blocks containing `fetch(`, `await`, or ORM calls. Flag any that perform data loading (not event-driven updates).

**CHECK P3 — Heavy library imports**
Pattern: large libraries imported in client components that should only run server-side, or imported without tree-shaking.
Grep: in client component files, look for imports of: date libraries (moment.js, dayjs full import), PDF libraries, chart libraries, i18n full bundles, lodash without path imports (`import _ from 'lodash'` instead of `import debounce from 'lodash/debounce'`).
Flag: any heavy library imported in full in a client component.

**CHECK P4 — Images without optimization**
Pattern: `<img>` tags or background-image CSS in components — these bypass framework image optimization.
Grep: `<img ` (not `<Image ` for Next.js), or inline `style={{ backgroundImage }}` with external URLs.
Flag: any non-optimized image tag in a component file.

**CHECK P5 — Serial awaits that could be parallel**
Pattern: multiple `await` statements in sequence where the operations are independent (no data dependency between them).
Grep: find functions with 3+ sequential `await` calls. Flag any where the awaited values are not used by the next await (candidates for `Promise.all`).
Example of bad pattern:
```
const a = await fetchA()  // doesn't need B
const b = await fetchB()  // doesn't need A
const c = await fetchC()  // doesn't need A or B
```"

---

## Step 3 — API query efficiency (main context)

Read the 5 most-used API routes that return lists:

**Q1 — N+1 patterns**: check for fetch-then-loop patterns (see `/skill-db` Q1 for details).

**Q2 — Missing pagination**: list endpoints with no LIMIT/page parameter.

**Q3 — Over-fetching**: routes that return all fields when only a subset is displayed in the UI. Compare route response to what the frontend actually renders.

---

## Step 4 — Bundle size check (if [BUNDLE_TOOL] is configured)

If a bundle analyzer is available, run it: `[BUNDLE_TOOL_COMMAND]`

Flag any single chunk exceeding 500KB (uncompressed). Common culprits:
- PDF/chart/editor libraries not lazy-loaded
- Multiple versions of the same library
- Development-only code in production bundle

If no bundle analyzer is available, skip this step and note it in the report.

---

## Step 5 — Produce report and update backlog

Output format:

```
## Performance Audit — [DATE]

### Rendering Architecture
| Check | Issues found | Verdict |
|---|---|---|
| P1 Unnecessary 'use client' | N | ✅/❌ |
| P2 Data fetching in client | N | ✅/❌ |
| P3 Heavy library imports | N | ✅/❌ |
| P4 Unoptimized images | N | ✅/❌ |
| P5 Serial awaits (parallelizable) | N | ✅/❌ |

### API Query Efficiency
| Check | Routes flagged | Verdict |
|---|---|---|
| Q1 N+1 patterns | N | ✅/❌ |
| Q2 Missing pagination | N | ✅/❌ |
| Q3 Over-fetching | N | ✅/❌ |

### Bundle Size
| Status | Notes |
|---|---|
| [analyzed / skipped — no analyzer configured] | |

### High findings (N)
[location — issue — estimated impact — fix]

### Medium findings (N)
[location — issue — fix]
```

For each High finding, append to `docs/backlog-refinement.md`:
- ID: `PERF-[n]`
- Priority index entry + full detail section

### Severity guide
- **High**: N+1 on high-traffic route; heavy library blocking initial render; data fetch in tight render loop
- **Medium**: unnecessary `use client` on 3+ components; serial awaits on 3+ independent calls; unoptimized images
- **Low**: single unnecessary `use client`; minor over-fetching; single serial await pair
