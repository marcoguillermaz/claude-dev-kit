---
name: api-design
description: API design consistency review. Checks endpoint naming conventions, HTTP verb correctness, response shape consistency, error code standardization (400/409/422 distinction), pagination patterns, input validation presence, schema validation safety, request body parsing safety, top-level array responses, and RFC 9457 error shape compliance. Does not cover auth implementation (use /security-audit) or performance (use /perf-audit).
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:section:<section>|target:role:<role>|mode:audit|mode:remediation|mode:apply]
---

You are performing an API design consistency review of the project's API endpoints.

**Scope**: endpoint naming, HTTP verbs, response shapes, error codes, pagination, validation, schema validation safety, request body parsing safety.
**Out of scope**: auth implementation → `/security-audit` | performance → `/perf-audit` | DB schema → `/skill-db`.
**Format**: JSON APIs only. If the project uses GraphQL, gRPC, or other protocols, state that this skill does not apply and stop.
**Do NOT make code changes. Audit only.**
**All findings go to `[BACKLOG_FILE]`.**

### Status code reference (source: MDN + RFC 9457)
- **400** — malformed request: bad JSON, schema parse failure, missing required field
- **401** — not authenticated (no valid session)
- **403** — authenticated but lacks permission
- **404** — resource not found
- **409** — valid request conflicts with current server state (e.g., approving an already-approved record, duplicate unique value)
- **422** — semantically invalid data that passes schema validation but violates a business rule
- **500** — unexpected server error (no internal details in response)

---

## Step 0 — Framework and stack detection

Before running any check, detect the project's API stack. Read `CLAUDE.md`, `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, `build.gradle`, `Gemfile`, `composer.json`, or equivalent to determine:

1. **Language**: JavaScript/TypeScript, Python, Go, Rust, Java, Ruby, PHP, C#, etc.
2. **Framework**: Next.js, Express, Fastify, Hono, Koa, NestJS, Django, Flask, FastAPI, Spring Boot, Rails, Laravel, Gin, Actix, ASP.NET, etc.
3. **Routing model**: file-based routing (Next.js, Nuxt, SvelteKit) vs explicit router (Express, Fastify, Django, Rails, Spring) vs decorator-based (NestJS, FastAPI, Spring Boot)
4. **Validation library**: Zod, Joi, Yup, AJV, class-validator, Valibot, Typebox, Pydantic, marshmallow, Bean Validation, ActiveModel, Laravel Validator, etc.
5. **Dynamic segment syntax**: `[id]` (Next.js) | `:id` (Express/Fastify/Rails) | `{id}` (Laravel/Spring/OpenAPI) | `<int:id>` (Django/Flask) | other
6. **Response builder pattern**: how the framework constructs JSON responses (e.g. `Response.json()`, `res.json()`, `JsonResponse()`, `jsonify()`, `ResponseEntity`, `render json:`, `reply.send()`, `ctx.body =`, etc.)
7. **Request body access pattern**: how handlers access the parsed request body (e.g. `await request.json()`, `req.body`, `request.data`, `request.get_json()`, `@RequestBody`, `params.require()`, etc.)
8. **Error handling model**: try/catch in handlers, global error middleware, exception filters, decorator-based, Result types, or framework-managed

Announce detected stack:
```
Detected stack: [LANGUAGE] / [FRAMEWORK]
Routing model: [file-based | explicit-router | decorator-based]
Validation: [LIBRARY]
Dynamic segments: [SYNTAX]
Response builder: [PATTERN]
Body access: [PATTERN]
Error handling: [MODEL]
```

All subsequent checks use the detected patterns — not hardcoded framework-specific syntax.

---

## Step 0b — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:<name>` | Only endpoints in that functional section |
| `target:role:<role>` | Endpoints relevant to that role |
| `target:page:<route>` | Only that specific endpoint |
| No argument | Full audit — all API endpoints |

**Mode** (controls whether changes are made):
| Token | Behavior |
|---|---|
| `mode:audit` (default) | Report findings only. No code changes. Write to backlog. |
| `mode:remediation` | Produce a prioritized improvement plan with migration guidance. No code changes. |
| `mode:apply` | Make focused, non-breaking fixes to endpoints only. Prefer one-liner diffs. Breaking changes require explicit user confirmation. |

Announce: `Running api-design — scope: [FULL | target: <resolved>] — mode: [audit|remediation|apply]`
Apply the target filter to the endpoint inventory in Step 1.

---

## Step 1 — Build API inventory

Discover API endpoints using the method appropriate to the detected routing model:

- **File-based routing** (Next.js, Nuxt, SvelteKit): scan the file tree under the API directory (e.g. `app/api/`, `pages/api/`, `server/api/`)
- **Explicit router**: read the router definition files (e.g. Express `router.get()`, Django `urlpatterns`, Rails `routes.rb`, Laravel `routes/api.php`, Spring `@RequestMapping`)
- **Decorator-based**: scan controller classes for route decorators (e.g. `@Get()`, `@GetMapping`, `@app.get()`)
- **If a route list or sitemap document exists** (e.g. `docs/sitemap.md`, OpenAPI spec): use it as supplementary input

For each endpoint build:
- Path and HTTP methods
- Expected request body shape (infer from code or documentation)
- Expected response shape

Group endpoints by functional area. Also read current `[BACKLOG_FILE]` to avoid duplicates.

---

## Step 2 — Pattern checks (two Explore subagents, run in parallel)

Split into two parallel Explore subagents (model: haiku) to stay within context budget. Launch both at once.

**Subagent A** handles: N1, N2, N3, N4, N5, N6, N7

"Run checks N1–N7 on the provided API endpoint definitions. For each check: report total match count, list every match as `file:line — excerpt`, state PASS or FAIL.

**CHECK N1 — HTTP verb / action alignment**
For each endpoint handler, identify the HTTP methods it handles. Adapt detection to the project's routing model:
- File-based routing: look for exported function names or method handlers
- Explicit router: look for `router.get()`, `router.post()`, etc. or equivalent
- Decorator-based: look for `@Get()`, `@Post()`, `@GetMapping`, `@app.get()`, etc.

Flag mismatches:
- POST used for read-only operations (should be GET)
- PUT used for partial updates (should be PATCH — PUT implies full replacement)
- DELETE used with a required request body (non-standard)
- GET handlers that modify DB state (write to DB)

**CHECK N2 — URL structure consistency**
From endpoint paths (extracted from router definitions, file structure, or decorators), flag:
- Inconsistent pluralization (e.g. `/api/user/` vs `/api/users/` mixed across the project)
- Nested routes that skip a level (e.g. `/api/documents/sign` but also `/api/documents/{id}/sign` for the same resource — use the project's dynamic segment syntax in the report)
- Action verbs in URLs that should be HTTP verbs (e.g. `/api/records/approve` should be `PATCH /api/records/{id}` with an action body)

**CHECK N3 — Query parameter vs path parameter usage**
Pattern: resource identifiers belong in the path (`/api/users/{id}`), not query params (`/api/users?id=...`). Filters and pagination belong in query params, not the path.
Flag: IDs passed as query params; filter values baked into the URL path.

**CHECK N4 — Validation presence on write endpoints**
Pattern: POST/PUT/PATCH handlers must have explicit input validation using the project's validation library or an inline validation approach.
Grep: in all write endpoint handlers, check for import or usage of the detected validation library. Common patterns by library:
- Zod: `safeParse`, `.parse(`, schema import
- Joi: `schema.validate(`, Joi import
- Yup: `schema.validate(`, `isValid(`, Yup import
- AJV: `ajv.validate(`, AJV import
- class-validator: `validate(`, `@IsString()`, class-validator import
- Pydantic: Pydantic model as type hint on endpoint parameter
- Bean Validation: `@Valid`, `@Validated` annotations
- Laravel: `$request->validate(`, Form Request class
- ActiveModel: `validates` in model, `strong_parameters` in controller
- If none of the above: any explicit check on input fields before DB access

Flag: any write endpoint without explicit input validation.

**CHECK N5 — Consistent error response shape**
Pattern: all error responses must use the same JSON shape.
Grep: in endpoint error handling code (catch blocks, error middleware returns, exception handler responses), identify the response shape used (`{ error: message }`, `{ message }`, `{ errors: [] }`, `{ detail: ... }`, etc.).
Flag: endpoints using a different error shape from the majority. The current project standard should be noted in the report.

**CHECK N6 — Error detail format**
Pattern: API errors should expose a structured detail (issues array, field errors, or equivalent) when validation fails — not raw error objects or opaque messages.
Grep: validation error responses. Verify errors include field-level detail identifying which field(s) failed, not raw thrown error objects or just a generic string.
Flag: any validation error response that does not identify the failing field.

**CHECK N7 — Framework-specific route parameter handling**
This is a framework-aware check. Based on the detected framework, verify correct parameter access:
- Next.js 15+ App Router: `params` is a Promise — must be awaited before destructuring
- Express/Fastify: `req.params` is synchronous — verify consistent access
- Django: URL parameters arrive as function arguments or via `kwargs`
- Spring: `@PathVariable` annotation required on parameters
- Rails: `params[:id]` access pattern
- Other frameworks: verify parameter access follows the framework's documented pattern

If the project's framework has no known parameter-handling pitfall, mark this check as N/A.
Flag: any parameter access that violates the framework's required pattern."

**Subagent B** handles: N8, N9, N10, N11, N12, N13

"Run checks N8–N13 on the provided API endpoint definitions. For each check: report total match count, list every match as `file:line — excerpt`, state PASS or FAIL.

**CHECK N8 — Schema validation safety (throwing vs safe validation)**
Pattern: validation calls that throw on invalid input, when used outside error-handling protection, produce unhandled exceptions.
This check is library-specific:
- **Zod**: `.parse()` throws; `.safeParse()` does not. Flag `.parse()` outside error handling.
- **Joi**: `.validate()` returns `{ error, value }` and does not throw. `.assert()` / `.attempt()` throw. Flag `.assert()` / `.attempt()` outside error handling.
- **Yup**: `.validate()` throws; `.isValid()` does not. Flag `.validate()` outside error handling.
- **Pydantic**: validation errors are raised as exceptions — check for proper exception handler.
- **class-validator**: `validate()` returns array of errors (does not throw). Generally safe.
- **AJV**: `ajv.validate()` returns boolean (does not throw). Generally safe.
- **Other**: identify if the library has a throwing vs non-throwing API. Flag the throwing variant when used without error protection.

"Error protection" means: (a) try/catch wrapping the call, (b) global error middleware that catches the library's error type, (c) a higher-order function wrapper (e.g. `asyncHandler()`), (d) framework-managed exception filters (NestJS, Django, Spring).
Two-pass approach:
1. Grep for the throwing validation call.
2. For each candidate: check if the SAME FILE or a registered middleware/filter handles the exception type. If no handler is found → flag. If handler exists but coverage is unclear → mark as "review needed".

**CHECK N9 — Request body parsing safety**
Pattern: raw body parsing calls that can throw (e.g. malformed JSON) must be protected by error handling.
Adapt to detected body access pattern:
- `await request.json()` / `await req.json()` (Web API, Next.js, Hono): can throw SyntaxError on malformed JSON
- `req.body` (Express with `express.json()` middleware, Fastify with built-in parser): body is pre-parsed by middleware — SyntaxError is caught at middleware level. **Mark as N/A unless the project has no body-parsing middleware configured.**
- `request.data` (Django REST Framework): pre-parsed by the framework. Mark as N/A.
- `request.get_json()` (Flask): returns `None` on failure by default; `force=True` or `silent=False` may throw. Check for error handling if non-default options are used.
- `@RequestBody` (Spring): parsing errors produce 400 automatically. Mark as N/A.
- Other: check if the framework handles malformed body automatically or requires explicit handling.

For frameworks where manual body parsing is needed:
Pass 1: Grep for the body parsing call — collect file list.
Pass 2: For each file, check if error handling covers the call (try/catch, middleware, wrapper).
- No error handling → **definite violation** — flag.
- Error handling present but coverage unclear → **mark as "review needed"**.
Report separately: N definite violations + M files needing review.

**CHECK N10 — Top-level array response**
Pattern: no endpoint should return a bare array as the top-level JSON response.
Grep: using the detected response builder pattern, find instances where the response body argument is an array literal (e.g. `[...]` as the first argument to the response builder).
Flag: any endpoint returning a bare array at the top level. All list responses must be wrapped in an object (`{ items: [...] }` or equivalent) — this allows adding `meta`, `pagination`, or `error` fields later without a breaking change.

**CHECK N11 — Filtering and sorting parameter naming conventions**
Step 1 — Inventory: collect ALL query parameter names used across endpoints. Group by semantic role:
- Pagination: `page`, `pageSize`, `limit`, `offset`, `cursor`
- Sort: `sort`, `sortBy`, `order`, `orderBy`
- Filter: any domain-field name used as filter
- Search/text: `q`, `search`, `query`, `keyword`
Step 2 — Convention derivation: count usage frequency for each semantic role. The most-used name in each group IS the project convention.
Step 3 — Flag deviations: any param name in a semantic group that differs from the majority convention.
Step 4 — Case style: if the majority of params are camelCase, flag any snake_case param (and vice versa).
Report the derived convention and list all deviations from it.

**CHECK N12 — Field naming consistency in request/response bodies**
For each endpoint handler: extract field names from validation schema declarations (using the detected validation library) for request fields. For response keys, read the JSON response object structure.
Flag:
- Boolean field naming: inconsistent prefix (`is_`, `has_`) usage within the same entity type
- Note: DB column names (snake_case) are NOT violations. Only flag fields in the JSON request/response contract layer.

**CHECK N13 — Resource modeling: action endpoint overuse and nesting depth**
From endpoint paths (extracted from router definitions, file structure, or decorators), analyze URL structure:
Flag action endpoints that could be replaced by a resource + HTTP verb:
- Pattern: `/api/{resource}/{id}/{verb}` where verb is `approve`, `reject`, `sign`, `send`, `publish`, `archive`, `restore`, `revoke` — note these as ACCEPTED if the verb maps to a single state transition
- Pattern: `/api/{resource}/{verb}-bulk` or `/api/{resource}/bulk-{verb}` — flag naming inversion if inconsistent across resources
Flag deep nesting (3+ levels):
- Pattern: `/api/{a}/{id}/{b}/{id}/{c}` — challenge whether nesting is justified by strict ownership
Count total action-style path segments vs total resource segments. Report ratio."

---

## Step 3 — Response shape consistency (main context)

Read 10 representative endpoint handlers (mix of GET, POST, PATCH, DELETE):

**R1 — Success response envelope**: verify all success responses use the same envelope shape. Flag any endpoint that deviates from the project's established pattern (e.g. `{ data: ... }` or `{ result: ... }` or direct object — flag inconsistencies within the project, not against an external standard).

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

Flag: endpoints returning 200 for errors, 500 for validation errors, 400 for state-conflict scenarios (should be 409), or 200 on deletes.

**R3 — RFC 9457 compliance note**: check if the project uses RFC 9457 "Problem Details for HTTP APIs" format (`{ type, title, status, detail }`). Note whether the current error shape is consistent with or diverges from RFC 9457. Do not flag as a violation if the project has a consistent non-RFC-9457 shape — note it as an informational recommendation.

---

## Step 4 — Pagination consistency check (main context)

From the endpoint inventory, identify all `GET` collection endpoints (paths without a single-resource identifier). Read each GET handler. Verify:

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

Identify all write endpoints (POST, PUT, PATCH). For each:

**V1 — Input validation completeness**
Check that the validation schema covers all required fields (fields that are NOT NULL in the DB with no default). Flag any required field missing from the schema.

**V2 — Validation before DB**
Check that validation always happens BEFORE any DB query. Flag: any handler that reads from DB before validating input.

**V3 — Validation error quality**
Check that validation failures return `status: 400` with field-level error detail — not just a generic "bad request".
Preferred: a structured response that identifies each failing field and the reason. The exact shape depends on the project's error convention (identified in N5).

---

## Step 6 — Produce report and update backlog

### Output format

```
## API Design Audit — [DATE] — [TARGET]
### Stack: [LANGUAGE] / [FRAMEWORK] — Validation: [LIBRARY]
### Scope: [N] API endpoints
### Sources: RFC 9457, MDN HTTP status codes, validation library docs

### Pattern Checks (Explore agent)
| # | Check | Issues | Severity | Verdict |
|---|---|---|---|---|
| N1 | HTTP verb alignment | N | Medium | ✅/⚠️ |
| N2 | URL structure | N | Low | ✅/⚠️ |
| N3 | Path vs query params | N | Low | ✅/⚠️ |
| N4 | Missing input validation | N | High | ✅/⚠️ |
| N5 | Error shape consistency | N | High | ✅/⚠️ |
| N6 | Error detail format (field-level) | N | Medium | ✅/⚠️ |
| N7 | Framework param handling | N | High | ✅/⚠️/N/A |
| N8 | Throwing validation without error handling | N | High | ✅/⚠️/N/A |
| N9 | Unprotected body parsing | N | High | ✅/⚠️/N/A |
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
Verdict: [Consistent / Inconsistent — N endpoints diverge]
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
- Validation strategy: [e.g. [LIBRARY] safe validation before DB — X% of write endpoints]

### ⚠️ Findings requiring action ([N] total)
[endpoint — check# — issue — standard to apply — fix]
```

### Backlog decision gate

Present all findings with severity Medium or above as a numbered decision list, sorted Critical → High → Medium:

```
Found N findings at Medium severity or above. Which should be added to the backlog?
[1] [CRITICAL] API-? — endpoint/file — one-line description
[2] [HIGH]     API-? — endpoint/file — one-line description
[3] [MEDIUM]   API-? — endpoint/file — one-line description
```

Reply with the numbers to include (e.g. "1 2 4"), "all", or "none".
**Wait for explicit user response before writing anything.**

Then write ONLY the approved entries to `[BACKLOG_FILE]`:
- Assign ID: `API-[n]` (increment from last API entry)
- Add row to the priority index table
- Add full detail section: `### API-N — [title]` with File, Issue, Impact, Suggested fix

### Severity guide

- **Critical**: framework param handling producing runtime errors (N7); unhandled throwing validation producing 500 instead of 400 (N8); unhandled body parsing error producing 500 (N9)
- **High**: write endpoint with no input validation (N4); divergent error shapes that client code may silently mishandle (N5); 200 returned with error body; unbounded list endpoint with no pagination (P1/P3)
- **Medium**: N10 top-level array response; POST not returning 201 on create (R2); 400 used for state-conflict scenarios instead of 409 (R2); N6 error responses without field-level detail; missing validation before DB (V2); mixed pagination param names (P2)
- **Low**: URL structure issues (N2); ID in query param instead of path (N3); PUT vs PATCH mismatch; total count not converted to number; minor status code pedantry; RFC 9457 divergence when project shape is at least consistent

---

## Execution notes

- Do NOT make any endpoint changes.
- Do NOT audit auth logic (covered by `/security-audit`).
- If a pattern is used consistently project-wide (even if non-standard), note it as "consistent but non-standard" — don't flag as a violation unless it causes actual client-side issues.
- After the report, ask: "Do you want me to align the endpoints that show inconsistencies?"
- **Mode: audit / remediation**: Do NOT make any endpoint changes.
- **Mode: apply**: make only non-breaking, focused fixes (e.g. 200→201, error shape corrections). Flag every breaking change explicitly before touching it. Do not rewrite handler logic.
