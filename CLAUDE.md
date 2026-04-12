# claude-dev-kit — Project Context

## Overview
CLI tool that installs a governance layer on top of Claude Code. Four tiers from minimal discovery to full pipeline governance. Stack-agnostic, npm-distributable. Target user: Builder PM and tech lead — technical enough for end-to-end Claude Code work.

## Output Style

Read `.claude/rules/output-style.md` before responding. It is the single source of truth for tone, vocabulary, punctuation, and structure. No other style guidance applies.

## Tech Stack
- **Runtime**: Node.js ≥ 20, ESM modules
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
481 checks: file structure per tier, Stop hook presence and resolution, pipeline gate counts, wizard placeholder resolution, safe-mode preservation, new named stacks (swift/kotlin/rust/dotnet/ruby/java), conditional docs pruning (sitemap.md, db-map.md), security rule variant selection (6 stack/API combinations + leak check + deny verification), placeholder noise reduction (unfilled sections stripped from CLAUDE.md), native skill adaptation (8 stacks), simplify skill presence, rubric scoring (D2/D5/D7/D8 for node-ts/swift/python with quality floor), full CLI execution via `--answers` fixtures (9 scenarios). Output is gitignored (`packages/cli/test/integration/output/`).

## Interaction Protocol
**Perimeter questions** (scope, vision, user, future): always use the `AskUserQuestion` tool — never present as inline text. Max 4 questions per call, each with 2–4 options. Open-ended questions get representative options + "Other" for custom input.

## Mandatory Rules

**Anthropic docs validation**: any change that touches Claude Code formats — skill frontmatter, settings.json, hooks, CLAUDE.md structure, or any field that Claude Code interprets — must be verified against Anthropic's official documentation before implementation. External LLM recommendations (GPT-4.1, Gemini, Mistral, etc.) are useful input but never authoritative. Anthropic docs are the single source of truth for Claude Code conventions.

**Critical evaluation + explicit Go**: every proposed modification — including single-file changes — must be presented with concrete benefits, negative impacts, and alternatives before execution. Execution proceeds only after explicit user confirmation ("Go", "Proceed", "Confirmed"). Multi-step plans execute one point at a time with STOP between each point. No batching, no silent execution.

## Agentic Behavior

**Plan Mode Default**: use `EnterPlanMode` for any task with 3+ steps or architectural decisions. If execution goes off track → STOP and re-plan before continuing.

**Subagent Strategy**: keep main context window clean. Offload research, codebase exploration, and parallel analysis to subagents. One focused task per subagent.

**Verification Gate**: before marking any task complete — run integration tests, diff behavior, ask "Would a staff engineer approve this?" No green = not done.

**Lessons Capture**: after any user correction, check if the pattern is non-obvious. If so, save it as a feedback memory immediately.

## Roadmap Tracking

When work starts or completes on a roadmap item (any issue linked to a GitHub milestone), update these three locations:

**On start**: set status to `In Progress`, record start date in `.claude/initiatives/roadmap-status.md`. Update GitHub Project board start date via `gh api graphql`.

**On completion** (PR created, before merging):
1. `.claude/initiatives/roadmap-status.md` — set status to `Done`, record end date and PR number
2. `docs/reviews/roadmap-v1.9.1.md` — update the deliverable's Status column to **Done** with PR reference
3. GitHub Project board — set status to Done, update start/target dates via `gh api graphql`
4. Close the GitHub issue with implementation summary

These updates are part of the commit sequence (docs commit), not a post-merge afterthought.

## Reference Documents
- `README.md` — public-facing, must stay in sync with all template/CLI changes
- `docs/operational-guide.md` — full reference, must stay in sync
- `.claude/initiatives/roadmap-status.md` — local roadmap progress tracking
- All updated as mandatory final step after every round of changes (standing rule)

## Current Version
`v1.9.0` — alignment block (Phases 1-3). CI consolidation, ESLint+Prettier, 271 unit tests, CLAUDE.md single-authority generation, security-audit 3-path selector (NS1-NS6), perf-audit native resource checks (NR1-NR4), Node.js >=22. 481 integration checks.
