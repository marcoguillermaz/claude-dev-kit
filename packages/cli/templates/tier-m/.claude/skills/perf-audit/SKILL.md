---
name: perf-audit
description: Performance audit: bundle size, lazy loading, data fetching, caching, N+1 queries, image optimization. Native mode checks memory, I/O, launch weight, energy.
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:section:<section>|target:page:<route>|mode:audit|mode:apply]
---

## Configuration (adapt before first run)

> Replace these placeholders:
> - `[FRAMEWORK]` — e.g. `Next.js App Router`, `Remix`, `SvelteKit`, `plain React`
> - `[SITEMAP_OR_ROUTE_LIST]` — e.g. `docs/sitemap.md`
> - `[API_ROUTES_PATH]` — e.g. `routes/`, `src/handlers/`, `api/`
> - `[BUNDLE_TOOL]` — e.g. `@next/bundle-analyzer`, `vite-bundle-visualizer`, `webpack-bundle-analyzer`
> - Note: if this is a **public-facing** app, remove the "Out of scope" restriction on Core Web Vitals

## Applicability check

Before any other step: read `CLAUDE.md` and check the Framework and Language fields.

- If the project is a **web application** (Framework is NOT `N/A — native app` and NOT `N/A — no web frontend`): proceed to **Step 1 — Web Performance Audit** (Steps 1–5).
- If the project is a **native or backend-only application** (Framework is `N/A — native app` or `N/A — no web frontend`): skip Steps 1–5 and proceed directly to **Step 6 — Native/Backend Performance Audit**.



## Context and scope

**In scope**: bundle composition, server/client component boundaries, dynamic rendering triggers, lazy loading, data fetching efficiency (caching, parallelism, N+1), re-render patterns, image optimization. For native stacks: algorithmic complexity, stack-specific hot-path patterns, memory management, launch weight, energy impact, binary size.
**Out of scope**: SEO, CWV as ranking signals, `robots.txt`, `sitemap.xml`, OG tags, Lighthouse site audit, accessibility (→ `/ui-audit`), DB schema (→ `/skill-db`).
**Default mode**: audit (report only, no code changes). `mode:apply` makes focused non-breaking fixes.

**CWV reference (informational only — not primary deliverable for this internal app):**

| Metric | Good | Needs work | Poor | Primary cause |
|---|---|---|---|---|
| LCP | ≤ 2.5s | 2.5–4s | > 4s | Slow server response, render-blocking resources |
| CLS | ≤ 0.1 | 0.1–0.25 | > 0.25 | Unsized images, dynamic content above fold |
| INP | ≤ 200ms | 200–500ms | > 500ms | Blocking JS on event handlers |

Source: web.dev/articles/vitals. Use these thresholds only as triage anchors — not as primary deliverables.

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for `target:` and `mode:` tokens.

**Operating modes:**
| Mode | Behavior |
|---|---|
| `mode:audit` (default) | Report only — no code changes |
| `mode:apply` | Apply focused, non-breaking fixes (lazy loading wrappers, `Promise.all` parallelization). Describe each change before applying. |

**Target resolution:**
| Pattern | Meaning |
|---|---|
| `target:page:/dashboard` | Focus on the dashboard and its component tree (example) |
| No argument | **Full audit — ALL page files + layout files + lib files + API routes from sitemap.md. Maximum depth.** |

**STRICT PARSING — mandatory**: derive target ONLY from the explicit text in `$ARGUMENTS`. Do NOT infer target from conversation context, recent work, active block names, or project memory. If `$ARGUMENTS` contains no `target:` token → full audit across ALL files from sitemap.md at maximum depth. When a target IS provided → act with maximum depth and completeness on that specific scope only.

Announce: `Running perf-audit — scope: [FULL | target: <resolved>] — mode: [audit | apply]`
Apply the target filter to the file list in Step 1.

---

## Step 1 — Build file inventory

- All page files in scope
- All heavy components (those with chart, calendar, data table, Tiptap editor — high rendering cost)
- All `app/**/layout.tsx` files (always include regardless of target — critical for B1 Flag B and B8)
- All lib service files directly called from page/component files (`lib/svc.ts`, `lib/queries.ts`, etc.) — exclude pure utility files with no DB calls
- `next.config.ts` (or `next.config.js`)

Read `docs/refactoring-backlog.md` — note existing `PERF-` entries to avoid duplicates.

---

## Step 2 — Server/Client boundary checks (Explore agent)

Launch a **single Explore subagent** (model: haiku) with all page, component, and lib files from Step 1:

"Run all 9 checks below. For each: state total match count, list every match as `file:line — excerpt`, and state PASS or FAIL.

**CHECK B1 — Unnecessary or over-broad 'use client' directives**
Grep: `'use client'` across all `app/**/*.tsx` files.
For each match: check if the file uses ANY of: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, `onClick`, `onChange`, `useRouter`, `usePathname`, `useSearchParams`.
Flag A: any `'use client'` file that uses NONE of these patterns. It may be a Server Component incorrectly marked as client.
Flag B: any `'use client'` in a `layout.tsx` or `*Provider*.tsx` file that also imports 5 or more child components (count `import` statements targeting `./` or `../` paths). These files wrap large subtrees — if only a small interactive portion (theme toggle, session sync) requires browser APIs, extracting it into an island would allow the layout to become a Server Component.
Exclude `app/(app)/layout.tsx` from Flag B — it intentionally uses `'use client'` for session and theme synchronization (known pattern).

**CHECK B2 — Heavy libraries in client bundle**
Grep: `import.*from` in `'use client'` files. Flag any imports of these known-heavy libraries that do NOT need browser APIs and should be moved to Server Components:
- `xlsx`, `pdf-lib`, `pdfjs-dist` — document processing (server-only)
- `@tiptap/*` — rich text editor (client is acceptable IF interactive; flag if read-only render only)
- Chart libraries (e.g. `recharts`, `chart.js`) — acceptable in client if interactive; flag if data-display only
- Any library > ~50KB that could run server-side
Flag: each import with the library name and whether a server-side equivalent pattern exists.

**CHECK B3 — useEffect for data fetching in client components**
Two-pass approach:
Pass 1 — grep `useEffect` in all `'use client'` files to find files with useEffect usage.
Pass 2 — for each file found, read up to 10 lines after each `useEffect(` call. Flag any useEffect whose callback body contains `fetch(`, `.from(`, `svc.`, or `supabase.` within those 10 lines.
The single-line regex `useEffect.*fetch\(` misses multi-line patterns where the fetch call is on the line after the opening brace.
Flag: `useEffect` calls that fetch data — these defeat server rendering. Consider Server Components with `Suspense`, or SWR/React Query for client-side caching with proper revalidation.

**CHECK B4 — Memo/callback missing on stable callbacks passed to child components**
Grep: inline `() =>` arrow functions passed as props to components that are known to be memoized (check if child is wrapped in `memo()`). Pattern: `onX={()=>` where the prop is passed to a component declared with `memo(`.
Flag: each case. Inline arrow function props create new references on every parent render, defeating `memo`.
Note: do NOT flag `onClick` on native HTML elements — React batches these internally.

**CHECK B5 — Sequential await waterfall in Server Components**
Pattern: two or more consecutive `await` calls for independent data sources in the same async function.
Grep in server component files (files WITHOUT `'use client'`): lines matching `const .* = await (fetch|svc\.|supabase\.)` that appear consecutively (i.e., within 5 lines of each other) without the first result being an input to the second call.
Flag: each pair of sequential awaits that could be parallelised with `Promise.all`. A sequential waterfall adds full latency of each call one after the other; `Promise.all` runs them concurrently.
Example of violation: `const a = await getA(); const b = await getB();` where b doesn't depend on a.
Example of correct: `const [a, b] = await Promise.all([getA(), getB()]);`

**CHECK B6 — Missing caching on repeated Server Component queries**
Pattern: data fetches that run on every request without caching in Server Components.
Grep in server component files: `await svc.from(|await supabase.from(` — check if ANY of these are wrapped in `React.cache(` or called inside a function decorated with `use cache` directive.
Flag: server-side Supabase queries that are not cached and are called in layout-level or frequently-visited components (e.g. navigation data, user profile, community list). These execute on every page visit.
Note: `fetch` calls have automatic deduplication within a request, but Supabase client calls do NOT — they always hit the DB.

**CHECK B7 — Images without explicit dimensions (CLS risk)**
Two-pass approach:
Pass 1 — grep `<Image` across all `.tsx` files to collect all Next.js Image usages.
Pass 2 — for each match, read up to 5 lines after the opening `<Image` tag. Flag if NEITHER of these conditions is met: (a) `width=` appears within those 5 lines, OR (b) `fill` prop appears within those 5 lines.
Do NOT use a single-line regex with negative lookbehind — it fails when props are on separate lines.
Also grep: `<img` (raw img tags — covered by /ui-audit but also a CLS risk here).
Flag: each unsized image. Without dimensions, the browser cannot reserve layout space → content below the image shifts when it loads = CLS violation.

**CHECK B8 — Dynamic rendering triggers (accidental force-dynamic)**
Pattern A: `cookies()` or `headers()` called inside `app/**/layout.tsx` — opts the ENTIRE route subtree into dynamic rendering.
Grep (two separate greps to avoid shell OR issues): `cookies()` in `app/**/layout.tsx`, then `headers()` in `app/**/layout.tsx`.
Exclude `app/(app)/layout.tsx` — it intentionally calls `cookies()` for session and theme synchronization.
For any other layout match: check whether the call could move to a child Server Component or Server Action.
Pattern B: `export const dynamic = 'force-dynamic'` in page or layout files.
Grep: `force-dynamic` across `app/**/*.tsx` and `app/**/*.ts`.
Flag: each occurrence. Verify from context whether intentional (auth-dependent, real-time data) or avoidable with proper `React.cache` or component restructuring.
Pattern C: `no-store` cache directive in fetch calls inside layout files — opts the route subtree out of static generation.
Grep: `'no-store'` or `"no-store"` in `app/**/layout.tsx` files (use exact string match — avoid broad `cache.*no-store` which matches comments and variable names).
Flag: each match with impact explanation.

**CHECK B9 — Missing lazy loading for heavy client components**
Two-pass approach (run each grep separately — do not combine with `|`):
Pass 1 — run four separate greps in `app/**/*.tsx`:
  - `from '@tiptap`
  - `import.*recharts`
  - `import.*chart\.js`
Collect all matching files.
Pass 2 — for each file from Pass 1: check if `next/dynamic` is also imported in the same file (grep `from 'next/dynamic'`).
Flag: any file where a heavy component is statically imported AND `next/dynamic` is NOT present — the component loads eagerly in the initial bundle.
If both a static import and `next/dynamic` are present in the same file, read the file to confirm the heavy component itself is the one wrapped in `dynamic()` (not a different component).
Note: `ssr: false` is acceptable for browser-only components (calendar, charts). `ssr: true` (default) is preferable when the component can pre-render."

---

## Step 3 — Bundle composition check (main context)

Read `next.config.ts` (or `next.config.js`).

**P1 — Bundle analyzer availability**
Check if `@next/bundle-analyzer` is configured or `npx next experimental-analyze` is available:
- Turbopack native analyzer (Next.js v16.1+): `npx next experimental-analyze` — no config needed, interactive module graph with import chain tracing

Since this project uses Next.js 16, both options are available. If neither is configured/documented, flag as Medium — developers cannot easily audit bundle composition.

**P2 — `serverExternalPackages` coverage**
Check if `serverExternalPackages` in `next.config.ts` includes all heavy server-only packages.
Known mandatory entries for this project: `['pdfjs-dist', 'pdf-lib']` (documented in CLAUDE.md).
Also check for: `xlsx`, `docxtemplater`, `pizzip` — large packages that should never be client-bundled.
Flag: any heavy server-only package that is NOT in `serverExternalPackages` (risk: it gets bundled into the client JS if accidentally imported from a `'use client'` path).

**P3 — `optimizePackageImports` for icon/utility libraries**
Check if `optimizePackageImports` in `next.config.ts` includes large packages with many exports that are partially used.
For this project, check: `lucide-react` (hundreds of icons — tree-shaking is critical).
Note: Next.js automatically optimizes some packages (check the official list). If `lucide-react` is already auto-optimized, note as PASS.
Flag: any package with 100+ exports where only a subset is used, not in `optimizePackageImports`.

---

## Step 4 — API query efficiency (Explore agent — separate pass)

"Run these 3 checks:

**CHECK Q1 — Unbounded queries (no limit on large-growth tables)**
Flag: each collection query without pagination bounds. Exception: export routes that intentionally fetch all for CSV/XLSX — verify from context.

**CHECK Q2 — Select * (over-fetching columns)**
Grep: `\.select\('\*'\)` in route handlers.
Flag: each match. Fetching all columns is a performance and security risk — columns with large values (e.g. `body`, `content`, blob URLs) are sent over the wire unnecessarily.

**CHECK Q3 — N+1 patterns**
Pattern A: `.from(table).select` inside `.map(` or `for` loop.
Pattern B: `for...of` with `await svc.from(` inside the loop body.
Flag: each match. N+1 on a list endpoint means N DB queries for an N-item list — use `.in([ids])` batch query or an embedded select instead."

---

## Step 5 — Produce report and update backlog

### Output format

```
## Perf Audit — [DATE] — [SCOPE] — mode: [audit | apply]
### Sources: Next.js bundle docs (v16), web.dev/vitals, React docs

### Executive summary
- [2-8 bullets: one per Critical/High finding or notable PASS. Lead with the most impactful issue.]

### Scope reviewed
- Routes/components scanned: [N files]
- Config files: next.config.ts [present/absent]
- Bundle evidence: bundle analyzer [configured / not configured]
- Assumptions: [any scope limitations, e.g. "layout files excluded from B8 — none found"]

### Core Web Vitals thresholds (reference)
| Metric | Good | Needs work | Poor | Primary cause |
|---|---|---|---|---|
| LCP | ≤ 2.5s | 2.5–4s | > 4s | Slow server response, render-blocking resources |
| CLS | ≤ 0.1 | 0.1–0.25 | > 0.25 | Unsized images, dynamic content above fold |
| INP | ≤ 200ms | 200–500ms | > 500ms | Blocking JS on event handlers |

### Server/Client Boundary
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| B1 | Unnecessary / over-broad 'use client' | N | Medium | ✅/⚠️ |
| B2 | Heavy libraries in client bundle | N | High | ✅/⚠️ |
| B3 | useEffect data fetching | N | High | ✅/⚠️ |
| B4 | Unstable callbacks on memo'd children | N | Low | ✅/⚠️ |
| B5 | Sequential await waterfall | N | High | ✅/⚠️ |
| B6 | Uncached server queries | N | Medium | ✅/⚠️ |
| B7 | Images without dimensions (CLS) | N | Medium | ✅/⚠️ |
| B8 | Dynamic rendering triggers | N | High | ✅/⚠️ |
| B9 | Missing lazy loading for heavy components | N | Medium | ✅/⚠️ |

### Bundle Composition
| # | Check | Verdict | Notes |
|---|---|---|---|
| P1 | Bundle analyzer availability | ✅/⚠️ | [which tool] |
| P2 | serverExternalPackages | ✅/⚠️ | [missing packages if any] |
| P3 | optimizePackageImports | ✅/⚠️ | [lucide-react status] |

### API Query Efficiency
| # | Check | Matches | Verdict |
|---|---|---|---|
| Q1 | Unbounded queries | N | ✅/⚠️ |
| Q2 | Select * | N | ✅/⚠️ |
| Q3 | N+1 patterns | N | ✅/⚠️ |

### Performance maturity assessment
| Dimension | Score | Notes |
|---|---|---|
| Boundary discipline (B1, B2, B9) | 🟢/🟡/🔴 | [summary] |
| Client bundle health (P1, P2, P3) | 🟢/🟡/🔴 | [summary] |
| Data-fetching quality (B3, B5, B6) | 🟢/🟡/🔴 | [summary] |
| Async/query efficiency (Q1, Q2, Q3) | 🟢/🟡/🔴 | [summary] |
| Rendering efficiency (B4, B8) | 🟢/🟡/🔴 | [summary] |
| Image / layout stability (B7) | 🟢/🟡/🔴 | [summary] |
Scoring: 🟢 = 0 High/Critical findings · 🟡 = 1-2 Medium findings · 🔴 = any High or Critical finding

### Findings requiring action ([N] total)
[Sorted Critical → High → Medium → Low]
Format: `[SEVERITY] file:line — check# — issue — impact — suggested fix`

### Quick wins (implement in < 1 hour each)
[findings that are isolated, low-risk, and self-contained — e.g. add Promise.all, add next/dynamic wrapper]

### Strategic refactors (require planning)
[findings that affect multiple files or need architectural decisions — e.g. move data fetch to Server Component, extract client island from layout]

### Validation checklist
After applying fixes, verify:
- [ ] Pages that had B5 waterfall: add timing log to confirm parallel fetch time ≤ slowest single fetch
```

### Backlog decision gate

Present all findings with severity Medium or above as a numbered decision list, sorted Critical → High → Medium:

```
Trovati N finding Medium o superiori. Quali aggiungere al backlog?

[1] [CRITICAL] PERF-? — file:line — one-line description
[2] [HIGH]     PERF-? — file:line — one-line description
[3] [MEDIUM]   PERF-? — file:line — one-line description
...

Rispondi con i numeri da includere (es. "1 2 4"), "tutti", o "nessuno".
```

**Wait for explicit user response before writing anything.**

Then write ONLY the approved entries to `docs/refactoring-backlog.md`:
- Assign ID: `PERF-[n]` (increment from last PERF entry)
- Add row to the priority index table with columns: `| PERF-N | check# | file:line | Severity | Description |`
- Add full detail section: `### PERF-N — [check label]` with sub-sections: **File**, **Issue**, **Impact**, **Suggested fix**

### Severity guide

- **Critical**: N+1 in dashboard/list endpoints under heavy load (Q3); heavy server-only library (pdfjs, xlsx) discovered in client bundle (B2)
- **High**: Sequential await waterfall with >500ms combined latency risk (B5); useEffect data fetching on a primary route (B3); unbounded query on large-growth table (Q1); `cookies()`/`headers()` in a layout causing route tree force-dynamic (B8)
- **Medium**: Uncached layout-level server queries called on every page load (B6); `select *` on tables with blob/large-text columns (Q2); unsized images (B7 — CLS risk); `optimizePackageImports` missing for lucide-react (P3); unnecessary or over-broad `'use client'` on a heavy page or layout (B1); missing `next/dynamic` on Tiptap/calendar/chart components (B9)
- **Low**: Unstable callbacks on memoized children (B4); minor code-splitting opportunities; bundle analyzer not configured (P1)

---

## Execution notes

- In `mode:audit` (default): do NOT make any code changes — report only. After producing the report, ask: "Vuoi che implementi le ottimizzazioni di priorità High/Critical?"
- In `mode:apply`: apply only the fixes listed in Quick wins (isolated, non-breaking). Describe each change before writing it. Do not apply Strategic refactors without explicit user confirmation. Do NOT ask the closing question — the user already expressed intent via `mode:apply`.
- `pdfjs-dist` and `pdf-lib` in `serverExternalPackages` are intentional and documented — note as correctly configured.
- Tiptap in `'use client'` files is acceptable — it requires browser APIs. Only flag if used in a read-only display context.
- `app/(app)/layout.tsx` with `'use client'` and `cookies()` is intentional — session and theme synchronization. Do NOT flag under B1 Flag B or B8 Pattern A.

---

## Step 6 — Native/Backend Performance Audit

**This path runs for non-web projects only.** Web projects use Steps 1–5 above.

### Profiling tools

**Primary tool**: [PERF_TOOL]
**Profile command**: `[PROFILER_COMMAND]`

Run the profiler on the main execution path. Identify the top 5 hotspots by CPU time and the top 5 by memory allocation. If profiling data is not available, proceed with static analysis and recommend running the profiler.

---

### Step 6a — Algorithmic and resource checks (Explore agent)

Launch a **single Explore subagent** (model: haiku) with all source files from the project:

"Run these 4 checks on the provided source files. For each: state total match count, list every match as `file:line — excerpt`, and state PASS or FAIL.

**CHECK NP1 — Nested iteration on collections**
Grep for nested loops (for/while/map/forEach inside another loop body) operating on collections or arrays.
Flag: O(n²) or worse complexity. Exclude small fixed-size iterations (< 10 items known at compile time).

**CHECK NP2 — Memory allocation in hot paths**
Flag:
- Object/string/array/buffer creation inside loops (new allocation per iteration)
- Unbounded caches or collections that grow without eviction
- Missing cleanup of heavyweight resources (file handles, DB connections, network sockets)

**CHECK NP3 — I/O bottleneck patterns**
Flag:
- Synchronous file I/O on the main/UI thread
- Sequential network calls that could be parallelized
- Unbuffered reads/writes on large files
- Missing timeout on network or IPC operations

**CHECK NP4 — Concurrency inefficiency**
Flag:
- Thread/goroutine/task creation inside loops without pooling
- Shared mutable state without synchronization primitives
- Blocking calls on async/concurrent paths
- Missing cancellation support on long-running operations"

---

### Step 6b — Stack-specific checks (main context)

Read the 10 largest source files by line count. Apply the checks relevant to the project language. Each check includes grep patterns — run them, then read flagged files for context.

**Swift**:
- Main-thread work: grep for `DispatchQueue.main.sync` outside UI layer files — synchronous dispatch on main blocks the UI. Also grep for `URLSession.shared.data` without `Task { }` wrapper in non-async contexts.
- Image downsampling: grep for `UIImage(named:` or `NSImage(named:` in collection view / table view code — flag if no `preparingThumbnail` or `CGImageSource` downsampling nearby.
- Core Data batch size: grep for `NSFetchRequest` — flag if `fetchBatchSize` is 0 or not set (default fetches all objects into memory).
- Retain cycles: grep for closures capturing `self` — flag `{ self.` or `{ [self]` without `[weak self]` in long-lived contexts (completion handlers, observers, timers).
- Allocation spikes: grep for object creation inside `for`/`while` loops (e.g. `= String(`, `= Data(`, `= NSMutableAttributedString(`).

**Kotlin**:
- Main-thread DB: grep for `Room` or `SQLite` calls outside `Dispatchers.IO` or `withContext(Dispatchers.IO)`.
- RecyclerView recycling: grep for `onBindViewHolder` — flag if view inflation (`inflate(`) happens inside bind instead of `onCreateViewHolder`.
- Bitmap memory: grep for `BitmapFactory.decode` — flag if no `inSampleSize` option is set (loads full-resolution bitmaps).
- Coroutine leaks: grep for `GlobalScope.launch` — flag each occurrence (no lifecycle-aware cancellation).
- StrictMode: grep for `StrictMode` in Application class — flag if absent in debug build (disk/network violations on main thread go undetected).

**Rust**:
- Unnecessary clone: grep for `.clone()` — flag if the value is only read after cloning (borrow would suffice).
- Hot-path allocation: grep for `Vec::new()`, `String::new()`, `Box::new(` inside loop bodies — flag if the allocation could be hoisted or reused.
- Dynamic dispatch: grep for `Box<dyn` — flag if the trait has a single implementor (generics avoid vtable overhead).
- Missing inline: grep for `pub fn` in hot-path modules with body < 5 lines — consider `#[inline]` for small frequently-called functions.

**Go**:
- Goroutine creation in loops: grep for `go func` or `go ` inside `for` — flag if no semaphore/pool limits the concurrency.
- Channel sizing: grep for `make(chan` — flag unbuffered channels (`make(chan T)`) in producer-consumer patterns (causes blocking).
- Defer in loops: grep for `defer` inside `for` — deferred calls accumulate until the function returns, not the loop iteration.
- Escape analysis: recommend running `go build -gcflags='-m' 2>&1 | grep 'escapes to heap'` on hot-path packages.

**Python**:
- Regex in loops: grep for `re.compile` or `re.search`/`re.match` with literal pattern inside `for`/`while` — flag if pattern is constant (compile once outside loop).
- List vs generator: grep for list comprehensions `[... for ... in ...]` passed to `sum(`, `max(`, `min(`, `any(`, `all(` — generator expression avoids materializing the full list.
- Deep copies: grep for `copy.deepcopy` — flag in hot paths (extremely expensive).
- GIL contention: grep for `threading.Thread` doing CPU-bound work — flag (use `multiprocessing` or `concurrent.futures.ProcessPoolExecutor` instead).

**Ruby**:
- N+1 queries: grep for `.each` followed by association access (e.g. `user.company`) — flag if no `.includes(` or `.eager_load(` on the parent query.
- String allocation: grep for string interpolation `"#{` inside loops — flag if the string could be built with `StringIO` or array join.
- GC pressure: grep for `.map { |x| x.` patterns creating intermediate arrays — flag if `.lazy.map` or `.each_with_object` would avoid allocation.

**Java**:
- Autoboxing: grep for `Integer`, `Long`, `Double` in loop variable declarations — flag (use primitive types `int`, `long`, `double`).
- String concat in loops: grep for `+=` on String variables inside loops — flag (use `StringBuilder`).
- Connection pool: grep for `DriverManager.getConnection` — flag if no connection pool (HikariCP, c3p0) is configured.
- Stream overhead: grep for `.stream().` on small collections (< 10 items) — traditional loop may be faster due to stream pipeline overhead.

**dotnet**:
- LINQ allocations: grep for `.Select(`, `.Where(`, `.ToList()` chains — flag if intermediate `.ToList()` materializes unnecessarily before final consumption.
- String concatenation: grep for `+=` on string inside loops — flag (use `StringBuilder` or `string.Join`).
- LOH fragmentation: grep for `new byte[` with size > 85000 — flag (Large Object Heap allocations are expensive to collect).
- Async overhead: grep for `async` methods that contain only a single `await` with no branching — flag as candidates for removing async wrapper (avoids state machine overhead).

---

### Step 6d — Resource footprint checks (main context)

**CHECK NR1 — Launch / startup weight**
Identify the application entry point:
- Swift: `@main` struct or `AppDelegate.didFinishLaunchingWithOptions`
- Kotlin: `Application.onCreate` or `MainActivity.onCreate`
- Rust/Go/Python/Ruby/Java/dotnet: `main()` function or entry module

Grep for heavy operations in the entry point: database initialization, network calls, large file reads, complex object graph construction. Flag any operation that could be deferred (lazy initialization) or moved to a background thread/task.

**CHECK NR2 — Memory management patterns**
- Swift: grep for missing `autoreleasepool` in batch processing loops. Grep for `NSCache` or `Dictionary` used as cache without size limit.
- Kotlin: grep for `static` or `companion object` holding Activity/Context references (memory leak). Check `onDestroy` for missing listener/observer cleanup.
- Rust: grep for `Vec` that grows via `push` in a loop without `with_capacity` pre-allocation.
- Go: grep for `sync.Map` or map growth without periodic cleanup — flag unbounded maps.
- All: grep for large static/global collections that persist for the process lifetime.

**CHECK NR3 — Energy and background patterns** (mobile stacks only)
- Swift: grep for `Timer.scheduledTimer` or `DispatchSource.makeTimerSource` — flag if no `tolerance` set (tight timers prevent CPU sleep). Grep for `CLLocationManager` with `startUpdatingLocation` — flag if `startMonitoringSignificantLocationChanges` would suffice.
- Kotlin: grep for `AlarmManager.setRepeating` or `Handler.postDelayed` in loops — flag excessive wake-ups. Grep for `LocationRequest` with high frequency updates.
- Flag: any background polling pattern (repeated network calls on a timer) that could use push notifications or event-driven updates instead.

**CHECK NR4 — Binary / artifact size**
- Grep for large embedded assets in source directories (images > 1MB, bundled databases, embedded fonts). Flag if assets could be downloaded on demand.
- Swift: check for `DEBUG` conditional code that may leak into release builds (grep for `#if DEBUG` blocks containing large test fixtures or mock data).
- Kotlin: check for `debugImplementation` dependencies accidentally in `implementation` (grep `build.gradle` for heavy debug-only libraries in the wrong configuration).
- All: grep for unused imports at module/package level — flag files importing modules they don't use (increases link time and potentially binary size).

---

### Step 6c — Produce report and update backlog

### Output format (native audit)

```
## Perf Audit — [DATE] — [SCOPE] — mode: [audit | apply]
### Sources: platform profiling documentation, language performance guides

### Executive summary
- [2-8 bullets: one per Critical/High finding or notable PASS]

### Scope reviewed
- Source files scanned: [N files]
- Profiling tool: [PERF_TOOL]
- Profile data: [available / not available — recommend running profiler]

### Algorithmic & Resource Checks
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| NP1 | Nested iteration on collections | N | High | ✅/⚠️ |
| NP2 | Memory allocation in hot paths | N | Medium | ✅/⚠️ |
| NP3 | I/O bottleneck patterns | N | High | ✅/⚠️ |
| NP4 | Concurrency inefficiency | N | Medium | ✅/⚠️ |

### Stack-Specific Checks
| Check | Verdict | Notes |
|---|---|---|
| [check name per 6b] | ✅/⚠️ | [details] |

### Resource Footprint Checks
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| NR1 | Launch / startup weight | N | High | ✅/⚠️ |
| NR2 | Memory management patterns | N | Medium | ✅/⚠️ |
| NR3 | Energy / background patterns | N | Medium | ✅/⚠️ |
| NR4 | Binary / artifact size | N | Low | ✅/⚠️ |

### Findings requiring action ([N] total)
[Sorted Critical → High → Medium → Low]
Format: `[SEVERITY] file:line — check# — issue — impact — suggested fix`

### Quick wins
[isolated, low-risk, self-contained fixes]

### Strategic refactors
[multi-file changes or architectural decisions needed]
```

### Backlog decision gate (native audit)

Present all findings with severity Medium or above:

```
Trovati N finding Medium o superiori. Quali aggiungere al backlog?

[1] [HIGH]     PERF-? — file:line — one-line description
[2] [MEDIUM]   PERF-? — file:line — one-line description

Rispondi con i numeri da includere (es. "1 2 4"), "tutti", o "nessuno".
```

**Wait for explicit user response before writing anything.**

Then write approved entries to `docs/refactoring-backlog.md` using the same ID format (`PERF-[n]`).

### Severity guide (native audit)

- **Critical**: O(n²+) in a hot path processing user-visible data; memory leak causing OOM on long sessions; main-thread blocking > 1s; Activity/Context leak via static reference (Kotlin)
- **High**: synchronous I/O blocking UI/main thread (NP3); sequential network calls with >500ms combined latency; goroutine/thread/coroutine leak; unbounded collection growth (NR2); heavy initialization in app entry point delaying launch (NR1); GlobalScope.launch without lifecycle cancellation
- **Medium**: unnecessary allocations in moderate-frequency paths (NP2); missing cancellation on background tasks; suboptimal data structure choice; missing resource cleanup; excessive timer/location wake-ups (NR3); retain cycles in closures; regex compilation in loops
- **Low**: minor allocation optimization; style-level concurrency improvement; profiler not configured; binary size overhead from unused assets (NR4); missing `#[inline]` on small functions

---

### Native audit — execution notes

- In `mode:audit` (default): report only. After report, ask: "Vuoi che implementi le ottimizzazioni di priorità High/Critical?"
- In `mode:apply`: apply only Quick wins. Describe each change before writing.
