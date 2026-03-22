# Git Conventions

## Branch naming

| Type | Pattern | Example |
|---|---|---|
| Feature / block | `feature/short-description` | `feature/user-invitations` |
| Bug fix | `fix/short-description` | `fix/login-redirect-loop` |
| Chore / docs | `chore/short-description` | `chore/update-dependencies` |

**Never commit directly to `main` or `staging`.** All work on feature or fix branches.

## Commit messages

Format: `type(scope): short description` — imperative mood, under 72 characters.

```
feat(auth): add email invite flow
fix(api): return 403 instead of 404 for unauthorized access
docs(adr): record decision to use Zod for validation
chore(deps): upgrade TypeScript to 5.4
refactor(db): extract query helpers to lib/db.ts
test(auth): add integration tests for invite flow
```

**Types**: `feat` · `fix` · `docs` · `chore` · `refactor` · `test` · `perf` · `ci`

**Scope**: the part of the codebase affected (feature area, module, layer).

## What never goes in a commit

- `.env*` files or any secrets/credentials
- Build artifacts (`dist/`, `.next/`, `__pycache__/`)
- Personal editor config (`.vscode/` unless team-agreed)
- Debug code, `console.log`, commented-out code blocks

## Force push

Never force-push to shared branches (`main`, `staging`, `develop`).
Force-push on personal feature branches is acceptable before a PR is opened.

## AI-generated commits

Commits containing AI-generated code are tagged automatically via `attribution.commit`
in `.claude/settings.json`. This creates an audit trail in git history without
requiring manual tagging.

The AI attribution does not replace human review — every AI-generated commit on a
shared branch should be reviewed before merging.
