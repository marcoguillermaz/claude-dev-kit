---
title: External LLM Review Prompt — claude-dev-kit
version: 1.16.0
last_synced: 2026-04-26
target_release: "1.16.0"
focus_area: "general"
audience: GPT-4.1, Gemini 2.5 Pro, Mistral Large, Perplexity Sonar Pro, Claude (fresh-context)
---

# External LLM Review Prompt — claude-dev-kit

> Sync the **version** + **last_synced** fields above when CDK ships a new release.
> Replace `1.16.0` and `general` placeholders with the run-time values before fanning out to providers.
> The bundle is auto-assembled by `scripts/external-review-bundle.mjs` (run via the `/external-review` skill).

---

You are reviewing an open-source CLI tool called **claude-dev-kit** (CDK). It scaffolds a governance layer on top of Claude Code (Anthropic's agentic coding CLI). The scaffold provides structured development pipelines, audit skills, security rules, process controls, and team-wide governance primitives.

You have **no prior memory** of this project. Treat the attached bundle as the only source of truth. If a claim in the bundle isn't supported by another file in the bundle, flag it.

## What CDK does

- `npx mg-claude-dev-kit init` runs an interactive wizard
- Outputs: `CLAUDE.md` (project context, ≤200 lines), `.claude/settings.json` (permissions + Stop hook), `.claude/rules/` (pipeline, security, git, output-style), `.claude/skills/` (audit slash-commands), `.claude/team-settings.json` (team-wide policy, opt-in)
- Four tiers: Discovery (3 files, no pipeline), Fast Lane / Tier S (4-step pipeline, 1 scope-confirm), Standard / Tier M (8 phases, 2 STOP gates), Full / Tier L (11 phases, 4 STOP gates + audit cycle)
- Stack-aware: auto-detects 11 tech stacks (Node-TS, Node-JS, Python, Go, Swift, Kotlin, Rust, .NET, Ruby, Java, generic), adapts security rules, permissions, commands, and skill checks
- 20 audit skills with model routing: haiku for mechanical checks, sonnet for analysis, opus for visual reasoning. Skills are conditionally installed per project flags (`hasApi`, `hasDatabase`, `hasFrontend`, `hasDesignSystem`).
- Three governance flags ship in the scaffold and are enforced mechanically: a Stop hook blocks task completion until tests pass, CODEOWNERS gates `.claude/` changes behind review, and `team-settings.json` (v1.16+) lets a team enforce `minTier`, `allowedSkills`, `blockedSkills`, `requiredSkills` across every clone.

## Current state (1.16.0)

- 365 unit tests, 1000 integration checks, all passing
- 28 doctor checks (validation surface)
- GitHub Actions CI: Node 22/24 matrix, Lint, Unit, Integration, Verify CLI, Drift tracker, CodeQL, dependency-review
- ESLint + Prettier
- Published on npm as `mg-claude-dev-kit`
- Single maintainer, used on 2-3 real projects, npm adoption metric not yet validated (registry currently lags local versioning)
- Roadmap is ICE-prioritized across Q1–Q4 2026; Q1+Q2 mostly shipped; Q3 has 3 of 9 items shipped through v1.16.0

## Focus area for this run

general

> If `general` is `general`, treat the seven questions as full-coverage. If it names a specific dimension (e.g., `architecture`, `competitive-position`, `team-adoption`, `pricing`, `enterprise-readiness`), give that dimension extra depth and use the others as supporting context.

## Attached files (auto-bundled)

1. **README.md** — full product documentation
2. **CHANGELOG.md** — last three releases (v1.14, v1.15, v1.16) so the change cadence is visible
3. **security-audit SKILL.md (Tier M)** — example of a complex audit skill with 3-path stack-aware selector
4. **pipeline.md (Tier M)** — example of the standard pipeline tier with two STOP gates
5. **roadmap-status.md** — ICE-ranked roadmap snapshot (Q1–Q4 2026 + backlog)

## Questions

Answer each with specific, actionable feedback. No flattery — treat this as a paid code review. If you don't have enough information from the bundle to answer, say so explicitly rather than speculating.

1. **Strongest aspect**: what is the single most valuable thing CDK does that other AI coding tools/frameworks don't?

2. **Weakest aspect**: what is the biggest weakness or gap that would prevent adoption? Be specific — name what's missing and why it matters.

3. **Competitive position**: how does this compare to Cursor rules (`.cursorrules`), Windsurf rules, Aider conventions, raw `CLAUDE.md` files, and Claude Code's native skills/permissions system? What does CDK offer beyond what a senior engineer could build in an afternoon? What does it offer beyond what a $20/month subscription to one of the competitors already provides?

4. **Adoption barrier**: what would make a team of 5–10 engineers adopt this over writing their own `CLAUDE.md` + rules? What's the pitch they'd respond to? What objection would kill the deal?

5. **Single highest-impact improvement**: if you could make one change to CDK over the next quarter, what would it be? Not a wish list — one specific change with the most leverage. Cite the roadmap item it maps to (or argue why it's missing from the roadmap).

6. **Architecture concern**: is there anything in the design that would become a maintenance burden or create scaling problems as the tool grows? Consider: skill count growth (20 → 40 → 100), tier count, stack count, doctor check count, pipeline complexity per tier, drift between scaffolded files and template files.

7. **What should be removed**: is there anything in CDK that adds complexity without proportional value? Over-engineering signals? Features the bundle suggests aren't pulling their weight?

## Output format

Use this exact structure:

```
## [Model name] Review — CDK 1.16.0
Date: [ISO date]
Focus area: general

### 1. Strongest aspect
[answer]

### 2. Weakest aspect
[answer]

### 3. Competitive position
[answer]

### 4. Adoption barrier
[answer]

### 5. Single highest-impact improvement
[answer — name the roadmap item if applicable, else propose a new item with rough ICE]

### 6. Architecture concern
[answer]

### 7. What should be removed
[answer — be specific; "nothing" is acceptable if defended]

### Overall assessment
[2-3 sentences. End with a single-line one-of: SHIP / SHIP-WITH-RESERVATIONS / DO-NOT-SHIP and a one-sentence reason.]
```
