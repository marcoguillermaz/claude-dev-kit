---
name: arch-audit
description: Audit the Claude Code governance files against the latest Anthropic documentation and release notes. Run weekly to stay compliant with new Claude Code features, catch deprecations, and keep the context system clean and efficient.
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

> **Parallelism**: Steps 1 and 2 have no data dependency. Launch the Step 1 research agent first (background), then begin Step 2 file reads in the main context immediately — do not wait for the agent to complete.

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

From Claude Code sources extract: new keys/features, deprecations, breaking changes, best practice updates.
From the prompting guide extract: principles for system prompt design, instruction clarity, context management, and what Anthropic explicitly discourages in long instruction files.

**URL resilience**: if any URL returns 404, note it and try the base URL `https://docs.anthropic.com/en/docs/claude-code/` to locate the current path. Do not skip a topic because one URL failed — find the current equivalent page.

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

---

## Step 3b — Internal ecosystem consistency checks

Run these checks against the current project state. For each FAIL: classify as AUTO-FIX or RECOMMEND.

**C1 — Hook integrity**
Check: `.claude/settings.json` must contain all 3 essential hooks: `SessionStart` (arch-audit reminder), `PostCompact` (CLAUDE.local.md restore reminder), `InstructionsLoaded` (debug log).
Run: `grep -o "SessionStart\|PostCompact\|InstructionsLoaded" .claude/settings.json | sort -u`
Expected: 3 lines. Any missing = FAIL.
RECOMMEND if failing — do not auto-fix (hooks require verifying intent before restoring).

**C2 — Stop hook present**
Check: `.claude/settings.json` must contain a `Stop` hook that blocks completion until tests pass.
Run: `grep -c "\"Stop\"" .claude/settings.json`
Expected: ≥ 1. Missing = FAIL.
RECOMMEND if failing.

**C3 — STOP gate count in pipeline**
Check: `.claude/rules/pipeline.md` must contain the expected number of `*** STOP` markers (Tier S: ≥1, Tier M: ≥2, Tier L: ≥4). Determine the tier from the pipeline header, then verify the count.
Run: `grep -c "\*\*\* STOP" .claude/rules/pipeline.md`
Expected: ≥ tier-appropriate count. Fewer = FAIL (gate was accidentally removed).
RECOMMEND if failing.

**C4 — context:fork on all skills**
Check: every `.claude/skills/*/SKILL.md` must declare `context: fork`. Skip this check if `.claude/skills/` does not exist.
Run: `grep -rL --include="SKILL.md" "context: fork" .claude/skills/`
Expected: 0 files returned. Any returned path = FAIL.
AUTO-FIX: insert `context: fork` after the `model:` line in any failing skill.

**C5 — Interaction Protocol in CLAUDE.md**
Check: `CLAUDE.md` must contain a `## Interaction Protocol` section with execution keywords defined.
Run: `grep -n "Interaction Protocol" CLAUDE.md`
Expected: ≥ 1 match. Missing = FAIL.
RECOMMEND if failing.

**C6 — Cross-file path references (dead pointers)**
For each `docs/` or `.claude/` path referenced in `CLAUDE.md` and `pipeline.md`, verify the file exists.
Run: check each referenced path. Report any that resolve to "No such file or directory".
Expected: all paths resolve. Any missing = FAIL.
RECOMMEND if failing.

---

## Step 3c — Anthropic Prompting Guide compliance

Using the prompting guide content fetched in Step 1, evaluate `CLAUDE.md`, `pipeline.md`, and `context-review.md` against Anthropic's published best practices. These checks are judgment-based — classify each as PASS or WARN (not hard FAIL). Always RECOMMEND, never auto-fix.

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

**T3 — Skill model fitness**
Check: every skill's `model:` frontmatter fits the task's reasoning requirement. Haiku is appropriate for mechanical pattern matching only; Sonnet for cross-file judgment, complex analysis, fix application. Opus is never appropriate for audit skills. Skip if `.claude/skills/` does not exist.
Run: `grep -A1 "^name:" .claude/skills/*/SKILL.md | grep "model:"`
FAIL: any skill using `model: opus`. WARN: any skill that does pure grep/pattern work but declares `model: sonnet`.

---

## Step 4 — Apply AUTO-FIX changes

For each AUTO-FIX from Steps 3, 3b, and 3d: apply the change, note the file and line modified.

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

### Ecosystem consistency (C1–C6)
- C1 Hook integrity: [PASS/FAIL — list missing hooks if any]
- C2 Stop hook: [PASS/FAIL]
- C3 STOP gate count: [PASS/FAIL — actual count]
- C4 context:fork coverage: [PASS/FAIL — list missing skills if any]
- C5 Interaction Protocol: [PASS/FAIL]
- C6 Dead path refs: [PASS/FAIL — list missing paths if any]

### Prompting compliance (P1–P5) — judgment-based, PASS/WARN only
- P1 CLAUDE.md content type: [PASS/WARN — note any sections failing Anthropic's inclusion test]
- P2 Instruction clarity: [PASS/WARN — note any vague or unmeasurable directives]
- P3 Structural redundancy: [PASS/WARN — note any rules duplicated across files]
- P4 Pipeline complexity: [PASS/WARN — note any phases with unclear value]
- P5 Long context structure: [PASS/WARN — note any scannability issues]

### Token & subagent optimization (T1–T3)
- T1 Research agent model: [PASS/FAIL]
- T2 Explore subagent model: [PASS/FAIL]
- T3 Skill model fitness: [PASS/FAIL/WARN]

### Next audit due: [DATE + 7 days]
```

If no gaps are found: output "Architecture fully compliant as of [DATE]. No changes needed." and still update the timestamp.
