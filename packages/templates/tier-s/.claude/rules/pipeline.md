# Fast Lane Pipeline

Use for: changes touching ≤3 files, no migrations, no new patterns, no shared type changes.
Branch prefix `fix/` activates this pipeline automatically.

---

## FL-0 — Branch check

- Confirm current branch starts with `fix/`. If not: `git checkout -b fix/description`.
- Never commit directly to `main` or `staging`.

## FL-1 — Implement

- No requirements gate. Write the fix.
- Run type check: `[TYPE_CHECK_COMMAND]`
- Run tests: `[TEST_COMMAND]`
- Both must be green before committing.
- Commit: `git add … && git commit -m "fix(scope): description"`

## FL-2 — Deploy to staging + smoke test

- Merge to staging: `git checkout staging && git merge fix/description --no-ff && git push origin staging`
- Wait for deploy (~1–2 min). Verify in 1–3 steps.
- If broken: fix on the `fix/` branch, re-merge.

## FL-3 — Promote to production

- Merge to main: `git checkout main && git merge staging --no-ff && git push origin main`
- Verify deploy completes.
- Output a one-line summary: `fix complete ✅ — [description] · type check ✅ · tests N/N ✅`

## FL-4 — Cleanup

- Update `docs/implementation-checklist.md` only if the fix closes a tracked item.
- Update `CLAUDE.md` only if the fix reveals a non-obvious pattern worth documenting.
- Delete local fix branch: `git branch -d fix/description`

> Fast Lane has no STOP gates. If scope expands beyond 3 files or requires a migration,
> escalate to Tier M or Tier L and notify the user.

---

## Cross-cutting rules

- **Never commit to `main` or `staging` directly.** All development on `fix/` branches.
- **Green before commit**: type check + tests must pass before every commit.
- **Conventional commits**: `fix(scope): description` — lowercase, imperative, under 72 chars.
- **No unrequested changes**: fix only what was asked. No opportunistic refactoring.
- **Secret hygiene**: never commit `.env*` files, tokens, or credentials.
