---
name: perf-audit
description: Performance audit. Checks server/client rendering boundaries, bundle size (external packages, tree-shaking optimizations), unnecessary re-renders, image optimization, serial await waterfalls, missing caching on server-side data fetching, N+1 query patterns, and unbounded data fetching. Internal app — Core Web Vitals public scoring, SEO meta tags, and Lighthouse public metrics are out of scope unless noted.
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:section:<section>|target:page:<route>|mode:audit|mode:apply]
---

You are performing a performance audit of the project.

**Scope**: rendering architecture, bundle size, re-renders, image handling, API query efficiency, caching patterns.
**Out of scope**: Lighthouse public scores, Core Web Vitals public metrics, SEO, robots.txt — adapt scope based on whether this is a public or internal app.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/refactoring-backlog.md`.**

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:<name>` | Focus on components and routes belonging to that section |
| `target:page:<route>` | Focus on the page and its component tree |
| No argument | Full audit — all files from sitemap |

**Operating modes:**
| Mode | Behavior |
|---|---|
| `mode:audit` (default) | Report only — no code changes |
| `mode:apply` | Apply focused, non-breaking fixes (lazy loading wrappers, `Promise.all` parallelization). Describe each change before applying. |

Announce: `Running perf-audit — scope: [FULL | target: <resolved>] — mode: [audit | apply]`
Apply the target filter to the file list in Step 1.

---

## Configuration (adapt before first run)

> Replace these placeholders:
> - `[FRAMEWORK]` — e.g. `Next.js App Router`, `Remix`, `SvelteKit`, `plain React`
> - `[SITEMAP_OR_ROUTE_LIST]` — e.g. `docs/sitemap.md`
> - `[API_ROUTES_PATH]` — e.g. `routes/`, `src/handlers/`, `api/`
> - `[BUNDLE_TOOL]` — e.g. `@next/bundle-analyzer`, `vite-bundle-visualizer`, `webpack-bundle-analyzer`
> - Note: if this is a **public-facing** app, remove the "Out of scope" restriction on Core Web Vitals

---

## Step 1 — Read structural guides

Read `[SITEMAP_OR_ROUTE_LIST]` — note:
- All page routes and their key components
- Server vs client component markers (e.g. `'use client'`) if using a framework with a client/server split
- Data fetching patterns per route

Read `docs/refactoring-backlog.md` to avoid duplicates.

---

## Step 2 — Server/Client rendering boundary audit (Explore subagent)

Launch a **single Explore subagent** (model: haiku) with the full page and component file list:

"Run all 7 checks on the provided files. For each: state total match count, list every match as `file:line — excerpt`, state PASS or FAIL.

**CHECK B1 — Unnecessary client component markers**
Pattern: `'use client'` (or equivalent framework marker) on a component that does not use: browser APIs, event handlers, useState, useEffect, useContext, useRef, or third-party browser-only hooks.
Grep: find all client component declarations. For each: check if the file body contains any of the above patterns.
Flag: any file marked as a client component with no client-only code.

**CHECK B2 — Heavy libraries in client bundle**
Grep: `import.*from` in client component files. Flag any imports of known-heavy libraries that do NOT need browser APIs and should run server-side:
- Document processing libraries (e.g. PDF generators, spreadsheet libraries) — server-only
- Rich text editors — client is acceptable IF interactive; flag if used for read-only display only
- Chart libraries — acceptable in client if interactive; flag if data-display only with no user interaction
- Any library that could plausibly run server-side to avoid shipping to the client bundle
Flag: each import with the library name and whether a server-side alternative pattern exists.

**CHECK B3 — Data fetching in client components**
**Adapt to your framework**: this check is written for React hooks. Skip if project does not use React or a React-like hooks model — apply your framework's equivalent for detecting data fetches inside reactive/client contexts.
Two-pass approach:
Pass 1 — grep `useEffect` in all client component files to find files with useEffect usage.
Pass 2 — for each file found, read up to 10 lines after each `useEffect(` call. Flag any useEffect whose callback body contains `fetch(`, `.from(`, or equivalent DB client call within those 10 lines.
The single-line regex misses multi-line patterns where the fetch call is on the line after the opening brace.
Flag: `useEffect` calls that fetch data — these defeat server rendering. Consider Server Components with Suspense, or a client-side data fetching library with proper caching.

**CHECK B4 — Unstable callbacks on memoized child components**
**Adapt to your framework**: this check is written for React `memo()`. Skip if project does not use React component memoization — apply your framework's equivalent (e.g. `computed` in Vue, `OnPush` change detection in Angular).
Grep: inline `() =>` arrow functions passed as props to components that are known to be memoized (check if child is wrapped in `memo()`). Pattern: `onX={()=>` where the prop is passed to a component declared with `memo(`.
Flag: each case. Inline arrow function props create new references on every parent render, defeating `memo`.
Note: do NOT flag `onClick` on native HTML elements.

**CHECK B5 — Serial await waterfall in server-side code**
Pattern: multiple consecutive `await` calls for independent data sources in the same async function.
Grep in server-side files: lines matching `const .* = await (fetch|db\.|svc\.|[A-Z][a-zA-Z]+\.get|[A-Z][a-zA-Z]+\.find)` that appear consecutively (within 5 lines of each other) without the first result being an input to the second call.
Flag: each pair of sequential awaits that could be parallelised with `Promise.all`. A sequential waterfall adds full latency of each call; `Promise.all` runs them concurrently.

**CHECK B6 — Missing caching on server-side data fetching calls**
Pattern: server-side data fetches that run on every request without any caching mechanism.
Grep in server-side files: DB client calls or `fetch()` calls — check if ANY of these are wrapped in a caching utility (e.g. `React.cache(`, `use cache` directive, `unstable_cache`, a custom cache wrapper, or framework-specific caching).
Flag: server-side data queries not using any caching that are called in layout-level or frequently-visited components (navigation data, user profile, configuration). These execute on every page visit.
Note: `fetch` calls have automatic request deduplication in some frameworks, but direct DB client calls typically do not.

**CHECK B7 — Images without explicit dimensions (layout shift risk)**
Grep: image components without both `width` and `height` props (or without a `fill` + parent `position:relative` pattern).
Also grep: raw `<img` tags — these bypass framework image optimization.
Flag: each unsized image. Without dimensions, the browser cannot reserve layout space — content below the image shifts when it loads."

---

## Step 3 — Bundle composition check (main context)

Read the framework config file (e.g. `next.config.ts`, `vite.config.ts`, `webpack.config.js`).

**P1 — Bundle analyzer availability**
Check if a bundle analyzer is configured or available:
- For webpack/Next.js: `@next/bundle-analyzer` or similar
- For Vite: `vite-bundle-visualizer` or `rollup-plugin-visualizer`
- Framework-native analyzer commands (e.g. `next experimental-analyze`)

If no bundle analyzer is configured or documented, flag as Medium — developers cannot easily audit bundle composition without it.

**P2 — Server-external package configuration**
Check if the framework config lists heavy server-only packages as external to the client bundle (e.g. `serverExternalPackages`, `externals`, `ssr.noExternal` exclusions).
Look for packages that should never appear in the client bundle: document processing, PDF generation, spreadsheet libraries, server-only SDKs.
Flag: any heavy server-only package that is NOT excluded from the client bundle (risk: it gets bundled into the client JS if accidentally imported from a client component path).

**P3 — Tree-shaking optimization for large icon/utility libraries**
Check if the framework config includes tree-shaking or import optimization settings for large libraries with many exports (e.g. icon libraries, utility libraries).
For frameworks that support `optimizePackageImports` or equivalent: verify that large icon libraries (icon packs with hundreds of exports) are included.
Flag: any package with 100+ exports where only a subset is used, and no import optimization is configured.

---

## Step 4 — API query efficiency (Explore subagent — separate pass)

Launch a second **Explore subagent** (model: haiku) scoped to API route files only (`[API_ROUTES_PATH]`):

"Run these 3 checks:

**CHECK Q1 — Unbounded queries (no limit on large-growth tables)**
Identify tables in the project that can grow unboundedly over time (from db-map.md or inferred from table names: events, logs, messages, orders, notifications, etc.).
Grep for those table names in DB query calls: check if `.limit(`, `.take(`, `.range(`, or a `pageSize` parameter appears within 10 lines.
Flag: each collection query without pagination bounds. Exception: export routes that intentionally fetch all records for file export — verify from context.

**CHECK Q2 — Select * (over-fetching columns)**
Grep: `\.select\('\*'\)` or `SELECT *` or equivalent no-column-list query patterns in route handlers.
Flag: each match. Fetching all columns when only a subset is needed wastes bandwidth and may expose sensitive columns.

**CHECK Q3 — N+1 patterns**
Pattern A: DB query call inside `.map(` or `for` loop.
Pattern B: `for...of` loop with sequential `await` DB calls inside the loop body.
Flag: each match. N+1 on a list endpoint means N DB queries for an N-item list — use a batch query or JOIN instead."

---

## Step 5 — Produce report and update backlog

### Output format

```
## Performance Audit — [DATE] — [SCOPE]
### Sources: [FRAMEWORK] bundle docs, your framework's documentation, web.dev/vitals

### Server/Client Boundary
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| B1 | Unnecessary client component markers | N | Medium | ✅/⚠️ |
| B2 | Heavy libraries in client bundle | N | High | ✅/⚠️ |
| B3 | Data fetching in client components | N | High | ✅/⚠️ |
| B4 | Unstable callbacks on memo'd children | N | Low | ✅/⚠️ |
| B5 | Serial await waterfall | N | High | ✅/⚠️ |
| B6 | Missing caching on server-side fetches | N | Medium | ✅/⚠️ |
| B7 | Images without dimensions (layout shift) | N | Medium | ✅/⚠️ |

### Bundle Composition
| # | Check | Verdict | Notes |
|---|---|---|---|
| P1 | Bundle analyzer availability | ✅/⚠️ | [which tool] |
| P2 | Server-external package config | ✅/⚠️ | [missing packages if any] |
| P3 | Tree-shaking for large libraries | ✅/⚠️ | [libraries flagged] |

### API Query Efficiency
| # | Check | Matches | Verdict |
|---|---|---|---|
| Q1 | Unbounded queries | N | ✅/⚠️ |
| Q2 | Select * | N | ✅/⚠️ |
| Q3 | N+1 patterns | N | ✅/⚠️ |

### Performance maturity assessment
| Dimension | Score | Notes |
|---|---|---|
| Client bundle health (B1, B2) | 🟢/🟡/🔴 | [summary] |
| Data-fetching quality (B3, B5, B6) | 🟢/🟡/🔴 | [summary] |
| Async/query efficiency (Q1, Q2, Q3) | 🟢/🟡/🔴 | [summary] |
| Image/layout stability (B7) | 🟢/🟡/🔴 | [summary] |

Scoring: 🟢 = 0 High/Critical findings · 🟡 = 1-2 Medium findings · 🔴 = any High or Critical finding

### Quick wins (implement in < 1 hour each)
[findings that are isolated, low-risk, and self-contained — e.g. add Promise.all, add lazy loading wrapper]

### Strategic refactors (require planning)
[findings that affect multiple files or need architectural decisions — e.g. move data fetch to a server-side component or handler]

### Findings requiring action ([N] total)
[file:line — check# — issue — impact — suggested fix for each]
```

### Backlog decision gate

Present all findings with severity Medium or above as a numbered decision list:

```
Found N findings at Medium severity or above. Which to add to the backlog?
[1] [CRITICAL] PERF-? — file:line — one-line description
[2] [HIGH]     PERF-? — file:line — one-line description
[3] [MEDIUM]   PERF-? — file:line — one-line description
```

Reply with the numbers to include (e.g. "1 2 4"), "all", or "none".
**Wait for explicit user response before writing anything.**

Then write ONLY the approved entries to `docs/refactoring-backlog.md`:
- Assign ID: `PERF-[n]`
- Add row to the priority index table
- Add full detail section: `### PERF-N — [title]` with File, Issue, Impact, Suggested fix

### Severity guide
- **Critical**: server-only library (document processing, PDF, spreadsheet) discovered in client bundle (B2); N+1 in dashboard/list endpoints under expected load (Q3)
- **High**: serial await waterfall with >500ms combined latency risk (B5); data fetching in client components on a primary route (B3); unbounded query on a large-growth table (Q1)
- **Medium**: missing caching on layout-level server queries called on every page load (B6); `select *` on tables with large-value columns (Q2); unsized images (B7 — layout shift risk); tree-shaking not configured for large icon/utility library (P3); unnecessary client component marker on a heavy page (B1)
- **Low**: unstable callbacks on memoized children (B4); minor code-splitting opportunities; bundle analyzer not configured (P1)

After the report, ask: "Do you want me to implement the High/Critical optimizations identified?"
- In `mode:audit` (default): do NOT make any code changes. After the report, ask: "Do you want me to implement the High/Critical optimizations?"
- In `mode:apply`: apply only the fixes listed in Quick wins. Describe each change before writing it. Do not apply Strategic refactors without explicit user confirmation.
