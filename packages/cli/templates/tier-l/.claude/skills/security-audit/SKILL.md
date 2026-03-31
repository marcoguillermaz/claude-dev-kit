---
name: security-audit
description: Security review of API routes and data layer. Checks authentication guards, authorization completeness, input validation coverage, sensitive data exposure in responses, environment variable leakage, service credentials in client code, storage signed URL compliance, open redirect, mass assignment, dependency CVE audit, and HTTP security headers. Does not cover auth implementation architecture (business logic) or performance.
user-invocable: true
model: sonnet
context: fork
effort: high
argument-hint: [target:page:<route>|target:role:<role>|target:section:<section>]
---

You are performing a security audit of the project's API routes and data layer.

**Scope**: API routes, middleware/proxy, access control policies, input validation, response shapes, environment variables, dependencies, HTTP headers.
**Out of scope**: SEO, public indexing, performance, auth architecture design.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/refactoring-backlog.md`.**

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:page:/api/users` | Restrict scope to that route only |
| `target:role:admin` | Focus on routes accessible/relevant to the admin role |
| `target:section:export` | Focus on all export/bulk-data routes |
| No argument | Full audit — all API routes |

Announce: `Running security-audit — scope: [FULL | target: <resolved>]`
Apply the target filter to the route inventory built in Step 1.

---

## Step 1 — Build API route inventory

Read `[SITEMAP_OR_ROUTE_LIST]` to extract the full list of API routes.
Also read:
- Middleware or proxy file — understand the auth layer and what it protects
- Auth helper file (`[AUTH_HELPER]`) — understand session/token mechanics
- `docs/refactoring-backlog.md` — avoid reporting duplicates

Output: list of routes grouped as:
- **Public** (no auth required)
- **Protected** (auth required, any role)
- **Role-specific** (grouped by role)
- **Cron/job routes** (background jobs — typically bypass normal auth layer)
- **Export routes** (bulk data endpoints returning CSV, XLSX, or PDF)

Apply target scope from Step 0 before proceeding.

---

## Step 2 — Auth, authorization, and injection checks (Explore subagent)

Launch a **single Explore subagent** (model: haiku) with the full route file list:

"Run all 13 checks on the provided route files and adjacent files as noted.

**CHECK A1 — Missing auth check at route entry**
Pattern: route handler does NOT call `[AUTH_HELPER]` or equivalent within the first 15 lines.
Flag: any route where no auth check appears near the top of the handler.
Note: service-role or internal routes must still verify caller identity — their auth is different, not absent.

**CHECK A2 — Role check present on privileged routes**
Pattern: routes under admin/management paths must contain an explicit role assertion (`role === '[ROLE_ENUM]'` or equivalent).
Flag: any privileged route without an explicit role check.

**CHECK A3 — Input validation on write endpoints**
Pattern: POST/PUT/PATCH handlers must import `[VALIDATION_LIB]` or contain a schema parse call.
Flag: any write route without schema validation.

**CHECK A4 — Raw user input in queries**
Pattern: template literals or string concatenation used to build DB queries with user-supplied values.
Flag: any parameterized query built via string concatenation instead of the parameterized API (e.g. `.eq('column', variable)` is correct; `.filter('column=' + variable)` is not).

**CHECK A5 — Sensitive fields in API responses**
Pattern: routes that select all columns (`SELECT *` or equivalent) and return the full result.
Flag: any route that may include internal fields (password hashes, tokens, internal flags) in the response without explicit field filtering.

**CHECK A6 — Cron/job routes missing secret check**
Scope: all background job or cron route files.
Pattern: these routes typically bypass the normal auth layer. They MUST verify the request using a cron/job secret token.
Grep: in each job route file, check for presence of: `CRON_SECRET|authorization|x-cron|Authorization` or an equivalent secret-based verification.
Flag: any job route that does NOT contain one of these patterns.

**CHECK A7 — Export routes missing role check**
Scope: any route file whose path contains 'export' or that returns `Content-Type: text/csv`, `application/vnd.openxmlformats`, or `application/pdf`.
Grep: files containing `text/csv|Content-Disposition.*attachment|application/vnd.openxml|application/pdf`.
For each match: verify the route also contains a role check.
Flag: any export route without an explicit role assertion.

**CHECK A8 — Secret environment variable exposure (client-side)**
Scope: all source files, environment config files, and framework config files.
Pattern: environment variable names containing secret-like suffixes (`*_KEY`, `*_SECRET`, `*_TOKEN`, `*_PASSWORD`) that are prefixed or configured to be exposed to the client (e.g. `NEXT_PUBLIC_`, `VITE_`, or equivalent for the project's framework).
Flag: any client-exposed variable name that contains secret-like suffixes. These are inlined into the client bundle and visible to all users.
Note: public/anon keys for services designed to be used client-side are expected and safe — exclude those if documented as safe in the project.

**CHECK A9 — Service/admin credentials in client-side code**
Scope: all files marked as client-side (e.g. `'use client'`, browser entry points, client modules).
Pattern: grep for service role keys, admin credentials, or credential variable names: `SERVICE_ROLE|service_role|ADMIN_KEY|SERVICE_ACCOUNT|adminCredential|serviceKey`.
Adapt these patterns to your project's credential variable naming conventions.
Flag: any match. Admin/service credentials bypass access control — their presence in client-side code exposes them in the browser bundle.

**CHECK A10 — Storage/file URLs for private resources**
Scope: all API route files and utility files that handle file/document/attachment operations.
Pattern: calls to `getPublicUrl` or equivalent (generating permanent public URLs) in files that reference private storage buckets (documents, attachments, contracts, receipts).
Flag: any public URL generation call for what appears to be a private-bucket asset. Private buckets must use signed/time-limited URLs with a TTL.
Note: publicly intended assets (e.g. avatars bucket explicitly marked public) should be excluded from flagging.

**CHECK A11 — Open redirect**
Scope: all middleware and API route files containing `redirect`.
Pattern: lines with a redirect call where the URL argument is NOT a hardcoded string literal but derives from user-controlled input (`searchParams.get|req.body|params.|query.`) without an explicit allowlist check.
Flag: any redirect where the target URL is constructed from user-controlled input without validation against an allowlist of safe destinations.

**CHECK A12 — Mass assignment**
Scope: all API route files handling POST/PUT/PATCH.
Pattern:
  Step 1: find lines that parse the full request body (e.g. `await req.json()`, `request.body`)
  Step 2: in the same file, check if the raw body object is passed directly to a DB write (`.insert(body)`, `.update(body)`, or equivalent) without explicit field destructuring.
Flag: any route where the raw request body object is passed wholesale to a DB write without explicit field allowlisting.
Note: routes that pass a validated schema result (not the raw body) to the DB write are safe — exclude those.

**CHECK A13 — Horizontal access control / IDOR**
For each dynamic route (routes with path parameters like `[id]`, `[slug]`, etc.):
Step 1 — Verify that the DB query filters by the caller's identity OR ownership, not just by the URL parameter alone.
Insecure pattern: `.eq('id', params.id)` as the ONLY filter — any authenticated user can access any record by guessing or enumerating IDs.
Secure pattern: `.eq('id', params.id).eq('owner_id', session.user.id)` or equivalent ownership/scope filter.
Flag: each route where ownership/scope is not enforced server-side in the query."

---

## Step 3 — Response shape review (main context)

For the 5–10 most-used routes (pick highest-traffic from sitemap or route list):

**R1 — PII exposure**: verify that sensitive personal data (email if non-owner, SSN, banking details, passwords) is NOT returned to non-owner callers.

**R2 — Error message verbosity**: inspect `catch` blocks. Verify internal DB errors are NOT forwarded to the client response. Expected: generic message only, error logged server-side.

**R3 — Privilege escalation via response**: verify that response objects don't include fields that reveal other users' data or internal system state to unprivileged callers.

**R4 — Rate limiting on high-value endpoints**: check server config, middleware, and any platform config for rate limiting on: admin write routes that create users or modify roles, password change endpoints, export/bulk-data routes. Flag if no rate limiting is found at any layer.
Note: absence of rate limiting is a Medium finding for an internal app.

---

## Step 3b — Dependency CVE audit

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

## Step 3c — Code-level access control completeness check

Complement the dependency CVE audit (Step 3b) with a grep-based check on your project's data access layer.

**AC-1 — Tables or resources with access control disabled**
Grep migration files or ORM model definitions for table/collection creation. For each, check if a corresponding access control policy (RLS, row-level security, or equivalent) is enabled.
Flag: any table where access control is absent and the table contains user data or sensitive business data.

**AC-2 — Write policies missing enforcement clause**
For databases that support it (PostgreSQL RLS, etc.): check if INSERT/UPDATE policies include both a visibility clause (USING) AND a write enforcement clause (WITH CHECK).
Flag: any write policy with only USING but no WITH CHECK — this allows inserting/updating rows the user cannot see.

---

## Step 4 — HTTP security headers

**Static check**: read the server config file (e.g. `next.config.ts`, `server.ts`, `nginx.conf`). Verify these headers are configured:

| Header | Expected | Risk if missing |
|---|---|---|
| `Content-Security-Policy` | Present (even permissive) | XSS escalation |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer data leakage |
| `Permissions-Policy` | camera/mic/geolocation denied | Feature abuse |

Note: `Strict-Transport-Security` is typically handled by the hosting platform — skip if on a managed platform that enforces HTTPS.

**Live check** (if a staging/dev URL is available): run:
```bash
curl -sI [STAGING_URL] | grep -i "x-frame\|x-content-type\|referrer-policy\|content-security\|permissions-policy"
```
Compare actual headers received vs configuration. A header present in config but absent in the live response indicates a route-pattern mismatch (e.g. only applying to `/` not all paths).

Flag: any header present in config but absent in live response — this means the config is ineffective for that path.

---

## Step 5 — Produce report and update backlog

### Output format

```
## Security Audit — [DATE] — [TARGET]

### Security maturity assessment
| Dimension | Rating | Notes |
|---|---|---|
| Auth coverage | low / medium / high | [summary] |
| Authorization quality (RBAC + ownership) | low / medium / high | [summary] |
| Input validation coverage | low / medium / high | [summary] |
| Data exposure control | low / medium / high | [summary] |
| Config hardening (headers) | low / medium / high | [summary] |
| Release readiness | low / medium / high | [summary] |

### Auth & Authorization (API routes)
| # | Check | Routes flagged | Severity | Verdict |
|---|---|---|---|---|
| A1 | Missing auth check | N | Critical | ✅/❌ |
| A2 | Missing role check (privileged routes) | N | Critical | ✅/❌ |
| A3 | Missing input validation | N | High | ✅/❌ |
| A4 | Raw input in queries | N | Critical | ✅/❌ |
| A5 | Sensitive fields in responses | N | High | ✅/❌ |
| A6 | Cron routes missing secret | N | Critical | ✅/❌ |
| A7 | Export routes missing role check | N | High | ✅/❌ |
| A8 | Secret env var exposed client-side | N | Critical | ✅/❌ |
| A9 | Service/admin credentials in client code | N | Critical | ✅/❌ |
| A10 | Private storage using public URLs | N | High | ✅/❌ |
| A11 | Open redirect | N | High | ✅/❌ |
| A12 | Mass assignment | N | High | ✅/❌ |
| A13 | Horizontal access control / IDOR | N | High | ✅/❌ |

### Response Shape Review
| # | Check | Verdict | Notes |
|---|---|---|---|
| R1 | PII exposure | ✅/❌ | |
| R2 | Error message verbosity | ✅/❌ | |
| R3 | Privilege escalation via response | ✅/❌ | |
| R4 | Rate limiting on high-value endpoints | ✅/❌ | |

### Dependency CVEs
| Package | Version | Severity | CVE | Fix available |
|---|---|---|---|---|
| [name] | [range] | critical/high | [id] | yes/no |

### HTTP Headers
| Header | In config | In live response | Verdict |
|---|---|---|---|
| Content-Security-Policy | ✅/❌ | ✅/❌ | ✅/❌ |
| X-Frame-Options | ✅/❌ | ✅/❌ | ✅/❌ |
| X-Content-Type-Options | ✅/❌ | ✅/❌ | ✅/❌ |
| Referrer-Policy | ✅/❌ | ✅/❌ | ✅/❌ |
| Permissions-Policy | ✅/❌ | ✅/❌ | ✅/❌ |

### ❌ Critical findings ([N])
[route/file — check# — issue — exploit scenario — recommended fix]

### ⚠️ High findings ([N])
[route/file — check# — issue — recommended fix]

### 🔶 Medium findings ([N])
[route/file — check# — issue — recommended fix]

### ℹ️ Low / Informational ([N])
[route/file — check# — note]

### Quick wins
[findings that are isolated, low-risk fixes — e.g. add ownership filter, add input validation for query parameters]

### Strategic refactors
[findings requiring broader changes — e.g. state machine enforcement across all transition routes, centralized response serializers]
```

### Backlog decision gate

Present all findings with severity Medium or above as a numbered decision list:

```
Found N findings at Medium severity or above. Which to add to the backlog?
[1] [CRITICAL] SEC-? — route/file — one-line description
[2] [HIGH]     SEC-? — route/file — one-line description
[3] [MEDIUM]   SEC-? — route/file — one-line description
```

Reply with the numbers to include (e.g. "1 2 4"), "all", or "none".
**Wait for explicit user response before writing anything.**

Then write ONLY the approved entries to `docs/refactoring-backlog.md`:
- Assign ID: `SEC-[n]`
- Add to priority index
- Add full detail section with exploit scenario and recommended fix

### Severity guide

- **Critical**: unauthenticated route exposing or modifying data; access control bypass; service/admin credentials in client code; client-exposed secret env vars; cron route with no secret check; raw input in queries; critical CVE in production dependency
- **High**: privileged route without role check; PII exposed to non-owner; export route without role check; private storage using public URLs; open redirect; mass assignment; high CVE in production dependency
- **Medium**: missing validation on write route; error message leaking DB internals; missing security header; no rate limiting on high-value endpoints
- **Low**: header best-practice gap; moderate/low CVE not directly exploitable

After the report, ask: "Do you want me to implement fixes for Critical/High findings?"
