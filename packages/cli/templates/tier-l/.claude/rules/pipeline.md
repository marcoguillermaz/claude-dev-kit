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

**Session file — non-negotiable**: check `.claude/session/` for existing `block-*.md` files.
- If one exists: read it immediately — a previous session was interrupted. Resume from the recorded state. Do NOT create a new file.
- If none: create `.claude/session/block-new-session.md` with the current date and a placeholder skeleton. Rename to `block-[name].md` in Phase 1 once the block name is known.
- The session file must exist before any other Phase 0 action runs.

Then:
- Read `.claude/CLAUDE.local.md` to confirm active overrides (if file exists).
- Read `MEMORY.md` (project root): Active plan section + relevant Lessons.
- If context was compressed: read `docs/implementation-checklist.md` to re-align on current state.
- Do not re-read files already in context — use the already-acquired line reference.
- **Branch check**: if on `main` or `staging`, stop. Development always starts on `feature/block-name`.

## Phase 1 — Requirements ⏸ STOP

- **Rename session file**: once the block name is known, rename `block-new-session.md` → `block-[name].md`. Skip if already named correctly (resumed session).
- Update the session file after every significant decision during requirements definition.
- Read `docs/implementation-checklist.md` to verify block dependencies.
- Read the relevant section of `docs/requirements.md`.
- Check `docs/refactoring-backlog.md` for intersecting entries.
- **Block mode selection** — auto-select based on block signals, declare the selected mode with a one-line rationale, then proceed. User can override at any point before the STOP gate.

  **Mode A — Spec-first** (auto-selected when any signal is present):
  - Tier 2 sweep is triggered (>5 files, new entity, migration, multi-role change)
  - New feature with unclear or evolving shape
  - New API endpoint, contract change, or domain model change
  - Multi-component work

  **Mode B — Scope-confirm** (auto-selected when all signals are absent):
  - Tier 1 sweep (≤5 files, single entity, no migration, no new pattern)
  - Refactor, bug fix, or isolated change with clearly bounded scope

  Declare: *"Mode A — Spec-first [or B — Scope-confirm]: [one-line rationale]. Override if needed."* Then proceed immediately to the scope sweep.

- **Scope sweep** — auto-select Tier 1 or Tier 2 based on block signals, declare it, allow user to override. Do NOT proceed to dependency scan until an execution keyword is received:

  **Tier 1 — Standard Sweep** (≤5 files, single entity, no migration, no new pattern):
  - **Roles & permissions**: which roles in scope? Implicit inclusions?
  - **Data**: entities read/written? Silent data loss possible?
  - **Triggers**: activating event? Secondary triggers?
  - **Error conditions**: invalid input, missing data, concurrent edits — behavior defined?
  - **UI states**: empty, error, loading covered?
  - **Integrations**: notifications, external systems affected?
  - **Reversibility**: irreversible operation? Rollback defined?
  - **Explicit exclusions**: what is NOT being done that a reader might assume?

  **Tier 2 — EARS Deep Sweep** (>5 files, OR new entity, OR migration, OR multi-role change, OR new integration):
  - **Triggers** `WHEN`: activating event? Secondary or implicit triggers?
  - **Conditions** `IF/THEN`: preconditions that change behavior? Edge cases, concurrent edits?
  - **States** `WHILE`: which entity states or user states affect behavior? All combinations covered?
  - **Optional / role-gated** `WHERE`: what is conditional on role, community, or config?
  - All Tier 1 dimensions (roles, data, error conditions, UI states, integrations, reversibility, exclusions)
  - **Pre-mortem**: if this plan fails in Phase 2 due to scope ambiguity, what caused it?

  Also declare: **does this block include critical UI flows?** (yes/no). Determines whether Phase 4 activates.
  - If **yes** and `[E2E_COMMAND]` is configured: ask the user to list numbered UAT scenarios (1–5). Claude tests exactly those — no invented scenarios.
  - If **no** or `[E2E_COMMAND]` is `# not configured`: Phase 4 is skipped. State this explicitly.

  Compose one `AskUserQuestion` with all open items. The user — not Claude — declares when scope is complete.

- **Dependency scan** (mandatory — always delegate to the `dependency-scanner` agent):
  Invoke via the Agent tool. Pass the full list of affected routes, components, types/utilities, DB tables in one prompt. The agent runs all 6 checks in parallel and returns exact file paths + line numbers. Do not run checks manually in the main session — an incomplete scan is an incomplete file list, which is a process error.
  Every file listed under "Mandatory additions" in the agent's report must be in the file list before the STOP gate.
- **All clarification questions must use `AskUserQuestion` tool** — never inline.

- **Path A — Spec-first**: generate `docs/specs/[block-name].md` using this structure:

  ```markdown
  # Spec — [block-name]
  **Date**: [date]  **Sweep**: [Tier 1 / Tier 2]  **Mode**: Spec-first

  ## Goal
  [One sentence: what changes for the user when this block ships.]

  ## Acceptance Criteria
  - WHEN [trigger], the system MUST [outcome] [measurable constraint]
  - WHEN [trigger], the system MUST [outcome]
  - IF [precondition], THEN [behavior]
  (3–5 criteria. EARS format: WHEN/IF/WHILE + MUST/SHALL.)

  ## Scope
  **In scope** (confirmed by dependency scan): [file or component list]
  **Out of scope** (explicit): [what is NOT being done]

  ## Definition of Done
  - [ ] All acceptance criteria verified manually
  - [ ] Tests cover the criteria above
  - [ ] Phase 6 checklist signed off
  ```

  Present the spec. Do not proceed to Phase 2 until the spec is explicitly approved.

- **Path B — Scope-confirm**: output feature summary + **complete** file list verified by dependency scan. Present for confirmation.

***** STOP — Path A: spec review. Path B: requirements summary. Wait for an execution keyword (`Execute` · `Proceed` · `Confirmed` · `Go ahead`). *****

## Phase 1.5 — Design review *(blocks touching >5 files or new patterns)*

- Present data flow, data structures, main trade-offs.
- State discarded alternatives and rationale.
- For simple blocks (≤3 files, no shared types, no migration, no new patterns): skip, stating so.
- **All clarification questions arising during design review must use the `AskUserQuestion` tool** — no inline open questions.

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
- **After every new migration**: apply to remote DB immediately + verify + log in your project's migrations log (e.g. `docs/migrations-log.md`) if one is tracked.
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

- Write tests covering:
  - Happy path: expected status code + key fields in response body
  - Auth: no token → 401
  - Authz: unauthorized role → 403
  - Validation: invalid payload or missing required field → 400
  - Business rules: application constraint violation → correct error code
  - DB state: after write, verify expected record with a privileged client
- Every test that writes to DB must clean up in `afterAll`. Use cleanup-first pattern in `beforeAll` (delete pre-existing test data before creating fixtures).
- Output: summary line only (`✓ N/N`).

## Phase 4 — UAT / E2E tests *(conditional — read before skipping)*

**This phase activates only when both conditions hold**:
1. `[E2E_COMMAND]` is set in CLAUDE.md Key Commands (not `# not configured`)
2. At the Phase 1 scope gate, the user confirmed critical UI flows and defined the UAT scenarios

If either condition is false: **skip this phase and state so explicitly** — do not proceed silently.

- Implement exactly the numbered UAT scenarios defined by the user at the Phase 1 scope gate. Do not add, remove, or reinterpret scenarios.
- Use `data-*` attribute selectors — never CSS color classes or positional selectors.
- Each scenario becomes one test: scenario title as test name, steps as the test body.
- Run: `[E2E_COMMAND]`
- Output: summary line only (`✓ N/N`). On failure: list the failing scenario by name.

## Phase 5b — Test data setup *(MANDATORY — must complete before Phase 5c)*

- Identify test account(s) from the role scope of the block.
- Insert representative test records covering all relevant states via a one-shot script (cleanup-first: delete existing test records before inserting fresh ones).
- Goal: the test account has realistic data for every UI state visible in Phase 5c.
- Leave test data in DB for the smoke test. Clean up after Phase 5c only if records would break other tests.

## Phase 5c — Staging deploy + smoke test

- Start dev server if needed: `[DEV_COMMAND]`. Declare the endpoint before proceeding.
- Merge to staging: `git checkout staging && git merge feature/block-name --no-ff && git push origin staging`
- Wait for deploy (~1–2 min). Smoke test the main flow in 3–5 steps using a test account.
- For UI changes: verify in both light and dark mode.
- Output: "smoke test OK" or describe the problem and fix before proceeding.
- Fix on `feature/` branch, re-merge if issues found.

## Phase 5d — Block-scoped quality audit *(blocks with UI or API changes)*

**Track A — UI audit** *(if block adds/modifies UI routes or components — runs on localhost)*
- Run `/ui-audit` scoped to the block's new/modified routes only (token compliance, component adoption, accessibility, empty states).
- Run `/visual-audit` scoped to the block's new/modified pages (typography, spacing, hierarchy, colour, density, dark-mode, micro-polish).
- Run `/ux-audit` scoped to the block's user flows (task completion, feedback clarity, cognitive load).
- Run `/responsive-audit` only if the block modifies routes used by non-admin roles.
- **Execution order**: `/ui-audit` is static — launch it concurrently with the first Playwright-based skill. Then: `/visual-audit` → `/ux-audit` → `/responsive-audit` sequentially (they share the Playwright session).

**Track B — API/DB audit** *(if block creates/modifies API routes or applies migrations — static analysis, no dev server needed)*
- Run `/security-audit` if the block creates or modifies any API route. Run `/api-design` if the block adds new API routes. Both are static — run them concurrently.
- Run `/skill-db` only if the block applies migrations.

**Severity handling — both tracks**:
- **Critical**: fix before Phase 6. Do not proceed with open Critical issues.
- **Major**: flag in Phase 6 checklist with planned resolution sprint.
- **Minor**: append to `docs/refactoring-backlog.md` — assign ID prefix (`PERF-`, `API-`, `DB-`, `DEV-`, `UX-`).
- Output per skill: one-paragraph summary only.

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
- [ ] Empty states handled with a dedicated component, not bare text
- [ ] New async routes have loading/skeleton states
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
1. **Delete session file**: remove `.claude/session/block-[name].md`.
   - Proceed only if the user's confirmation unambiguously closes the block.
   - If the confirmation is ambiguous (partial approval, open questions): ask explicitly — "Confirm session file deletion and block closure?" — then wait for a clear yes.
   - Never delete the session file speculatively.
2. Update `docs/implementation-checklist.md`: mark ✅, add Log row.
3. Update `CLAUDE.md` only if block introduces non-obvious patterns, changes access control rules, or adds a new convention.
4. Update `docs/requirements.md` if spec changed during implementation.
5. If Mode A was used: move `docs/specs/[block-name].md` → `docs/specs/archive/[block-name].md` and mark as `Status: IMPLEMENTED`.
5. Write ADR in `docs/adr/` if an architectural decision was made.
6. **Lessons capture**: review corrections received during this block. Add any non-obvious pattern rule to `tasks/lessons.md` (rule + why it exists). Do not wait for the next block.
7. Update `MEMORY.md` (project root) only if new lessons emerged not already documented.
7. **Canonical doc updates** (conditional — only update docs that exist in the project):
   - If `docs/sitemap.md` exists and the block added/removed routes: update it now.
   - If `docs/db-map.md` exists and the block changed the schema: update it now.
   - If `docs/prd/prd.md` exists: update it to reflect this block's outcomes.
   - If `docs/contracts/` exists and the block modified a domain entity: update the relevant contract.
8. **Commit sequence** — up to 3 commits, never mixed:
   - **Commit 1** (already done in Phase 3): source files only.
   - **Commit 2 — docs**: `docs/` changes + `README.md` if updated — separate commit.
   - **Commit 3 — context** (only if updated): `CLAUDE.md` and/or `MEMORY.md` — never mixed with code or docs.
9. Promote to production: `git checkout main && git merge staging --no-ff && git push origin main`

## Phase 8.5 — Context review + compact

**C1–C3** (grep-only — delegate to agent):
Invoke the `context-reviewer` agent via the Agent tool with `model: "haiku"`. It runs C1 (credential patterns), C2 (unresolved placeholders), C3 (field name staleness) in a single call and returns pass/fail per check with matched lines. Apply any fix in the main session before proceeding.

**C4–C12** (judgment-required — run in main session):
Execute checks C4 through C12 from `.claude/rules/context-review.md` in order.
Apply any fix before moving to the next check.
**Phase complete only when all 12 checks pass** — not when the review "seems thorough".

**Mandatory closing message** (before `/compact`):

```
**Block complete ✅ — [Block name]**
- Implemented: [one-line summary]
- Tests: type check ✅ · build ✅ · unit N/N ✅ [+ API ✅ · E2E ✅ if applicable]
- Next: [next block name] OR "No next block defined"
```

This message is non-negotiable — never skip it, even for small blocks.

Then run `/compact` to free the session context.

---

## Cross-cutting rules

- **Never commit to `main` or `staging` directly.**
- **STOP gates are hard stops** — not suggestions. Never proceed to the next phase without explicit confirmation.
- **Execution keywords**: `Execute` · `Proceed` · `Confirmed` · `Go ahead` — the only phrases that authorize autonomous action after a STOP gate.
- **Exception — active Phase 2**: once a plan is confirmed and an execution keyword was given, proceed autonomously through implementation without re-confirming each file edit. The confirmation covers the approved plan, not each step.
- **Green before commit**: type check + tests must pass before every commit.
- **Conventional commits**: `feat(scope):`, `fix(scope):`, `docs:`, `chore:` — imperative, under 72 chars.
- **No unrequested changes**: implement only what was approved in Phase 1.
- **Dependency scan is mandatory**: always delegate to the `dependency-scanner` agent in Phase 1. Never produce a file list without first running the full scan. An incomplete scan is a process error.
- **Context hygiene**: if context window reaches ~50% during Phase 2, run `/compact [keep: current implementation state and open TODOs]` before continuing. Re-read `.claude/CLAUDE.local.md` after compact to restore active overrides.
- **Secret hygiene**: never commit `.env*` files, tokens, or credentials.
- **Immediate migration**: every migration file must be applied to the remote DB immediately after writing.
- **Read-only ops are always free**: `Read`, `Grep`, `Glob`, `git status/log/diff` may run without prior confirmation.

---

## Pipeline for Structural Requirements Changes

Activate when stakeholders change functional scope on already-implemented blocks.

**Phase R1 — Requirements update**
- Compare the change with the relevant section of `docs/requirements.md`.
- Propose updated text section by section.
- ***** STOP — wait for explicit approval of each section before writing anything. *****

**Phase R2 — Impact analysis**
- Identify all already-implemented blocks impacted by the change.
- For each block: list affected files, logic to update, tests to revise.
- Check `docs/refactoring-backlog.md`: can existing entries be deprecated or updated in light of the change?
- Output: impact matrix (block → file → change type) + refactoring-backlog delta.

**Phase R3 — Intervention plan**
- Update `docs/implementation-checklist.md` with the new plan.
- Update `docs/refactoring-backlog.md` (deprecate obsolete entries, add emerging issues).
- ***** STOP — present the full plan. Wait for explicit confirmation before touching any code. *****

**Phase R4 — Execution**
- Read `docs/implementation-checklist.md` — the approved plan per block is defined and ready.
- Proceed block by block following the standard pipeline (Phases 0–8.5).
