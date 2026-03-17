---
name: security-audit
description: Security review of API routes and data layer. Checks authentication guards, authorization completeness, input validation coverage, sensitive data exposure in responses, and HTTP security headers. Does not cover auth implementation architecture (business logic) or performance.
user-invocable: true
model: sonnet
---

You are performing a security audit of the project's API routes and data layer.

**Scope**: API routes, middleware/proxy, access control policies, input validation, response shapes, HTTP headers.
**Out of scope**: SEO, public indexing, performance, auth architecture design.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/backlog-refinement.md`.**

---

## Configuration (adapt before first run)

> Replace these placeholders with the real paths for this project:
> - `[API_ROUTES_PATH]` — e.g. `app/api/`, `routes/`, `src/handlers/`
> - `[AUTH_HELPER]` — e.g. `getSession`, `auth()`, `verifyToken`, `requireAuth`
> - `[VALIDATION_LIB]` — e.g. `zod`, `yup`, `joi`, `pydantic`
> - `[SITEMAP_OR_ROUTE_LIST]` — e.g. `docs/sitemap.md` or `docs/api-routes.md`
> - `[ROLE_ENUM]` — e.g. `admin`, `editor`, `viewer` (your role names)

---

## Step 1 — Build API route inventory

Read `[SITEMAP_OR_ROUTE_LIST]` to extract the full list of API routes.
Also read:
- Middleware or proxy file — understand the auth layer and what it protects
- Auth helper file (`[AUTH_HELPER]`) — understand session/token mechanics
- `docs/backlog-refinement.md` — avoid reporting duplicates

Output: list of routes grouped as: Public (no auth required) / Protected (auth required) / Role-specific.

---

## Step 2 — Auth & authorization checks (Explore subagent)

Launch a **single Explore subagent** (model: haiku) with the full route file list:

"Run all 5 checks on the provided route files:

**CHECK A1 — Missing auth check at route entry**
Pattern: route handler does NOT call `[AUTH_HELPER]` or equivalent within the first 15 lines.
Flag: any route where no auth check appears near the top of the handler.
Note: service-role or internal routes must still verify caller identity.

**CHECK A2 — Role check present on privileged routes**
Pattern: routes under admin/management paths must contain an explicit role assertion (`role === '[ROLE_ENUM]'` or equivalent).
Flag: any privileged route without a role check.

**CHECK A3 — Input validation on write endpoints**
Pattern: POST/PUT/PATCH handlers must import `[VALIDATION_LIB]` or contain a schema parse call.
Flag: any write route without schema validation.

**CHECK A4 — Raw user input in queries**
Pattern: template literals or string concatenation used to build DB queries with user-supplied values.
Flag: any parameterized query built via string concatenation instead of parameterized API.

**CHECK A5 — Sensitive fields in API responses**
Pattern: routes that select all columns (`SELECT *` or `.select('*')`) and return the full result.
Flag: any route that may include internal fields (password hashes, tokens, internal flags) in the response."

---

## Step 3 — Response shape review

For the 5–10 most-used routes (pick highest-traffic from sitemap):

**R1 — PII exposure**: verify that sensitive personal data (SSN, banking details, passwords) is NOT returned to non-owner callers.

**R2 — Error message verbosity**: inspect `catch` blocks. Verify internal DB errors are NOT forwarded to the client response. Expected: generic message only, error logged server-side.

**R3 — Privilege escalation via response**: verify that response objects don't include fields that reveal other users' data or internal system state to unprivileged callers.

---

## Step 4 — HTTP security headers

Read the server config file (e.g. `next.config.ts`, `server.ts`, `nginx.conf`). Check for:

| Header | Expected | Risk if missing |
|---|---|---|
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Data leakage |
| `Content-Security-Policy` | Present | XSS escalation |

Note: `Strict-Transport-Security` is typically handled by the hosting platform — skip if using Vercel/Fly/Railway.

---

## Step 5 — Produce report and update backlog

Output format:

```
## Security Audit — [DATE]

### Auth & Authorization
| Check | Routes flagged | Verdict |
|---|---|---|
| A1 Missing auth check | N | ✅/❌ |
| A2 Missing role check | N | ✅/❌ |
| A3 Missing validation | N | ✅/❌ |
| A4 Raw input in queries | N | ✅/❌ |
| A5 Sensitive fields in response | N | ✅/❌ |

### Response Shape
| Check | Verdict | Notes |
|---|---|---|
| R1 PII exposure | ✅/❌ | |
| R2 Error verbosity | ✅/❌ | |
| R3 Privilege escalation | ✅/❌ | |

### HTTP Headers
| Header | Present | Verdict |
|---|---|---|
| X-Frame-Options | ✅/❌ | |
| X-Content-Type-Options | ✅/❌ | |
| Referrer-Policy | ✅/❌ | |
| Content-Security-Policy | ✅/❌ | |

### ❌ Critical findings (N)
[route — issue — exploit scenario — fix]

### ⚠️ Medium findings (N)
[route — issue — fix]
```

For each Critical or Medium finding, append to `docs/backlog-refinement.md`:
- ID: `SEC-[n]`
- Add to priority index + full detail section

### Severity guide
- **Critical**: unauthenticated route that exposes or modifies data; raw input in query
- **High**: privileged route without role check; PII exposed to non-owner
- **Medium**: missing validation on write route; DB error leaked to client; missing security header
- **Low**: informational over-exposure; header best-practice gap

After the report, ask: "Do you want me to implement fixes for Critical/High findings?"
