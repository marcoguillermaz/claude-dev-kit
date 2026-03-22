---
name: skill-db
description: Database schema and query quality audit. Reviews normalization, index coverage, access control completeness, constraint gaps, N+1 query patterns in API routes, and data type choices. Uses docs/db-map.md as authoritative schema reference. Outputs findings to docs/backlog-refinement.md.
user-invocable: true
model: sonnet
context: fork
---

You are performing a database quality audit of the project's database schema and query layer.

**Critical constraints**:
- `docs/db-map.md` is the authoritative schema reference. Read it first — do NOT query the live DB to discover schema unless verifying a specific detail.
- `docs/sitemap.md` provides the API route inventory for checking query patterns.
- Do NOT make schema changes. Audit only.
- All findings go to `docs/backlog-refinement.md`.

---

## Configuration (adapt before first run)

> Replace these placeholders:
> - `[DB_SYSTEM]` — e.g. `PostgreSQL + Supabase`, `MySQL + Prisma`, `SQLite + Drizzle`, `MongoDB`
> - `[ORM_OR_CLIENT]` — e.g. `Supabase JS client`, `Prisma`, `Drizzle`, `SQLAlchemy`, `raw SQL`
> - `[API_ROUTES_PATH]` — path to API route files for N+1 check
> - `[ACCESS_CONTROL]` — e.g. `RLS policies`, `middleware guards`, `model-level scopes`
> - `[MIGRATIONS_PATH]` — e.g. `supabase/migrations/`, `prisma/migrations/`, `db/migrations/`

---

## Step 1 — Read schema reference

Read `docs/db-map.md` in full. Note:
- Tables and their key columns + data types
- FK relationships (graph)
- Existing indexes
- Access control summary and flagged gaps
- Ownership patterns (how rows are scoped to users)

Also read `docs/refactoring-backlog.md` and current `docs/backlog-refinement.md` to avoid duplicates.

---

## Step 2 — Schema quality checks (Explore subagent)

Launch a **single Explore subagent** (model: haiku) with the schema files and migration files:

"Run all 6 checks on the provided migration/schema files:

**CHECK S1 — Missing indexes on FK columns**
Pattern: foreign key columns without a corresponding index cause full table scans on joins.
For each FK column identified in the schema: verify a CREATE INDEX exists for that column.
Flag: FK columns with no index.

**CHECK S2 — Overly broad access control**
Pattern: tables with access control enabled but policies that are too permissive (e.g. allow SELECT for all authenticated users on sensitive tables).
Flag: any table where the access control policy grants read/write access more broadly than the ownership pattern requires.

**CHECK S3 — Missing NOT NULL constraints**
Pattern: columns that represent required domain fields but lack NOT NULL constraint.
Grep: in schema definitions, look for columns named `*_id`, `created_at`, `user_id`, `owner_id` that do not have NOT NULL.
Flag: required fields without constraint.

**CHECK S4 — Inappropriate data types**
Pattern: storing structured data in TEXT/VARCHAR when a typed column would be better.
Flag: columns named `*_json`, `*_data`, `*_config` stored as TEXT (should be JSONB/JSON).
Flag: boolean-semantic columns (is_*, has_*, can_*) stored as VARCHAR or INT instead of BOOLEAN.
Flag: monetary amounts stored as FLOAT (should be DECIMAL/NUMERIC to avoid rounding).

**CHECK S5 — CASCADE behavior on FKs**
Pattern: FK constraints without explicit CASCADE or SET NULL — default behavior (RESTRICT) can cause confusing errors on delete.
Grep: FK definitions without `ON DELETE` clause.
Flag: FKs where delete behavior is not explicitly defined.

**CHECK S6 — Unique constraints on logical keys**
Pattern: columns that are semantically unique (e.g. `email`, `username`, `slug`) without a UNIQUE constraint.
Flag: columns with names suggesting uniqueness that lack UNIQUE or unique index."

---

## Step 3 — N+1 query patterns (main context)

Read the 5 most-used API routes that return lists (from `docs/sitemap.md`).

For each route that returns a list of records:

**Q1 — Loop queries**: check if the route fetches a list, then queries inside a loop. Flag any pattern like:
```
const items = await db.from('table').select()
for (const item of items) {
  const related = await db.from('other').eq('id', item.fk)  // N+1
}
```

**Q2 — Missing select projection**: check if routes fetch all columns (`SELECT *`) when only a few are needed. Flag routes that likely transfer excess data.

**Q3 — Unbounded queries**: check if list queries have a LIMIT clause or pagination. Flag queries that could return unbounded result sets.

---

## Step 4 — Migration quality check

Read the 5 most recent migration files from `[MIGRATIONS_PATH]`.

**M1 — Destructive migrations**: verify that `DROP COLUMN`, `DROP TABLE`, `TRUNCATE` have rollback SQL in a comment block at the top of the file.

**M2 — Data migration safety**: verify that migrations adding NOT NULL columns either provide a DEFAULT value or include a backfill UPDATE before the constraint is added.

---

## Step 5 — Produce report and update backlog

Output format:

```
## DB Quality Audit — [DATE]

### Schema Checks
| Check | Issues found | Verdict |
|---|---|---|
| S1 Missing FK indexes | N | ✅/❌ |
| S2 Overly broad access control | N | ✅/❌ |
| S3 Missing NOT NULL | N | ✅/❌ |
| S4 Inappropriate data types | N | ✅/❌ |
| S5 Undefined CASCADE behavior | N | ✅/❌ |
| S6 Missing unique constraints | N | ✅/❌ |

### Query Patterns
| Check | Routes flagged | Verdict |
|---|---|---|
| Q1 N+1 loops | N | ✅/❌ |
| Q2 Over-fetching (SELECT *) | N | ✅/❌ |
| Q3 Unbounded queries | N | ✅/❌ |

### Migration Quality
| Check | Verdict | Notes |
|---|---|---|
| M1 Destructive migrations have rollback | ✅/❌ | |
| M2 NOT NULL with safe backfill | ✅/❌ | |

### ❌ High findings (N)
[table/route — issue — impact — fix]

### ⚠️ Medium findings (N)
[table/route — issue — fix]
```

For each High finding, append to `docs/backlog-refinement.md`:
- ID: `DB-[n]`
- Priority index entry + full detail section

### Severity guide
- **High**: N+1 on a high-traffic route; missing index on FK used in joins; overly broad access control on sensitive table
- **Medium**: missing NOT NULL on required field; monetary value as FLOAT; unbounded list query
- **Low**: missing CASCADE definition; suboptimal data type (low impact); cosmetic naming
