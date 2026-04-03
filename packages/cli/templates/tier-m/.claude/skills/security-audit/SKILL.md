---
name: security-audit
user-invocable: true
model: sonnet
context: fork
effort: high
argument-hint: [target:page:<route>|target:role:<role>|target:section:<section>]
---

**Scope**: API routes, middleware/proxy, RLS policies, data validation, response shapes, environment variables, Supabase configuration, dependencies.
**Out of scope**: SEO, robots.txt, public crawlability, OpenGraph, sitemap.xml — this is a private internal webapp.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/refactoring-backlog.md`.**

---

## Applicability check

Before any other step: read `CLAUDE.md` and check the Framework and Language fields.

- If the project is a native application (Swift, Kotlin, Objective-C, C++, desktop GUI) with no API routes (the `[HAS_API]` field is `false` or the Framework field is `N/A — native app`): output the following and stop — do not proceed to Step 0:

  > **security-audit** targets web applications with API routes, middleware, and database access policies. This project uses a native stack with no server-side API surface. For native app security, audit manually: App Sandbox entitlements, Keychain access patterns, TCC permissions (camera, microphone, file access), code signing, and hardened runtime configuration.

- If the project has API routes (`[HAS_API]` is `true`), even on a native stack: proceed to Step 0. The API surface is auditable.
- If unsure: check for route handler files (e.g., `src/app/api/`, `routes/`, `handlers/`). If none exist, output the message above and stop.

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:role:admin` | Focus on admin routes |
| `target:section:export` | Focus on all export/bulk-data routes |
| `target:section:<other>` | Read `docs/sitemap.md` — find rows matching the section keyword, resolve to API routes and related route files |
| No argument | Full audit — all API routes |

Announce: `Running security-audit — scope: [FULL | target: <resolved>]`
Apply the target filter to the route inventory built in Step 1.

---

## Step 1 — Build API route inventory

Also read:
- `lib/auth.ts` or equivalent auth helpers — understand session/token helpers
- `docs/refactoring-backlog.md` — avoid duplicates

Output: complete list of API routes grouped by:
- **Public** (no auth required)
- **Protected** (auth required, any role)
- **Role-specific** (grouped by functional section per sitemap.md)
- **Export routes** (bulk data endpoints returning CSV or XLSX)

Apply target scope from Step 0 before proceeding.

---

## Step 2 — Auth, authorization, and injection checks (Explore agent)

Launch a **single Explore subagent** (model: haiku) with the full route file list:

**CHECK A1 — Missing auth check at route entry**
Pattern: route handler function body does NOT contain any of the following within the first 20 lines of the handler:
`getSession|getUser|createClient|supabase.auth|auth()|session|serviceClient|createServiceClient`
Grep: for each route file, check if any of these patterns appear within the first 20 lines of the exported handler function. Flag any route file where none appear.
Note: service-role-only routes must still verify the caller's role — service role alone is not an auth check.

**CHECK A2 — Role check present for admin routes**
Flag: any admin route without an explicit role assertion.

**CHECK A3 — Zod validation on request body, path params, and query params**
Pattern A (body): route files handling POST/PUT/PATCH should import Zod and use `safeParse` or `parse`.
Grep: in all write route files, check for `z\.object|zod|safeParse|\.parse\(`.
Flag: any write route without Zod validation on the request body.
Flag: raw `params.*` fed into `.eq('id', params.id)` without UUID format validation — an invalid format causes a DB error, leaking implementation details; a KSUID/short-id mismatch could silently return wrong records.
Pattern C (query params): grep all route files for `searchParams\.get\(` or `url\.searchParams` whose return value is used in a `.eq(`, `.filter(`, or `.in(` DB call without an explicit allowlist or Zod enum validation.
Flag: unvalidated query params used as DB filter inputs.

**CHECK A4 — Raw user input in SQL/queries**
Pattern: template literals or string concatenation used to build Supabase queries with user-provided values.
Grep: `` `.from(`${` `` or `'eq.' +` or `.filter('` + ` or `.eq(` + ` (string concatenation in query building).
Flag: any parameterized query built with string concat. The correct form is `.eq('column', variable)` — not `.eq('column=' + variable)`.

**CHECK A5 — Sensitive fields in API responses**
Pattern: API routes returning full objects that may include sensitive fields.
Grep: `.select('*')` in route files — flag any route that selects all columns AND returns the full result to the client without explicit field filtering.

**CHECK A6 — Cron/job routes missing secret check**
Flag: any job route that does NOT contain one of these patterns.

**CHECK A7 — Export routes missing role check**
Scope: any route file whose path contains 'export' or that returns `Content-Type: text/csv` or `application/vnd.openxmlformats`.
Grep: files containing `text/csv|Content-Disposition.*attachment|application/vnd.openxml`.
Flag: any export route without an explicit role assertion.

**CHECK A8 — NEXT_PUBLIC_ secret exposure**
Scope: all `.ts`, `.tsx`, `.env*`, and `next.config.*` files in the project root and `app/`.
Pattern: `NEXT_PUBLIC_.*KEY|NEXT_PUBLIC_.*SECRET|NEXT_PUBLIC_.*TOKEN|NEXT_PUBLIC_.*PASSWORD`
Flag: any `NEXT_PUBLIC_` variable name that contains secret-like suffixes. These variables are inlined into the client bundle at build time and are visible to all users.
Note: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are expected and safe — exclude these two exact names.

**CHECK A9 — Service role key in client-side code**
Scope: all `.ts` and `.tsx` files that contain `'use client'` at the top.
Pattern: in those client files, grep for: `SERVICE_ROLE|service_role|SUPABASE_SERVICE|serviceRoleKey`
Flag: any match. The service role key bypasses all RLS — its presence in a client-side file exposes it in the browser bundle to every authenticated user.

**CHECK A10 — Storage public URL for private buckets**
Scope: all API route files and lib files that handle file/document/attachment operations.
Pattern: `getPublicUrl` in files that also reference `documents`, `attachments`, `compensation_attachments`, `expense_attachments`, `contract`, or `receipt`.
Flag: any `getPublicUrl` call for what appears to be a private-bucket asset. Private buckets must use `createSignedUrl` with a TTL.
Note: `avatars` bucket is public by design — exclude matches in files solely handling avatars.

**CHECK A11 — Open redirect**
Pattern: lines with `redirect(` or `NextResponse.redirect(` where the URL argument is NOT a hardcoded string literal but derives from: `searchParams.get|req.body|params\.|query\.`
Flag: any redirect where the target URL is constructed from user-controlled input without an explicit allowlist check.

**CHECK A12 — Mass assignment**
Scope: all API route files handling POST/PUT/PATCH.
Pattern:
  Step 1: find lines with `const body = await req.json()|const data = await req.json()`
  Step 2: in the same file, check if `body` or `data` (the whole object) is passed directly to `.insert(body)|.update(body)|.upsert(body)` or `.insert(data)|.update(data)|.upsert(data)`.
Flag: any route where the raw request body object is passed wholesale to a DB write without explicit field destructuring (e.g. `const { field1, field2 } = body`).
Note: routes that use a Zod `schema.parse(body)` result (not the raw `body`) before inserting are safe — exclude those.

**CHECK A13 — Horizontal access control / IDOR**
For each dynamic route:
Step 1 — identify how the caller's identity is resolved (grep for `getSession|getUser|get_my_collaborator_id|user\.id|session\.user`).
Step 2 — verify that the DB query filters by the caller's identity OR community membership, not just by the URL parameter alone.
Insecure pattern: `.eq('id', params.id)` as the ONLY filter — any authenticated user can access any record by guessing or enumerating IDs.
Flag: each route where ownership/community scope is not enforced server-side in the query.

**CHECK A14 — State machine enforcement on transition routes**
For each match:
Step 1 — verify the route reads the CURRENT state from the DB before applying the transition (grep for a SELECT query before the UPDATE in the same handler).
Flag: any transition route that does NOT verify current state server-side before applying the update. Note: skipping a required intermediate state (e.g. IN_ATTESA → PAGATO directly) is both a business logic violation and a potential abuse path for financial manipulation."

---

## Step 3 — Response shape review (main context)

For the 10 most-used API routes (identified from sitemap.md "API routes" column):

**R1 — Collaborator sensitive data exposure**
- `codice_fiscale` is NOT returned to non-admin/non-owner callers
- `iban` is NOT returned to non-admin/non-owner callers
- `partita_iva` is NOT returned to non-admin/non-owner callers
- `must_change_password` is not returned in list endpoints (only own-profile)

**R2 — Compensation data exposure**

**R3 — Error message verbosity**
Scan 5 route handlers for `catch` blocks. Verify internal error messages (DB errors, stack traces) are NOT forwarded to the client response.
Expected: `return NextResponse.json({ error: 'Generic message' }, { status: 500 })` — never `{ error: err.message }` for DB errors where `err.message` may contain schema details.

**R4 — Domain data scoping**
- Collaborators can only see records scoped to themselves (ownership via `get_my_collaborator_id()` or equivalent RLS)

**R5 — Rate limiting on high-value endpoints**
- Any export route (bulk data)
- Any compensation bulk-action route
Note: absence of rate limiting is a Medium finding for an internal app — flag it, don't treat as Critical.

---

## Step 3b — Supabase Security Advisors (MCP)

This returns Supabase's own automated security recommendations covering:
- Exposed service role key
- RLS disabled on tables
- Leaked `anon` or `authenticated` role grants on sensitive objects
- Unprotected database functions
- Auth configuration issues

For each advisor returned:
- `level: "error"` → **Critical** finding
- `level: "warning"` → **High** finding
- `level: "info"` → **Low** / informational

Include the full list in the report output. Do not suppress any advisor result.

---

## Step 3c — Dependency CVE audit

Run in the project root:
```bash
npm audit --json --omit=dev 2>/dev/null
```

Parse the JSON output for vulnerabilities with `severity: "high"` or `severity: "critical"`.

For each finding, record:
- Package name and affected version range
- CVE ID (if available)
- Brief description
- Whether a `fixAvailable` patch exists

Flag any `critical` CVE in a production dependency as a **Critical** finding.
Flag any `high` CVE as a **High** finding.
`moderate` and `low` → note in report but do not add to backlog unless directly exploitable in this app's context.

If `npm audit` exits with non-zero but the JSON output is parseable, continue. If the command is not available or fails to produce parseable output, note it and skip.

---

## Step 3d — Code-level RLS completeness check

Complement Step 3b (Supabase advisors) with a grep-based check on migration files.

**RLS-1 — Tables with RLS disabled**
Grep all migration files for `CREATE TABLE` statements. For each table name found, check if a corresponding `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY` appears anywhere in the migration history.
Flag: any table where `ENABLE ROW LEVEL SECURITY` is absent. Default Postgres behavior without RLS: all authenticated and service-role reads bypass per-row checks entirely.
Note: tables with only service-role access (e.g. internal log tables) may legitimately skip RLS — verify from context.

**RLS-2 — Tables with RLS enabled but no policies**
For each table with `ENABLE ROW LEVEL SECURITY`, grep for `CREATE POLICY.*ON <tablename>` in the full migration history.
Flag: any table with RLS enabled but zero policies. With RLS enabled and no policies, the default is DENY for all roles except table owner — this can cause silent 0-row returns rather than errors, masking bugs.

**RLS-3 — Missing WITH CHECK on INSERT/UPDATE policies**
Flag: each match. `USING` controls which rows are visible; `WITH CHECK` controls which rows can be written. A missing `WITH CHECK` allows inserting/updating rows the user cannot see.

---

## Step 4 — HTTP security headers check

**Static check**: read `next.config.ts`. Verify these headers are configured:

| Header | Expected | Risk if missing |
|---|---|---|
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer data leakage |
| `Content-Security-Policy` | Present (even permissive) | XSS escalation |
| `Permissions-Policy` | camera/mic/geolocation denied | Feature abuse |

**Live check** (staging): run:
```bash
```
Compare actual headers received vs configuration. A header present in `next.config.ts` but absent in the curl output indicates a `source` pattern mismatch (e.g. only applying to `/` not `/(.*)`).

Flag: any header present in config but absent in live response — this means the config is ineffective.

---

## Step 5 — Proxy / middleware check

- API routes are not accessible without a valid session token (no CORS bypass path)
- The `must_change_password` and `onboarding_completed` redirects are enforced at the proxy level, not just client-side
- The `/api/jobs/` whitelist is narrow — specific paths only, not a wildcard `startsWith('/api/jobs')` that could expose other routes under a similar prefix
- Each whitelisted path has a comment explaining why it is public
- The proxy does not trust any header that could be forged by the client to bypass auth (e.g. `X-User-Role`, `X-Is-Admin`)

---

## Step 6 — Produce report and update backlog

### Output format

```
## Security Audit — [DATE] — [TARGET]

### Executive summary
- [2-8 bullets: lead with the most critical risk. One bullet per Critical/High finding or notable PASS cluster. Be specific — name the route, table, or pattern.]

### Scope reviewed
- Routes / entry points: [N routes, list categories]
- Validation layer: Zod schemas in [N] route files
- DB/RLS layer: [N] migration files + Supabase advisors
- Headers: next.config.ts + live curl on staging
- Assumptions: [e.g. "Server Actions not present — N/A"]

### Security maturity assessment
| Dimension | Rating | Notes |
|---|---|---|
| Auth coverage | low/medium/high | [summary] |
| Authorization quality (RBAC + ownership) | low/medium/high | [summary] |
| Input validation coverage | low/medium/high | [summary] |
| Data exposure control | low/medium/high | [summary] |
| RLS / row isolation | low/medium/high | [summary] |
| Config hardening (headers, proxy) | low/medium/high | [summary] |
| Release readiness | low/medium/high | [summary] |

### Auth & Authorization (API routes)
| # | Check | Routes flagged | Severity | Verdict |
|---|---|---|---|---|
| A1 | Missing auth check | N | Critical | ✅/❌ |
| A2 | Missing role check (admin routes) | N | Critical | ✅/❌ |
| A3 | Missing Zod validation (body/params/query) | N | High | ✅/❌ |
| A4 | Raw input in queries | N | Critical | ✅/❌ |
| A5 | Sensitive fields in responses | N | High | ✅/❌ |
| A6 | Cron routes missing secret | N | Critical | ✅/❌ |
| A7 | Export routes missing role check | N | High | ✅/❌ |
| A8 | NEXT_PUBLIC_ secret exposure | N | Critical | ✅/❌ |
| A9 | Service role key in client code | N | Critical | ✅/❌ |
| A10 | Storage public URL on private bucket | N | High | ✅/❌ |
| A11 | Open redirect | N | High | ✅/❌ |
| A12 | Mass assignment | N | High | ✅/❌ |
| A13 | Horizontal AC / IDOR (dynamic routes) | N | High | ✅/❌ |
| A14 | State machine enforcement | N | High | ✅/❌ |

### Response Shape Review
| # | Check | Verdict | Notes |
|---|---|---|---|
| R1 | Collaborator sensitive data (CF, IBAN, P.IVA) | ✅/❌ | |
| R2 | Compensation data exposure | ✅/❌ | |
| R3 | Error message verbosity | ✅/❌ | |
| R5 | Rate limiting on high-value endpoints | ✅/❌ | |

### RLS — Code-level check
| # | Check | Tables flagged | Verdict |
|---|---|---|---|
| RLS-1 | Tables missing ENABLE ROW LEVEL SECURITY | N | ✅/❌ |
| RLS-2 | RLS enabled but zero policies | N | ✅/❌ |
| RLS-3 | INSERT/UPDATE policies missing WITH CHECK | N | ✅/❌ |

### Supabase Security Advisors
| Level | Count | Items |
|---|---|---|
| error (Critical) | N | [list] |
| warning (High) | N | [list] |
| info (Low) | N | [list] |

### Dependency CVEs
| Package | Version | Severity | CVE | Fix available |
|---|---|---|---|---|
| [name] | [range] | critical/high | [id] | yes/no |

### HTTP Headers
| Header | In config | In live response | Verdict |
|---|---|---|---|
| X-Frame-Options | ✅/❌ | ✅/❌ | ✅/❌ |
| X-Content-Type-Options | ✅/❌ | ✅/❌ | ✅/❌ |
| Referrer-Policy | ✅/❌ | ✅/❌ | ✅/❌ |
| Content-Security-Policy | ✅/❌ | ✅/❌ | ✅/❌ |
| Permissions-Policy | ✅/❌ | ✅/❌ | ✅/❌ |

### Proxy / Middleware
| Check | Verdict | Notes |
|---|---|---|
| API protected behind auth layer | ✅/❌ | |
| Proxy redirects server-side (not client-side) | ✅/❌ | |
| Jobs whitelist is narrow (no wildcard) | ✅/❌ | |
| No forgeable bypass header trusted | ✅/❌ | |

### Prioritized findings (Critical → High → Medium → Low)
Format: `[SEVERITY] route/file:line — check# — issue — exploit path — recommended fix — effort`

### Quick wins
[findings that are isolated, low-risk fixes — e.g. add ownership filter, add Zod enum on query param, add WITH CHECK to policy]

### Strategic refactors
[findings requiring broader changes — e.g. state machine enforcement across all transition routes, centralized response serializers, RLS policy overhaul]

### Validation checklist
After applying fixes, verify:
- [ ] Unauthenticated request (no token) to each fixed route → 401
- [ ] Horizontal AC: request with valid token but different owner's ID → 403 or 404
- [ ] State machine: PATCH with invalid transition target on current state → 422
- [ ] Zod path param: request with non-UUID id param → 400
- [ ] RLS: direct Supabase anon client query on fixed tables → 0 rows (not error)
- [ ] Supabase advisors re-run after migrations → 0 `error` level items
```

### Backlog decision gate

Present all findings with severity Medium or above as a numbered decision list, sorted Critical → High → Medium:

```
Trovati N finding Medium o superiori. Quali aggiungere al backlog?

[1] [CRITICAL] SEC-? — route/file — one-line description
[2] [HIGH]     SEC-? — route/file — one-line description
[3] [MEDIUM]   SEC-? — route/file — one-line description
...

Rispondi con i numeri da includere (es. "1 2 4"), "tutti", o "nessuno".
```

**Wait for explicit user response before writing anything.**

Then write ONLY the approved entries to `docs/refactoring-backlog.md`:
- Assign ID: `SEC-[n]`
- Add to priority index
- Add full detail section with exploit scenario and recommended fix

### Severity guide

- **Critical**: unauthenticated route exposing or modifying data; RLS bypass; service role key in client code; NEXT_PUBLIC_ secret; cron route with no secret check; raw input in queries; Supabase advisor `level: error`; table missing `ENABLE ROW LEVEL SECURITY` on financial/personal data (RLS-1)
- **High**: admin route without role check; sensitive field (CF, IBAN, P.IVA) exposed to non-owner; export route without role check; storage public URL on private bucket; open redirect; mass assignment; horizontal AC / IDOR on financial records (A13); state machine bypass on compensation/document transitions (A14); missing `WITH CHECK` on financial table INSERT/UPDATE policies (RLS-3); Supabase advisor `level: warning`; critical/high CVE in production dependency
- **Medium**: missing Zod on write route body; unvalidated path param or query param used in DB filter (A3B/C); error message leaking DB internals; missing security header; no rate limiting on high-value endpoints; RLS enabled but zero policies (RLS-2)
- **Low**: header best-practice gap; informational Supabase advisor; moderate/low CVE not directly exploitable; state machine bypass on low-risk status fields

---

## Execution notes

- Do NOT modify any route, config, or migration file.
- SEO, robots.txt, meta tags, sitemaps, and public indexing are explicitly OUT OF SCOPE.
- **Server Actions**: this app currently uses Route Handlers only — no `'use server'` files. If Server Actions are introduced in future blocks, they must be treated as directly-reachable POST endpoints and audited with the same auth/authz/validation checks as Route Handlers. Note as N/A if absent.
- After the report, ask: "Vuoi che implementi i fix Critical/High identificati?"
