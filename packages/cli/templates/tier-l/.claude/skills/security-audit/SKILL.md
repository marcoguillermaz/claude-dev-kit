---
name: security-audit
description: Security audit: auth/authz on API routes, input validation, RLS policies, response shape review, secret exposure, HTTP headers. Native mode checks entitlements and Keychain.
user-invocable: true
model: sonnet
context: fork
effort: high
argument-hint: [target:page:<route>|target:role:<role>|target:section:<section>]
---

**Scope**: API routes, middleware/proxy, row-level access control policies, data validation, response shapes, environment variables, database configuration, dependencies. For native stacks: secrets management, platform security (Keychain/Keystore/entitlements), input validation, signing credentials, sensitive data protection.
**Out of scope**: SEO, robots.txt, public crawlability, OpenGraph, sitemap.xml.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/refactoring-backlog.md`.**

---

## Applicability check

Before any other step: read `CLAUDE.md` and check the Framework and Language fields.

- **Web or API project** (Framework is NOT `N/A — native app`, OR route handler directories exist): proceed to **Step 0** — full web audit (Steps 0–5) + Step 3e if the language is non-JS.
- **Native with API** (Framework is `N/A — native app` AND route handler directories exist): proceed to **Step 0** — full web audit (Steps 0–5) + Step 3e (native checks run in addition to web checks).
- **Native only** (Framework is `N/A — native app` AND no route handler directories): skip Steps 0–5. Proceed directly to **Step 3e** (native-only audit). Then skip to **Step 6** for the report.

Announce the execution path: `Running security-audit — mode: [WEB | WEB+NATIVE | NATIVE-ONLY]`

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:role:admin` | Focus on admin routes |
| `target:section:export` | Focus on all export/bulk-data routes |
| `target:section:<other>` | Read `[SITEMAP_OR_ROUTE_LIST]` — find rows matching the section keyword, resolve to API routes and related route files |
| No argument | Full audit — all API routes |

Announce: `Running security-audit — scope: [FULL | target: <resolved>]`
Apply the target filter to the route inventory built in Step 1.

---

## Step 1 — Build API route inventory

Also read:
- Auth helper files (e.g. `lib/auth.ts`, `utils/auth.py`) — understand session/token helpers
- `docs/refactoring-backlog.md` — avoid duplicates

Output: complete list of API routes grouped by:
- **Public** (no auth required)
- **Protected** (auth required, any role)
- **Role-specific** (grouped by functional section per `[SITEMAP_OR_ROUTE_LIST]`)
- **Export routes** (bulk data endpoints returning CSV or XLSX)

Apply target scope from Step 0 before proceeding.

---

## Step 2 — Auth, authorization, and injection checks (Explore agent)

Launch a **single Explore subagent** (model: haiku) with the full route file list:

**CHECK A1 — Missing auth check at route entry**
Pattern: route handler function body does NOT contain any auth verification pattern within the first 20 lines (e.g. `getSession|getUser|auth()|session|req.user|currentUser`).
Grep: for each route file, check if any auth pattern appears within the first 20 lines of the exported handler function. Flag any route file where none appear.
Note: service-role-only routes must still verify the caller's role — a privileged client alone is not an auth check.

**CHECK A2 — Role check present for admin routes**
Flag: any admin route without an explicit role assertion.

**CHECK A3 — Input validation on request body, path params, and query params**
Pattern A (body): route files handling POST/PUT/PATCH should use a validation library (e.g. Zod, Joi, class-validator).
Grep: in all write route files, check for validation patterns (e.g. `safeParse|\.parse\(|validate\(|Joi\.object`).
Flag: any write route without validation on the request body.
Flag: raw path params fed into DB queries without format validation — an invalid format causes a DB error, leaking implementation details.
Pattern C (query params): grep all route files for user-provided query parameters whose return value is used in DB filter calls without an explicit allowlist or schema validation.
Flag: unvalidated query params used as DB filter inputs.

**CHECK A4 — Raw user input in SQL/queries**
Pattern: template literals or string concatenation used to build database queries with user-provided values.
Grep: string interpolation or concatenation in query construction (e.g. `` `SELECT * FROM ${table}` ``, `.where('col = ' + val)`).
Flag: any query built with string concatenation from user input. Use parameterized queries instead.

**CHECK A5 — Sensitive fields in API responses**
Pattern: API routes returning full objects that may include sensitive fields.
Grep: routes selecting all columns (e.g. `SELECT *`, `.select('*')`, `.findAll()`) AND returning the full result to the client without explicit field filtering.

**CHECK A6 — Cron/job routes missing secret check**
Flag: any job/cron route that does NOT verify a shared secret or API key before execution.

**CHECK A7 — Export routes missing role check**
Scope: any route file whose path contains 'export' or that returns `Content-Type: text/csv` or `application/vnd.openxmlformats`.
Grep: files containing `text/csv|Content-Disposition.*attachment|application/vnd.openxml`.
Flag: any export route without an explicit role assertion.

**CHECK A8 — Client-exposed environment variable secret leak**
Scope: all source files and `.env*` files.
Pattern: environment variables with client-side prefixes (e.g. `NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`, `NUXT_PUBLIC_`) whose names contain secret-like suffixes (`KEY`, `SECRET`, `TOKEN`, `PASSWORD`).
Flag: any client-prefixed variable that contains a secret-like suffix. These variables are inlined into the client bundle and visible to all users.
Note: public API URLs and non-secret anon keys are expected — exclude those.

**CHECK A9 — Privileged credentials in client-side code**
Scope: all client-side source files (files with `'use client'`, browser entry points, frontend components).
Pattern: grep for privileged credential references (e.g. `SERVICE_ROLE|service_role|ADMIN_KEY|serviceRoleKey|masterKey`).
Flag: any match. Privileged credentials bypass access control — their presence in client-side code exposes them to every user.

**CHECK A10 — Public URL for private storage assets**
Scope: all route files and utility files that handle file/document/attachment operations.
Pattern: public URL generation (e.g. `getPublicUrl`, direct S3 URL construction) in files that handle private assets (documents, contracts, receipts).
Flag: any public URL call for a private asset. Private assets must use signed/temporary URLs with a TTL.
Note: explicitly public storage (avatars, public uploads) is expected — exclude those.

**CHECK A11 — Open redirect**
Pattern: redirect calls where the URL argument derives from user-controlled input (query params, request body, path params) without an explicit allowlist check.
Flag: any redirect where the target URL is constructed from user-controlled input.

**CHECK A12 — Mass assignment**
Scope: all route files handling POST/PUT/PATCH.
Pattern: find where the raw request body object is passed wholesale to a DB write operation without explicit field destructuring or schema validation first.
Flag: any route where the raw body is inserted/updated directly.
Note: routes that validate through a schema (e.g. `schema.parse(body)`) before inserting are safe — exclude those.

**CHECK A13 — Horizontal access control / IDOR**
For each dynamic route:
Step 1 — identify how the caller's identity is resolved (grep for `getSession|getUser|user\.id|session\.user|req\.user|currentUser`).
Step 2 — verify that the DB query filters by the caller's identity or scope, not just by the URL parameter alone.
Insecure pattern: filtering only by the requested ID without verifying ownership — any authenticated user can access any record by guessing IDs.
Flag: each route where ownership/scope is not enforced server-side in the query.

**CHECK A14 — State machine enforcement on transition routes**
For each status-changing route:
Step 1 — verify the route reads the CURRENT state from the DB before applying the transition (grep for a SELECT/read query before the UPDATE in the same handler).
Flag: any transition route that does NOT verify current state server-side before applying the update. Skipping a required intermediate state is both a business logic violation and a potential abuse path."

---

## Step 3 — Response shape review (main context)

For the 10 most-used API routes (identified from `[SITEMAP_OR_ROUTE_LIST]`):

**R1 — Sensitive field exposure**
Identify fields containing PII, financial data, or credentials (e.g. tax IDs, bank account numbers, password flags). Verify these are NOT returned to non-admin/non-owner callers.

**R2 — Financial/restricted data exposure**
Verify that financial records, compensation data, or other restricted entities are not exposed beyond their authorized audience.

**R3 — Error message verbosity**
Scan 5 route handlers for error handling blocks. Verify internal error messages (DB errors, stack traces) are NOT forwarded to the client response.
Expected: generic error messages returned to client — never raw error details that may contain schema or internal state information.

**R4 — Domain data scoping**
Users can only see records scoped to their ownership or authorized scope (via ownership checks, row-level policies, or equivalent access control).

**R5 — Rate limiting on high-value endpoints**
- Any export route (bulk data)
- Any bulk-action route
Note: absence of rate limiting is a Medium finding for an internal app — flag it, don't treat as Critical.

---

## Step 3b — Database security advisors *(if available)*

If your database platform provides automated security advisors (e.g. Supabase Security Advisors via MCP, AWS RDS recommendations), run them and include results:

For each finding returned:
- Error/critical level → **Critical** finding
- Warning level → **High** finding
- Info level → **Low** / informational

Include the full list in the report output. Do not suppress any result.
If no automated advisors are available, skip this step and note it in the report.

---

## Step 3c — Dependency CVE audit

Run the appropriate dependency audit for the project's package manager:
- Node.js: `npm audit --json --omit=dev` or `yarn audit --json`
- Python: `pip-audit` or `safety check`
- Ruby: `bundle-audit check`
- Go: `govulncheck ./...`
- Rust: `cargo audit`
- Java/Kotlin: `mvn dependency-check:check` or `./gradlew dependencyCheckAnalyze`
- .NET: `dotnet list package --vulnerable`
- Swift: check Package.resolved for known CVEs

For each finding, record:
- Package name and affected version range
- CVE ID (if available)
- Brief description
- Whether a fix is available

Flag any `critical` CVE in a production dependency as a **Critical** finding.
Flag any `high` CVE as a **High** finding.
`moderate` and `low` → note in report but do not add to backlog unless directly exploitable in this app's context.

If the audit command fails or is unavailable, note it and skip.

---

## Step 3d — Row-level access control completeness check

Complement Step 3b (DB advisors) with a grep-based check on migration or schema files.

**RLS-1 — Tables without row-level access control**
Grep migration/schema files for table creation statements. For each table, check if row-level access control is enabled (e.g. `ENABLE ROW LEVEL SECURITY` in PostgreSQL, application-level guards in other stacks).
Flag: any table storing user-scoped data where row-level access control is absent.
Note: tables with only service-role access (e.g. internal log tables) may legitimately skip this — verify from context.

**RLS-2 — Access control enabled but no policies**
For each table with row-level access control enabled, verify that at least one access policy exists.
Flag: any table with access control enabled but zero policies. This can cause silent empty results, masking bugs.

**RLS-3 — Missing write-side policy checks**
For databases with row-level policies: verify that INSERT/UPDATE policies include write-side checks (e.g. `WITH CHECK` in PostgreSQL).
Flag: policies that control reads but not writes — this allows inserting/updating rows the user cannot see.

---

## Step 3e — Native application security checks

**This step runs only when the project uses a native or non-web stack** (check CLAUDE.md Language field: Swift, Kotlin, Rust, Go, Python, Ruby, Java, C#). For web-only projects (Node.js/TypeScript with a web frontend), skip to Step 4.

These checks supplement the API-level checks in Step 2. They audit the application's own security posture beyond its HTTP surface.

### Stack-specific security checklist

[SECURITY_CHECKLIST_ITEMS]

### NS1 — Secrets management audit
Grep all source files for patterns that indicate hardcoded secrets:
- String literals containing `password`, `secret`, `token`, `key`, `api_key` (case-insensitive)
- Base64-encoded strings longer than 40 characters in source (potential embedded credentials)
- Configuration files committed to git that contain non-placeholder secret values

Flag: each hardcoded secret. Secrets must come from environment variables, platform keychain, or a secrets manager.

### NS2 — Dependency vulnerability scan
Run the appropriate dependency audit tool:
- Swift: check for known CVEs in Package.resolved dependencies
- Kotlin: `./gradlew dependencyCheckAnalyze` or review build.gradle for outdated dependencies
- Rust: `cargo audit`
- Go: `govulncheck ./...`
- Python: `pip-audit` or `safety check`
- Ruby: `bundle-audit check`
- Java: `mvn org.owasp:dependency-check-maven:check`
- dotnet: `dotnet list package --vulnerable`

Flag: Critical/High CVEs as Critical/High findings. Medium/Low CVEs noted in report.

### NS3 — Input validation on external boundaries
For each entry point (CLI args, file parsing, IPC, network input, URL schemes, deep links, clipboard data):
- Verify input is validated/sanitized before use
- Check for path traversal in file operations (user input in file paths)
- Check for command injection (user input passed to shell execution or subprocess)
- Check for buffer overflow risk in languages without bounds checking

Flag: each unvalidated external input.

### NS4 — Platform security checks
Execute each item from the stack-specific checklist above as a targeted grep/read check:
- **Swift**: verify Keychain usage (not UserDefaults) for secrets, check ATS exceptions in Info.plist, verify Data Protection on sensitive files, audit entitlements for minimal privilege, confirm hardened runtime enabled, check TCC usage descriptions present
- **Kotlin**: verify Android Keystore usage (not SharedPreferences) for secrets, check certificate pinning config, verify ProGuard/R8 enabled for release, audit ContentProvider export settings, check WebView JavaScript disabled by default
- **Rust**: audit every `unsafe` block for safety justification comment, verify no use-after-free/double-free patterns, check FFI boundaries for input validation, verify constant-time comparison for secrets
- **Go**: verify parameterized SQL queries (no string concatenation), check goroutine context cancellation propagated, verify crypto stdlib usage (no custom crypto), check govulncheck results
- **Python**: verify parameterized queries (no f-strings in SQL), check subprocess usage (no shell=True with user input), verify no pickle on untrusted data, check for SSRF in URL handling
- **Ruby**: verify strong parameters on controllers, check CSRF protection enabled, verify no string interpolation in where(), check secure cookie settings
- **Java**: verify no ObjectInputStream on untrusted data, check PreparedStatement usage, verify XXE prevention in XML parsers, check SecureRandom usage
- **dotnet**: verify Secret Manager or Key Vault usage (not appsettings.json for secrets), check anti-forgery tokens, verify HTTPS enforcement, check ProblemDetails in production

Flag: each violation with severity based on exploitability.

### NS5 — Sensitive data protection
- Verify sensitive data written to disk uses platform encryption (Data Protection API on Apple, EncryptedSharedPreferences on Android, file permissions on systems stacks)
- Check that temporary files with sensitive content are deleted after use
- Verify no sensitive data in logs (grep for log/print statements near secret/token/password handling)
- Check that error messages do not expose internal state or stack traces to users

Flag: each unprotected sensitive data path.

### NS6 — Code signing and distribution
- No signing credentials, provisioning profiles, or keystores committed to repository (grep for `.p12`, `.mobileprovision`, `.keystore`, `.jks`, `.pem`, `.key` in tracked files)
- No disabled code signing workarounds in build config
- CI/CD signing credentials sourced from environment variables or secure storage, not checked-in files

Flag: each signing credential in repository as Critical.

---

## Step 4 — HTTP security headers check

**Static check**: read the server/framework configuration file (e.g. `next.config.ts`, `nginx.conf`, `helmet()` config). Verify these headers are configured:

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
Compare actual headers received vs configuration. A header present in config but absent in the curl output indicates a misconfiguration (pattern mismatch, wrong route scope, etc.).

Flag: any header present in config but absent in live response — this means the config is ineffective.

---

## Step 5 — Proxy / middleware check

- API routes are not accessible without a valid session token (no CORS bypass path)
- Auth-gated redirects (e.g. password change, onboarding) are enforced at the server/proxy level, not just client-side
- Public route whitelists are narrow — specific paths only, not wildcard prefixes that could expose other routes
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
- Validation layer: schema validation in [N] route files
- DB/access control layer: [N] migration files + DB advisors (if available)
- Headers: server config + live curl on staging
- Assumptions: [e.g. "No server-side form actions — N/A"]

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
| A3 | Missing input validation (body/params/query) | N | High | ✅/❌ |
| A4 | Raw input in queries | N | Critical | ✅/❌ |
| A5 | Sensitive fields in responses | N | High | ✅/❌ |
| A6 | Cron routes missing secret | N | Critical | ✅/❌ |
| A7 | Export routes missing role check | N | High | ✅/❌ |
| A8 | Client-exposed env var secret leak | N | Critical | ✅/❌ |
| A9 | Privileged credentials in client code | N | Critical | ✅/❌ |
| A10 | Public URL on private storage asset | N | High | ✅/❌ |
| A11 | Open redirect | N | High | ✅/❌ |
| A12 | Mass assignment | N | High | ✅/❌ |
| A13 | Horizontal AC / IDOR (dynamic routes) | N | High | ✅/❌ |
| A14 | State machine enforcement | N | High | ✅/❌ |

### Response Shape Review
| # | Check | Verdict | Notes |
|---|---|---|---|
| R1 | Sensitive field exposure (PII, financial) | ✅/❌ | |
| R2 | Restricted data exposure | ✅/❌ | |
| R3 | Error message verbosity | ✅/❌ | |
| R5 | Rate limiting on high-value endpoints | ✅/❌ | |

### RLS — Code-level check
| # | Check | Tables flagged | Verdict |
|---|---|---|---|
| RLS-1 | Tables without row-level access control | N | ✅/❌ |
| RLS-2 | Access control enabled but zero policies | N | ✅/❌ |
| RLS-3 | Write-side policy checks missing | N | ✅/❌ |

### Native Application Security (if applicable)
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| NS1 | Hardcoded secrets | N | Critical | ✅/❌ |
| NS2 | Dependency vulnerabilities | N | High | ✅/❌ |
| NS3 | Unvalidated external input | N | High | ✅/❌ |
| NS4 | Platform security (stack-specific) | N | varies | ✅/❌ |
| NS5 | Sensitive data protection | N | High | ✅/❌ |
| NS6 | Code signing credentials in repo | N | Critical | ✅/❌ |

### Database Security Advisors (if available)
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
| Auth-gated redirects server-side (not client-side) | ✅/❌ | |
| Public route whitelist is narrow (no wildcard) | ✅/❌ | |
| No forgeable bypass header trusted | ✅/❌ | |

### Prioritized findings (Critical → High → Medium → Low)
Format: `[SEVERITY] route/file:line — check# — issue — exploit path — recommended fix — effort`

### Quick wins
[findings that are isolated, low-risk fixes — e.g. add ownership filter, add validation enum on query param, add write-side policy check]

### Strategic refactors
[findings requiring broader changes — e.g. state machine enforcement across all transition routes, centralized response serializers, access control policy overhaul]

### Validation checklist
After applying fixes, verify:
- [ ] Unauthenticated request (no token) to each fixed route → 401
- [ ] Horizontal AC: request with valid token but different owner's ID → 403 or 404
- [ ] State machine: request with invalid transition on current state → 422
- [ ] Path param validation: request with invalid ID format → 400
- [ ] Row-level access: unprivileged query on fixed tables → 0 rows (not error)
- [ ] DB advisors re-run after schema changes → 0 critical-level items
```

### Backlog decision gate

Present all findings with severity Medium or above as a numbered decision list, sorted Critical → High → Medium:

```
Found N findings at Medium or above. Which to add to backlog?

[1] [CRITICAL] SEC-? — route/file — one-line description
[2] [HIGH]     SEC-? — route/file — one-line description
[3] [MEDIUM]   SEC-? — route/file — one-line description
...

Reply with numbers to include (e.g. "1 2 4"), "all", or "none".
```

**Wait for explicit user response before writing anything.**

Then write ONLY the approved entries to `docs/refactoring-backlog.md`:
- Assign ID: `SEC-[n]`
- Add to priority index
- Add full detail section with exploit scenario and recommended fix

### Severity guide

- **Critical**: unauthenticated route exposing or modifying data; row-level access bypass; privileged credentials in client code; client-exposed env var secret; cron route with no secret check; raw input in queries; DB advisor critical-level finding; table missing row-level access control on sensitive data (RLS-1); hardcoded secrets in source code (NS1); signing credentials committed to repo (NS6); unsafe block without safety justification in Rust (NS4)
- **High**: admin route without role check; sensitive PII/financial field exposed to non-owner; export route without role check; public URL on private storage asset; open redirect; mass assignment; horizontal AC / IDOR on sensitive records (A13); state machine bypass on financial/status transitions (A14); missing write-side policy checks (RLS-3); DB advisor warning-level finding; critical/high CVE in production dependency (NS2); unvalidated external input at system boundary (NS3); sensitive data written without platform encryption (NS5); disabled code signing (NS6)
- **Medium**: missing validation on write route body; unvalidated path param or query param used in DB filter (A3); error message leaking DB internals; missing security header; no rate limiting on high-value endpoints; access control enabled but zero policies (RLS-2); sensitive data in log output (NS5)
- **Low**: header best-practice gap; informational DB advisor finding; moderate/low CVE not directly exploitable; state machine bypass on low-risk status fields

---

## Execution notes

- Do NOT modify any route, config, or migration file.
- SEO, robots.txt, meta tags, sitemaps, and public indexing are explicitly OUT OF SCOPE.
- **Server-side form actions**: if the framework supports server-side form actions (e.g. Next.js Server Actions, SvelteKit form actions, Remix actions), treat them as directly-reachable POST endpoints and audit with the same auth/authz/validation checks. Note as N/A if absent.
- After the report, ask: "Should I implement the Critical/High fixes identified?"
