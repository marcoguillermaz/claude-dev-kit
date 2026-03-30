---
name: api-design
description: API design consistency review. Checks endpoint naming conventions, HTTP verb correctness, response shape consistency, error code standardization (400/409/422 distinction), pagination patterns, input validation presence, schema validation safety (safeParse vs parse), request body parsing safety, top-level array responses, and RFC 9457 error shape compliance. Does not cover auth implementation (use /security-audit) or performance (use /perf-audit).
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:section:<section>|target:role:<role>|mode:audit|mode:remediation|mode:apply]
---

You are performing an API design consistency review of the project's API routes.

**Scope**: endpoint naming, HTTP verbs, response shapes, error codes, pagination, validation, schema validation safety, request body parsing safety.
**Out of scope**: auth implementation → `/security-audit` | performance → `/perf-audit` | DB schema → `/skill-db`.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/refactoring-backlog.md`.**

### Status code reference (source: MDN + RFC 9457)
- **400** — malformed request: bad JSON, schema parse failure, missing required field
- **401** — not authenticated (no valid session)
- **403** — authenticated but lacks permission
- **404** — resource not found
- **409** — valid request conflicts with current server state (e.g., approving an already-approved record, duplicate unique value)
- **422** — semantically invalid data that passes schema validation but violates a business rule
- **500** — unexpected server error (no internal details in response)

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:<name>` | Only routes in that functional section (derive from sitemap) |
| `target:role:<role>` | Routes relevant to that role |
| `target:page:<route>` | Only that specific route |
| No argument | Full audit — all API routes |

**Mode** (controls whether changes are made):
| Token | Behavior |
|---|---|
| `mode:audit` (default) | Report findings only. No code changes. Write to backlog. |
| `mode:remediation` | Produce a prioritized improvement plan with migration guidance. No code changes. |
| `mode:apply` | Make focused, non-breaking fixes to routes only. Prefer one-liner diffs. Breaking changes require explicit user confirmation. |

Announce: `Running api-design — scope: [FULL | target: <resolved>] — mode: [audit|remediation|apply]`
Apply the target filter to the route inventory in Step 1.

---

## Step 1 — Build API inventory

Read `[SITEMAP_OR_ROUTE_LIST]` API routes section. For each route build:
- Path and HTTP methods
- Expected request body shape (infer from sitemap or read the route file)
- Expected response shape

Group routes by functional area (derived from sitemap). Also read current `docs/refactoring-backlog.md` to avoid duplicates.

---

## Step 2 — Pattern checks (two Explore subagents, run in parallel)

Split into two parallel Explore subagents (model: haiku) to stay within context budget. Launch both at once.

**Subagent A** handles: N1, N2, N3, N4, N5, N6, N7

"Run checks N1–N7 on the provided API route files. For each check: report total match count, list every match as `file:line — excerpt`, state PASS or FAIL.

**CHECK N1 — HTTP verb / action alignment**
For each route file, identify the exported handler names (GET, POST, PUT, PATCH, DELETE).
Flag mismatches:
- POST used for read-only operations (should be GET)
- PUT used for partial updates (should be PATCH — PUT implies full replacement)
- DELETE used with a required request body (non-standard)
- GET handlers that modify DB state (write to DB)

**CHECK N2 — URL structure consistency**
From route file paths, flag:
- Inconsistent pluralization (e.g. `/api/user/` vs `/api/users/` mixed across the project)
- Nested routes that skip a level (e.g. `/api/documents/sign` but also `/api/documents/[id]/sign` for the same resource)
- Action verbs in URLs that should be HTTP verbs (e.g. `/api/records/approve` should be `PATCH /api/records/[id]` with an action body)

**CHECK N3 — Query parameter vs path parameter usage**
Pattern: resource identifiers belong in the path (`/api/users/[id]`), not query params (`/api/users?id=...`). Filters and pagination belong in query params, not the path.
Flag: IDs passed as query params; filter values baked into the URL path.

**CHECK N4 — Validation library usage on write routes**
Pattern: POST/PUT/PATCH handlers must import `[VALIDATION_LIB]` or contain a schema parse.
Grep: in all write route files, check for validation import or `safeParse|validate|schema.parse|Schema.parse`.
Flag: any write route without explicit input validation.

**CHECK N5 — Consistent error response shape**
Pattern: all error responses must use the same JSON shape.
Grep: in route `catch` blocks and error returns, identify the response shape used (`{ error: message }`, `{ message }`, `{ errors: [] }`, etc.).
Flag: routes using a different error shape from the majority. The current project standard should be noted in the report.

**CHECK N6 — Error detail format**
Pattern: API errors should expose a structured issues array (or equivalent) when validation fails — not raw error objects or opaque messages.
Grep: validation error catch blocks. Verify errors return `{ error: '...', issues: [...] }` or equivalent structured detail, not raw thrown error objects (`{ error: err }`) or just `{ error: 'Invalid' }` with no field detail.
Flag: any validation error response that does not identify the failing field.

**CHECK N7 — Framework-specific route parameter handling**
Pattern: if the framework requires async access to route parameters (e.g. frameworks where `params` is a Promise object), verify that all dynamic route files resolve params asynchronously before destructuring.
Grep: in files with dynamic path segments (`[id]`, `[slug]`, etc.): direct destructuring from `params` or `context.params` without `await` where the framework requires it.
Flag: any synchronous `params` access in a framework that requires async access. Note this as a framework-specific check — verify against the project's framework version."

**Subagent B** handles: N8, N9, N10, N11, N12, N13

"Run checks N8–N13 on the provided API route files. For each check: report total match count, list every match as `file:line — excerpt`, state PASS or FAIL.

**CHECK N8 — Schema validation safety (.parse() vs .safeParse())**
Pattern: calling `.parse()` outside a try/catch block throws an unhandled exception on invalid input.
Two-pass approach:
1. Grep for `.parse(` to get candidate lines.
2. For each candidate: check if the SAME FILE contains at least one `try {` that precedes it. If the file has zero `try {` blocks → definite violation. If the file has try blocks → mark as "review needed" (cannot determine nesting without AST).
Flag: files with no try/catch at all as definite violations. Others as "review needed".

**CHECK N9 — Request body parsing safety**
Two-pass approach (avoids false positives from ±10 line heuristic):
Pass 1: Grep all files containing `await request\.json\(\)|await req\.json\(\)` — collect file list.
Pass 2: For each file, check if the file also contains `try {`.
- File has `request.json()` AND zero `try {` blocks → **definite violation** — flag.
- File has `request.json()` AND has `try {` blocks → **mark as "review needed"** (try may wrap json or may not).
Report separately: N definite violations + M files needing review.

**CHECK N10 — Top-level array response**
Pattern: no route should return a bare array as the top-level JSON response.
Grep: `Response\.json\(\s*\[|NextResponse\.json\(\s*\[|res\.json\(\s*\[|json\(\s*\[` across all route files.
Flag: any route returning a bare array at the top level. All list responses must be wrapped in an object (`{ items: [...] }`) — this allows adding `meta`, `pagination`, or `error` fields later without a breaking change.

**CHECK N11 — Filtering and sorting parameter naming conventions**
Step 1 — Inventory: collect ALL query parameter names used across routes. Group by semantic role:
- Pagination: `page`, `pageSize`, `limit`, `offset`, `cursor`
- Sort: `sort`, `sortBy`, `order`, `orderBy`
- Filter: any domain-field name used as filter
- Search/text: `q`, `search`, `query`, `keyword`
Step 2 — Convention derivation: count usage frequency for each semantic role. The most-used name in each group IS the project convention.
Step 3 — Flag deviations: any param name in a semantic group that differs from the majority convention.
Step 4 — Case style: if the majority of params are camelCase, flag any snake_case param (and vice versa).
Report the derived convention and list all deviations from it.

**CHECK N12 — Field naming consistency in request/response bodies**
For each route file: extract field names from Zod schema declarations (POST/PATCH body schemas) for request fields. For response keys, read the JSON response object structure.
Flag:
- Boolean field naming: inconsistent prefix (`is_`, `has_`) usage within the same entity type
- Note: DB column names (snake_case) are NOT violations. Only flag fields in the JSON request/response contract layer.

**CHECK N13 — Resource modeling: action endpoint overuse and nesting depth**
From route file paths (no code read needed), analyze URL structure:
Flag action endpoints that could be replaced by a resource + HTTP verb:
- Pattern: `/api/[resource]/[id]/[verb]` where verb is `approve`, `reject`, `sign`, `send`, `publish`, `archive`, `restore`, `revoke` — note these as ACCEPTED if the verb maps to a single state transition
- Pattern: `/api/[resource]/[verb]-bulk` or `/api/[resource]/bulk-[verb]` — flag naming inversion if inconsistent across resources
Flag deep nesting (3+ levels):
- Pattern: `/api/[a]/[id]/[b]/[id]/[c]` — challenge whether nesting is justified by strict ownership
Count total action-style path segments vs total resource segments. Report ratio."

---

## Step 3 — Response shape consistency (main context)

Read 10 representative route handlers (mix of GET, POST, PATCH, DELETE):

**R1 — Success response envelope**: verify all success responses use the same envelope shape. Flag any route that deviates from the project's established pattern (e.g. `{ data: ... }` or `{ result: ... }` or direct object — flag inconsistencies within the project, not against an external standard).

**R2 — HTTP status code correctness**:
- 200: success with body
- 201: resource created (POST that creates)
- 204: success with no body (DELETE, PATCH with no return)
- 400: malformed request — bad JSON, schema validation failure, missing required field
- 401: not authenticated (no valid session)
- 403: authenticated but lacks permission
- 404: resource not found
- 409: valid request conflicts with current server state (duplicate, state machine conflict)
- 422: semantically invalid data that passes schema validation but violates a business rule
- 500: unexpected server error (no internal details in response)

Flag: routes returning 200 for errors, 500 for validation errors, 400 for state-conflict scenarios (should be 409), or 200 on deletes.

**R3 — RFC 9457 compliance note**: check if the project uses RFC 9457 "Problem Details for HTTP APIs" format (`{ type, title, status, detail }`). Note whether the current error shape is consistent with or diverges from RFC 9457. Do not flag as a violation if the project has a consistent non-RFC-9457 shape — note it as an informational recommendation.

---

## Step 4 — Pagination consistency check (main context)

From the sitemap, identify all `GET` collection endpoints (paths without a single-resource identifier). Read each GET handler. Verify:

**P1 — Consistent pagination shape**
Expected: a consistent documented project standard, e.g. `{ items: T[], total: number, page: number, pageSize: number }` or cursor-based equivalent.
Flag any list endpoint using a different shape or returning a bare array (overlap with N10).
Flag any list endpoint with no pagination at all (returning all records unboundedly).

**P2 — Consistent pagination parameter names**
Check if all paginated endpoints use the same query param names (e.g. `page`/`pageSize` vs `limit`/`offset` vs `cursor` — pick one convention and apply consistently).
Flag: mixed pagination parameter naming across endpoints.

**P3 — Default page size**
Check if a missing page size param falls back to a safe default (e.g. 50). Flag any endpoint with no default that could return unbounded results when the param is omitted.

**P4 — Total count as number (not string)**
Some DB clients return count values as strings. Verify that paginated endpoints explicitly convert count to a number type before including it in the response.
Flag: any endpoint returning `total` without an explicit numeric conversion where the source is a DB count query.

---

## Step 5 — Validation consistency check (main context)

Identify all write routes (POST, PUT, PATCH). For each:

**V1 — Input validation completeness**
Check that the validation schema covers all required fields (fields that are NOT NULL in the DB with no default). Flag any required field missing from the schema.

**V2 — Validation before DB**
Check that validation always happens BEFORE any DB query. Flag: any handler that reads from DB before validating input.

**V3 — Validation error quality**
Check that validation failures return `status: 400` with field-level error detail — not just a generic "bad request".
Preferred response shape: `{ error: 'Validation failed', issues: [...] }` or `flattenError(result.error)` for form-facing endpoints.

---

## Step 6 — Produce report and update backlog

### Output format

```
## API Design Audit — [DATE] — [TARGET]
### Scope: [N] API routes
### Sources: RFC 9457, MDN HTTP status codes, schema validation library docs

### Pattern Checks (Explore agent)
| # | Check | Issues | Severity | Verdict |
|---|---|---|---|---|
| N1 | HTTP verb alignment | N | Medium | ✅/⚠️ |
| N2 | URL structure | N | Low | ✅/⚠️ |
| N3 | Path vs query params | N | Low | ✅/⚠️ |
| N4 | Missing input validation | N | High | ✅/⚠️ |
| N5 | Error shape consistency | N | High | ✅/⚠️ |
| N6 | Error detail format (field-level) | N | Medium | ✅/⚠️ |
| N7 | Framework param handling | N | High | ✅/⚠️ |
| N8 | .parse() without safeParse | N | High | ✅/⚠️ |
| N9 | request.json() without try/catch | N | High | ✅/⚠️ |
| N10 | Top-level array response | N | Medium | ✅/⚠️ |
| N11 | Filtering/sorting param conventions | N | Low | ✅/⚠️ |
| N12 | Field naming consistency | N | Medium | ✅/⚠️ |
| N13 | Action endpoint overuse & nesting depth | N | Low | ✅/⚠️ |

### Response Consistency
| # | Check | Issues | Verdict |
|---|---|---|---|
| R1 | Success envelope consistency | N | ✅/⚠️ |
| R2 | HTTP status code correctness | N | ✅/⚠️ |
| R3 | RFC 9457 compliance note | — | ℹ️ |

### Pagination
| # | Check | Verdict | Notes |
|---|---|---|---|
| P1 | Pagination shape | ✅/⚠️ | |
| P2 | Parameter names | ✅/⚠️ | |
| P3 | Default page size | ✅/⚠️ | |
| P4 | Total count as number | ✅/⚠️ | |

### Validation
| # | Check | Verdict | Notes |
|---|---|---|---|
| V1 | Input validation completeness | ✅/⚠️ | |
| V2 | Validation before DB | ✅/⚠️ | |
| V3 | Validation error quality | ✅/⚠️ | |

### Error Shape Consistency Note
Current project standard: [identify from audit]. RFC 9457 standard: `{ type, title, status, detail }`.
Verdict: [Consistent / Inconsistent — N routes diverge]
Recommendation: [keep current if consistent | standardize to minimum `{ error, status }` | adopt RFC 9457]

### API Design Maturity Assessment
| Dimension | Rating | Notes |
|---|---|---|
| HTTP semantics | low / medium / high | [summary] |
| Response contract quality | low / medium / high | [summary] |
| Error model quality | low / medium / high | [summary] |
| Pagination consistency | low / medium / high | [summary] |
| Field naming consistency | low / medium / high | [summary] |
| Resource modeling | low / medium / high | [summary] |

### Detected API Conventions (current project state)
- Routing style: [e.g. REST resource-oriented]
- Naming style: [e.g. camelCase params]
- Error format: [e.g. { error: string } — consistent/inconsistent]
- Pagination pattern: [e.g. { items, total, page, pageSize } — partial/full]
- Validation strategy: [e.g. Zod safeParse before DB — X% of write routes]

### ⚠️ Findings requiring action ([N] total)
[route — check# — issue — standard to apply — fix]
```

### Backlog decision gate

Present all findings with severity Medium or above as a numbered decision list, sorted Critical → High → Medium:

```
Trovati N finding Medium o superiori. Quali aggiungere al backlog?
[1] [CRITICAL] API-? — route/file — one-line description
[2] [HIGH]     API-? — route/file — one-line description
[3] [MEDIUM]   API-? — route/file — one-line description
```

Rispondi con i numeri da includere (es. "1 2 4"), "tutti", o "nessuno".
**Wait for explicit user response before writing anything.**

Then write ONLY the approved entries to `docs/refactoring-backlog.md`:
- Assign ID: `API-[n]` (increment from last API entry)
- Add row to the priority index table
- Add full detail section: `### API-N — [title]` with File, Issue, Impact, Suggested fix

### Severity guide

- **Critical**: framework param handling producing runtime errors (N7); unhandled schema validation throw producing 500 instead of 400 (N8); unhandled body parsing SyntaxError producing 500 (N9)
- **High**: write route with no input validation (N4); divergent error shapes that client code may silently mishandle (N5); 200 returned with error body; unbounded list endpoint with no pagination (P1/P3)
- **Medium**: N10 top-level array response; POST not returning 201 on create (R2); 400 used for state-conflict scenarios instead of 409 (R2); N6 error responses without field-level detail; missing validation before DB (V2); mixed pagination param names (P2)
- **Low**: URL structure issues (N2); ID in query param instead of path (N3); PUT vs PATCH mismatch; total count not converted to number; minor status code pedantry; RFC 9457 divergence when project shape is at least consistent

---

## Execution notes

- Do NOT make any route changes.
- Do NOT audit auth logic (covered by `/security-audit`).
- If a pattern is used consistently project-wide (even if non-standard), note it as "consistent but non-standard" — don't flag as a violation unless it causes actual client-side issues.
- After the report, ask: "Do you want me to align the endpoints that show inconsistencies?"
- **Mode: audit / remediation**: Do NOT make any route changes.
- **Mode: apply**: make only non-breaking, focused fixes (e.g. 200→201, error shape corrections). Flag every breaking change explicitly before touching it. Do not rewrite handler logic.
