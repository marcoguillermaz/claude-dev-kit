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
- Check `.claude/session/` for existing `block-*.md` files. If one exists: resume from it.
- If none: create `.claude/session/block-[name].md` with date + placeholder.
- Read `MEMORY.md` (project root): Active plan + relevant Lessons.
- **Branch check**: if on `main` or `staging`, stop. Create `feature/block-name` first.

## Phase 1 — Requirements ⏸ STOP

- Read `docs/implementation-checklist.md` to verify block dependencies.
- Read the relevant section of `docs/requirements.md`.
- Check `docs/refactoring-backlog.md` for intersecting entries.
- **Dependency scan** (mandatory — delegate all 6 checks in a single agent call):
  Invoke the `dependency-scanner` agent via the Agent tool. Pass the full list of affected routes, components, types/utilities, and DB tables in one prompt. Do not run the checks manually in the main session.
  Every file listed under "Mandatory additions" in the agent's report must be added to the file list before the STOP gate.
- Ask all clarification questions using `AskUserQuestion` tool — never inline.
- Output: feature summary, complete file list, open questions resolved.

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
- **Security checklist** before committing: auth check, input validation, no sensitive data in responses, RLS/ACL not bypassed.
- Run `/simplify` on changed files after writing (skip for trivial 1-file changes).

## Phase 3 — Build + tests

- Run type check: `[TYPE_CHECK_COMMAND]` — must be clean.
- Run build: `[BUILD_COMMAND]` — must succeed.
- Run tests: `[TEST_COMMAND]` — all must pass.
- Output: summary line only (e.g. `✓ 42/42`). Do NOT paste full output.
- **Intermediate commit** after green: `git add … && git commit -m "feat(scope): description"`

## Phase 3b — API integration tests *(if block creates or modifies API routes)*

- Write core tests covering: happy path, auth (401), authz (403), validation (400), business rules.
- Every test that writes to DB must clean up in `afterAll`.
- Run: all green before proceeding.

## Phase 5 — Staging deploy + smoke test

- Merge to staging: `git checkout staging && git merge feature/block-name --no-ff && git push origin staging`
- Wait for deploy. Open staging URL and verify the main flow in 3–5 steps.
- For blocks with UI changes: verify in both light and dark mode.
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
- path/to/file.ts — description
```

***** STOP — wait for explicit confirmation before Phase 8. *****

## Phase 8 — Block closure

Only after explicit confirmation:
1. Delete session file: `.claude/session/block-[name].md`
2. Update `docs/implementation-checklist.md`: mark ✅, add Log row.
3. Update `CLAUDE.md` only if block introduces non-obvious patterns or changes conventions.
4. Update `docs/requirements.md` if spec changed during implementation.
5. Update `MEMORY.md` (project root) only if new lessons emerged not already documented.
6. Commit docs: `git add docs/ && git commit -m "docs(block): update checklist and requirements"`
7. Promote to production: `git checkout main && git merge staging --no-ff && git push origin main`

---

## Cross-cutting rules

- **Never commit to `main` or `staging` directly.**
- **STOP gates are hard stops** — not suggestions.
- **Green before commit**: type check + tests must pass.
- **Conventional commits**: `feat(scope):`, `fix(scope):`, `docs:`, `chore:` — imperative, under 72 chars.
- **No unrequested changes**: implement only what was approved in Phase 1.
- **Context hygiene**: if context window reaches ~50% during Phase 2, run `/compact` before continuing.
- **Secret hygiene**: never commit `.env*` files, tokens, or credentials. `.gitignore` must cover all secret files.
