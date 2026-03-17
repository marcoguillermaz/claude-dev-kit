# Full Development Pipeline — Tier L

Use for: complex features, long-running projects, domain model changes, team of 3+.
Branch prefix `feature/` activates the full pipeline automatically.

---

## Which pipeline to use

| Work type | Branch | Pipeline |
|---|---|---|
| Bugfix / ≤3 files | `fix/description` | Tier S (Fast Lane) |
| Feature block / 1–2 weeks | `feature/block-name` | Tier M |
| Complex domain / multi-month / team | `feature/block-name` | This pipeline (Tier L) |

---

## Phase 0 — Session orientation

**FIRST**: check for `CONTEXT_IMPORT.md` in the project root. If it exists and contains `Status: PENDING_DISCOVERY`, run the Discovery Workflow inside that file **before any other work**. Do not proceed until discovery is marked `COMPLETE`.

**Session file**: check `.claude/session/` for existing `block-*.md` files.
- If one exists: read it — a previous session was interrupted. Resume from it. Do NOT create a new file.
- If none: create `.claude/session/block-[name].md` with date + placeholder skeleton.
- This is non-negotiable: the session file must exist before any other Phase 0 action.

Then:
- Read `.claude/CLAUDE.local.md` to confirm active overrides (if file exists).
- Read `MEMORY.md` (project root): Active plan section + relevant Lessons.
- If context was compressed: read `docs/implementation-checklist.md` to re-align.
- **Branch check**: if on `main` or `staging`, stop. Development always starts on `feature/block-name`.

## Phase 1 — Requirements ⏸ STOP

- **Rename session file**: once block name is known, rename `block-new-session.md` → `block-[name].md`.
- Update the session file after every significant decision during requirements definition.
- Read `docs/implementation-checklist.md` to verify block dependencies.
- Read the relevant section of `docs/requirements.md`.
- Check `docs/refactoring-backlog.md` for intersecting entries.
- **Dependency scan** (mandatory): before declaring the file list, grep for ALL usages of affected entities. Minimum checks:
  1. Every route being moved/modified → grep for hrefs and imports
  2. Every component being modified → find all import consumers
  3. Every shared type or utility → grep import count across codebase
  4. Check `e2e/` and `__tests__/` for files referencing affected routes or selectors
  5. Every table being modified → check FK references and access control policies
- **All clarification questions must use `AskUserQuestion` tool** — never inline.
- Expected output: feature summary, **complete** file list verified by dependency scan, open questions.

***** STOP — present requirements summary and file list. Wait for explicit confirmation. *****

## Phase 1.5 — Design review *(blocks touching >5 files or new patterns)*

- Present data flow, data structures, main trade-offs.
- State discarded alternatives and rationale.
- For simple blocks (≤3 files, no shared types, no migration, no new patterns): skip, stating so.

***** STOP — wait for design confirmation before writing code. *****

## Phase 1.6 — Visual & UX Design *(MANDATORY for any block with UI/UX impact)*

**Triggers**: new page route, new layout pattern, changed information architecture, complex interactive pattern.

1. **ASCII wireframe** — full page layout with named regions, column structure, action placement, empty/loading states.
2. **Design system mapping** — map every wireframe region to the correct component and token. No region "TBD".
3. **UX rationale** — mental model used, why alternatives were discarded, key UX improvement.

***** STOP — present wireframe + UX rationale. Wait for approval before Phase 2. *****

## Plan lock + context reset *(after Phase 1/1.5 STOP gate confirmed)*

- Use `EnterPlanMode` to present the complete approved plan in locked form.
- Prompt user to enable **auto-accept edits** before proceeding.
- Call `ExitPlanMode` once confirmed.
- Run `/compact` to reset context before Phase 2 implementation.

## Phase 2 — Implementation

- **First action**: update `docs/requirements.md` with the approved plan before writing code.
- Follow all coding conventions in `CLAUDE.md`.
- **After every new migration**: apply to remote DB immediately + verify + log in `docs/migrations-log.md`.
- **Destructive migrations** (`DROP COLUMN`, `DROP TABLE`): write rollback SQL in a comment block at the top of the migration file before applying.
- **Security checklist** (before intermediate commit): (1) auth check before any operation, (2) input validated, (3) no sensitive data in response, (4) access control not bypassed; (5) new tables have row-level security enabled.
- Run `/simplify` on changed files after writing (skip for trivial 1-file changes).

## Phase 3 — Build + unit tests

- Run type check: `[TYPE_CHECK_COMMAND]` — must be clean.
- Run build: `[BUILD_COMMAND]` — must succeed.
- Run tests: `[TEST_COMMAND]` — all must pass.
- Output: summary line only. Do NOT paste full output — only paste error lines on failure.
- **Intermediate commit** after green.

## Phase 3b — API integration tests *(if block creates or modifies API routes)*

- Write tests covering: happy path, auth (401), authz (403), validation (400), business rules, DB state.
- Every test that writes to DB must clean up in `afterAll`. Use cleanup-first pattern in `beforeAll`.
- Output: summary line only.

## Phase 4 — E2E tests *(if block has significant UI flows)*

- Write Playwright or Cypress tests for critical user journeys.
- Use `data-*` attribute selectors — never CSS color classes.
- Output: summary line only.

## Phase 5 — Staging deploy + smoke test

- Merge to staging: `git checkout staging && git merge feature/block-name --no-ff && git push origin staging`
- Wait for deploy (~1–2 min). Smoke test the main flow in 3–5 steps using a test account.
- For UI changes: verify in both light and dark mode.
- Fix on `feature/` branch, re-merge if issues found.

## Phase 6 — Outcome checklist ⏸ STOP

```
## Block checklist — [Block Name]

### Build & Test
- [ ] Type check: 0 errors
- [ ] Build: success
- [ ] Unit tests: N/N passed
- [ ] API integration tests: N/N passed
- [ ] E2E tests: N/N passed (if applicable)

### Design System compliance (UI blocks)
- [ ] No hardcoded color values on interactive elements
- [ ] Empty states use EmptyState component, not bare <p>
- [ ] New page routes have loading.tsx / skeleton
- [ ] Icon-only buttons have aria-label
- [ ] Verified in both light and dark mode

### Implemented features
- [ ] [feature 1]: [outcome]

### Manual verification
1. [step]

### Files created / modified
- path/to/file — description
```

***** STOP — do not declare complete, do not update docs, until explicit confirmation. *****

## Phase 8 — Block closure

Only after explicit confirmation:
1. Delete session file: `.claude/session/block-[name].md`
2. Update `docs/implementation-checklist.md`: mark ✅, add Log row.
3. Update `CLAUDE.md` only if block introduces non-obvious patterns, changes RBAC, or adds a new convention.
4. Update `docs/requirements.md` if spec changed.
5. Write ADR in `docs/adr/` if an architectural decision was made.
6. Update `MEMORY.md` (project root) only if new lessons emerged not already documented.
7. Commit sequence:
   - **Commit 1** (already done in Phase 3): source files.
   - **Commit 2 — docs**: `docs/` changes + `README.md` if updated.
   - **Commit 3 — context** (only if updated): `CLAUDE.md` and/or project-root `MEMORY.md`.
8. Promote to production: `git checkout main && git merge staging --no-ff && git push origin main`

## Phase 8.5 — Context review + compact

Execute checks C1–C11 from `.claude/rules/context-review.md` in order.
Apply any fix found before moving to the next check.
Run `/compact` after all checks pass.

---

## Cross-cutting rules

- **Never commit to `main` or `staging` directly.**
- **STOP gates are hard stops** — not suggestions. Never proceed to the next phase without explicit confirmation.
- **Green before commit**: type check + tests must pass before every commit.
- **Conventional commits**: `feat(scope):`, `fix(scope):`, `docs:`, `chore:` — imperative, under 72 chars.
- **No unrequested changes**: implement only what was approved in Phase 1.
- **Dependency scan is mandatory**: never produce a file list without first grepping for all usages of affected entities.
- **Context hygiene**: if context window reaches ~50% during Phase 2, run `/compact` before continuing. Re-read `.claude/CLAUDE.local.md` after compact to restore active overrides.
- **Secret hygiene**: never commit `.env*` files, tokens, or credentials.
- **Immediate migration**: every migration file must be applied to the remote DB immediately after writing. Never leave a written migration unapplied before running tests.
