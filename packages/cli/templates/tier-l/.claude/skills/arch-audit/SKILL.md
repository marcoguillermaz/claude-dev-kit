---
name: arch-audit
description: Audit Claude Code architecture files against Anthropic docs and release notes, and verify internal ecosystem consistency. Run weekly to maintain compliance, catch new features, and keep the context system clean.
user-invocable: true
model: sonnet
context: fork
---

## Step 1 - Fetch latest Anthropic documentation

> **Parallelism**: Steps 1 and 2 have no data dependency. Launch the Step 1 research agent first (async), then begin Step 2 file reads in the main context immediately - do not wait for the agent to complete before reading local files.

Launch a single research agent **(model: haiku)** to fetch ALL of the following URLs and extract key changes:

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/slash-commands
- https://code.claude.com/docs/en/release-notes/overview
- https://github.com/anthropics/claude-code/releases (latest 5 releases)
- https://docs.anthropic.com/en/docs/about-claude/models (latest model IDs and deprecation notices)
- https://code.claude.com/docs/en/best-practices

From each Claude Code source extract: new keys/features, deprecations, breaking changes, best practice updates.
From the models page extract: current model IDs for Opus/Sonnet/Haiku, any deprecation dates announced.
From the prompting guide sources extract: principles for system prompt design, instruction clarity, context management, and what Anthropic explicitly discourages in long instruction files.

**URL resilience**: if any URL returns 404, try the canonical base `https://code.claude.com/docs/en/` to locate the current path. Note in the report if a URL changed. Do not skip a topic because one URL failed - find the current equivalent page.

**Expected current model IDs** (as of last research - verify against the models page):

- Opus: `claude-opus-4-7` (released April 16, 2026 - new tokenizer, `xhigh` effort level)
- Sonnet: `claude-sonnet-4-6`
- Haiku: `claude-haiku-4-5-20251001`
- Legacy (still available): `claude-opus-4-6`
- Deprecated: `claude-3-haiku-*` and `claude-3-5-haiku-*` (retired April 19, 2026)
- Retiring soon: `claude-sonnet-4-20250514` and `claude-opus-4-20250514` (retirement June 15, 2026)

Flag any changes to this list in the report.

## Step 2 - Read current architecture files (run in parallel with Step 1)

Read these files in parallel while the Step 1 agent runs:

- `CLAUDE.md`
- `.claude/rules/pipeline.md`
- `.claude/rules/context-review.md`
- `.claude/rules/claudemd-standards.md` ← normative baseline for P1–P5 compliance checks
- `.claude/rules/pipeline-standards.md` ← normative baseline for Step 3e pipeline compliance checks
- `.claude/settings.json`
- `.claude/files-guide.md`
- `.claude/cheatsheet.md`
- `.claude/skills/dependency-scan/SKILL.md`

## Step 3 - Anthropic compliance gap analysis

Compare Step 1 findings against Step 2 state. For each gap found, classify it:

**AUTO-FIX** - apply directly without asking:

- Deprecated keys in settings.json with a direct replacement
- New settings keys that are clearly beneficial and low-risk (token efficiency, attribution)
- Stale file paths or descriptions in files-guide.md
- New hook events or agent frontmatter fields that improve existing patterns
- Deprecated model IDs in SKILL.md files or settings.json

**RECOMMEND** - list for user review, do not apply:

- Structural changes (splitting files, new directories)
- New features requiring user decision (sandbox, auto mode, new MCP servers, effort level `xhigh`)
- Changes that could affect existing workflow behavior
- Anything touching the pipeline phase gates
- New settings keys that change execution model (`autoMode`, `sandbox.*`, `tui`, `viewMode`, `availableModels`)

Every RECOMMEND must include: (1) specific file path(s) to modify, (2) section or line reference, (3) proposed change in one sentence. A RECOMMEND without a file target is incomplete - do not emit it.

**File target map for common divergence types** - use this when classifying findings:

| Divergence area                                                           | Files to update                                                                                                       | Classification                                                                        |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Hook event name changed or deprecated                                     | `.claude/settings.json` (hook key)                                                                                    | RECOMMEND                                                                             |
| Hook JSON response schema changed (new/removed fields)                    | `.claude/settings.json` (hook prompt inline) + `.claude/rules/prompt-quality-rubric.md` (Block output format section) | RECOMMEND                                                                             |
| Hook prompt logic updated (trigger conditions, exclusions, bypass format) | `.claude/settings.json` (hook prompt inline) + `.claude/rules/prompt-quality-rubric.md` (matching section)            | RECOMMEND - both files always updated together; hook is authoritative, rubric follows |
| Deprecated model ID in hook                                               | `.claude/settings.json` (`model:` field in hook entry)                                                                | AUTO-FIX                                                                              |
| New hook event worth adding                                               | `.claude/settings.json` (new hook entry)                                                                              | RECOMMEND                                                                             |
| Pipeline phase gate wording                                               | `.claude/rules/pipeline.md`                                                                                           | RECOMMEND                                                                             |
| CLAUDE.md instruction addition                                            | `CLAUDE.md`                                                                                                           | RECOMMEND                                                                             |
| Skill model ID deprecated                                                 | `.claude/skills/<name>/SKILL.md` (`model:` frontmatter)                                                               | AUTO-FIX                                                                              |
| Skill missing `context: fork`                                             | `.claude/skills/<name>/SKILL.md` (frontmatter)                                                                        | AUTO-FIX                                                                              |
| Skill missing `allowed-tools`                                             | `.claude/skills/<name>/SKILL.md` (frontmatter)                                                                        | AUTO-FIX                                                                              |
| claudemd-standards.md outdated                                            | `.claude/rules/claudemd-standards.md` (relevant section + `Last verified` date)                                       | RECOMMEND                                                                             |
| pipeline-standards.md outdated                                            | `.claude/rules/pipeline-standards.md` (relevant section + `Last verified` date)                                       | RECOMMEND                                                                             |

## Step 3b - Internal ecosystem consistency checks

**Execution strategy - two tiers**:

- **Grep-tier** (pure pattern matching, no judgment): C2, C4, C6, C9, C10, C11, C12, C13, C14, C15, C16, C17 - batch into a **single haiku subagent** that runs all commands and returns structured pass/fail results.
- **Judgment-tier** (require file reading + interpretation): C1, C3, C5, C7, C8 - run in main context using files already read in Step 2.

**Grep-tier batch** - invoke one Agent with `model: "haiku"`, pass these exact commands, and receive one structured result:

| Check | Command                                                                                                                                                                                  | Pass condition   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| C4    | `grep -n "ln -s" .claude/rules/pipeline.md`                                                                                                                                              | 0 matches        |
| C6    | `grep -A3 "Phase 5b" .claude/rules/pipeline.md \| grep -i "dev\|server\|localhost"`                                                                                                      | ≥1 match         |
| C9    | `grep -c "\*\*\* STOP" .claude/rules/pipeline.md`                                                                                                                                        | ≥5               |
| C10   | `grep -n "Worktree isolation" .claude/rules/pipeline.md`                                                                                                                                 | ≥1 match         |
| C11   | `for skill_dir in .claude/skills/*/; do name=$(basename "$skill_dir"); grep -q "$name" .claude/cheatsheet.md && echo "OK: $name" \|\| echo "MISSING: $name"; done`                       | 0 MISSING lines  |
| C12   | `grep -o "SessionStart\|PostCompact\|InstructionsLoaded" .claude/settings.json \| sort -u`                                                                                               | 3 lines          |
| C13   | `grep -rL --include="SKILL.md" "context: fork" .claude/skills/`                                                                                                                          | 0 files returned |
| C14   | `git check-ignore -q CLAUDE.md && echo "PASS" \|\| echo "FAIL"`                                                                                                                          | PASS             |
| C15   | `wc -l CLAUDE.md \| awk '{print $1}'`                                                                                                                                                    | ≤200             |
| C16   | `grep -rn "claude-3-haiku\|claude-3-5-haiku\|claude-3-opus\|claude-3-sonnet\|claude-3-5-sonnet\|claude-sonnet-4-20250514\|claude-opus-4-20250514" .claude/skills/ .claude/settings.json` | 0 matches        |
| C17   | `for f in .claude/skills/*/SKILL.md; do if grep -q "mcp__" "$f" && ! grep -q "allowed-tools:" "$f"; then echo "MISSING allowed-tools: $f"; fi; done`                                     | 0 MISSING lines  |

Collect batch results, then run judgment-tier checks below. For each FAIL: classify as AUTO-FIX or RECOMMEND using the same criteria as Step 3.

**C1 - Deploy information currency (CLAUDE.md)**
Check: does the `## Tech Stack → Deploy` entry describe the actual deploy platform?

**C2 - Deleted file references (all skills, cheatsheet, docs)**
Expected: 0 matches. Any match = FAIL.
AUTO-FIX: replace stale references → `refactoring-backlog.md` for backlog entries; remove references to deleted files.

**C3 - files-guide.md: CLAUDE.local.md description is not live state**
Check: does the CLAUDE.local.md section in files-guide.md contain specific current content descriptions (e.g. "Phase 4/5 suspended") rather than a generic description of the file's purpose?
Expected: generic description only. Specific current content = FAIL (live state in static doc).

**C4 - settings.json ↔ pipeline.md worktree symlink alignment**
Run: `grep -n "ln -s" .claude/rules/pipeline.md`
Expected: 0 matches. Any `ln -s` = FAIL (redundant, potentially conflicting with auto-symlink).

**C5 - CLAUDE.md Worktree Known Pattern: reflects standard (not optional) usage**
Check: does the "Worktree setup" Known Pattern in CLAUDE.md describe worktrees as the **standard pattern for all functional blocks** (not just parallel development)?
Expected: language like "standard pattern for all functional blocks". Language implying optional/parallel-only = FAIL.

**C6 - Phase 5b dev server prerequisite**
Check: does Phase 5b in pipeline.md contain an explicit prerequisite to verify `[DEV_COMMAND]` is running before fixture setup?
Run: `grep -A3 "Phase 5b" .claude/rules/pipeline.md | grep -i "dev\|server\|localhost"`
Expected: at least one mention. Missing = FAIL.

**C7 - Cross-file path references (dead pointers)**
For each file path mentioned in CLAUDE.md and pipeline.md that is a docs/ or .claude/ path, verify the file exists.
Also verify directories: `docs/contracts/` and `.claude/skills/`.
Expected: all paths resolve. Any "No such file or directory" = FAIL.

**C8 - Interaction Protocol present in CLAUDE.md**
Check: does CLAUDE.md contain a `## Interaction Protocol - Plan-then-Confirm` section with execution keywords defined?
Run: `grep -n "Interaction Protocol" CLAUDE.md`
Expected: at least 1 match. Missing = FAIL.

**C9 - Pipeline STOP gate integrity**
Check: pipeline.md must contain at least 5 `*** STOP` markers (Phase 1, Phase 1.5, Phase 1.6, Phase 6, Phase 8 worktree cleanup).
Run: `grep -c "\*\*\* STOP" .claude/rules/pipeline.md`
Expected: ≥ 5. Fewer = FAIL (gate was accidentally removed).

**C10 - Worktree isolation rule present in Cross-Cutting**
Check: pipeline.md Cross-Cutting Rules must contain the "Worktree isolation (hard rule)" entry prohibiting staging merges before Phase 8.
Run: `grep -n "Worktree isolation" .claude/rules/pipeline.md`
Expected: at least 1 match. Missing = FAIL.

**C11 - Cheatsheet skill registry completeness**
Check: every directory under `.claude/skills/` must have a corresponding entry in `.claude/cheatsheet.md`.
Run: `for skill_dir in .claude/skills/*/; do name=$(basename "$skill_dir"); grep -q "$name" .claude/cheatsheet.md && echo "OK: $name" || echo "MISSING: $name"; done`
Expected: all lines show "OK". Any "MISSING" = FAIL.
AUTO-FIX: add a minimal row to the "Custom Skills" table in cheatsheet.md for any missing skill.

**C12 - settings.json hook integrity and hook type coverage**
Check: `.claude/settings.json` must contain all 3 essential hooks: `SessionStart` (audit overdue reminder), `PostCompact` (CLAUDE.local.md restore reminder), `InstructionsLoaded` (debug log).
Run: `grep -o "SessionStart\|PostCompact\|InstructionsLoaded" .claude/settings.json | sort -u`
Expected: 3 lines (SessionStart, PostCompact, InstructionsLoaded). Any missing = FAIL.
RECOMMEND if failing - do not auto-fix (hooks require verifying intent before restoring).

Additionally (judgment check in main context): verify that the hook configurations use the appropriate hook type. Claude Code supports 4 hook types - `command`, `http`, `prompt`, and `agent`. For reference:

- `command` - runs a shell command, captures stdout for injection
- `http` - calls a URL endpoint with event data as JSON body
- `prompt` - injects a text message into the conversation
- `agent` - spawns an agent to handle the hook event
  Flag any hook that uses `command` type but would benefit from `prompt` type (simpler config, no shell needed for static reminders), or vice versa.

Also flag any of the following new events from recent Claude Code releases that the project might benefit from adding:

- `WorktreeCreate` / `WorktreeRemove` - auto-setup / teardown logic when worktrees change
- `SubagentStart` / `SubagentStop` - logging or context injection for subagent calls
- `PreCompact` - save critical in-progress state before context compression
- `TaskCompleted` - post-completion summary or notification
- `FileChanged` - lint/format trigger on file write
- `PermissionDenied` - auto-mode classifier denial handling (return `retry: true` for alternative approach)
- `Elicitation` / `ElicitationResult` - MCP server user-input request interception
- `ConfigChange` - config source change detection
- `CwdChanged` - working directory change handling
  These are RECOMMEND, not AUTO-FIX.

Additionally, verify awareness of these recent Claude Code capabilities:

- `defer` value for `permissionDecision` in PreToolUse hooks (pause and resume via `--resume`)
- Hook output over 50K saved to disk with path + preview instead of context injection
- `if` field for conditional hook execution using permission rule syntax
- `once` field for single-fire hooks in skill/agent frontmatter
- `asyncRewake` field for background hooks that wake Claude on exit code 2

**C13 - context: fork on all skills**
Check: every skill SKILL.md must declare `context: fork` so audits run in an isolated context and do not pollute the main session window.
Run: `grep -rL --include="SKILL.md" "context: fork" .claude/skills/`
Expected: 0 files returned. Any returned file path = FAIL.
AUTO-FIX: insert `context: fork` after the `model: sonnet` line in any failing skill.

**C14 - CLAUDE.md is gitignored**
Check: `CLAUDE.md` must be listed in `.gitignore` (project convention: personal CLAUDE.md is never committed - exposes internal context, causes commit history pollution).
Run: `git check-ignore -q CLAUDE.md && echo "PASS" || echo "FAIL"`
Expected: "PASS" (exit 0 - file is ignored). "FAIL" = FAIL.
RECOMMEND if failing - do not auto-fix (requires user to add `CLAUDE.md` to `.gitignore` explicitly).

**C15 - CLAUDE.md line budget**
Check: CLAUDE.md must stay within 200 lines. Beyond this threshold, Anthropic's own research shows instruction adherence degrades - lower-priority rules get silently ignored (hard auto-truncation at 200 lines per Claude Code docs).
Run: `wc -l CLAUDE.md | awk '{print $1}'`
Expected: ≤ 200. Any count above 200 = WARN.
RECOMMEND if failing: invoke P1 and P5 to identify sections to remove or convert to `@import` references. Do not auto-fix - pruning requires judgment.

**C16 - Deprecated model IDs**
Check: no SKILL.md file or `.claude/settings.json` should reference model IDs from Claude 3 family (retired) or Claude 4.0 family (retiring June 15, 2026). Retired as of April 19, 2026: `claude-3-haiku-*`, `claude-3-5-haiku-*`. Also check for any `claude-3-opus-*`, `claude-3-sonnet-*`, `claude-sonnet-4-20250514`, or `claude-opus-4-20250514` references.
Run: `grep -rn "claude-3-haiku\|claude-3-5-haiku\|claude-3-opus\|claude-3-sonnet\|claude-3-5-sonnet\|claude-sonnet-4-20250514\|claude-opus-4-20250514" .claude/skills/ .claude/settings.json`
Expected: 0 matches. Any match = FAIL.
AUTO-FIX: replace deprecated model IDs with the current equivalents:

- `claude-3-haiku-*` or `claude-3-5-haiku-*` → `claude-haiku-4-5-20251001`
- `claude-3-opus-*` → `claude-opus-4-7`
- `claude-3-sonnet-*` or `claude-3-5-sonnet-*` → `claude-sonnet-4-6`
- `claude-sonnet-4-20250514` or `claude-opus-4-20250514` → respective 4.6/4.7 equivalents (retiring June 15, 2026)

**C17 - `allowed-tools` frontmatter on MCP-dependent skills**
Check: any SKILL.md that calls `mcp__*` tools in its instructions must declare those tools in `allowed-tools:` frontmatter. This ensures Claude requests the correct permissions upfront before the skill runs, preventing mid-execution permission prompts.
Run: `for f in .claude/skills/*/SKILL.md; do if grep -q "mcp__" "$f" && ! grep -q "allowed-tools:" "$f"; then echo "MISSING allowed-tools: $f"; fi; done`
Expected: 0 MISSING lines. Any match = FAIL.
AUTO-FIX: for each failing skill, read the `mcp__*` tool names from its body and add `allowed-tools: [mcp__tool1, mcp__tool2, ...]` to its frontmatter after the `context:` line.

## Step 3c - Anthropic Prompting Guide compliance

Using the prompting guide content fetched in Step 1 **and the normative baseline in `.claude/rules/claudemd-standards.md`** (read in Step 2), evaluate `CLAUDE.md`, `pipeline.md`, and `context-review.md` against best practices. The standards file is the local stable reference - use it as the primary benchmark; live-fetched docs confirm it's still current. These checks are judgment-based - classify each as PASS or WARN (not hard FAIL), and always RECOMMEND, never auto-fix.

**Standards file currency check (run first)**: compare the `Last verified` date in `.claude/rules/claudemd-standards.md` against today's date. If > 30 days old AND Step 1 fetched new material changes → flag as RECOMMEND to update the standards file. If ≤ 30 days → skip.

**P1 - CLAUDE.md content type (Anthropic's inclusion test)**
Anthropic's rule: CLAUDE.md should contain ONLY non-obvious information Claude cannot infer by reading the code. Apply Anthropic's own test to every section: _"Would removing this cause Claude to make mistakes?"_

Flag as WARN if a section:

- Describes what a file does structurally (e.g. "file X handles Y") without explaining a non-obvious constraint - Claude can read the code
- States a standard convention Claude already knows without a project-specific reason
- Contains tutorial-style explanations of concepts (React, TypeScript, SQL) that Claude understands natively
- Describes current session state or temporary phase status (this belongs in CLAUDE.local.md or MEMORY.md)

Report: list any sections that fail the test with a suggested action (remove, condense, or move to a more appropriate file).

**P2 - Instruction clarity and actionability**
Anthropic's guidance: instructions must be specific, actionable, and unambiguous. A vague rule gives Claude discretion where a concrete rule would remove ambiguity.

Flag as WARN:

- Directives with no measurable outcome ("be thorough", "be careful", "verify appropriately")
- Instructions that say "ensure X" without specifying how to verify X
- Rules with implicit scope ("update relevant files") where an explicit list would prevent errors

Report: flagged instances with suggested sharper wording.

**P3 - Structural redundancy across instruction files**
Redundancy dilutes attention. If a rule appears in both CLAUDE.md and pipeline.md with no clear canonical source, Claude may apply it inconsistently - or the longer file may suppress the shorter one.

Check: read "Known Patterns" in CLAUDE.md and "Cross-Cutting Rules" in pipeline.md side-by-side. Also check for overlap between context-review.md checks and arch-audit C1–C17.

Flag as WARN: any rule stated substantively in two files where one should be canonical.

Report: duplicates with a recommendation on which file is the correct owner.

**P4 - Pipeline complexity proportionality**
Anthropic's principle: instruction complexity should be proportional to the actual risk and value it protects against. Over-specified pipelines make Claude slower and more likely to get stuck on process rather than output.

Evaluate:

- Are there phases (or sub-phases) whose STOP gate catches errors that have actually occurred in practice? Or are they theoretical?
- Does the Fast Lane meaningfully simplify, or does it mostly duplicate the full pipeline?
- Are there context-review checks (C1–C12) that have never caught a real issue - suggesting they address a risk that doesn't materialize?
- Does the total length of pipeline.md + context-review.md stay within a range where Claude can hold the key constraints in working context?

Report: any phase or check that appears to add friction without demonstrated value → RECOMMEND for review or consolidation. Note: do NOT recommend removing STOP gates without strong evidence of zero value - gates protect against irreversible actions.

**P5 - Long context structure and scannability**
Anthropic guidance for long system prompts: critical rules should be visually distinct and easy to locate. Recency and position matter - Claude gives more weight to recent context.

Check:

- Are the most-critical, most-referenced rules (RBAC, worktree isolation, migration isolation, environment isolation) marked as CRITICAL or placed at the top of their sections?
- Is CLAUDE.md structured so Claude can find a rule without reading the entire file?
- Are there sections that are rarely referenced but consume significant token space in every context window?

Report: structural improvements for scannability → RECOMMEND.

## Step 3d - Token & subagent optimization checks

These checks audit the project's own efficiency at model selection and subagent delegation. Regressions here increase cost and latency without improving output quality. Judgment-based where noted; mechanical checks reuse the grep-tier haiku batch from Step 3b.

**T1 - Research agent model in arch-audit Step 1**
Check: does the Step 1 instruction in this SKILL.md specify `model: haiku` for the research agent?
Batch command: `grep -n "model.*haiku\|haiku.*model" .claude/skills/arch-audit/SKILL.md`
Expected: at least 1 match in the Step 1 section. Missing = FAIL.
AUTO-FIX: add `(model: haiku)` to the research agent invocation in Step 1.

**T2 - Haiku model on all Explore subagents across skills**
Check: every "Launch ... Explore subagent" instruction in all SKILL.md files must explicitly name `model: haiku`.
Batch command: `grep -rn "Explore subagent" .claude/skills/*/SKILL.md | grep -v "model.*haiku\|haiku"`
Expected: 0 matches (all invocations already name haiku). Any match = FAIL.
AUTO-FIX: append `(model: haiku)` to the invocation description in each failing line.

**T3 - Phase 5d Playwright concurrency note**
Check: does pipeline.md Phase 5d document that `/ui-audit` (static, no Playwright by default) can run concurrently with Playwright-based skills, and that `/visual-audit`, `/ux-audit`, `/responsive-audit` must run sequentially (shared MCP Playwright session)?
Batch command: `grep -A30 "Phase 5d" .claude/rules/pipeline.md | grep -i "concurrent\|parallel\|sequenti\|playwright.*conflict\|conflict.*playwright"`
Expected: at least 1 match. Missing = WARN.
RECOMMEND if failing: add a note to Phase 5d: "Run `/ui-audit` concurrently with the first Playwright skill launch. Run `/visual-audit` → `/ux-audit` → `/responsive-audit` sequentially - they share the MCP Playwright session and cannot run in parallel."

Batch commands:
Expected: ≥1 match in each file. Missing from either = FAIL.

**T5 - Skill model fitness (judgment)**
For each skill, verify `model:` frontmatter fits the task's reasoning requirement:

- `model: haiku` appropriate for: mechanical structural checks, pure grep/pattern matching, URL text extraction, formatting validation
- `model: sonnet` appropriate for: cross-file judgment, complex analysis, fix application, multi-dimension scoring
- `model: opus` appropriate for: screenshot-based visual reasoning, multi-role journey simulation, live aesthetic scoring - requires vision + deep analysis

Current expected state:
| Skill | Expected | Rationale |
|---|---|---|
| arch-audit | sonnet | Complex judgment, cross-doc analysis, AUTO-FIX application |
| ui-audit | sonnet | Design system judgment, visual compliance scoring |
| ux-audit | opus | Multi-flow simulation + live screenshot analysis - visual reasoning requires Opus |
| visual-audit | opus | 7-dimension aesthetic scoring + screenshot analysis - visual reasoning requires Opus |
| security-audit | sonnet | Exploit reasoning, authorization analysis |
| api-design | sonnet | REST pattern judgment + internal haiku Explore agent |
| perf-audit | sonnet | Bundle analysis, server/client boundary judgment + internal haiku Explore agent |
| skill-dev | sonnet | Coupling/abstraction judgment + internal haiku Explore agent |
| skill-db | opus | Deep schema normalization + RLS policy reasoning requires Opus - internal haiku Explore agent for dep scan |
| responsive-audit | opus | Multi-viewport screenshot judgment - visual reasoning requires Opus |

Batch command: `grep -A1 "^name:" .claude/skills/*/SKILL.md | grep "model:"` - compare each result against the table above.
FAIL: any skill using `model: haiku` as top-level model (only Explore _subagents within_ skills should use haiku, not the skill itself).
WARN: any skill using `model: opus` **unless** it is one of the intentional Opus skills: `visual-audit`, `ux-audit`, `responsive-audit` (screenshot-based visual reasoning) or `skill-db` (deep schema normalization + RLS policy reasoning). All other skills should use sonnet.

## Step 3e - Pipeline.md compliance check

Using `pipeline.md` (read in Step 2) and **`.claude/rules/pipeline-standards.md`** as the normative baseline, evaluate each pipeline phase and the Fast Lane against industry standards. Classify each finding as PASS or WARN (never auto-fix pipeline content - changes require user confirmation).

**Standards file currency check (run first)**: compare the `Last verified` date in `.claude/rules/pipeline-standards.md` against today's date. If > 30 days old AND Step 1 fetched material changes → flag as RECOMMEND to update the standards file.

**PE1 - Phase gates integrity (S1)**
Check: does every Phase have a verifiable STOP gate before promotion to the next phase? Phases 1, 1.5, 1.6, 6, and Phase 8 worktree cleanup must have explicit `*** STOP` markers requiring an execution keyword.
Run: `grep -c "\*\*\* STOP" .claude/rules/pipeline.md`
Pass: ≥5 stops, Phase 8 cleanup stop present.

**PE2 - Testing pyramid compliance (S2)**
Check: does pipeline.md define a phase ordering that enforces the pyramid (fast tests before slow)?
Expected order: Phase 3 (vitest unit) → Phase 3b (API integration) → Phase 4 (Playwright e2e). Any inversion = WARN.
Run: `grep -n "Phase 3\b\|Phase 3b\|Phase 4\b" .claude/rules/pipeline.md | head -10`

**PE3 - Auth boundary coverage mandatory (S2)**
Check: does Phase 3b explicitly require no-token → 401, unauthorized role → 403, valid role → 2xx for every new API route?
Run: `grep -n "401\|403\|no.token\|unauthorized role" .claude/rules/pipeline.md`
Expected: at least 3 matches in Phase 3b. Missing = WARN.

**PE4 - Type check before commit (S3)**
Run: `grep -n "TYPE_CHECK_COMMAND\|type.check\|tsc\|mypy\|pyright\|swiftc" .claude/rules/pipeline.md`
Expected: ≥1 match confirming a type-check step exists in the build phase. Missing = WARN.

**PE5 - Security checklist per API route (S3)**
Check: does Phase 2 include a security checklist covering auth check, input validation, no sensitive data in responses, access control enforcement, and row-level security on new tables?
Run: `grep -A8 "Security checklist" .claude/rules/pipeline.md | grep -c "RLS\|auth\|sensitive\|validat"`
Expected: ≥3 matches. Missing = WARN.

**PE6 - Staging-before-production (S4)**
Check: does pipeline.md prohibit direct production deploy without staging first?
Expected: ≥1 match enforcing the staging prerequisite. Missing = WARN.

**PE7 - Migration isolation (S4)**
Expected: ≥2 matches. Missing = WARN.

**PE8 - Scope gate before implementation (S1, S5)**
Check: does Phase 1 include both a Tier 1 / Tier 2 scope sweep AND an execution keyword gate before the dependency scan proceeds?
Run: `grep -n "Tier 1\|Tier 2\|execution keyword" .claude/rules/pipeline.md | head -5`
Expected: ≥2 matches in Phase 1. Missing = WARN.

**PE9 - Minimal footprint / no unrequested features (S1, S3)**
Check: does pipeline.md prohibit adding features beyond the approved plan scope?
Run: `grep -n "unrequested\|scope creep\|approved plan\|outside.*plan" .claude/rules/pipeline.md | head -5`
Expected: ≥1 match. Missing = WARN.

**PE10 - Fast Lane escalation criteria (S6)**
Check: does the Fast Lane define clear escalation conditions to the full pipeline?
Run: `grep -A5 "Escalat" .claude/rules/pipeline.md | grep -c "file\|migration\|shared\|consumer"`
Expected: ≥2 matches. Missing = WARN.

**PE11 - Documentation requirements gate (S7)**
Check: does Phase 8 require `docs/prd/prd.md` + GDoc update as a hard gate before block closure?
Run: `grep -n "PRD.*hard gate\|PRD.*mandatory\|no exceptions.*PRD\|PRD.*no exception" .claude/rules/pipeline.md`
Expected: ≥1 match. Missing = WARN.

**PE12 - Commit discipline (S8)**
Check: does pipeline.md specify the 3-commit block pattern (code → docs → context files)?
Run: `grep -n "Commit 1\|Commit 2\|Commit 3\|three-commit\|3-commit" .claude/rules/pipeline.md | head -5`
Expected: ≥2 matches. Missing = WARN.

Output results in the Step 6 report under a new section:

```
### Pipeline compliance (PE1–PE12) - judgment-based, PASS/WARN only
- PE1 Phase gates integrity: [PASS/WARN]
- PE2 Testing pyramid order: [PASS/WARN]
- PE3 Auth boundary coverage: [PASS/WARN]
- PE4 TypeScript check gate: [PASS/WARN]
- PE5 Security checklist: [PASS/WARN]
- PE6 Staging before production: [PASS/WARN]
- PE7 Migration isolation: [PASS/WARN]
- PE8 Scope gate before impl: [PASS/WARN]
- PE9 Minimal footprint: [PASS/WARN]
- PE10 Fast Lane escalation: [PASS/WARN]
- PE11 Documentation gate: [PASS/WARN]
- PE12 Commit discipline: [PASS/WARN]
```

## Step H1 - Hook compliance check

Using hook documentation fetched in Step 1 (`https://code.claude.com/docs/en/hooks`) and `settings.json` read in Step 2, verify the project's hook configuration against current Anthropic spec.

**H1a - Event name currency**
Check: every event name in `settings.json` hooks matches the current official event list.
Run: `grep -o '"SessionStart"\|"UserPromptSubmit"\|"PreToolUse"\|"PostToolUse"\|"Stop"\|"WorktreeCreate"\|"WorktreeRemove"\|"PostCompact"\|"PreCompact"\|"InstructionsLoaded"\|"Notification"\|"TaskCompleted"' .claude/settings.json | sort -u`
Pass: all events appear in the Step 1 documentation. Any unrecognized event → RECOMMEND removal or rename.

**H1b - JSON response field compliance (prompt hooks)**
For each hook with `"type": "prompt"` in settings.json: check that response fields (`ok`, `reason`, `decision`, `updatedInput`) match the documented schema.
Source: Step 1 hooks doc content.
If divergence found → RECOMMEND (never AUTO-FIX): specify both files that need updating:

- `.claude/settings.json` - the hook prompt inline text (authoritative)
- `.claude/rules/prompt-quality-rubric.md` - the "Block output format" section (documentation, follows the hook)

**H1c - Bypass mechanism visibility**
Check: every `UserPromptSubmit` hook with `type: prompt` that can return a blocking response (`ok: false`) must include bypass instructions in the `reason` field.
Fail → RECOMMEND update to add bypass instructions.

**H1d - Hook type fitness**
For each hook, verify `type` matches intent:

- `command` - shell execution, dynamic state (git, files, env)
- `prompt` - static/contextual text injection, no shell needed
- `agent` - multi-step async logic
  Flag as RECOMMEND (not AUTO-FIX) any `command` hook that only outputs static text and could be simplified to `prompt`.

**H1e - Rubric-hook drift check**
Check: `.claude/rules/prompt-quality-rubric.md` must stay in sync with the inline logic in the `UserPromptSubmit` prompt hooks in `settings.json`. Drift = the rubric documents behavior that the hook no longer implements (or vice versa).

Run these two greps and compare results:

- T3 wildcards in rubric: `grep "T3" .claude/rules/prompt-quality-rubric.md`
- T3 wildcards in hook: `grep "T3" .claude/settings.json`

Also check output format sync:

- Rubric block format: `grep -A5 "Block output format" .claude/rules/prompt-quality-rubric.md`
- Hook output format: look for the `If a trigger matches` instruction in the settings.json hook prompt

Pass: T3 wildcard lists match; rubric output format matches hook output format structure.
Fail → AUTO-FIX: update the rubric to match the hook (hook is authoritative - rubric is documentation). Update `Last updated` date in rubric.

**H1f - New events to consider**

Add results to Step 6 report under:

```
### Hook compliance (H1a–H1e)
- H1a Event name currency: [PASS/FAIL - list unknown events if any]
- H1b JSON response fields: [PASS/FAIL - list non-compliant fields if any]
- H1c Bypass visibility: [PASS/FAIL - list hooks missing bypass guidance]
- H1d Hook type fitness: [PASS/WARN - list command→prompt candidates]
- H1e Rubric-hook drift: [PASS/FAIL - list any T3 or format divergences found]
- H1f New events: [list relevant new events, or "none since last audit"]
```

## Step 4 - Apply AUTO-FIX changes

For each AUTO-FIX from Step 3, Step 3b, and Step H1: apply the change, note the file and line modified.

## Step 5 - Update timestamp

```bash
date +%s > "$CLAUDE_PROJECT_DIR/.claude/session/last-arch-audit"
```

## Step 6 - Produce audit report

Generate the report using the template in `${CLAUDE_SKILL_DIR}/REPORT.md`. Include all check results from Steps 3, 3b, 3c, 3d, 3e, and H1.
