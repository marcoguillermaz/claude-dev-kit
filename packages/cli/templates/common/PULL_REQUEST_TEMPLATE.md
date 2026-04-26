## Changes

<!-- Brief description of what this PR does and why -->

## Type

- [ ] `feat` - new feature
- [ ] `fix` - bug fix
- [ ] `refactor` - code change, no functional change
- [ ] `docs` - documentation only
- [ ] `chore` - dependencies, config, tooling

## AI Involvement

- [ ] No AI assistance used
- [ ] AI-assisted (Claude Code) - review checklist below
- [ ] Primarily AI-generated - requires thorough review

### AI Review Checklist *(complete if AI-assisted or AI-generated)*

- [ ] Reviewed all generated code for correctness and intent
- [ ] Verified no secrets or credentials in generated code (`git diff --stat` + manual scan)
- [ ] Confirmed test coverage is adequate for the changes
- [ ] Checked that generated migrations are reversible
- [ ] Verified no unexpected file deletions or scope creep
- [ ] Confirmed generated code follows project conventions (CLAUDE.md)

## Testing

<!-- How was this tested? Include steps to reproduce manually if needed. -->

- [ ] Type check passes
- [ ] All existing tests pass
- [ ] New tests written for new behaviour (if applicable)
- [ ] Smoke tested on staging

## Documentation

User-facing changes (CLI flags, public API, schemas, migrations, configuration) must be reflected in the corresponding project docs before merge. Internal-only changes (refactor, test, CI) tick the last item.

- [ ] README updated where the user-facing surface is described
- [ ] Inline docstrings or operational docs updated for new public APIs / schemas / commands
- [ ] CHANGELOG entry under `[Unreleased]` or the relevant version block
- [ ] No user-facing change — internal/refactor/test/CI only

## Breaking Changes

- [ ] No breaking changes
- [ ] Breaking changes - described below:

<!-- Describe what breaks and migration path if applicable -->

## Screenshots / recordings *(UI changes only)*

<!-- Before / after screenshots or a short screen recording -->
