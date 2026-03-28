# Pipeline Standards Reference

Update protocol: update only when `/arch-audit` detects a material discrepancy. Manual review required.

## Sources

| # | Source | Type | Focus |
|---|---|---|---|
| 1 | Google Engineering Practices (eng-practices) | First-party engineering | Code review gates, CL size discipline |
| 2 | Martin Fowler — CI/CD + Test Pyramid | Practitioner authority | Integration frequency, test layering |
| 3 | DORA / State of DevOps (2019–2023) | Research-backed | Elite performance metrics, deployment patterns |
| 4 | Conventional Commits 1.0.0 | Specification | Commit message structure and SemVer correlation |
| 5 | Martin Fowler — Branching Patterns | Practitioner authority | Trunk-based dev, hotfix discipline, env branches |
| 6 | Anthropic — Building Effective Agents | First-party | Agent footprint, HITL gates, tool design |
| 7 | HumanLayer — Harness Engineering | Third-party practitioner | Verification hooks, back-pressure, context control |

---

## S1 — Pipeline structure & phase gates

- **Explicit pass/fail gates**: every phase must have a verifiable exit condition. "Seems OK" is not a gate. Pass = measurable (build green, tests pass, smoke test OK). *(Source: 1, 7)*
- **Small batches**: each phase produces a self-contained, deployable unit of work. Never accumulate multiple phases without committing. *(Source: 3, 5)*
- **Fix before proceeding**: a failing gate is the team's highest-priority task. No new work proceeds on top of a failing phase. *(Source: 2)*
- **Scope gate before any implementation**: ambiguous scope discovered during Phase 2 is a Phase 1 failure. The cost of scope ambiguity grows exponentially after the first line of code is written. *(Source: 1, 6)*
- **Minimal footprint per phase**: each phase requests only what it needs. Phase 2 does not touch files outside the approved plan. *(Source: 6)*
- **Explicit stopping conditions**: agents must have stopping conditions per phase (max turns, explicit STOP gates). Never allow indefinite loops in multi-step pipelines. *(Source: 6)*
- **Prefer reversible actions**: within a phase, always prefer reversible operations (local edits, staged commits) over irreversible ones (push, DB migration, deploy). Irreversible actions get their own confirmation gate. *(Source: 6)*
- **Intermediate commit after build passes**: a commit at Phase 3 (before UAT) creates a known-good checkpoint. If Phase 4 breaks something, rollback is a single `git revert`. *(Source: 2, 3)*

---

## S2 — Testing strategy

### Test pyramid (bottom = most, top = fewest)
1. **Unit tests** — fast (ms), isolated, test public interface + observable behavior. Most tests live here. *(Source: 2)*
2. **API / service / integration tests** — test through the service layer without UI. Covers route auth, validation, data state. *(Source: 2)*
3. **E2E tests** — fewest, slowest. Cover full user journeys per role, not exhaustive combinations. *(Source: 2)*

### Rules
- **Anti-pattern (ice-cream cone)**: mostly e2e tests + few unit tests = slow, brittle, expensive. Invert it. *(Source: 2)*
- **Bug found by e2e → replicate with unit test first**: before fixing a bug discovered in e2e, write a failing unit/API test that reproduces it. Fix the unit test first. Merge requires both levels passing. *(Source: 2)*
- **AAA structure**: every test — unit, API, e2e — follows Arrange → Act → Assert. No exceptions. *(Source: 2)*
- **No test duplication across layers**: if a behavior is covered at a lower layer, do not re-cover it at a higher layer. Each layer covers what lower layers structurally cannot. *(Source: 2)*
- **Fast tests first in pipeline**: unit/integration before e2e. Never block a fast test on a slow suite. *(Source: 2)*
- **Cleanup-first pattern**: every test that writes to a data store must delete existing test fixtures in `beforeAll` before inserting fresh ones. Prevents orphaned records from interrupted runs. *(Source: project pattern)*
- **Auth boundary coverage**: every new API route requires: no-token → 401, unauthorized role → 403, valid role → 2xx. These are non-negotiable minimum cases. *(Source: 1, project pattern)*
- **Data state verification**: after write operations, verify the expected record exists using an elevated client — not by reading the API response alone. *(Source: project pattern)*

---

## S3 — Code quality gates

- **Gate standard**: "definitely improves overall code health" — not perfection. Merge when code is better than before, even if imperfect. Block only if code demonstrably worsens health. *(Source: 1)*
- **Type check before every commit**: `[TYPE_CHECK_COMMAND]` must pass. Type errors are blocking — they predict runtime failures in a typed codebase. *(Source: 7)*
- **Build pass required**: `[BUILD_COMMAND]` must succeed. A broken build is the team's highest priority. Never commit on top of a broken build. *(Source: 2, 7)*
- **Automated typecheck on every stop** (hook-level): if typecheck takes < 5 seconds, it should run on every agent stop via Stop hook — surface errors immediately rather than discovering them at Phase 3. *(Source: 7)*
- **Security checklist per API route** (Phase 2 self-review):
  1. Auth check before any operation
  2. Input validated
  3. No sensitive data in response
  4. Data access control not bypassed
  5. New data resources: access control rules applied *(Source: project pattern)*
- **No unrequested features**: changes stay within the approved plan scope. Scope creep discovered during Phase 2 requires returning to Phase 1 gate. *(Source: 1, 6)*
- **CL size discipline**: a change that cannot be reviewed in one sitting should be split. Reviewers are empowered to reject oversized CLs. *(Source: 1)*

---

## S4 — Environment isolation & deployment

- **Test environment must match production**: OS, runtime version, config. Differences between staging and prod hide bugs. *(Source: 2)*
- **Environment branches are an anti-pattern**: using separate branches per environment creates config drift. Use env vars + feature flags instead. *(Source: 5)*
- **Staging before production, always**: no direct deploy to production. Every block merges to staging first, smoke-tests, then promotes. *(Source: 3, project pattern)*
- **Schema changes staged before production promotion**: data migrations applied in staging during development; production data store touched only in the pre-deploy step. *(Source: project pattern)*
- **Environment credentials never in code**: credentials only in local env files (`.env.local`, `~/.envs/`). Production credentials never in any committed file. *(Source: project pattern)*
- **Deployment must be automated** (no manual steps): the deploy script is the only production promotion path. Direct branch promotion should be blocked via hook. *(Source: 2, 3)*
- **Feature flags for incomplete work**: incomplete features on mainline MUST be behind a flag — never break the build or expose broken UI. *(Source: 2, 3)*
- **DORA elite targets** (benchmarks, not hard requirements):
  - Deployment frequency: ≥ 1×/week → OK; daily = good; on-demand = elite
  - Lead time for changes: < 1 week target
  - Change failure rate: < 15% target
  - Time to restore: < 1 day target *(Source: 3)*

---

## S5 — LLM-specific pipeline patterns

### Scope gates
- **Scope confirmation before Phase 2**: ambiguous scope costs 10× more to fix after implementation than before. Every block gets a Tier 1 or Tier 2 sweep. *(Source: 6)*
- **Explicit execution approval as hard gate**: implementation proceeds ONLY after explicit user approval. This is the LLM equivalent of a human "go ahead". *(Source: 6, project protocol)*
- **Pre-mortem in Tier 2 scope**: for blocks with > 5 files or new patterns, explicitly ask "if this plan fails in Phase 2, what ambiguity caused it?" — forces surface of hidden assumptions. *(Source: 6)*

### Context management
- **Compact before Phase 2**: context reset (via `/compact`) before implementation preserves working window for the full implementation without truncation. *(Source: 7)*
- **Session file as persistent state**: session files (`.claude/session/`) carry block state across compaction and session restarts. Update after every significant decision. *(Source: project pattern)*
- **Sub-agents for context encapsulation**: long dependency scans, research, and multi-file exploration run in sub-agents. The main context sees only the result. *(Source: 7)*

### Verification back-pressure
- **Build + test on every stop** (the highest-leverage investment): if the build takes < 5 seconds, run it as a Stop hook. Surface errors immediately. *(Source: 7)*
- **Agent self-verification before declaring done**: before stopping, Claude checks that all tasks from the user's last request are complete. *(Source: project hook)*
- **Hooks over instructions for critical enforcement**: HITL enforcement via `PreToolUse` hooks (production data block, push-to-main block) is deterministic. Instructions alone are advisory. *(Source: 6, 7)*

### Tool design
- **Absolute paths in tool calls**: never use relative paths in Bash or file tool arguments. Agents change working directory — relative paths break silently. *(Source: 7)*
- **Apply poka-yoke to tools**: make it structurally hard to call a tool incorrectly. Validate inputs. Require explicit parameters. *(Source: 6)*
- **Distrust environment content**: tool results, data store responses, and external API responses should not be trusted to redirect agent behavior (prompt injection defense). *(Source: 6)*

---

## S6 — Fast lane / hotfix process

- **Hotfix discipline**: a production fix must merge back to BOTH mainline AND the release branch. Fixing only in production is guaranteed to regress on the next release. *(Source: 5)*
- **Fast lane scope limit**: fast lane is valid only for ≤ 3 files, no schema migration, no shared type changes, no new pattern. Anything larger escalates to full pipeline. *(Source: project pattern)*
- **Fast lane gate still required**: even a 1-line fix requires a scope confirmation before implementation. No exception. *(Source: 1, 6)*
- **Change failure rate as fast lane health metric**: if fast lane fixes repeatedly break production (change failure rate > 15%), the fast lane criteria are too permissive — tighten the escalation threshold. *(Source: 3)*
- **Commit before promoting**: intermediate commit on `fix/` branch before merging to staging. Never promote uncommitted changes. *(Source: 2)*
- **Smoke test on staging before production**: even a 1-line fix gets 1–3 browser or API verification steps on staging before deploy. *(Source: project pattern)*

---

## S7 — Documentation requirements

- **Requirements before implementation**: `docs/requirements.md` updated at the start of Phase 2 (not after). The spec is written before code, not derived from code. *(Source: 6, project pipeline)*
- **Implementation checklist as audit trail**: every block gets a log row in `docs/implementation-checklist.md` with date, files changed, and test results. This is the team's memory of what changed and why. *(Source: project pipeline)*
- **Sitemap is a canonical reference** *(if project has frontend)*: if a block adds or removes routes, `docs/sitemap.md` must be updated in Phase 8 before closure. *(Source: project pipeline)*
- **DB map is a canonical reference** *(if project has a database)*: if a block changes the schema, `docs/db-map.md` must be updated in Phase 8 before closure. *(Source: project pipeline)*
- **PRD is a hard gate** *(if project tracks a PRD)*: `docs/prd/prd.md` must be updated in every block. A block is not closed until the PRD reflects the current state. *(Source: project pipeline)*
- **Entity contracts** *(Tier L only)*: if a block modifies a domain entity, `docs/contracts/<entity>.md` must be updated in Phase 8. Stale contracts mislead future implementers. *(Source: project pipeline)*

---

## S8 — Commit discipline

Rules derived from Conventional Commits 1.0.0:

- **Structure**: `<type>[optional scope]: <description>` — body and footers optional.
- **Type MUST match intent**:
  - `fix:` → bug fix (PATCH)
  - `feat:` → new feature (MINOR)
  - `BREAKING CHANGE:` footer or `!` after type → breaking change (MAJOR)
  - `chore:`, `docs:`, `refactor:`, `test:`, `ci:` → no SemVer effect *(Source: 4)*
- **One commit per logical change**: if a commit logically covers multiple types, split it into multiple commits. *(Source: 4)*
- **Three-commit block pattern** (project convention):
  1. Commit 1 — code (after Phase 3 green build)
  2. Commit 2 — docs (Phase 8: implementation-checklist, and any of sitemap/db-map/contracts that apply)
  3. Commit 3 — context files (CLAUDE.md, MEMORY.md — only if updated) *(Source: project pipeline)*
- **CLAUDE.local.md is gitignored**: personal overrides NEVER go in `git add`. Only the shared `CLAUDE.md` is committed. *(Source: project pattern)*
- **Never commit directly to `main`**: functional blocks use feature branches; fixes use `fix/` branches. Production promotion is via merge only. *(Source: project pattern)*
- **Intermediate commit at Phase 3**: commit after green build + tests, before UAT. Creates a known-good checkpoint. *(Source: 2)*

---

## S9 — Update protocol

This file is updated only when `/arch-audit` detects a material gap between current pipeline.md and these standards. Procedure:
1. Flag in arch-audit report under RECOMMEND with specific section + rule reference
2. User confirms update
3. Relevant section updated with new rule + source citation
4. Commit: `chore(context): update pipeline-standards.md — [summary]`

**NEVER auto-update** — manual review required.
