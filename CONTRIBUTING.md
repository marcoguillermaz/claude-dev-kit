# Contributing to claude-dev-kit

---

## Ways to contribute

- **Bug reports**: open an issue using the Bug Report template
- **Feature requests**: open an issue using the Feature Request template
- **New skills**: see [Custom Skills Guide](docs/custom-skills.md) for the SKILL.md format
- **Pull requests**: improvements to the CLI, templates, skills, or documentation

---

## Development setup

**Requirements**: Node.js >= 22, Git

```bash
git clone https://github.com/marcoguillermaz/claude-dev-kit.git
cd claude-dev-kit
cd packages/cli && npm install
```

**Run locally:**

```bash
node packages/cli/src/index.js --help
node packages/cli/src/index.js init
node packages/cli/src/index.js doctor
node packages/cli/src/index.js add skill arch-audit
node packages/cli/src/index.js add rule security --stack swift
```

**Run tests:**

```bash
node packages/cli/test/integration/run.js       # 464 integration checks
node --test packages/cli/test/unit/*.test.js      # 243 unit tests
```

All tests must pass before submitting a PR.

---

## Project structure

```
packages/cli/
  src/
    commands/     # init.js, doctor.js, upgrade.js, add.js
    scaffold/     # index.js (interpolate + copy), skill-registry.js
    generators/   # claude-md.js, readme.js, context-import.js
    utils/        # print-plan.js, detect-stack.js
  templates/
    tier-0/       # Discovery: 3 files only
    tier-s/       # Fast Lane: 4-step pipeline
    tier-m/       # Standard: 8 phases, 2 STOP gates
    tier-l/       # Full: 14 phases, 4 STOP gates
    common/       # Shared files: rules, templates, guides
  test/
    unit/         # node:test unit tests
    integration/  # Full scaffold + assertion tests
    fixtures/     # Wizard answer JSON files for --answers flag
```

---

## Key conventions

- **Skill registry**: `scaffold/skill-registry.js` is the single source of truth for skill applicability. Adding a new skill = one entry here.
- **Placeholder syntax**: `[PLACEHOLDER_NAME]` - uppercase with underscores. All handled in `scaffold/index.js` -> `interpolate()`.
- **Tier boundaries**: no Tier L features in Tier M templates. No Tier M features in Tier S.
- **Custom skills**: files matching `.claude/skills/custom-*/SKILL.md` are never touched by `upgrade` or `init`. This convention is documented for end users.
- **Stack agnosticity**: templates contain no framework-specific assumptions. Stack adaptation happens in `interpolate()` and `skill-registry.js`.
- **Doctor check count**: must match what README documents (currently 17).

---

## Adding a new skill

1. Add an entry to `SKILL_REGISTRY` in `packages/cli/src/scaffold/skill-registry.js`
2. Create `SKILL.md` in the appropriate tier template directories
3. Add integration test assertions for the new skill
4. Update `docs/custom-skills.md` if the change affects the documented format
5. Run both test suites before submitting

See [Custom Skills Guide](docs/custom-skills.md) for the SKILL.md frontmatter schema and body structure.

---

## Pull request guidelines

1. Fork the repo and create a branch: `git checkout -b fix/description` or `feature/description`
2. Keep changes focused - one concern per PR
3. Run integration tests: `node packages/cli/test/integration/run.js`
4. Run unit tests: `node --test packages/cli/test/unit/`
5. Update `README.md` and `docs/operational-guide.md` if your change affects documented behavior
6. Update `CHANGELOG.md` under `[Unreleased]`
7. Open a PR - describe what changed and why

---

## Reporting bugs

Use the **Bug Report** issue template. Include:
- Command you ran (`npx mg-claude-dev-kit init`, `doctor`, etc.)
- Expected vs actual behavior
- Node.js version (`node --version`)
- OS

---

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
