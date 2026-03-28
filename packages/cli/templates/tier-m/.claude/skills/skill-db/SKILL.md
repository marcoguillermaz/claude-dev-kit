---
name: skill-db
description: Database schema and query quality audit. Reviews normalization, index coverage (FK columns, partial indexes, GIN for arrays), access control policy completeness and performance, constraint gaps, data type antipatterns, unused indexes, N+1 query patterns in API routes, and unbounded queries. Uses docs/db-map.md as authoritative schema reference. Outputs findings to docs/backlog-refinement.md.
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:section:<section>|target:table:<table>]
---

You are performing a database quality audit of the project's database schema and query layer.

**Critical constraints**:
- `docs/db-map.md` is the authoritative schema reference. Read it first — do NOT query the live DB to discover schema unless verifying a specific detail.
- `docs/sitemap.md` provides the API route inventory for checking query patterns.
- Do NOT make schema changes. Audit only.
- All findings go to `docs/backlog-refinement.md`.

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:<name>` | Focus on tables and routes belonging to that domain section |
| `target:table:<tablename>` | Focus on a specific table and its direct FKs |
| No argument | Full audit — all tables in db-map.md |

Announce: `Running skill-db — scope: [FULL | target: <resolved>]`
Apply the target filter to the schema analysis in Steps 2–4.

---

## Configuration (adapt before first run)

> Replace these placeholders:
> - `[DB_SYSTEM]` — e.g. `PostgreSQL`, `MySQL`, `SQLite`, `MongoDB`
> - `[ORM_OR_CLIENT]` — e.g. `Prisma`, `Drizzle`, `Supabase JS client`, `SQLAlchemy`, `raw SQL`
> - `[API_ROUTES_PATH]` — path to API route files for N+1 check
> - `[ACCESS_CONTROL]` — e.g. `row-level security policies`, `middleware guards`, `model-level scopes`
> - `[MIGRATIONS_PATH]` — e.g. `prisma/migrations/`, `db/migrations/`, `drizzle/`

---

## Step 1 — Read schema reference

Read `docs/db-map.md` in full. Note:
- Tables and their key columns + data types (including nullable/NOT NULL status)
- FK relationships (full graph)
- Existing indexes (B-tree, GIN, partial)
- Access control summary and flagged gaps
- Ownership patterns (how rows are scoped to users or roles)

Also read `docs/refactoring-backlog.md` and current `docs/backlog-refinement.md` to avoid duplicates.

Output: structured understanding of schema. Do not proceed until complete.

---

## Step 2 — Schema quality checks (main context)

**S1 — Index coverage**

*Part A — Common filter columns*
Cross-reference the "Missing indexes" section of `db-map.md` with query patterns described in the sitemap. For each table frequently filtered or ordered by a column not in the index list, flag it.
Priority candidates: date range filter columns, recency sort columns (`created_at`, `updated_at`), status/state columns used in frequent filters.

*Part B — FK column coverage*
For every FK relationship in the FK graph, verify that the child FK column is indexed (parent primary keys are indexed by default — child columns must be explicitly indexed).
Unindexed FK columns cause full table scans on every join and on every cascaded delete.
Run in Step 4 (live DB — PostgreSQL):
```sql
SELECT
  tc.conname AS fk_name,
  tbl.relname AS table_name,
  att.attname AS fk_column,
  idx.indexname AS index_name
FROM pg_constraint tc
JOIN pg_attribute att ON att.attrelid = tc.conrelid AND att.attnum = ANY(tc.conkey)
JOIN pg_class tbl ON tbl.oid = tc.conrelid
LEFT JOIN pg_indexes idx ON idx.tablename = tbl.relname
  AND idx.indexdef LIKE '%' || att.attname || '%'
WHERE tc.contype = 'f'
ORDER BY tbl.relname, att.attname;
```
Flag: any FK column where `index_name IS NULL`.

*Part C — Partial index opportunity on low-cardinality columns*
Tables with state machine or status columns are frequently filtered by active states (e.g. pending, open, in-progress).
Check: does each such table have either (a) a B-tree index on the status column, or (b) a partial index (e.g. `WHERE status = 'pending'`)?
A full B-tree on a low-cardinality column has limited benefit. A partial index is preferable when the active-state subset is < 20% of rows.
Flag as Low: missing any index on state machine columns. Suggest partial index strategy.

**S2 — Normalization issues**
Check for:
- Repeated denormalized data (e.g. storing a user's name as a string instead of a FK to users)
- Fields stored as `text` that should be an enum or FK (e.g. status columns with no constraint)
- Array columns used where a junction table would provide proper FK enforcement

For each: assess trade-off. Note intentional denormalization patterns documented in CLAUDE.md.

**S3 — Missing NOT NULL constraints**
From `db-map.md`, identify columns that are nullable but should logically never be null in a valid record (e.g. required FK columns, required business fields used in calculations without null guards in application code).
Flag as Medium if the column is used in calculations or display logic without null guards.
PostgreSQL best practice: "the majority of columns should be marked NOT NULL" — err toward NOT NULL, not nullable.

**S4 — Access control policy completeness and performance**

*Part A — Policy existence (RBAC cross-reference)*
If the project has an RBAC matrix (`docs/prd/rbac-matrix.md` or equivalent), cross-reference it against the access control policies summarized in `db-map.md`. Flag any table with a documented access right but no matching access control policy.
Also evaluate any flagged gaps in the `db-map.md` access control summary section for severity and whether they are resolvable.

*Part B — Function call performance*
For databases with row-level security (e.g. PostgreSQL), verify that identity functions (`auth.uid()`, `current_user_id()`, or equivalent) are wrapped in `(select ...)` to enable per-statement caching instead of per-row evaluation.
On tables with many rows, calling an identity function once per row instead of once per statement causes significant overhead.
Run in Step 4 (PostgreSQL):
```sql
SELECT policyname, tablename, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
  AND (qual NOT LIKE '%(select auth.uid())%' AND with_check NOT LIKE '%(select auth.uid())%');
```
Flag as Medium: each policy using bare identity function call instead of the cached `(select ...)` form.

*Part C — Policy scope precision*
Policies that apply to all roles (including unauthenticated) when a specific role would be more precise create unnecessary overhead and risk.
Flag as Low: policies that apply to `{public}` role where a specific authenticated role would be more appropriate.

*Part D — UPDATE without matching SELECT policy (PostgreSQL)*
A table with an UPDATE access control policy but no SELECT policy will silently fail to return updated rows.
Run in Step 4:
```sql
SELECT DISTINCT tablename
FROM pg_policies
WHERE schemaname = 'public' AND cmd = 'UPDATE'
EXCEPT
SELECT DISTINCT tablename
FROM pg_policies
WHERE schemaname = 'public' AND cmd IN ('SELECT', 'ALL');
```
Flag as High: any table with UPDATE policy but no SELECT policy.

*Part E — Views bypassing access control*
Views may bypass row-level security unless configured with `security_invoker = true` (Postgres 15+). Verify any public views that query tables with access control policies.
Flag as High: any view over a secured table that does not have `security_invoker = true`.

**S5 — Data type choices**

Flag questionable data type choices from `db-map.md` column specs:
- **`timestamp` without timezone** → should be `timestamptz`. Plain `timestamp` stores no timezone context — arithmetic errors across timezones. Expected: all timestamp columns use `timestamptz`.
- **`varchar(n)` with arbitrary length limits** → prefer `text` with a CHECK constraint when a limit is genuinely required. `varchar(n)` provides no storage benefit over `text` and adds arbitrary rejection constraints.
- **`serial` columns** → should use `IDENTITY` (Postgres 10+). `serial` creates hidden sequences with unusual permission and dependency behaviors.
- **`money` type** → use `numeric` instead. `money` has locale-tied rounding behavior and doesn't store currency.
- **State machine columns as `text`** → no constraint, risk of invalid values. Flag as Medium — consider CHECK constraint or enum type.
- **Monetary amounts stored as `float`** → use `DECIMAL`/`NUMERIC` to avoid floating-point rounding errors.

Run in Step 4 (PostgreSQL):
```sql
-- Detect timestamp without timezone
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'timestamp without time zone';

-- Detect varchar(n) columns
SELECT table_name, column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'character varying'
  AND character_maximum_length IS NOT NULL;

-- Detect serial (uses sequences with serial ownership)
SELECT s.relname AS seq_name, d.refobjid::regclass AS table_name
FROM pg_class s
JOIN pg_depend d ON d.objid = s.oid
WHERE s.relkind = 'S'
  AND d.deptype = 'a'
  AND d.classid = 'pg_class'::regclass;
```

**S6 — FK cascade behavior**
For each FK in the FK graph, verify delete cascade behavior. Flag any FK without explicit `ON DELETE` handling where orphaned records are a risk (e.g. if a parent record is deleted, what happens to its children?).
Run in Step 4 (PostgreSQL):
```sql
SELECT
  c.conname,
  c.confrelid::regclass AS referenced_table,
  c.conrelid::regclass AS table_name,
  CASE c.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END AS on_delete
FROM pg_constraint c
WHERE c.contype = 'f'
ORDER BY c.conrelid::regclass::text;
```
Flag: any FK with `NO ACTION` where orphaned children would be a data integrity risk. Flag: any unexpected `CASCADE` that could cause unintended mass deletes.

**S7 — Unused indexes**
Indexes that are never used by the query planner waste write I/O (every INSERT/UPDATE/DELETE must maintain them).
Run in Step 4 (PostgreSQL):
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```
Flag as Low: any index with 0 scans. Note that a development database may have low traffic — treat as a hint, not a definitive finding. Confirm no recent table activity before recommending removal.

---

## Step 3 — API query pattern check (Explore subagent)

Launch a **single Explore subagent** (model: haiku) to check API routes for query anti-patterns.

File scope: all files in `[API_ROUTES_PATH]` (from sitemap.md API routes list).

"Run these 5 checks on the provided API route files:

**CHECK Q1 — N+1 queries in list endpoints**
Pattern A: a DB query call inside a `.map(` callback or `for` loop.
Grep: DB client calls (`.from(`, `db.query(`, `findMany(`, etc.) inside `.map(|for\s*\(|forEach\(`
Pattern B: `for...of` loop with sequential `await` DB calls inside the loop body.
Flag: each match with file:line. A single JOIN query or batch query should replace any N+1 pattern.

**CHECK Q2 — Missing await on async DB calls**
Pattern: async DB client calls not preceded by `await` and not assigned to a promise chain.
Flag: each match.

**CHECK Q3 — Select * (unbounded column fetch)**
Pattern: `SELECT *` or `.select('*')` or `.select()` with no column list in API routes — fetches all columns including potentially sensitive or large ones.
Flag: each match. Evaluate if the route returns the full object to the client.

**CHECK Q4 — Missing error handling on DB writes**
Pattern: DB insert/update/delete calls without a subsequent error check or try/catch.
Grep: write calls (`.insert(`, `.update(`, `.delete(`, `db.query(`) not followed within 3 lines by `if.*error` or `.catch` and not inside a try/catch block.
Flag: each match.

**CHECK Q5 — Unbounded queries (no limit on potentially large tables)**
Pattern: DB query calls on tables that can grow unboundedly without `.limit(N)`, `.take(N)`, `.range()`, or a `pageSize` parameter.
Identify the project's large-growth tables from `db-map.md` (tables accumulating records over time: events, logs, messages, orders, etc.).
Flag: any collection endpoint on those tables that fetches without bounds. Exception: admin export routes that intentionally fetch all records for file export."

---

## Step 4 — Live DB verification (PostgreSQL)

Run all queries marked "Run in Step 4" from Step 2 against the development database. Group results by check:

1. S1B — FK column index coverage
2. S4B — Function call caching (bare identity functions in policies)
3. S4C — Policies without precise role scope
4. S4D — UPDATE without matching SELECT policy
5. S4E — Views bypassing access control
6. S5 — Data type antipatterns (timestamp, varchar(n), serial)
7. S6 — FK cascade behavior
8. S7 — Unused indexes (idx_scan = 0)

---

## Step 5 — Migration quality check

Read the 5 most recent migration files from `[MIGRATIONS_PATH]`.

**M1 — Destructive migrations**: verify that `DROP COLUMN`, `DROP TABLE`, `TRUNCATE` have rollback SQL in a comment block at the top of the file.

**M2 — Data migration safety**: verify that migrations adding NOT NULL columns either provide a DEFAULT value or include a backfill UPDATE before the constraint is added.

---

## Step 6 — Produce report and update backlog

### Output format

```
## DB Quality Audit — [DATE] — [SCOPE]
### Sources: your DB's access control docs, PostgreSQL docs (indexes, constraints), wiki.postgresql.org/Don't_Do_This

### Schema Checks
| # | Check | Verdict | Notes |
|---|---|---|---|
| S1A | Index — filter columns | ✅/⚠️ | [columns flagged] |
| S1B | Index — FK column coverage | ✅/⚠️ | [N FK columns unindexed] |
| S1C | Index — partial on low-cardinality columns | ✅/⚠️ | |
| S2 | Normalization | ✅/⚠️ | |
| S3 | Missing NOT NULL | ✅/⚠️ | |
| S4A | Access control — policy completeness | ✅/⚠️ | |
| S4B | Access control — function call caching | ✅/⚠️ | [N policies flagged] |
| S4C | Access control — policy scope precision | ✅/⚠️ | |
| S4D | Access control — UPDATE without SELECT | ✅/⚠️ | |
| S4E | Access control — views bypass | ✅/⚠️ | |
| S5 | Data type choices | ✅/⚠️ | [timestamp/varchar/serial hits] |
| S6 | FK cascade behavior | ✅/⚠️ | |
| S7 | Unused indexes | ✅/⚠️ | [N indexes with 0 scans] |

### Query Pattern Checks (API routes)
| # | Check | Matches | Verdict |
|---|---|---|---|
| Q1 | N+1 queries (loop) | N | ✅/⚠️ |
| Q2 | Missing await | N | ✅/⚠️ |
| Q3 | Select * | N | ✅/⚠️ |
| Q4 | Missing error handling | N | ✅/⚠️ |
| Q5 | Unbounded queries | N | ✅/⚠️ |

### Migration Quality
| Check | Verdict | Notes |
|---|---|---|
| M1 Destructive migrations have rollback | ✅/❌ | |
| M2 NOT NULL with safe backfill | ✅/❌ | |

### Findings requiring action ([N] total)
[table/file — check# — issue — impact — suggested fix]
```

### Write to backlog

For each finding with severity Medium or above, append to `docs/backlog-refinement.md`:
- Assign ID: `DB-[n]` (increment from last DB entry)
- Add row to priority index
- Add full detail section

### Severity guide

- **Critical**: access control gap allowing unauthorized data access (S4A); UPDATE policy without SELECT (S4D); view bypassing access control on sensitive table (S4E); cascade DELETE that would destroy live data (S6)
- **High**: N+1 on a list endpoint (Q1); unbounded query on a large-growth table (Q5); unindexed FK column on a high-traffic table (S1B); missing index on a column with >1000 rows filtered frequently (S1A)
- **Medium**: text status columns without ENUM/CHECK constraint (S5); missing NOT NULL on logically required column (S3); timestamp without timezone (S5); varchar(n) with arbitrary limit (S5); serial instead of IDENTITY (S5); bare identity function calls in policies (S4B)
- **Low**: unused indexes with 0 scans (S7); normalization opportunity with known trade-off (S2); partial index opportunity on low-cardinality column (S1C); policy scope precision (S4C)

---

## Execution notes

- Do NOT apply migrations or modify the schema.
- Do NOT report gaps already documented in `db-map.md` unless you have new evidence of actual exploitation risk or the gap is now resolvable.
- If `docs/db-map.md` is not present, derive schema from migration files and note the limitation.
- After the report, ask: "Do you want me to prepare the SQL fixes for the identified findings?"
