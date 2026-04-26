## What does this PR do?

<!-- One paragraph: what changed and why. -->

## Type of change

- [ ] Bug fix
- [ ] New feature / enhancement
- [ ] Template update (scaffold files)
- [ ] Documentation update
- [ ] Refactor (no behavior change)

## Checklist

- [ ] Tested locally with `node packages/cli/src/index.js init` and/or `doctor`
- [ ] No placeholder syntax broken (`[PLACEHOLDER_NAME]` always uppercase with underscores)
- [ ] Tier boundaries respected (no Tier L features in Tier M templates)

### Documentation (mandatory for any user-facing change)

A user-facing change is anything that adds, removes, or alters a CLI command, scaffolded file, skill, doctor check, MCP tool, schema, or public API surface. If this PR touches any of those, every applicable item below must be checked. If the PR is purely internal (refactor, test, CI, internal tooling), tick the last item to acknowledge no docs change was warranted.

- [ ] `README.md` updated — opening tagline / "What it does" / Architecture diagram / CLI Commands / dedicated section, as relevant
- [ ] `docs/operational-guide.md` updated with the corresponding subsection
- [ ] `CHANGELOG.md` entry under `[Unreleased]` (or the new version block if this PR is the release)
- [ ] PR title and body name the user-visible feature, not just the implementation detail
- [ ] If a release: humanized GitHub Release notes drafted (R2 governance)
- [ ] No user-facing change in this PR — internal/refactor/test/CI only

## Related issue

<!-- Closes #123 -->
