# Contributing to claude-dev-kit

Thank you for your interest in contributing.

---

## Ways to contribute

- **Bug reports**: open an issue using the Bug Report template
- **Feature requests**: open an issue using the Feature Request template
- **Pull requests**: improvements to the CLI, templates, or documentation

---

## Development setup

**Requirements**: Node.js ≥ 18, Git

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
```

---

## Project structure

```
packages/
  cli/src/
    commands/     ← init-greenfield.js, init-in-place.js, doctor.js, upgrade.js
    scaffold/     ← interpolate + copyTemplateDir
    generators/   ← claude-md.js, readme.js, context-import.js
    utils/        ← print-plan.js, detect-stack.js
  templates/
    tier-0/       ← Discovery tier scaffold files
    tier-s/       ← Fast Lane tier scaffold files
    tier-m/       ← Standard tier scaffold files
    tier-l/       ← Full tier scaffold files
    common/       ← Files shared across tiers
```

---

## Conventions

- **Placeholder syntax**: `[PLACEHOLDER_NAME]` — always uppercase with underscores
- All placeholders must be handled in `scaffold/index.js` → `interpolate()`
- Templates are stack-agnostic — no framework-specific assumptions
- Tier boundaries are strict: no Tier L features in Tier M templates
- `doctor.js` check count must match what README and operational-guide document

---

## Pull request guidelines

1. Fork the repo and create a branch: `git checkout -b fix/description` or `feature/description`
2. Make your changes — keep them focused (one concern per PR)
3. Run `node packages/cli/src/index.js doctor` in a test project to verify
4. Update `README.md` and `docs/operational-guide.docs` if your change affects documented behavior
5. Update `CHANGELOG.md` under `[Unreleased]`
6. Open a PR — describe what changed and why

---

## Reporting bugs

Use the **Bug Report** issue template. Include:
- What you ran (`npx claude-dev-kit init`, `doctor`, etc.)
- What you expected vs what happened
- Node.js version (`node --version`)
- OS

---

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be respectful.
