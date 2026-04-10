---
name: skill-db
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:section:<section>|target:table:<table>]
---

## Configuration (adapt before first run)

> Replace these placeholders:
> - `[DB_SYSTEM]` — e.g. `PostgreSQL`, `MySQL`, `SQLite`, `MongoDB`
> - `[ORM_OR_CLIENT]` — e.g. `Prisma`, `Drizzle`, `Supabase JS client`, `SQLAlchemy`, `raw SQL`
> - `[API_ROUTES_PATH]` — path to API route files for N+1 check
> - `[ACCESS_CONTROL]` — e.g. `row-level security policies`, `middleware guards`, `model-level scopes`
> - `[MIGRATIONS_PATH]` — e.g. `prisma/migrations/`, `db/migrations/`, `drizzle/`






## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:<other>` | Resolve to matching tables in db-map.md whose name contains `<other>` |
| `target:table:<tablename>` | Focus on a specific table and its direct FKs. **Migration safety (Step 2.5) is skipped for this target type.** |
| No argument | **Full audit — ALL tables in docs/db-map.md. Maximum depth across every check (S1–S7, Step 2.5).** |

**STRICT PARSING — mandatory**: derive target ONLY from the explicit text in `$ARGUMENTS`. Do NOT infer target from conversation context, recent work, active block names, or project memory. If `$ARGUMENTS` contains no `target:` token → full audit of the entire schema in db-map.md at maximum depth. When a target IS provided → act with maximum depth and completeness on that specific scope only.

Announce: `Running skill-db — scope: [FULL | target: <resolved>]`

**Target filter semantics**: apply the filter in Steps 2–4 as follows — S1 (only indexes on targeted tables and their FK children), S2/S3/S2b (only columns of targeted tables), S4 (only policies on targeted tables), S5/S6/S7 (only targeted tables). Step 2.5 (migration safety) scans only migration files that touch the targeted section; for `target:table:` it is skipped entirely.

**Critical constraints**:
- `docs/db-map.md` is the authoritative schema reference. Read it first — do NOT query the live DB to discover schema unless verifying a specific detail.
- `docs/sitemap.md` provides the API route inventory for query pattern checks.
- Do NOT make schema changes. Audit only.
- All findings go to `docs/refactoring-backlog.md`.

---

## Step 1 — Read schema reference

Read these files in order before proceeding:

1. `docs/db-map.md` — full read. Note: tables and key columns (nullable/NOT NULL), FK graph, existing indexes (B-tree, GIN, partial), RLS summary and ⚠️ gaps, ownership patterns (`user_id`, `collaborator_id`, `creator_user_id`).
3. `docs/sitemap.md` — extract API route inventory. Required for S1A filter-column cross-reference and Step 3 scope.
4. `docs/contracts/` — read the contracts relevant to the targeted section (all contracts for full audit). Required for S2b composite UNIQUE evaluation — business rules are defined here, not derivable from schema alone.
5. `docs/refactoring-backlog.md` — scan existing `DB-[n]` entries to avoid duplicate reporting.

Do not proceed until all five reads are complete.

---

## Step 2 — Schema quality checks (main context)

**S1 — Index coverage: filter columns + FK columns**

*Part A — Common filter columns*
Cross-reference the "Missing indexes" section of `db-map.md` with the API route list from `docs/sitemap.md`. For each table frequently filtered or ordered by a column that lacks an index, flag it.

Priority patterns to scan:
- `tickets.last_message_at` — sort in list endpoints

*Part B — FK column coverage*
For every FK relationship in the FK graph, verify that the **child** FK column is indexed. Parent primary keys are indexed by default — child FK columns must be explicitly indexed. An unindexed FK child column causes sequential scans on every JOIN and on every `ON DELETE` cascade operation.

Run in Step 4 (live DB):
```sql
SELECT
  c.conname AS fk_name,
  tbl.relname AS table_name,
  a.attname AS fk_column,
  EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
      AND a.attnum = ANY(i.indkey)
  ) AS is_indexed
FROM pg_constraint c
JOIN pg_class tbl ON tbl.oid = c.conrelid
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND tbl.relname NOT LIKE 'pg_%'
ORDER BY tbl.relname, a.attname;
```
Flag as Medium: `is_indexed = false` on lower-traffic tables.

*Part C — Partial index opportunity on state machine columns*

Run in Step 4 to check distribution:
```sql
UNION ALL
UNION ALL
SELECT 'tickets', stato, COUNT(*) FROM tickets GROUP BY stato
UNION ALL
ORDER BY tbl, stato;
```
If any active-state subset is < 30% of total rows and no partial index exists on that table, flag as Low with suggested partial index.

*Part D — GIN index for UUID[] array columns*
`community_ids UUID[]` columns on content tables cannot be efficiently queried with B-tree indexes.
Note: in-memory filtering is the current strategy (documented in CLAUDE.md as intentional). Flag as Low only if query strategy changes, with note: "becomes Critical if PostgREST array operators are ever used."

**S2 — Normalization and modeling**
Focus only on structural/modeling issues NOT covered by S2b (constraints), S5 (types), or S6 (FK behavior).

Check:
- `tickets.last_message_author_name`: denormalized from auth.users. If a user renames, existing tickets show a stale name. Assess: is there an update path? If no sync mechanism exists, flag as Low ("acceptable for read performance, but stale on profile rename — document the trade-off").
- `compensation_history` / `expense_history`: verify these tables exist and cover all state transitions. If a state machine table has no history table, flag as Medium — financial records require an audit trail.
- `stato` columns on all state machines stored as `text`: from a modeling standpoint this means the schema expresses no valid-value contract at the DB level. The risk is covered in S2b Part A (CHECK constraint). Note it here only as a modeling observation, not a separate finding — avoid double-reporting with S2b.
- `community_ids UUID[]` on content tables instead of a junction table: this is a known intentional design (CLAUDE.md). Note as "documented trade-off — acceptable." Do not flag as a finding.

For each: state whether the denormalization has a documented rationale. Only flag when the rationale is absent AND the risk is real.

**S3 — Missing NOT NULL constraints**
From `db-map.md` Column specs, identify columns that are nullable but should logically never be null in a valid record.

Run in Step 4:
```sql
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND is_nullable = 'YES'
  AND column_name IN (
    'data_competenza', 'data_spesa', 'data_ora',
    'stato', 'collaborator_id', 'creator_user_id',
  )
ORDER BY table_name, column_name;
```
For each row returned: evaluate whether null is a valid business state or an oversight.
PostgreSQL best practice: the majority of columns should be NOT NULL — err toward NOT NULL unless null has a documented semantic meaning.

**S2b — Constraint completeness (CHECK + composite UNIQUE)**

The project relies on application-layer validation (Zod) for most business rules. Identify where DB-level constraints are missing for invariants that should hold even under direct service-role access or migration scripts.

*Part A — CHECK constraints*
Evaluate each candidate after the ritenuta scale is confirmed in Step 4 (run S4 ritenuta query first to determine if scale is 20 or 0.20 before proposing the range):
- `collaborators.data_ingresso` — `CHECK (data_ingresso <= CURRENT_DATE)`

For each: "if a row were inserted directly via service role with an invalid value, would the DB catch it?" If no, and the value drives financial calculations or state machine logic, flag as Medium.

*Part B — Composite UNIQUE constraints*

Patterns to look for in contracts:
- Junction tables (entity + collaborator, key + role) are almost always composite UNIQUE — verify each one.
- Any contract rule saying "a collaborator can only have one active X per Y" requires a DB-level UNIQUE (optionally partial, scoped to active states).

For each: anchor to the business rule from the contract, not to implementation preference. Flag as Medium if the absence would allow duplicate records currently prevented only by application code.

**S4 — RLS completeness and performance**

*Part A — Policy existence (RBAC cross-reference)*
From the "⚠️ RLS gaps" section of `db-map.md`, evaluate each flagged gap against current evidence:
2. `compensation_attachments.comp_attachments_own_insert` — no WITH CHECK. Any authenticated user can insert attachments for any compensation?
3. `expense_attachments.exp_attachments_own_insert` — same.

*Part B — Function call caching*
Supabase recommendation: wrap `auth.uid()` in `(select auth.uid())` to enable per-statement caching instead of per-row evaluation. On tables with thousands of rows, bare `auth.uid()` is called once per row.

Run in Step 4:
```sql
SELECT policyname, tablename,
  CASE WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%'
    THEN 'qual' ELSE '' END ||
  CASE WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%'
    THEN ' with_check' ELSE '' END AS bare_uid_in
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
    OR
    (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%')
  );
```
Flag as Medium: each policy using bare `auth.uid()` not wrapped in `(select ...)`. Report table + policy name + which clause is affected.

*Part C — Explicit TO clause*
Policies without a `TO` clause apply to ALL roles including `anon`, creating unnecessary overhead and surface area.

Run in Step 4:
```sql
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND roles = '{public}';
```
Flag as Low: policies applying to `{public}` where `authenticated` or a specific role would be more precise. Exception: policies explicitly intended for unauthenticated access (e.g. public read on announcements).

*Part D — SELECT policy before UPDATE*
A table with an UPDATE RLS policy but no SELECT policy causes `supabase-js` to silently return `null` after updates — the row was written but the client cannot read it back.

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
Flag as High: any table returned by this query.

*Part E — Views without security_invoker*
Views bypass RLS by default in Postgres unless `security_invoker = true` (Postgres 15+). A view over an RLS-protected table exposes all rows to any caller with view access.

Run in Step 4:
```sql
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public';
```
For each view: check if the underlying tables have RLS policies. If yes, flag as High unless `security_invoker = true` is explicitly set.

**S5 — Data type choices**

Flag questionable data type choices from `db-map.md` Column specs. Source: wiki.postgresql.org/wiki/Don%27t_Do_This.

- **`timestamp` without timezone** → should be `timestamptz`. Plain `timestamp` stores no timezone context — arithmetic errors across timezones. Expected: all timestamp columns use `timestamptz`.
- **`varchar(n)` with arbitrary length limits** → should be `text`. `varchar(n)` takes identical storage to `text` but adds an arbitrary rejection constraint. Prefer `text + CHECK (length(col) <= N)` when a limit is genuinely required.
- **`serial` columns** → should use `IDENTITY` (Postgres 10+). `serial` creates hidden sequences with non-obvious permission and dependency behavior. `GENERATED ALWAYS AS IDENTITY` is the standard.
- **State machine columns as `text`** → no valid-value contract at DB level. Flag as Medium — consider CHECK constraint (see S2b).

Run in Step 4:
```sql
-- Detect timestamp without timezone
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'timestamp without time zone';

-- Detect varchar(n) columns
SELECT table_name, column_name, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'character varying'
  AND character_maximum_length IS NOT NULL;

-- Detect serial (sequences with auto-ownership)
SELECT s.relname AS seq_name, d.refobjid::regclass AS table_name
FROM pg_class s
JOIN pg_depend d ON d.objid = s.oid
WHERE s.relkind = 'S'
  AND d.deptype = 'a'
  AND d.classid = 'pg_class'::regclass;
```

**S6 — FK cascade behavior**
For each FK in the FK graph, verify delete cascade behavior and evaluate whether it reflects the intended parent-child semantics.

Run in Step 4:
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

Evaluation criteria for `NO ACTION` results:
- **Flag as High**: `SET NULL` on a FK column that is NOT NULL — this combination would cause the DELETE to fail at runtime with a constraint violation.

**S7 — Unused indexes**
Indexes with zero query planner usage waste write I/O on every INSERT/UPDATE/DELETE.

Run in Step 4:
```sql
SELECT
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  (SELECT reltuples::bigint FROM pg_class WHERE relname = tablename) AS est_row_count
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Step 2.5 — Migration safety review

**Scope**:
- `target:section:*`: scan only migration files that touch the targeted tables (filter by filename convention or by grepping table names).
- No argument (full audit): scan all migration files. If count > 30, prioritize: (1) all files containing `DROP`, `TRUNCATE`, `ALTER TYPE`, `RENAME`; (2) the 15 most recent files (highest-numbered); (3) any remaining files only if time permits.
- `target:table:*`: **skip this step entirely** — announced at Step 0.

For each file in scope, evaluate these four risks:

**M1 — Lock-heavy DDL**
Operations that take an `ACCESS EXCLUSIVE` lock, blocking all reads and writes:
- `CREATE INDEX` without `CONCURRENTLY` — locks the table for the full index build. Flag as High for any table with expected rows > 1000.
- `CREATE INDEX CONCURRENTLY` inside a `BEGIN`/`COMMIT` block — **this fails in PostgreSQL**. CONCURRENTLY cannot run inside a transaction. Grep for files containing both `BEGIN` (or `START TRANSACTION`) and `CREATE INDEX CONCURRENTLY` in the same file. Flag as Critical.
- `ADD COLUMN col type NOT NULL` without a DEFAULT — fails immediately on tables with existing rows. Flag as High.
- `ADD COLUMN col type NOT NULL DEFAULT <volatile_expr>` — triggers a full table rewrite (e.g. `DEFAULT now()` is volatile). Flag as High; suggest: add as nullable first, backfill, then add NOT NULL constraint.
- `ALTER COLUMN ... TYPE` that requires a cast and full rewrite — flag as High.
- `RENAME COLUMN` / `RENAME TABLE` — takes ACCESS EXCLUSIVE but completes instantly; flag as Medium only if the renamed object has active API consumers (verify in sitemap.md).
- `ALTER TYPE ... RENAME VALUE` — takes ACCESS EXCLUSIVE lock on all tables using that type; flag as Medium with the note that it is safe but blocking.

**M2 — Non-reversible operations without rollback comment**
Check each file for: `DROP COLUMN`, `DROP TABLE`, `TRUNCATE`, `ALTER TYPE ... RENAME VALUE`, or irreversible `UPDATE` statements.

Per CLAUDE.md Known Patterns: destructive migrations MUST have a rollback SQL comment at the top: `-- ROLLBACK: ...`.
Flag as High: any destructive migration lacking a rollback comment block.
Flag as Critical: a destructive migration that has already been applied to staging (verify: `SELECT * FROM supabase_migrations.schema_migrations WHERE version = 'NNN'` — if found, it's applied).

**M3 — Unsafe backfills**
`UPDATE table SET col = value` without batching on a high-traffic table holds a lock for the full duration, generating excessive WAL and causing replication lag.

**M4 — Constraint sequencing**
Per CLAUDE.md Known Patterns: if a migration changes a status/enum value, it must follow the sequence: (1) DROP CONSTRAINT, (2) UPDATE data, (3) ADD CONSTRAINT — all in one migration for atomicity.

Check: any migration with `UPDATE ... SET stato = ...` or similar value rename. Verify the DROP CONSTRAINT → UPDATE → ADD CONSTRAINT sequence is present. If a migration has only the UPDATE without constraint handling, flag as High (would fail on tables with existing CHECK constraints).

**Migration safety output**:
Report only files with at least one ⚠️. For clean files, report count only (e.g. "12 files reviewed, 10 clean"). For each flagged file: filename, issue code (M1/M2/M3/M4), severity, and the specific SQL line that raised the concern.

---

## Step 3 — API query pattern check (Explore agent)

Launch a **single Explore subagent** (model: haiku) with the following instructions. Pass the API route file list from `docs/sitemap.md` as the file scope.

```
MATCH | check_code | file:line | matched_pattern | severity

CHECK Q1 — N+1 queries in list endpoints
Step 1 (fast): grep -n "\.from(" across all route files to get all lines with DB calls.
Step 2 (contextual): for each match, read 15 lines of surrounding context. Flag if the .from() call appears inside a for/forEach/.map( block. Multi-line patterns are common — a loop opener on line N and a .from() on line N+5 inside the same block counts as N+1.
Severity: High on list endpoints, Medium on single-record endpoints.

CHECK Q2 — Missing await on Supabase calls
Grep: lines containing "svc.from(" or "supabase.from(" — check each match for the presence of "await" on the SAME line, OR that the call is part of a promise chain (.then(). Flag lines where neither condition is true.
Pattern to flag: "svc.from(" not preceded by "await" on the same line and not inside a .then( context.
Severity: High (fire-and-forget DB calls cause silent failures).

CHECK Q3 — Select * (unbounded column fetch)
Grep: '.select("*")' or ".select('*')"
Flag each match. Note whether the route returns the full object to the client (check if the result is spread into a response or filtered first).
Severity: Medium if result is returned directly to client, Low if filtered before response.

CHECK Q4 — Missing error handling on DB writes
Grep: lines with .insert(, .update(, .delete(, .upsert( — check within 5 lines for one of these patterns:
  - const { error } = await ...
  - const { data, error } = await ...
  - if (error) or if (insertError) or similar
Flag if none of these patterns appear within 5 lines after the write call.
Severity: High (silent write failures cause data loss without error response).

CHECK Q5 — Unbounded queries on large tables
For each match, check within 15 lines for: .limit(, .range(, pageSize, or a comment indicating it is an intentional full export (// export, // all records).
Flag: any collection endpoint that fetches without bounds and is not an export route.
Severity: High on production-volume tables.

Return ALL matches in the MATCH | check_code | file:line | matched_pattern | severity format. If a check has zero matches, return: CLEAN | check_code | no matches found.
```

---

## Step 4 — Live DB verification

1. **S1B** — FK column index coverage
2. **S1C** — stato column row distribution
3. **S3** — nullable columns on key financial/ownership fields
4. **S4B** — policies with bare `auth.uid()`
5. **S4C** — policies without explicit TO clause
6. **S4D** — UPDATE policies without matching SELECT
7. **S4E** — views in public schema
8. **S5** — data type antipatterns (timestamp, varchar(n), serial)
9. **S6** — FK cascade behavior

Additionally:
```sql

-- Check for invalid stato values
UNION ALL SELECT 'tickets', stato, COUNT(*) FROM tickets GROUP BY stato
ORDER BY tbl, stato;
```

**Empty result handling**: if a query returns no rows or all-NULL values (common on staging with low data volume), record as "not verifiable on staging — [table] has insufficient data" rather than ✅. Do not treat absence of data as absence of a problem.

---

## Step 5 — Produce report and update backlog

### Output format

```
## Skill-DB Audit — [DATE] — [SCOPE]
Sources: Supabase RLS docs, PostgreSQL docs (indexes, constraints), wiki.postgresql.org/Don't_Do_This

### Executive summary
[2-5 bullets — Critical and High findings only. Write concrete facts: table names, column names, line counts.
If nothing Critical/High: state that explicitly ("No Critical or High findings — schema is production-ready for this scope").
Example bullets:
- "2 migrations lack rollback comments for irreversible DROP COLUMN (M2): 045_..., 051_..."

### DB maturity assessment
| Dimension | Rating | Notes |
|---|---|---|
| Schema integrity | strong / adequate / weak | [nullable gaps, type antipatterns, constraint gaps] |
| Index quality | strong / adequate / weak | [unindexed FKs, missing filter indexes, unused indexes] |
| RLS / security posture | strong / adequate / weak | [policy gaps, unsafe views, function caching] |
| Query quality | strong / adequate / weak | [N+1, unbounded, missing error handling] |
| Migration safety | strong / adequate / weak | [lock-heavy DDL, missing rollbacks, unsafe backfills] |
| Release readiness | ready / conditional / blocked | [blocked = any Critical finding; conditional = High findings present but workarounded] |

Rating guide: strong = no significant issues; adequate = issues exist but low production risk; weak = issues that should be resolved before next production release.

### Schema Checks
| # | Check | Verdict | Findings |
|---|---|---|---|
| S1A | Index — filter columns | ✅/⚠️ | [columns flagged] |
| S1B | Index — FK column coverage | ✅/⚠️ | [N unindexed FK columns] |
| S1C | Index — partial on stato columns | ✅/⚠️ | |
| S1D | Index — GIN for UUID[] arrays | ✅/⚠️ | |
| S2 | Normalization and modeling | ✅/⚠️ | |
| S2b | Constraint completeness (CHECK + composite UNIQUE) | ✅/⚠️ | |
| S3 | Missing NOT NULL | ✅/⚠️ | |
| S4A | RLS — policy completeness | ✅/⚠️ | |
| S4B | RLS — function call caching | ✅/⚠️ | [N policies with bare auth.uid()] |
| S4C | RLS — explicit TO clause | ✅/⚠️ | |
| S4D | RLS — SELECT before UPDATE | ✅/⚠️ | |
| S4E | RLS — views security_invoker | ✅/⚠️ | |
| S5 | Data type choices | ✅/⚠️ | [timestamp/varchar/serial hits] |
| S6 | FK cascade behavior | ✅/⚠️ | |
| S7 | Unused indexes | ✅/⚠️ | [N with 0 scans and qualifying criteria] |

### Migration Safety Checks
[Only list files with at least one ⚠️. For clean files report summary count.]
| File | M1 Lock | M2 Rollback | M3 Backfill | M4 Constraint seq | Notes |
|---|---|---|---|---|---|
| [migration filename] | ✅/⚠️ | ✅/⚠️ | ✅/⚠️ | ✅/⚠️ | [specific SQL line] |

### Query Pattern Checks (API routes)
| # | Check | Matches | Verdict |
|---|---|---|---|
| Q1 | N+1 queries | N | ✅/⚠️ |
| Q2 | Missing await | N | ✅/⚠️ |
| Q3 | Select * | N | ✅/⚠️ |
| Q4 | Missing error handling on writes | N | ✅/⚠️ |
| Q5 | Unbounded queries | N | ✅/⚠️ |

### Prioritized findings
For each finding with severity Medium or above:
[SEVERITY] [ID] [check#] — [table/file:line] — [issue] — [business impact] — [fix] — [effort: S=<1h / M=half day / L=day+]
Example:

### Quick wins
[List findings that meet ALL three criteria: (a) Medium or High severity AND (b) effort S (<1 hour) AND (c) only DB migration OR only code change, not both simultaneously]
Format: "DB-[n]: [one-line description] — [migration or code change]"
If no quick wins: state explicitly.
```

### Backlog decision gate

Present all findings with severity Medium or above as a numbered decision list, sorted Critical → High → Medium:

```
Trovati N finding Medium o superiori. Quali aggiungere al backlog?

[1] [CRITICAL] DB-? — table/check — one-line description
[2] [HIGH]     DB-? — table/check — one-line description
[3] [MEDIUM]   DB-? — table/check — one-line description
...

Rispondi con i numeri da includere (es. "1 2 4"), "tutti", o "nessuno".
```

**Wait for explicit user response before writing anything.**

Then write ONLY the approved entries to `docs/refactoring-backlog.md`:
- Assign ID: `DB-[n]` (next available after existing DB entries)
- Add row to priority index
- Add full detail section with: issue, evidence, impacted tables/files, fix, effort, migration risk

### Severity guide

- **Critical**: RLS gap that allows unauthorized data access (S4A); UPDATE policy without SELECT (S4D); view bypassing RLS on sensitive table (S4E); `CASCADE` that would destroy financial records (S6); `CREATE INDEX CONCURRENTLY` inside a BEGIN block (M1); destructive migration applied to staging without rollback comment (M2)
- **High**: N+1 on a list endpoint (Q1); missing await on a DB write call (Q2); unbounded query on a high-volume table (Q5); unindexed FK on a write-heavy table (S1B); bare `auth.uid()` on a table with thousands of rows (S4B); `CREATE INDEX` without CONCURRENTLY on a production-size table (M1); missing constraint DROP before status-value UPDATE (M4); `ADD COLUMN NOT NULL` without safe staging pattern (M1)
- **Medium**: Missing CHECK constraint on financial column (S2b); missing composite UNIQUE where business rules require it (S2b); nullable column used in financial calculations (S3); `timestamp` without timezone (S5); `varchar(n)` with arbitrary limit (S5); `serial` instead of IDENTITY (S5); unsafe backfill on high-traffic table (M3); `stato` as unconstrained text (S2b/S5); `SET NULL` on a NOT NULL FK column (S6)
- **Low**: Unused indexes with 0 scans meeting all qualifying criteria (S7); normalization observation with documented trade-off (S2); missing GIN for UUID[] (S1D); partial index opportunity where distribution warrants it (S1C); policies with `{public}` scope where a narrower role would be more precise (S4C)

---

## Execution notes

- Do NOT apply migrations or modify the schema.
- For gaps already documented in `db-map.md` ⚠️ RLS gaps section: do not re-describe them from scratch. Instead report their current status (open / resolved / risk-changed) and escalate if the gap has been open for more than 2 completed blocks without a scheduled fix. A documented gap that remains unfixed is not a reason to silence it — it is a reason to increase urgency.
- S1D (GIN for UUID[]) and the in-memory filtering pattern are documented as intentional in CLAUDE.md. Note as known trade-off — do not flag unless query strategy changes.
- After the report, ask: "Vuoi che prepari le migration SQL per i fix identificati?"
