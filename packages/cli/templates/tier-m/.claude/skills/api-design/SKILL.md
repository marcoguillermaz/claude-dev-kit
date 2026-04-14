---
name: api-design
description: API design audit: endpoint naming, HTTP verbs, response shapes, error codes, pagination, validation consistency. Run when adding or modifying API routes.
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:section:<section>|target:role:<role>|mode:audit|mode:remediation|mode:apply]
---

**Scope**: endpoint naming, HTTP verbs, resource modeling, response shapes, error codes, field naming, filtering/sorting conventions, pagination, validation, auth/authz boundary clarity.
**Out of scope**: auth implementation → `/security-audit` | performance → `/perf-audit` | DB schema → `/skill-db`.
**Default mode**: audit (no code changes). Modes: `audit` | `remediation` (propose plan, no changes) | `apply` (make focused fixes).
**All audit findings go to `docs/refactoring-backlog.md`.**

### Status code reference (source: MDN + RFC 9457)
- **400** — malformed request: bad JSON, Zod parse failure, missing required field
- **401** — not authenticated (no valid session)
- **403** — authenticated but lacks permission
- **404** — resource not found
- **409** — valid request conflicts with current server state (e.g., approving an already-approved record, duplicate unique value)
- **422** — semantically invalid data that passes Zod schema but violates a business rule
- **500** — unexpected server error (no internal details in response)

### Idempotency keys — explicit non-requirement

---

## Step 0 — Target and mode resolution

Parse `$ARGUMENTS` for `target:` and `mode:` tokens.

**Target:**
| Pattern | Meaning |
|---|---|
| `target:section:export` | Only export/bulk routes (example) |
| `target:section:<other>` | Resolve by reading `[SITEMAP_OR_ROUTE_LIST]` API routes section, filtering for routes whose path or group label contains `<other>`. Announce the resolved route list before proceeding. |
| No argument | **Full audit — ALL API routes across the entire codebase. Maximum depth.** |

**STRICT PARSING — mandatory**: derive target ONLY from the explicit text in `$ARGUMENTS`. Do NOT infer target from conversation context, recent work, active block names, or project memory. If `$ARGUMENTS` contains no `target:` token → full audit across ALL API routes at maximum depth. When a target IS provided → act with maximum depth and completeness on that specific scope only.

**Mode:**
| Token | Behavior |
|---|---|
| `mode:audit` (default) | Report findings only. No code changes. Write to backlog. |
| `mode:remediation` | Produce a prioritized improvement plan with migration guidance. No code changes. |
| `mode:apply` | Make focused, non-breaking fixes to routes only. Prefer one-liner diffs. Breaking changes require explicit user confirmation. |

Announce: `Running api-design — scope: [FULL | target: <resolved>] — mode: [audit|remediation|apply]`
Apply the target filter to the route inventory in Step 1.

---

## Step 1 — Build API inventory

Read `[SITEMAP_OR_ROUTE_LIST]` API routes section. Build a complete list of all routes (filtered by target scope). For each route: read the actual route file to determine HTTP methods, request body shape, and response shape — do not infer from sitemap entries alone, as sitemap descriptions may be incomplete.

Group routes by functional area (derived from `[SITEMAP_OR_ROUTE_LIST]`):
- Core entity routes (CRUD for primary domain objects)
- Role-specific domain routes (include all non-admin, non-cron routes per role)
- Jobs/cron routes
- Export: routes returning CSV/XLSX

Also read current `docs/refactoring-backlog.md` to avoid duplicates.

---

## Step 2 — Pattern checks (two Explore subagents, run in parallel)

Split into two parallel Explore subagents (model: haiku) to stay within context budget. Launch both at once.

**CHECK N1 — HTTP verb / action alignment**
For each route file, identify the exported function names (GET, POST, PUT, PATCH, DELETE).
Flag mismatches:
- POST used for read-only operations (should be GET)
- PUT used for partial updates (should be PATCH — PUT implies full replacement)
- DELETE used with a request body (non-standard)
- GET handlers that modify state (write to DB)

**CHECK N2 — URL structure consistency**
From route file paths, flag:
- Nested routes that skip a level: e.g. `/api/documents/sign` but also `/api/documents/[id]/sign`

**CHECK N3 — Response shape consistency (success)**
Grep for the framework's JSON response pattern (e.g. `return NextResponse.json(`, `res.json(`, `Response.json(`, `jsonify(`) across all route files.
For each route returning a single entity (GET /[id]): check if the top-level key is consistent — e.g. `{ compensation }` vs `{ data }` vs `{ result }` vs naked object. The same entity must use the same wrapper key across all routes.
For each route returning a list: check if the shape is `{ items, total, page }` or a naked array.
Flag: any inconsistency in the key name for the same entity type across different routes.

**CHECK N4 — Error response shape consistency**
Two-pass approach to handle multi-line JSON response calls:
Pass 1: Grep for non-standard error keys in route files: `\"message\":|\{ message:|'message':|\{ msg:|\{ errors:`
Flag every match — these are clear violations of the `{ error: string }` project standard.
Pass 2: Grep for `\"error\":` to confirm the standard key is present in the majority of files.
Report: N files use `message`, M files use `error`. Flag all `message`/`msg`/`errors` users.
Do NOT rely on same-line status code matching — status may be on a separate line.

**CHECK N5 — Status code correctness**
Grep for common misuses:
- `status: 200` on a successful POST — look for route files exporting `POST` that return `status: 200` (check within 30 lines of the JSON response return at the end of success paths)
- `status: 400` for authorization errors (should be 403)
- `status: 500` for validation errors (should be 400)
- `status: 200` anywhere in a file that also has `error:` in the same return statement
- `status: 400` in files that also contain state machine transitions or status checks — state conflicts should return 409, not 400. Flag as 'review needed', not definitive violation.
Flag each match with the correct status code.

**CHECK N6 — Validation error access convention**
If using Zod: when handling ZodError, always access `.issues` (not `.errors`). Using `.errors` returns `undefined` silently.
Grep: `zodResult\.error\.errors|err\.errors|parseResult\.error\.errors|\.error\.errors`
Expected: 0 matches. All ZodError access must use `.issues`.
If using a different validation library: check that error details are accessed via the documented API - not a similar-but-wrong property name.

**CHECK N6b — Async params access (framework-specific)**
If the project uses a framework where route params are async (e.g. Next.js 15+):
Grep for direct destructuring of `params` without `await`. Flag any access to `params` without the required async handling.

---

### Subagent B — checks N8-N13 (safeParse, json try/catch, top-level array, params, field naming, resource modeling)

**CHECK N8 — .parse() instead of .safeParse() in route handlers**
Pattern: `[A-Z][a-zA-Z]+Schema\.parse\(|Schema\.parse\(await`
Two-pass:
1. Grep for `\.parse(` to get candidate lines.
2. For each candidate: check if the SAME FILE contains at least one `try {` that precedes it. If the file has zero `try {` blocks → definite violation. If the file has try blocks → mark as "review needed" (cannot determine nesting without AST).
Correct pattern: use `.safeParse()` and check `result.success`.
Expected: 0 matches in files with no try/catch at all.

**CHECK N9 — request.json() without try/catch**
Two-pass approach (avoids the "±10 lines" false-positive problem):
Pass 1: Grep all files containing `await request\.json\(\)|await req\.json\(\)` — collect file list.
Pass 2: For each file in that list, check if the file also contains `try {`.
- File has `request.json()` AND zero `try {` blocks → **definite violation** — flag.
- File has `request.json()` AND has `try {` blocks → **mark as "review needed"** (try may wrap json or may not — human verification needed).
Report separately: N definite violations (no try at all) + M files needing review.
A malformed JSON body throws `SyntaxError` which becomes an unhandled 500 text response.
Expected: 0 definite violations.

**CHECK N10 — Top-level array response**
Pattern: grep for JSON response calls returning an array literal, e.g. `\.json\(\s*\[|jsonify\(\s*\[`
Flag: any route returning a bare array at the top level of the JSON response.
Expected: 0 matches. All responses must be wrapped in an object: `{ items: [...] }` not `[...]`. This allows adding `meta`, `pagination`, or `error` fields later without a breaking change.

**CHECK N11 — Filtering and sorting param naming conventions**
For each match: extract the parameter name string (the string literal argument).
Step 1 — Inventory: collect ALL query param names used across all routes. Group by semantic role:
- Pagination: `page`, `pageSize`, `limit`, `offset`, `cursor`
- Sort: `sort`, `sortBy`, `order`, `orderBy`, `sort_by`
- Filter: any domain-field name used as filter
- Search/text: `q`, `search`, `query`, `keyword`
Step 2 — Convention derivation: count usage frequency for each semantic role. The most-used name in each group IS the project convention.
Step 3 — Flag deviations: any param name in a semantic group that differs from the majority convention is a violation.
Step 4 — Case style: if the majority of params are camelCase, flag any snake_case param (and vice versa).
Report the derived convention and list all deviations from it.

**CHECK N12 — Field naming consistency in request/response bodies**
For each route file: read the validation schema declarations (POST/PATCH body schemas) to extract request field names. For response keys, grep for the framework's JSON response pattern and read up to 40 lines after the opening brace to capture the full response object (stop at the matching closing parenthesis line).
Extract field names from both sources.
Flag:
- Boolean field naming: consistent prefix (`is_`, `has_`) or lack thereof — flag mixed usage only if inconsistent within the same entity type
Note: DB column names (snake_case) may appear in raw database queries — these are NOT violations. Only flag fields in the JSON request/response contract layer.

**CHECK N13 — Resource modeling: action endpoint overuse and nesting depth**
From route file paths (no code read needed), analyze the URL structure:
Flag action endpoints that could be replaced by a resource + HTTP verb:
- Pattern: `/api/[resource]/[id]/[verb]` where verb is `approve`, `reject`, `sign`, `send`, `publish`, `archive`, `restore`, `revoke` — these are legitimate state-machine transitions; note them as ACCEPTED if the verb maps to a single state transition
- Pattern: `/api/[resource]/[verb]-bulk` or `/api/[resource]/bulk-[verb]` — flag naming inversion (approve-bulk vs bulk-approve); flag if inconsistent across resources
Flag deep nesting (3+ levels):
- Pattern: `/api/[a]/[id]/[b]/[id]/[c]` — challenge whether nesting is justified by strict ownership (c only exists in context of b in a) or could be flattened
Count total action-style path segments (non-resource, non-ID segments) vs total resource segments. Report ratio."

---

## Step 2b — Route coverage verification (main context, after both subagents complete)

Cross-check: confirm the route inventory from Step 1 (derived from `[SITEMAP_OR_ROUTE_LIST]`) matches the actual filesystem.

Flag any route file present on filesystem but absent from the route inventory — these routes were excluded from all N1-N13 checks. Add them to the findings as "undocumented routes" requiring manual audit.

This step takes < 1 minute. Do not skip it even on targeted runs.

---

## Step 3 — Pagination consistency check (main context)

Derive the list of paginated endpoints dynamically:
Read `[SITEMAP_OR_ROUTE_LIST]`. Select all `GET` routes whose path does NOT contain `[id]` (i.e., collection endpoints, not single-resource endpoints). These are the candidates for pagination audit.

For each collection endpoint, read the GET handler. Verify:

**P1 — Consistent pagination shape**
Target convention: `{ items: T[], total: number, page: number, pageSize: number }`. If the majority of existing paginated endpoints already use a different shape, treat that shape as the project convention and flag deviations from it — do not force a migration to the target convention if the project has established a different consistent standard.
Flag any list endpoint using a shape that differs from the majority convention.
Flag any list endpoint returning a bare array (overlap with N10 — flag independently).
Flag any list endpoint with no pagination at all that returns unbounded results.

**P2 — Pagination parameter names**
Check if all paginated endpoints use the same query param names (`page`, `pageSize` — not `limit`/`offset`).
Flag inconsistencies.

**P3 — Default page size**
Check if a missing `pageSize` param falls back to a safe default (e.g. 50). Flag any endpoint with no default that could return unbounded results.

**P4 — Total count as number (not string)**
Some database clients return count as a string. Verify that paginated endpoints convert count to the appropriate numeric type before including it in the response.
Flag: any endpoint returning `total` without an explicit numeric conversion where the source is a database count query.

---

## Step 4 — Validation consistency check (main context)

Derive the list of write routes dynamically:

For each write endpoint, read the handler. Verify:

**V1 — Zod schema completeness**
Check that the Zod schema for each POST/PATCH handler includes all NOT NULL, no-default columns as `.required()` fields. Flag any NOT NULL column missing from the Zod schema.

**V2 — Consistent validation placement**
Check that validation always happens BEFORE any DB query (not after a partial DB read). Flag: any handler that reads from DB before validating input.

**V3 — Validation error response**
Check that validation failures return `status: 400` with field-level error detail — not just a generic "bad request".
Verify `.issues` (not `.errors`) is used when accessing ZodError details.
Preferred response shape: `{ error: 'Validation failed', issues: result.error.issues }` or `z.flattenError(result.error)` for form-facing endpoints.

---

## Step 5 — Produce report and update backlog

### Output format

```
## API Design Audit — [DATE] — [TARGET] — mode: [audit|remediation|apply]
### Scope: [N] API routes
### Sources: framework route handler docs, RFC 9457, validation library docs, MDN HTTP status codes

### API Design Maturity Assessment
- HTTP semantics: low / medium / high
- Response contract quality: low / medium / high
- Error model quality: low / medium / high
- Pagination consistency: low / medium / high
- Field naming consistency: low / medium / high
- Resource modeling: low / medium / high

### Detected API Conventions (current project state)
- Routing style: [e.g. REST resource-oriented, /api/[resource]/[id]/[action]]
- Naming style: [e.g. camelCase params, snake_case DB fields]
- Error format: [e.g. { error: string } — consistent/inconsistent]
- Pagination pattern: [e.g. { items, total, page, pageSize } — partial/full]
- Validation strategy: [e.g. Zod safeParse before DB — X% of write routes]

### Pattern Checks
| # | Check | Issues | Severity | Verdict |
|---|---|---|---|---|
| N1 | HTTP verb alignment | N | Medium | ✅/⚠️ |
| N2 | URL structure & resource modeling | N | Medium | ✅/⚠️ |
| N3 | Response shape (success) | N | High | ✅/⚠️ |
| N4 | Error shape consistency | N | High | ✅/⚠️ |
| N5 | Status code correctness | N | High | ✅/⚠️ |
| N6 | ZodError .issues convention | N | Critical | ✅/⚠️ |
| N8 | .parse() without safeParse | N | Critical | ✅/⚠️ |
| N9 | request.json() without try/catch | N | Critical | ✅/⚠️ |
| N10 | Top-level array response | N | Medium | ✅/⚠️ |
| N11 | Filtering/sorting param conventions | N | Low | ✅/⚠️ |
| N12 | Field naming consistency | N | Medium | ✅/⚠️ |
| N13 | Action endpoint overuse & nesting depth | N | Low | ✅/⚠️ |

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
| V1 | Zod completeness | ✅/⚠️ | |
| V2 | Validation before DB | ✅/⚠️ | |
| V3 | Validation error quality | ✅/⚠️ | |

### Error Shape Consistency Note
Current project standard: `{ error: string }`. RFC 9457 standard: `{ type, title, status, detail }`.
Verdict: [Consistent / Inconsistent — N routes diverge with { message: } or { errors: [] }]
Recommendation: [keep current if consistent | standardize to { error, status } minimum]

### ⚠️ Inconsistencies requiring action ([N] total)
[route — check# — issue — standard to apply — fix]

### Strategic improvements
[Include ONLY if 3+ routes show the same structural issue. Each entry: title · impacted routes count · effort estimate (S/M/L) · suggested block name. Skip entire section if no strategic issue found — do not invent one.]

### Recommended platform standards
Produce this section always. Format:
```
| Convention | Current state | Recommended standard |
|---|---|---|
| Error shape | { error: string } | keep — consistent |
| Pagination params | page + pageSize | keep — or: adopt page + limit if majority uses limit |
| Field naming in bodies | [detected: camelCase/snake_case/mixed] | [recommendation] |
| Action endpoint policy | [state-machine transitions as /[id]/[verb]] | accept with max 1 action segment per route |
| Max nesting depth | [detected max] | max 2 levels: /[resource]/[id]/[sub-resource] |
| request.json() wrapping | [detected: N% wrapped] | all calls must be inside try/catch |
```
```

### Write to backlog

For each **High/Critical** finding, append to `docs/refactoring-backlog.md`:
- Assign ID: `API-[n]`
- Add to priority index table
- Add full detail section: `### API-[n] — [title]` with description, impacted files, fix.

For each **Medium** finding, append:
- Add to priority index table (lower priority tier)
- Add section: `### API-[n] — [title]` with description and impacted files. No fix required — mark as "planned."

**Low** findings: add only to priority index as a single line. No detail section. Include only if actionable in < 30 min.

### Severity guide

- **Critical**: N6 (silent undefined on ZodError); N7 (runtime error on params access); N8 (unhandled ZodError throw); N9 (unhandled SyntaxError → 500 text response)
- **High**: unbounded list endpoint (no pagination); inconsistent response shape for same entity; 200 returned with error body; divergent error shapes (`message` vs `error`); 400 used for state-conflict scenarios (should be 409)
- **Medium**: N10 top-level array; POST not returning 201 on create; N12 field naming inconsistency that breaks form-to-API contract; mixed pagination param names
- **Low**: N11 sort/filter param naming style; N13 action endpoint style; PUT vs PATCH mismatch; minor status code pedantry; `total` count not converted to number

---

## Execution notes

- **Mode: audit / remediation**: Do NOT make any route changes.
- **Mode: apply**: make only non-breaking, focused fixes (e.g. 200→201, `{ error: issues }` → `{ error: 'Invalid data', issues }`). Flag every breaking change explicitly before touching it. Do not rewrite handler logic.
- Do NOT audit auth implementation (covered by `/security-audit`).
- If a pattern is used consistently project-wide (even if non-standard), note it as "consistent but non-standard" — don't flag as a violation unless it causes actual client-side issues.
- Evidence standard: every non-trivial finding must cite `file:line — excerpt`. Do not draw broad conclusions from a single isolated endpoint.
- After the report, ask: "Do you want me to align the endpoints that show inconsistencies?" (only in audit/remediation mode) or summarize changes made (apply mode).
