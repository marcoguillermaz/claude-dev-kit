# External LLM Quality Review — Structured Evaluation Prompt

**Purpose**: Send this prompt (with attachments) to GPT-4, Gemini Pro, and Mistral Large to get independent critical assessment of CDK's architecture, scope, and quality.

**Instructions**: Copy the prompt below. Attach the referenced files as context.

---

## Attachments to include

1. `README.md` (full)
2. `packages/cli/templates/tier-m/CLAUDE.md` (template sample)
3. `packages/cli/templates/tier-m/.claude/rules/pipeline.md` (pipeline sample)
4. `packages/cli/templates/common/rules/security.md` (security rules sample)
5. `packages/cli/templates/tier-m/.claude/skills/security-audit/SKILL.md` (skill sample)
6. `packages/cli/templates/tier-m/.claude/skills/perf-audit/SKILL.md` (skill sample)
7. `docs/workspace-quality-rubric.md` (evaluation framework)
8. `packages/cli/src/scaffold/index.js` (core scaffold logic)
9. `packages/cli/src/generators/claude-md.js` (CLAUDE.md generator)
10. `packages/cli/test/integration/run.js` (test infrastructure)

---

## Prompt

```
You are reviewing an open-source CLI tool called "claude-dev-kit" (CDK). It scaffolds governance layers for AI-assisted development workspaces — primarily for Claude Code, but the patterns are transferable to Cursor, Copilot, Windsurf, etc.

The tool creates a structured set of files (CLAUDE.md, rules, skills, agents, settings, docs) that give the AI assistant context, process, and safety guards. Four tiers from minimal exploration (3 files) to full production governance (30+ files).

## Your task

Provide a rigorous, critical evaluation across these 5 dimensions. Be specific — cite file names, line numbers, patterns. Do not soften findings to be polite. Grade each dimension 1-5 (1 = poor, 5 = excellent).

### 1. Architecture & Code Quality (Grade 1-5)

Evaluate:
- Separation of concerns in the scaffold pipeline (scaffold/index.js + generators/claude-md.js)
- Template system design (tier hierarchy, common files, interpolation)
- The double-write pattern: scaffold copies and interpolates files, then generateClaudeMd() re-reads the raw template and overwrites CLAUDE.md. Is this sound or fragile?
- Test infrastructure: 271 integration checks, no unit tests, no linting. Is this appropriate?
- Extension model: how easy is it to add a new tier, stack, skill, or rule?

### 2. Template Quality & Real-World Applicability (Grade 1-5)

Evaluate:
- Pipeline templates (Tier S/M/L): are the workflow phases practical? Are STOP gates positioned correctly? Would a team actually follow this?
- Security rules: 4 variants (web, native-apple, native-android, systems). Are they specific enough to prevent real mistakes?
- Skills: 11 audit skills. Are the check lists comprehensive or superficial? Do they cover the right attack surface?
- CLAUDE.md templates: do they guide users to write useful context or just fill in placeholders?

### 3. Scope & Market Position (Grade 1-5)

Evaluate:
- 10 tech stacks (node-ts, node-js, python, ruby, go, swift, kotlin, rust, dotnet, java) × 4 tiers. Is this the right coverage?
- Target user: "Builder PM and tech lead — technical enough for end-to-end Claude Code work." Is the tool too complex for this persona? Too simple?
- Comparison to alternatives: how does CDK compare to .cursorrules, .windsurfrules, manual CLAUDE.md + settings.json setups?
- What would a team building a production app actually want that CDK does NOT provide?

### 4. Gap Analysis (Grade 1-5)

Evaluate:
- Skills are primarily web/Next.js/Supabase-focused. Native stacks (Swift, Kotlin) get exit guards instead of adapted checks. Is this acceptable?
- The rubric (workspace-quality-rubric.md) scored a macOS/Swift project at 58% — mostly due to web-centric skills and commands. What does this say about stack coverage quality?
- CI only validates "CLI starts" and "doctor runs." Integration tests (271 checks) are not in CI. Is this a release quality risk?
- No unit tests exist. Is this a concern for a scaffold/template tool?

### 5. Critical Assessment: What Would You Change? (Grade 1-5 for current state)

If you were taking over this project:
- What are the top 3 things you would fix immediately?
- What are the top 3 things you would add?
- What would you remove or simplify?
- What is the single biggest risk in the current design?

## Output format

For each dimension:
1. Grade (1-5)
2. 3-5 specific findings with evidence
3. Concrete recommendation

End with:
- Overall grade (average of 5 dimensions)
- One-paragraph executive summary
- Priority action list (top 5 items)
```

---

## Post-execution

After receiving responses from all 3 models:
1. Create a synthesis document comparing findings across models
2. Identify consensus findings (mentioned by 2+ models)
3. Identify divergent assessments and analyze why
4. Extract priority action items with attribution
5. Update session file with results
