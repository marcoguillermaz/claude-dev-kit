---
name: api-design
description: API design consistency review. Checks endpoint naming conventions, HTTP verb correctness, response shape consistency, error code standardization, pagination patterns, and input validation presence. Does not cover auth implementation (use /security-audit) or performance (use /perf-audit).
user-invocable: true
model: sonnet
---

You are performing an API design consistency review of the project's API routes.

**Scope**: endpoint naming, HTTP verbs, response shapes, error codes, pagination, validation placement.
**Out of scope**: auth implementation → `/security-audit` | performance → `/perf-audit` | DB schema → `/skill-db`.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/backlog-refinement.md`.**

---

## Configuration (adapt before first run)

> Replace these placeholders:
> - `[API_ROUTES_PATH]` — e.g. `app/api/`, `routes/`, `src/handlers/`
> - `[SITEMAP_OR_ROUTE_LIST]` — e.g. `docs/sitemap.md`, `docs/api-routes.md`
> - `[VALIDATION_LIB]` — e.g. `zod`, `yup`, `joi`, `pydantic`

---

## Step 1 — Build API inventory

Read `[SITEMAP_OR_ROUTE_LIST]` API routes section. For each route build:
- Path and HTTP methods
- Expected request body shape (infer from sitemap or read the route file)
- Expected response shape

Also read current `docs/backlog-refinement.md` to avoid duplicates.

---

## Step 2 — Naming and verb checks (Explore subagent)

Launch a **single Explore subagent** (model: haiku) with the full route file list:

"Run all 5 checks on the provided route files:

**CHECK N1 — URL naming consistency**
Pattern: REST URLs should use kebab-case, plural nouns for collections, and consistent nesting depth.
Grep: list all route paths. Flag: camelCase or snake_case in URLs, singular resource names for collections (e.g. `/api/user` instead of `/api/users`), inconsistent nesting (some routes 2 levels deep, others 4 levels for the same resource type).

**CHECK N2 — HTTP verb correctness**
Pattern:
- GET: must be idempotent and have no body. Never use GET for mutations.
- POST: create a new resource or trigger an action.
- PUT: full replace of a resource. PATCH: partial update.
- DELETE: remove a resource.
Grep: identify any route handlers where the HTTP method does not match the operation (e.g. GET handler that modifies DB state, POST that fetches without side effects).

**CHECK N3 — Query parameter vs path parameter usage**
Pattern: resource identifiers belong in the path (`/api/users/[id]`), not query params (`/api/users?id=...`). Filters and pagination belong in query params, not the path.
Flag: IDs passed as query params; filter values baked into the URL path.

**CHECK N4 — Validation library usage on write routes**
Pattern: POST/PUT/PATCH handlers must import `[VALIDATION_LIB]` or contain a schema parse.
Grep: in all write route files, check for validation import or `safeParse|validate|schema.parse`.
Flag: any write route without explicit validation.

**CHECK N5 — Consistent error response shape**
Pattern: all error responses must use the same JSON shape.
Grep: in route `catch` blocks and error returns, identify the response shape used (`{ error: message }`, `{ message }`, `{ errors: [] }`, etc.).
Flag: routes using a different error shape from the majority."

---

## Step 3 — Response shape consistency (main context)

Read 10 representative route handlers (mix of GET, POST, PATCH, DELETE):

**R1 — Success response envelope**: verify all success responses use the same envelope shape. Expected: consistent pattern like `{ data: ... }` or `{ result: ... }` or direct object — flag any route that deviates.

**R2 — HTTP status code correctness**:
- 200: success with body
- 201: resource created (POST that creates)
- 204: success with no body (DELETE, PATCH with no return)
- 400: validation error
- 401: not authenticated
- 403: not authorized
- 404: resource not found
- 409: conflict (duplicate)
- 500: unexpected server error

Flag: routes returning 200 for errors, 500 for validation errors, 200 for deletes, etc.

**R3 — Pagination pattern**: for routes returning lists, verify a consistent pagination approach (offset/limit, cursor-based, or page/size) is used. Flag any list route with no pagination (unbounded response).

---

## Step 4 — Produce report and update backlog

Output format:

```
## API Design Audit — [DATE]

### Naming & Verbs
| Check | Issues found | Verdict |
|---|---|---|
| N1 URL naming consistency | N | ✅/❌ |
| N2 HTTP verb correctness | N | ✅/❌ |
| N3 Path vs query params | N | ✅/❌ |
| N4 Missing validation | N | ✅/❌ |
| N5 Inconsistent error shape | N | ✅/❌ |

### Response Consistency
| Check | Issues found | Verdict |
|---|---|---|
| R1 Success envelope consistency | N | ✅/❌ |
| R2 HTTP status code correctness | N | ✅/❌ |
| R3 Pagination present on lists | N | ✅/❌ |

### High findings (N)
[route — issue — fix]

### Medium findings (N)
[route — issue — fix]
```

For each High finding, append to `docs/backlog-refinement.md`:
- ID: `API-[n]`
- Priority index entry + full detail section

### Severity guide
- **High**: GET route mutating state; missing validation on write route; unbounded list with no pagination
- **Medium**: inconsistent error shape; wrong HTTP status code; ID in query param instead of path
- **Low**: naming inconsistency (singular vs plural); envelope shape deviation on one route
