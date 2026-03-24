# claude-dev-kit — Project Context

## Overview
CLI tool that installs a governance layer on top of Claude Code. Four tiers from minimal discovery to full pipeline governance. Stack-agnostic, npm-distributable. Target user: Builder PM and tech lead — technical enough for end-to-end Claude Code work.

## Tech Stack
- **Runtime**: Node.js ≥ 18, ESM modules
- **CLI framework**: Commander + Inquirer + Chalk + Ora
- **Package**: `packages/cli/` — main CLI source
- **Templates**: `packages/cli/templates/` — tier-specific scaffold files

## Key Commands
```bash
node packages/cli/src/index.js init        # run the init wizard locally
node packages/cli/src/index.js doctor      # run health checks
node packages/cli/src/index.js --help      # list all commands
```

## Project Structure
```
packages/
  cli/
    src/
      commands/     ← init-greenfield.js, init-in-place.js, doctor.js, upgrade.js
      scaffold/     ← index.js (interpolate + copyTemplateDir)
      generators/   ← claude-md.js, readme.js, context-import.js
      utils/        ← print-plan.js, detect-stack.js
    templates/
      tier-0/       ← Discovery: 3 files only
      tier-s/       ← Fast Lane: 4-step pipeline
      tier-m/       ← Standard: 8 phases, 2 STOP gates
      tier-l/       ← Full: 11 phases, 4 STOP gates + R1–R4
      common/       ← shared files (context-review.md, files-guide.md, rules/)
```

## Conventions
- Placeholder syntax: `[PLACEHOLDER_NAME]` — always uppercase with underscores
- All placeholders must be handled in `scaffold/index.js` → `interpolate()`
- Templates are stack-agnostic — no framework-specific assumptions
- Tier boundaries are strict: no Tier L features in Tier M templates
- `doctor.js` check count must match what README + operational-guide document

## Integration Tests
Run before every release to validate all tier/mode combinations:
```bash
node packages/cli/test/integration/run.js
# Add --verbose for per-check output
```
98 checks: file structure per tier, Stop hook presence and resolution, pipeline gate counts, wizard placeholder resolution, safe-mode preservation. Output is gitignored (`packages/cli/test/integration/output/`).

## Interaction Protocol
**Perimeter questions** (scope, vision, user, future): always use the `AskUserQuestion` tool — never present as inline text. Max 4 questions per call, each with 2–4 options. Open-ended questions get representative options + "Other" for custom input.

## Agentic Behavior

**Plan Mode Default**: use `EnterPlanMode` for any task with 3+ steps or architectural decisions. If execution goes off track → STOP and re-plan before continuing.

**Subagent Strategy**: keep main context window clean. Offload research, codebase exploration, and parallel analysis to subagents. One focused task per subagent.

**Verification Gate**: before marking any task complete — run integration tests, diff behavior, ask "Would a staff engineer approve this?" No green = not done.

**Lessons Capture**: after any user correction, check if the pattern is non-obvious. If so, save it as a feedback memory immediately.

## Reference Documents
- `README.md` — public-facing, must stay in sync with all template/CLI changes
- `docs/operational-guide.docs` — full reference, must stay in sync
- Both updated as mandatory final step after every round of changes (standing rule)

## Current Version
`v1.1.0` — published on npm as `mg-claude-dev-kit`. Four tiers stable. Spec-driven mode (Mode A/B) in Tier M/L.
