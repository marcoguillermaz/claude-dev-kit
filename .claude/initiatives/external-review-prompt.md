# External LLM Quality Review — Structured Evaluation Prompt

**Purpose**: Send to GPT-4, Gemini Pro, Mistral Large, and Perplexity to get independent critical assessment of CDK's architecture, scope, quality, and market position.

**Execution**: automated via `scripts/external-review.mjs` — reads `.env` for API keys, sends prompts in parallel, collects responses into `docs/reviews/`.

**Models and roles**:
- **GPT-4** / **Gemini Pro** / **Mistral Large**: code review — receive file attachments, evaluate architecture and template quality
- **Perplexity (sonar-pro)**: market research — search-augmented, evaluates competitive landscape and real-world adoption patterns

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
- Test infrastructure: 459 integration checks, no unit tests, no linting. Is this appropriate?
- Extension model: how easy is it to add a new tier, stack, skill, or rule?

### 2. Template Quality & Real-World Applicability (Grade 1-5)

Evaluate:
- Pipeline templates (Tier S/M/L): are the workflow phases practical? Are STOP gates positioned correctly? Would a team actually follow this?
- Security rules: 4 variants (web, native-apple, native-android, systems). Are they specific enough to prevent real mistakes?
- Skills: 12 audit/dev skills. Are the check lists comprehensive or superficial? Do they cover the right attack surface?
- CLAUDE.md templates: do they guide users to write useful context or just fill in placeholders?

### 3. Scope & Market Position (Grade 1-5)

Evaluate:
- 10 tech stacks (node-ts, node-js, python, ruby, go, swift, kotlin, rust, dotnet, java) x 4 tiers = 40 matrix combinations. Is this the right coverage?
- Target user: "Builder PM and tech lead — technical enough for end-to-end Claude Code work." Is the tool too complex for this persona? Too simple?
- Comparison to alternatives: how does CDK compare to .cursorrules, .windsurfrules, manual CLAUDE.md + settings.json setups?
- What would a team building a production app actually want that CDK does NOT provide?

### 4. Gap Analysis (Grade 1-5)

Evaluate:
- Skills are primarily web/Next.js/Supabase-focused. Native stacks (Swift, Kotlin) get exit guards instead of adapted checks. Is this acceptable?
- The rubric (workspace-quality-rubric.md) scored a macOS/Swift project at 68% - mostly due to web-centric skills and commands. What does this say about stack coverage quality?
- CI only validates "CLI starts" and "doctor runs." Integration tests (459 checks) are not in CI. Is this a release quality risk?
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

## Perplexity Prompt (sonar-pro) — Market & Competitive Intelligence

Perplexity does NOT receive file attachments. It receives a focused research brief and uses web search to find external evidence.

```
I'm building an open-source CLI tool called "claude-dev-kit" (npm: mg-claude-dev-kit). It scaffolds governance layers for AI-assisted development workspaces.

What it does: generates structured context files (CLAUDE.md, pipeline rules, security rules, audit skills, settings.json hooks) that give AI coding assistants (Claude Code, Cursor, Copilot, Windsurf) process guardrails and project knowledge. Four complexity tiers. 10 tech stacks. 459 integration checks.

Target user: technical PM or tech lead who uses AI assistants for end-to-end development.

I need you to research and answer these 5 questions. Cite sources for every claim.

### Q1 — Competitive landscape

Search for tools, templates, and frameworks that solve the same problem: structuring AI assistant context for development workflows.

Specifically look for:
- .cursorrules template collections and generators
- .windsurfrules equivalents
- CLAUDE.md generators or scaffolders
- AI coding governance frameworks (any IDE)
- "rules for AI" or "AI coding standards" open-source projects

For each competitor found: name, URL, stars/downloads if available, what it does, how it differs from a multi-tier scaffold approach.

### Q2 — Community demand signals

Search for discussions about:
- "CLAUDE.md best practices" or "how to write CLAUDE.md"
- "cursorrules best practices" or "cursorrules template"
- Frustrations with AI coding assistants ignoring context or making repeated mistakes
- Requests for standardized AI governance in dev teams

Sources: GitHub issues/discussions, Reddit (r/ClaudeAI, r/cursor, r/ChatGPTCoding), Hacker News, dev blogs, X/Twitter.

Quantify demand where possible (upvotes, stars, comment counts).

### Q3 — Adoption patterns

What do teams currently do to manage AI assistant behavior at scale?
- Manual CLAUDE.md / .cursorrules written per-project?
- Shared template repos?
- Custom tooling?
- Nothing (every developer on their own)?

Find real examples of team-scale AI governance approaches. How many developers typically adopt structured rules vs. ad-hoc prompting?

### Q4 — Gap validation

Based on what you find in Q1-Q3, evaluate these specific gaps in claude-dev-kit:
- Skills (audit checklists) are web/Next.js-focused. Native mobile stacks get exit guards. Is this a real market gap or acceptable given the user base?
- The tool generates 30+ files at full tier. Is "governance fatigue" a known problem in similar tools?
- No VS Code / JetBrains extension — CLI only. How do competing tools distribute?

### Q5 — Market positioning advice

Based on your research:
- What is the strongest differentiator for claude-dev-kit vs. what exists?
- What is the most common unmet need in this space that CDK could address?
- What distribution channel (npm CLI, VS Code extension, GitHub template repo, other) has the highest adoption potential?
- Is "Builder PM / tech lead" the right target persona, or does the market suggest a different primary user?

## Output format

For each question:
1. Direct answer (2-3 sentences)
2. Evidence with citations (URLs, data points)
3. One actionable recommendation for claude-dev-kit

End with:
- Top 5 findings ranked by strategic importance
- Confidence level for each finding (high/medium/low based on source quality)
```

---

## Post-execution

After receiving responses from all 4 models:
1. Create a synthesis document in `docs/reviews/cross-model-synthesis.md`
2. Separate findings into two tracks:
   - **Code quality track** (GPT-4 + Gemini + Mistral) — consensus on architecture, templates, gaps
   - **Market track** (Perplexity) — competitive landscape, demand validation, positioning
3. Identify consensus findings (mentioned by 2+ code-review models)
4. Cross-reference: do Perplexity's market findings validate or contradict the code reviewers' gap analysis?
5. Extract priority action items with model attribution
6. Update session file with results
