---
name: arch-audit
description: Audit the Claude Code architecture files against latest Anthropic documentation and release notes, AND verify internal ecosystem consistency. Run weekly to maintain compliance, catch new features, and keep the project's context system clean and efficient.
user-invocable: true
model: sonnet
context: fork
effort: high
---

You are performing a weekly architecture compliance audit for this project's Claude Code governance setup.

Execute all steps below in order.

---

## Configuration (fill in before first run)

> Replace these placeholders with the real paths for this project:
> - `[MEMORY_PATH]` — path to the project's auto-memory file, e.g. `~/.claude/projects/-Users-yourname-Projects-yourproject/memory/MEMORY.md`
> - `[LAST_AUDIT_PATH]` — path to store the last-audit timestamp, e.g. `~/.claude/projects/-Users-yourname-Projects-yourproject/last-audit`

---

## Step 1 — Fetch latest Anthropic documentation

> **Parallelism**: Steps 1 and 2 have no data dependency. Launch the Step 1 research agent first (async), then begin Step 2 file reads in the main context immediately — do not wait for the agent to complete before reading local files.

Launch a single research agent **(model: haiku)** to fetch ALL of the following URLs and extract key changes:

- https://docs.anthropic.com/en/docs/claude-code/memory
- https://docs.anthropic.com/en/docs/claude-code/settings
- https://docs.anthropic.com/en/docs/claude-code/hooks
- https://docs.anthropic.com/en/docs/claude-code/mcp
- https://docs.anthropic.com/en/docs/claude-code/sub-agents
- https://docs.anthropic.com/en/docs/claude-code/slash-commands
- https://docs.anthropic.com/en/docs/claude-code/changelog
- https://github.com/anthropics/claude-code/releases (latest 5 releases)
- https://docs.anthropic.com/en/docs/claude-code/best-practices
- https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/slash-commands
- https://code.claude.com/docs/en/release-notes/overview
- https://docs.anthropic.com/en/docs/about-claude/models

From Claude Code sources extract: new keys/features, deprecations, breaking changes, best practice updates.
From the prompting guide extract: principles for system prompt design, instruction clarity, context management, and what Anthropic explicitly discourages in long instruction files.

**URL resilience**: if any URL returns 404, try the canonical base `https://code.claude.com/docs/en/` or `https://docs.anthropic.com/en/docs/claude-code/` to locate the current path. Note in the report if a URL changed. Do not skip a topic because one URL failed — find the current equivalent page.

**Expected current model IDs** (as of last research — verify against the models page):
- Opus: `claude-opus-4-6`
- Sonnet: `claude-sonnet-4-6`
- Haiku: `claude-haiku-4-5-20251001`
- Deprecated: `claude-3-haiku-*` and `claude-3-5-haiku-*` (deprecation: April 19, 2026)
Flag any changes to this list in the report.

---

## Step 2 — Read current governance files (run in parallel with Step 1)

Read these files in parallel while the Step 1 agent runs:
- `CLAUDE.md`
- `.claude/rules/pipeline.md` (if present)
- `.claude/rules/context-review.md` (if present)
- `.claude/settings.json` (if present)
- `.claude/files-guide.md` (if present)
- `[MEMORY_PATH]`
- All `.claude/skills/*/SKILL.md` files (if `.claude/skills/` exists)
- `.claude/rules/claudemd-standards.md` (if present) — normative baseline for P1–P5 compliance checks
- `.claude/rules/pipeline-standards.md` (if present) — normative baseline for Step 3e pipeline compliance checks
- `.claude/cheatsheet.md` (if present)
- `.claude/agents/dependency-scanner.md` (if present)

---

## Step 3 — Anthropic compliance gap analysis

Compare Step 1 findings against Step 2 state. Classify each gap:

**AUTO-FIX** — apply directly without asking:
- Deprecated keys in `settings.json` with a direct replacement
- New settings keys that are clearly beneficial and low-risk (token efficiency, attribution)
- Stale file paths or descriptions in `files-guide.md`
- New hook events or agent frontmatter fields that improve existing patterns

**RECOMMEND** — list for user review, do not apply:
- Structural changes (splitting files, new directories)
- New features requiring a user decision (sandbox mode, new MCP servers)
- Changes that could affect existing pipeline phase gates
- Anything that changes observable Claude behaviour

**File target map for common divergence types** — use this when classifying findings:

| Divergence area | Files to update | Classification |
|---|---|---|
| Hook event name changed or deprecated | `.claude/settings.json` (hook key) | RECOMMEND |
| New hook event worth adding | `.claude/settings.json` (new hook entry) | RECOMMEND |
| Pipeline phase gate wording | `.claude/rules/pipeline.md` | RECOMMEND |
| CLAUDE.md instruction addition | `CLAUDE.md` | RECOMMEND |
| Skill model ID deprecated | `.claude/skills/<name>/SKILL.md` (`model:` frontmatter) | AUTO-FIX |
| Skill missing `context: fork` | `.claude/skills/<name>/SKILL.md` (frontmatter) | AUTO-FIX |
| Skill missing `allowed-tools` | `.claude/skills/<name>/SKILL.md` (frontmatter) | AUTO-FIX |

Every RECOMMEND must include: (1) specific file path(s) to modify, (2) section or line reference, (3) proposed change in one sentence. A RECOMMEND without a file target is incomplete — do not emit it.

---

## Step 3b — Internal ecosystem consistency checks

**Execution strategy — two tiers**:
- **Grep-tier** (pure pattern matching, no judgment): C2, C4, C6, C9, C10, C11, C12, C13, C14, C15, C16, C17 — batch into a **single haiku subagent** that runs all commands and returns structured pass/fail results.
- **Judgment-tier** (require file reading + interpretation): C1, C3, C5, C7, C8 — run in main context using files already read in Step 2.

**Grep-tier batch** — invoke one Agent with `model: "haiku"`, pass these exact commands, and receive one structured result:

| Check | Command | Pass condition |
|---|---|---|
| C2 | `grep -rn "backlog-refinement" .claude/skills/ .claude/cheatsheet.md 2>/dev/null` | 0 matches |
| C4 | `grep -n "ln -s" .claude/rules/pipeline.md 2>/dev/null` | 0 matches |
| C6 | `grep -A3 "Phase 5b" .claude/rules/pipeline.md \| grep -i "dev\|server\|localhost" 2>/dev/null` | ≥1 match |
| C9 | `grep -c "\*\*\* STOP" .claude/rules/pipeline.md` | ≥5 |
| C10 | `grep -n "Worktree isolation\|isolation.*hard rule\|hard rule.*isolation" .claude/rules/pipeline.md 2>/dev/null` | ≥1 match |
| C11 | `for skill_dir in .claude/skills/*/; do name=$(basename "$skill_dir"); grep -q "$name" .claude/cheatsheet.md && echo "OK: $name" \|\| echo "MISSING: $name"; done 2>/dev/null` | 0 MISSING lines |
| C12 | `grep -o "SessionStart\|PostCompact\|InstructionsLoaded" .claude/settings.json \| sort -u` | 3 lines |
| C13 | `grep -rL --include="SKILL.md" "context: fork" .claude/skills/` | 0 files returned |
| C14 | `git check-ignore -q CLAUDE.md && echo "PASS" \|\| echo "FAIL"` | PASS |
| C15 | `wc -l CLAUDE.md \| awk '{print $1}'` | ≤200 |
| C16 | `grep -rn "claude-3-haiku\|claude-3-5-haiku\|claude-3-opus\|claude-3-sonnet\|claude-3-5-sonnet" .claude/skills/ .claude/settings.json 2>/dev/null` | 0 matches |
| C17 | `for f in .claude/skills/*/SKILL.md; do if grep -q "mcp__" "$f" && ! grep -q "allowed-tools:" "$f"; then echo "MISSING allowed-tools: $f"; fi; done` | 0 MISSING lines |

Collect batch results, then run judgment-tier checks below. For each FAIL: classify as AUTO-FIX or RECOMMEND using the criteria from Step 3.

**C1 — Deploy information currency (CLAUDE.md)**
Check: does the `## Tech Stack → Deploy` entry describe the actual deploy platform and its current configuration?
Expected: accurate, current description. Stale or placeholder text = FAIL.
RECOMMEND if failing.

**C2 — Skill output file references (all skills + cheatsheet)**
Check: no skill SKILL.md or cheatsheet.md must reference `docs/backlog-refinement.md` — the correct output path for all audit findings is `docs/refactoring-backlog.md`.
Run: `grep -rn "backlog-refinement" .claude/skills/ .claude/cheatsheet.md 2>/dev/null`
AUTO-FIX: replace every `backlog-refinement.md` → `refactoring-backlog.md` occurrence in all matching files.

**C3 — files-guide.md: no live state**
Check: does the `files-guide.md` CLAUDE.local.md section contain specific current content descriptions rather than a generic description of the file's purpose?
Expected: generic description only. Specific current content = FAIL (live state in static doc).
RECOMMEND if failing: remove the live content description, replace with generic "purpose" description.

**C4 — settings.json ↔ pipeline.md symlink alignment**
Run: `grep -n "ln -s" .claude/rules/pipeline.md 2>/dev/null`
Expected: 0 matches. Any `ln -s` = FAIL (redundant if worktrees use auto-symlink).
RECOMMEND if failing.

**C5 — CLAUDE.md Interaction Protocol present**
Check: does `CLAUDE.md` contain a `## Interaction Protocol` section with execution keywords defined?
Expected: ≥1 match. Missing = FAIL.
RECOMMEND if failing.

**C6 — Phase 5b dev server prerequisite**
Check: does Phase 5b in pipeline.md contain an explicit prerequisite to verify the dev server is running before proceeding to smoke test and quality audit?
Run: `grep -A3 "Phase 5b" .claude/rules/pipeline.md | grep -i "dev\|server\|localhost"`
Expected: at least one mention. Missing = FAIL.
RECOMMEND if failing.

**C7 — Cross-file path references (dead pointers)**
For each file path mentioned in CLAUDE.md and pipeline.md that is a `docs/` or `.claude/` path, verify the file exists.
Run: check each referenced path with `test -f <path> && echo "OK" || echo "MISSING: <path>"`.
Expected: all paths resolve. Any "MISSING" = FAIL.
RECOMMEND if failing: remove or update the stale reference.

**C8 — CLAUDE.md line budget**
Check: `CLAUDE.md` must stay within 200 lines.
Run: `wc -l CLAUDE.md | awk '{print $1}'`
Expected: ≤ 200. Any count above 200 = WARN.
RECOMMEND if failing: identify sections to remove or convert to `@import` references. Do not auto-fix — pruning requires judgment.

**C9 — Pipeline STOP gate integrity**
Check: `pipeline.md` must contain at least 5 `*** STOP` markers.
Expected: ≥ 5. Fewer = FAIL (gate was accidentally removed).
RECOMMEND if failing.

**C10 — Worktree isolation rule present**
Check: `pipeline.md` Cross-Cutting Rules must contain a rule prohibiting staging merges before the designated promotion phase.
Run: `grep -n "Worktree isolation\|isolation.*hard rule\|staging.*prohibited\|never.*staging.*before" .claude/rules/pipeline.md 2>/dev/null`
Expected: at least 1 match. Missing = FAIL.
RECOMMEND if failing.

**C11 — Cheatsheet skill registry completeness**
Check: every directory under `.claude/skills/` must have a corresponding entry in `.claude/cheatsheet.md` (if cheatsheet exists).
Run: `for skill_dir in .claude/skills/*/; do name=$(basename "$skill_dir"); grep -q "$name" .claude/cheatsheet.md && echo "OK: $name" || echo "MISSING: $name"; done 2>/dev/null`
Expected: all lines show "OK". Any "MISSING" = FAIL.
AUTO-FIX: add a minimal row to the "Custom Skills" table in cheatsheet.md for any missing skill.
Skip this check if `.claude/cheatsheet.md` does not exist.

**C12 — settings.json hook integrity**
Check: `.claude/settings.json` must contain all 3 essential hooks: `SessionStart` (audit reminder), `PostCompact` (CLAUDE.local.md restore reminder), `InstructionsLoaded` (debug log).
Run: `grep -o "SessionStart\|PostCompact\|InstructionsLoaded" .claude/settings.json | sort -u`
Expected: 3 lines. Any missing = FAIL.
Additionally (judgment check): verify hook configurations use the appropriate hook type (`command`, `prompt`, or `agent`). Flag any `command` hook that only outputs static text and could be simplified to `prompt` type.
RECOMMEND if failing.

**C13 — context: fork on all skills**
Check: every `.claude/skills/*/SKILL.md` must declare `context: fork`.
Run: `grep -rL --include="SKILL.md" "context: fork" .claude/skills/`
Expected: 0 files returned. Any returned path = FAIL.
AUTO-FIX: insert `context: fork` after the `model:` line in any failing skill.

**C14 — CLAUDE.md is gitignored**
Run: `git check-ignore -q CLAUDE.md && echo "PASS" || echo "FAIL"`
Expected: "PASS". "FAIL" = FAIL.
RECOMMEND if failing — requires user to add `CLAUDE.md` to `.gitignore`.

**C15 — CLAUDE.md line budget** (batch confirms count, judgment check here)
If batch returned > 200: RECOMMEND invoking P1 and P5 to identify sections to remove or convert to `@import` references. Do not auto-fix — pruning requires judgment.

**C16 — Deprecated model IDs**
Check: no SKILL.md or `.claude/settings.json` should reference deprecated Claude 3 model IDs.
Expected: 0 matches.
AUTO-FIX: replace deprecated IDs with current equivalents:
- `claude-3-haiku-*` or `claude-3-5-haiku-*` → `claude-haiku-4-5-20251001`
- `claude-3-opus-*` → `claude-opus-4-6`
- `claude-3-sonnet-*` or `claude-3-5-sonnet-*` → `claude-sonnet-4-6`

**C17 — `allowed-tools` frontmatter on MCP-dependent skills**
Check: any SKILL.md that calls `mcp__*` tools in its instructions must declare those tools in `allowed-tools:` frontmatter.
Expected: 0 MISSING lines.
AUTO-FIX: for each failing skill, read the `mcp__*` tool names from its body and add `allowed-tools: [mcp__tool1, mcp__tool2, ...]` to its frontmatter.

---

## Step 3c — Anthropic Prompting Guide compliance

Using the prompting guide content fetched in Step 1 **and the normative baseline in `.claude/rules/claudemd-standards.md`** (read in Step 2, if present), evaluate `CLAUDE.md`, `pipeline.md`, and `context-review.md` against Anthropic's published best practices. These checks are judgment-based — classify each as PASS or WARN (not hard FAIL). Always RECOMMEND, never auto-fix.

**Standards file currency check (run first)**: compare the `Last verified` date in `.claude/rules/claudemd-standards.md` against today's date. If > 30 days old AND Step 1 fetched new material changes → flag as RECOMMEND to update the standards file. If ≤ 30 days → skip. If the file doesn't exist → skip this check.

**P1 — CLAUDE.md content type (Anthropic's inclusion test)**
Anthropic's rule: CLAUDE.md should contain ONLY non-obvious information Claude cannot infer by reading the code. Apply Anthropic's own test to every section: *"Would removing this cause Claude to make mistakes?"*

Flag as WARN if a section:
- Describes what a file does structurally without explaining a non-obvious constraint
- States a standard convention Claude already knows without a project-specific reason
- Contains tutorial-style explanations Claude understands natively
- Describes current session state or temporary phase status (belongs in CLAUDE.local.md or MEMORY.md)

**P2 — Instruction clarity and actionability**
Flag as WARN: directives with no measurable outcome ("be thorough", "be careful"), instructions that say "ensure X" without specifying how to verify X, rules with implicit scope where an explicit list would prevent errors.

**P3 — Structural redundancy across instruction files**
Flag as WARN: any rule stated substantively in two files (e.g. CLAUDE.md and pipeline.md) where one should be canonical. Redundancy dilutes attention and causes inconsistent application.

**P4 — Pipeline complexity proportionality**
Anthropic's principle: instruction complexity should be proportional to the actual risk and value it protects against. Flag as WARN: phases or STOP gates that appear to add friction without demonstrated value. Note: do NOT recommend removing STOP gates without strong evidence of zero value — gates protect against irreversible actions.

**P5 — Long context structure and scannability**
Flag as WARN: critical rules not visually distinct or easy to locate, sections rarely referenced but consuming significant token space in every context window, structural improvements that would help Claude find a rule without reading the full file.

---

## Step 3d — Token & subagent optimization

**T1 — Research agent model in this skill's Step 1**
Check: does Step 1 above specify `model: haiku` for the research agent?
Expected: yes. Missing = FAIL.
AUTO-FIX: add `(model: haiku)` to the Step 1 agent invocation if missing.

**T2 — Haiku model on all Explore subagents across skills**
Check: every "Launch ... Explore subagent" instruction in all SKILL.md files must explicitly name `model: haiku`. Skip if `.claude/skills/` does not exist.
Run: `grep -rn "Explore subagent" .claude/skills/*/SKILL.md | grep -v "model.*haiku\|haiku"`
Expected: 0 matches. Any match = FAIL.
AUTO-FIX: append `(model: haiku)` to each failing line.

**T3 — Phase 5d Playwright concurrency note**
Check: does `pipeline.md` Phase 5d document that static skills (e.g. `/ui-audit`) can run concurrently with Playwright-based skills, and that Playwright-based skills must run sequentially (shared MCP Playwright session)?
Batch command: `grep -A30 "Phase 5d" .claude/rules/pipeline.md | grep -i "concurrent\|parallel\|sequenti\|playwright"`
Expected: at least 1 match. Missing = WARN.
RECOMMEND if failing: add a note to Phase 5d documenting the Playwright session sharing constraint.

**T4 — shadcn/design system MCP in CLAUDE.md and cheatsheet** *(conditional)*
Skip this check if the project does not use a component library MCP.
Check: if `mcp__shadcn__*` tools appear in any SKILL.md or settings.json, verify CLAUDE.md and `.claude/cheatsheet.md` document the MCP and its key commands.
Expected: documented. Missing = WARN.
RECOMMEND if failing.

**T5 — Skill model fitness**
Check: every skill's `model:` frontmatter fits the task's reasoning requirement. Skip if `.claude/skills/` does not exist.

Expected model assignments:
| Skill | Expected model | Rationale |
|---|---|---|
| arch-audit | sonnet | Complex judgment, cross-doc analysis, AUTO-FIX application |
| ui-audit | sonnet | Design system judgment, visual compliance scoring |
| ux-audit | opus | Multi-flow simulation + screenshot analysis — visual reasoning requires Opus |
| visual-audit | opus | Multi-dimension aesthetic scoring + screenshot analysis — visual reasoning requires Opus |
| responsive-audit | opus | Multi-viewport screenshot judgment — visual reasoning requires Opus |
| security-audit | sonnet | Exploit reasoning, authorization analysis |
| api-design | sonnet | REST pattern judgment + internal haiku Explore agent |
| perf-audit | sonnet | Bundle analysis, boundary judgment + internal haiku Explore agent |
| skill-dev | sonnet | Coupling/abstraction judgment + internal haiku Explore agent |
| skill-db | sonnet | Schema normalization + RLS reasoning + internal haiku Explore agent |
| commit | haiku | Mechanical type classification, no judgment required |

Run: `grep -A1 "^name:" .claude/skills/*/SKILL.md | grep "model:"` — compare each result against the table above.
FAIL: any skill using `model: haiku` as top-level model (internal Explore subagents within skills use haiku, not the skill itself — except `commit` which is mechanical).
WARN: any skill using `model: opus` that is not one of the three visual skills (`visual-audit`, `ux-audit`, `responsive-audit`).

---

## Step 3e — Pipeline compliance check

Using `pipeline.md` (read in Step 2) and **`.claude/rules/pipeline-standards.md`** (if present) as the normative baseline, evaluate each pipeline phase against process standards. Classify each finding as PASS or WARN (never auto-fix pipeline content — changes require user confirmation).

**Standards file currency check**: compare the `Last verified` date in `.claude/rules/pipeline-standards.md` against today's date. If > 30 days old AND Step 1 fetched material changes → flag as RECOMMEND to update the standards file. Skip if file doesn't exist.

**PE1 — Phase gates integrity**
Check: does every Phase have a verifiable STOP gate before promotion to the next phase?
Run: `grep -c "\*\*\* STOP" .claude/rules/pipeline.md`
Pass: ≥5 stops present.

**PE2 — Testing pyramid compliance**
Check: does pipeline.md define a phase ordering that enforces unit → integration → E2E order?
Run: `grep -n "Phase 3\b\|Phase 3b\|Phase 4\b" .claude/rules/pipeline.md | head -10`
Expected: Phase 3 (unit) appears before Phase 3b (integration) before Phase 4 (E2E). Any inversion = WARN.

**PE3 — Auth boundary coverage mandatory**
Check: does Phase 3b explicitly require testing no-token → 401, unauthorized role → 403, valid role → 2xx for every new API route?
Run: `grep -n "401\|403\|no.token\|unauthorized" .claude/rules/pipeline.md`
Expected: at least 2 matches in Phase 3b section. Missing = WARN.

**PE4 — Type check before commit**
Check: does Phase 3 require a type check command before committing?
Run: `grep -n "TYPE_CHECK_COMMAND\|tsc\|type.check" .claude/rules/pipeline.md | head -5`
Expected: ≥1 match. Missing = WARN.

**PE5 — Security checklist per API route**
Check: does Phase 2 include a security checklist for every new/modified API route?
Run: `grep -A8 "Security checklist\|security.*checklist" .claude/rules/pipeline.md | grep -c "auth\|validation\|Zod\|RLS\|sensitive"`
Expected: ≥2 matches. Missing = WARN.

**PE6 — Staging-before-production**
Check: does pipeline.md prohibit direct production deploy without staging first?
Run: `grep -n "staging\|staging.*first\|production.*after" .claude/rules/pipeline.md | head -5`
Expected: ≥1 match enforcing the staging prerequisite. Missing = WARN.

**PE7 — Migration isolation**
Check: does pipeline.md document that migrations are applied to staging before production?
Run: `grep -n "migration\|staging.*migration\|migration.*staging" .claude/rules/pipeline.md | head -5`
Expected: ≥1 match. Missing = WARN.

**PE8 — Scope gate before implementation**
Check: does Phase 1 include a scope sweep AND an execution keyword gate before implementation starts?
Run: `grep -n "Tier 1\|Tier 2\|execution keyword\|STOP" .claude/rules/pipeline.md | head -5`
Expected: ≥2 matches in Phase 1. Missing = WARN.

**PE9 — Minimal footprint / no unrequested features**
Check: does pipeline.md prohibit adding features beyond the approved plan scope?
Run: `grep -n "unrequested\|approved plan\|outside.*scope\|no.*unrequested" .claude/rules/pipeline.md | head -5`
Expected: ≥1 match. Missing = WARN.

**PE10 — Fast Lane escalation criteria**
Check: does the Fast Lane define clear escalation conditions to the full pipeline?
Run: `grep -A5 "Fast Lane\|Fast lane" .claude/rules/pipeline.md | grep -i "escalat\|full pipeline\|upgrade"`
Expected: ≥1 match describing escalation conditions. Missing = WARN.

**PE11 — Documentation gate**
Check: does pipeline.md require updating documentation (requirements, implementation checklist, or PRD) as part of block closure?
Run: `grep -n "requirements.md\|implementation-checklist\|PRD\|docs.*update" .claude/rules/pipeline.md | head -5`
Expected: ≥1 match. Missing = WARN.

**PE12 — Commit discipline**
Check: does pipeline.md specify a structured commit pattern (code, docs, context files as separate commits)?
Run: `grep -n "Commit 1\|Commit 2\|Commit 3\|three-commit\|3-commit\|commit.*sequence" .claude/rules/pipeline.md | head -5`
Expected: ≥1 match. Missing = WARN.

---

## Step H1 — Hook compliance check

Using hook documentation fetched in Step 1 and `settings.json` read in Step 2, verify the project's hook configuration against current Anthropic spec.

**H1a — Event name currency**
Check: every event name in `settings.json` hooks matches the current official event list.
Run: `grep -o '"SessionStart"\|"UserPromptSubmit"\|"PreToolUse"\|"PostToolUse"\|"Stop"\|"PostCompact"\|"PreCompact"\|"InstructionsLoaded"\|"Notification"' .claude/settings.json | sort -u`
Pass: all events appear in the Step 1 documentation. Any unrecognized event → RECOMMEND removal or rename.

**H1b — JSON response field compliance (prompt hooks)**
For each hook with `"type": "prompt"` in settings.json: check that response fields match the documented schema from Step 1 hooks documentation.
If divergence found → RECOMMEND (never AUTO-FIX).

**H1c — Bypass mechanism visibility**
Check: every `UserPromptSubmit` hook with `type: prompt` that can return a blocking response must include bypass instructions.
Fail → RECOMMEND update to add bypass instructions.

**H1d — Hook type fitness**
For each hook, verify `type` matches intent:
- `command` — shell execution, dynamic state (git, files, env)
- `prompt` — static/contextual text injection, no shell needed
- `agent` — multi-step async logic
Flag as RECOMMEND (not AUTO-FIX) any `command` hook that only outputs static text and could be simplified to `prompt`.

**H1e — Rubric-hook drift check** *(skip if no rubric file)*
Check: if `.claude/rules/prompt-quality-rubric.md` exists, it must stay in sync with the inline logic in the `UserPromptSubmit` prompt hooks in `settings.json`.
Run: compare key pattern lists between the rubric file and the hook. Flag any drift.
If drift found → AUTO-FIX: update the rubric to match the hook (hook is authoritative — rubric is documentation).

**H1f — New events to consider**
Based on Step 1 documentation, flag any new hook events from recent Claude Code releases that the project might benefit from:
- `PreCompact` — save critical in-progress state before context compression
- `TaskCompleted` — post-completion summary or notification
These are RECOMMEND, not AUTO-FIX.

---

## Step 4 — Apply AUTO-FIX changes

For each AUTO-FIX from Steps 3, 3b, 3d, and H1: apply the change, note the file and line modified.

---

## Step 5 — Update timestamp

```bash
date +%s > [LAST_AUDIT_PATH]
```

---

## Step 6 — Produce audit report

Output a structured report in this exact format:

```
## Arch Audit — [DATE]
### Claude Code version checked: [version from changelog/releases]

### ✅ Auto-fixed ([N] changes)
- [file]: [what changed and why]

### 📋 Recommendations ([N] items)
- [Priority: High/Medium/Low] [description] — [why it matters]

### ✓ Compliant (no action needed)
- [area]: [brief confirmation]

### Ecosystem consistency (C1–C17)
- C1 Deploy information currency: [PASS/FAIL]
- C2 Skill output file references: [PASS/FAIL — list matches if any]
- C3 files-guide.md live state: [PASS/FAIL]
- C4 settings.json ↔ pipeline.md symlink: [PASS/FAIL]
- C5 Interaction Protocol: [PASS/FAIL]
- C6 Phase 5b dev server prerequisite: [PASS/FAIL]
- C7 Dead path refs: [PASS/FAIL — list missing paths if any]
- C8 CLAUDE.md line budget: [PASS/WARN — actual count]
- C9 Pipeline STOP gate integrity: [PASS/FAIL — actual count]
- C10 Worktree isolation rule: [PASS/FAIL]
- C11 Cheatsheet skill registry: [PASS/FAIL — list missing skills if any]
- C12 settings.json hook integrity: [PASS/FAIL — list missing hooks if any]
- C13 context:fork coverage: [PASS/FAIL — list missing skills if any]
- C14 CLAUDE.md gitignored: [PASS/FAIL]
- C15 CLAUDE.md line budget (judgment): [PASS/WARN]
- C16 Deprecated model IDs: [PASS/FAIL — list matches if any]
- C17 allowed-tools on MCP skills: [PASS/FAIL — list missing skills if any]

### Prompting compliance (P1–P5) — judgment-based, PASS/WARN only
- P1 CLAUDE.md content type: [PASS/WARN — note any sections failing Anthropic's inclusion test]
- P2 Instruction clarity: [PASS/WARN — note any vague or unmeasurable directives]
- P3 Structural redundancy: [PASS/WARN — note any rules duplicated across files]
- P4 Pipeline complexity: [PASS/WARN — note any phases with unclear value]
- P5 Long context structure: [PASS/WARN — note any scannability issues]

### Token & subagent optimization (T1–T5)
- T1 Research agent model: [PASS/FAIL]
- T2 Explore subagent model: [PASS/FAIL]
- T3 Phase 5d Playwright concurrency: [PASS/WARN]
- T4 shadcn/design system MCP: [PASS/WARN or N/A]
- T5 Skill model fitness: [PASS/FAIL/WARN]

### Pipeline compliance (PE1–PE12) — judgment-based, PASS/WARN only
- PE1 Phase gates integrity: [PASS/WARN — actual STOP count]
- PE2 Testing pyramid order: [PASS/WARN]
- PE3 Auth boundary coverage: [PASS/WARN]
- PE4 Type check gate: [PASS/WARN]
- PE5 Security checklist: [PASS/WARN]
- PE6 Staging before production: [PASS/WARN]
- PE7 Migration isolation: [PASS/WARN]
- PE8 Scope gate before implementation: [PASS/WARN]
- PE9 Minimal footprint: [PASS/WARN]
- PE10 Fast Lane escalation: [PASS/WARN]
- PE11 Documentation gate: [PASS/WARN]
- PE12 Commit discipline: [PASS/WARN]

### Hook compliance (H1a–H1f)
- H1a Event name currency: [PASS/FAIL — list unknown events if any]
- H1b JSON response fields: [PASS/FAIL — list non-compliant fields if any]
- H1c Bypass visibility: [PASS/FAIL — list hooks missing bypass guidance]
- H1d Hook type fitness: [PASS/WARN — list command→prompt candidates]
- H1e Rubric-hook drift: [PASS/FAIL — list any divergences found, or N/A if no rubric]
- H1f New events: [list relevant new events, or "none since last audit"]

### Next audit due: [DATE + 7 days]
```

### 🎯 Decision guide
For each item in Recommendations above, output one decision card:

**[Priority] — [Short title]**
- **Benefit if applied**: concrete outcome in one sentence
- **Cost / effort**: file count, phase required, risk of regression
- **Verdict**: `✅ Apply now` | `⏸ Defer` (include trigger condition) | `⛔ Skip` (explain why not applicable)

If no gaps are found: output "Architecture fully compliant as of [DATE]. No changes needed." and still update the timestamp.
