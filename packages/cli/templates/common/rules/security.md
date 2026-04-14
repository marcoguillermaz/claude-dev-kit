# Security Rules

These rules apply when working on API routes, auth, and database code.

## Authentication

- Verify caller identity before any operation. Never trust client-supplied user IDs.
- Auth check must be the **first** operation in every route handler — before DB access, before validation.
- Return 401 for missing/invalid session. Return 403 for insufficient permissions. Never return 404 to hide existence.

## Input Validation

- Validate all inputs at system boundaries (API routes, webhooks, form submissions).
- Use a schema validation library (Zod, Yup, Joi, Pydantic, etc.) — never manual `if` chains.
- Reject requests with unexpected fields (strict parsing, not passthrough).
- Numeric IDs from URL params must be validated as integers before use in queries.

## Database

- Never interpolate user input directly into SQL strings. Use parameterized queries / ORM methods.
- Confirm that new tables have row-level access control enabled (e.g., PostgreSQL RLS, application-level guards).
- Never expose raw DB errors to clients — log internally, return generic message.
- Before using a column name from user input in a query, validate it against an allowlist.

## API Responses

- Never return password hashes, tokens, internal IDs (unless required), or PII beyond what the requester is authorized to see.
- Error messages must not reveal system internals (stack traces, query structure, file paths).
- Sensitive operations (delete, state change, privilege escalation) must require explicit confirmation in request body — never from a GET request.

## Secrets and Credentials

- Never hardcode secrets, tokens, passwords, or connection strings. Use environment variables.
- Never log secrets, even at debug level.
- `.env*` files must be in `.gitignore`. Verify before committing.

## Security Checklist (before every commit touching API/auth code)

- [ ] Auth check before any DB operation
- [ ] All inputs validated with schema library
- [ ] No sensitive data in responses
- [ ] No raw DB errors exposed to client
- [ ] No secrets in code or logs
- [ ] Row-level access control not implicitly bypassed
