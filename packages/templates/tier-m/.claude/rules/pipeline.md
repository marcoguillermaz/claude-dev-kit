# Standard Development Pipeline — Tier M

Use for: feature blocks, 1–2 week changes, ≤15 files, no complex domain model changes.
Branch prefix `feature/` activates this pipeline automatically.

---

## Which pipeline to use

| Work type | Branch | Pipeline |
|---|---|---|
| Bugfix / 1–3 file change | `fix/description` | Fast Lane (Tier S) |
| Feature block / 1–2 weeks | `feature/block-name` | This pipeline |
| Complex domain / long-running | — | Tier L (full pipeline) |

---

## Phase 0 — Session orientation

- **FIRST**: check for `CONTEXT_IMPORT.md` in the project root. If it exists and contains `Status: PENDING_DISCOVERY`, run the Discovery Workflow inside that file **before any other work**. Do not proceed to Phase 1 until discovery is marked `COMPLETE`.
- **Session file — non-negotiable**: check `.claude/session/` for existing `block-*.md` files.
  - If one exists: read it immediately — a previous session was interrupted. Resume from the recorded state. Do NOT create a new file.
  - If none exists: create `.claude/session/block-new-session.md` with the current date and a placeholder skeleton. Rename to `block-[name].md` in Phase 1 once the block name is known.
  - The session file must exist before any other Phase 0 action runs.
- Read `.claude/CLAUDE.local.md` to confirm active overrides (if file exists).
- Read `MEMORY.md` (project root): Active plan + relevant Lessons.
- If context was compressed: read `docs/implementation-checklist.md` to re-align on current state.
- **Branch check**: if on `main` or `staging`, stop. Create `feature/block-name` first.

## Phase 1 — Requirements ⏸ STOP

- **Rename session file**: once the block name is determined, rename `block-new-session.md` → `block-[name].md`. Skip if already named correctly (resumed session).
- Update the session file after every significant decision during requirements definition.
- Read `docs/implementation-checklist.md` to verify block dependencies.
- Read the relevant section of `docs/requirements.md`.
- Check `docs/refactoring-backlog.md` for intersecting entries.
- **Scope confirmation gate** — apply the Interaction Protocol (CLAUDE.md § Plan-then-Confirm). Select the tier based on block signals, declare it, and allow the user to override:

  **Tier 1 — Standard Sweep** (≤5 files, single entity, no migration, no new pattern):
  - **Roles & permissions**: which roles are in scope? Any implicit inclusion?
  - **Data**: entities read/written? Silent data loss possible?
  - **Triggers**: what user action activates this? Secondary triggers?
  - **Error conditions**: invalid input, missing data, concurrent edits — behavior defined?
  - **UI states**: empty, error, loading covered?
  - **Integrations**: emails, notifications, external systems affected?
  - **Reversibility**: any irreversible operation? Rollback defined?
  - **Explicit exclusions**: what is NOT being done that a reader might assume is included?

  **Tier 2 — Deep Sweep** (>5 files, OR new entity, OR migration, OR multi-role change):
  - All Tier 1 dimensions, plus:
  - **States** `WHILE`: which entity states or user states affect behavior?
  - **Conditions** `IF/THEN`: preconditions that change behavior? Edge cases?
  - **Optional / role-gated** `WHERE`: what is conditional on role or config?
  - **Pre-mortem**: if this plan fails in implementation due to scope ambiguity, what caused it?

  Compose one `AskUserQuestion` with all open items. Do NOT proceed to the dependency scan until an execution keyword is received (`Execute` · `Proceed` · `Confirmed` · `Go ahead`).

- **Dependency scan** (mandatory — always delegate to the `dependency-scanner` agent):
  Invoke the `dependency-scanner` agent via the Agent tool. Pass the full list of affected routes, components, types/utilities, and DB tables in one prompt. Do not run the checks manually in the main session — an incomplete scan is an incomplete file list, which is a process error.
  Every file listed under "Mandatory additions" in the agent's report must be in the file list before the STOP gate.
- Output: feature summary, complete file list verified by dependency scan.

***** STOP — present requirements summary. Wait for explicit confirmation. *****

## Phase 1.5 — Design review *(blocks touching >5 files or introducing new patterns)*

- Present data flow, data structures, main trade-offs.
- State discarded alternatives and rationale.
- Skip for simple blocks (≤3 files, no shared types, no migration, no new patterns).

***** STOP — wait for design confirmation before writing code. *****

## Phase 2 — Implementation

- Update `docs/requirements.md` with the approved plan before writing any code.
- Follow all coding conventions in `CLAUDE.md`.
- **After every new migration**: apply to remote DB immediately + verify + log in `docs/migrations-log.md`.
- **Security checklist** (before intermediate commit): for every new/modified API route: (1) auth check before any operation, (2) input validated, (3) no sensitive data exposed in response, (4) access control not bypassed. For every new DB table: (5) row-level security enabled and at least one policy covers each relevant role.
- Run `/simplify` on changed files after writing (skip for trivial 1-file changes).

## Phase 3 — Build + tests

- Run type check: `[TYPE_CHECK_COMMAND]` — must be clean.
- Run build: `[BUILD_COMMAND]` — must succeed.
- Run tests: `[TEST_COMMAND]` — all must pass.
- Output: summary line only (e.g. `✓ 42/42`). Do NOT paste full output.
- **Intermediate commit** after green: `git add … && git commit -m "feat(scope): description"`

## Phase 3b — API integration tests *(if block creates or modifies API routes)*

- Write core tests covering:
  - Happy path: expected status code + key fields in response body
  - Auth: no token → 401
  - Authz: unauthorized role → 403
  - Validation: invalid payload or missing required field → 400
  - Business rules: application constraint violation → correct error code
  - DB state: after write, verify expected record with a privileged client
- Every test that writes to DB must clean up in `afterAll`. Use cleanup-first pattern in `beforeAll` (delete pre-existing test data before creating fixtures).
- Run `[TEST_COMMAND] [API_TESTS_PATH]` — all green before proceeding.

## Phase 5b — Test data setup *(before smoke test)*

- Identify the test account(s) from the role scope of the block.
- Insert representative test records covering all relevant states.
- Goal: the test account has realistic data for every UI state that must be visible during smoke.

## Phase 5c — Staging deploy + smoke test

- Start the dev server if needed: `[DEV_COMMAND]`. Declare the endpoint before proceeding.
- Merge to staging: `git checkout staging && git merge feature/block-name --no-ff && git push origin staging`
- Wait for deploy. Open staging URL and verify the main flow in 3–5 steps using a test account.
- For blocks with UI changes: verify in both light and dark mode.
- Output: "smoke test OK" or describe the problem and fix before proceeding.
- Fix issues on `feature/` branch, re-merge if needed.

## Phase 6 — Outcome checklist ⏸ STOP

Present this checklist with actual results:

```
## Block checklist — [Block Name]

### Build & Test
- [ ] Type check: 0 errors
- [ ] Build: success
- [ ] Tests: N/N passed
- [ ] API tests: N/N passed (if Phase 3b executed)

### Implemented features
- [ ] [feature 1]: [outcome]

### Manual verification steps
1. [step]

### Files created / modified
- path/to/file — description
```

***** STOP — do not declare complete, do not update docs, until explicit confirmation. *****

## Phase 8 — Block closure

Only after explicit confirmation:
1. **Delete session file**: remove `.claude/session/block-[name].md`.
   - Proceed only if the user's confirmation unambiguously closes the block.
   - If the confirmation is ambiguous (partial approval, open questions): ask explicitly before deleting.
   - Never delete the session file speculatively.
2. Update `docs/implementation-checklist.md`: mark ✅, add Log row.
3. Update `CLAUDE.md` only if block introduces non-obvious patterns or changes conventions.
4. Update `docs/requirements.md` if spec changed during implementation.
5. Update `MEMORY.md` (project root) only if new lessons emerged not already documented.
6. **Commit sequence**:
   - **Commit 1** (already done in Phase 3): source files only.
   - **Commit 2 — docs**: `docs/` changes + `README.md` if updated.
   - **Commit 3 — context** (only if updated): `CLAUDE.md` and/or `MEMORY.md` — never mixed with code or docs.
7. Promote to production: `git checkout main && git merge staging --no-ff && git push origin main`

## Phase 8.5 — Context review + compact

Execute checks C1 through C11 from `.claude/rules/context-review.md` in order.
Apply any fix before moving to the next check.
**Complete only when all checks pass.**

**Mandatory closing message** (before `/compact`):

```
**Block complete ✅ — [Block name]**
- Implemented: [one-line summary]
- Tests: type check ✅ · build ✅ · tests N/N ✅ [+ any other phases]
- Next: [next block name] OR "No next block defined"
```

Then run `/compact` to free the session context.

---

## Cross-cutting rules

- **Never commit to `main` or `staging` directly.**
- **STOP gates are hard stops** — not suggestions. Never proceed to the next phase without explicit confirmation.
- **Execution keywords**: `Execute` · `Proceed` · `Confirmed` · `Go ahead` — these are the only phrases that authorize autonomous action after a STOP gate.
- **Green before commit**: type check + tests must pass before every commit.
- **Conventional commits**: `feat(scope):`, `fix(scope):`, `docs:`, `chore:` — imperative, under 72 chars.
- **No unrequested changes**: implement only what was approved in Phase 1.
- **Dependency scan is mandatory**: always delegate to the `dependency-scanner` agent in Phase 1. Never produce a file list without first running the full scan.
- **Context hygiene**: if context window reaches ~50% during Phase 2, run `/compact [keep: current implementation state and open TODOs]` before continuing.
- **Secret hygiene**: never commit `.env*` files, tokens, or credentials.
- **Read-only ops are always free**: `Read`, `Grep`, `Glob`, `git status/log/diff` may run without prior confirmation — no STOP gate needed for these.
