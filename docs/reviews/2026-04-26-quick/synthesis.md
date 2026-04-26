# CDK 1.16.0 — External Review Synthesis
Date: 2026-04-26
Mode: quick
Focus: general
Reviewers: Claude (general-purpose, fresh context)

> Note: quick mode runs a single fresh-context Claude review. This synthesis is summary, not cross-LLM convergence. For cross-LLM coverage at milestone gates, run `/external-review --mode=full`.

## Headline

The reviewer ships the release as **SHIP-WITH-RESERVATIONS**. The release stands; the credibility gap of the v1.16 headline feature is what to close next.

## Convergence (single reviewer, so each point is one-source)

- **Strongest piece is the Stop hook + CODEOWNERS + team-settings.json triad.** Mechanical enforcement of "tests pass before done" is what differentiates CDK from Cursor rules / Aider conventions / raw CLAUDE.md.
- **Headline 1.16 feature has a credibility gap.** `team-settings.json` enforces only at CLI invocation; Claude Code session can still type `/security-audit` directly and bypass `blockedSkills`. Release notes name this; reviewer judges it underdelivers on the team-governance pitch.
- **Architecture debt to watch**: template combinatorics (stacks × tiers × skills × flags), pipeline complexity inflation (Tier M is 11 phases / 295 lines, Tier L is 14), doctor check inflation (+1/release: 26 → 27 → 28).
- **Status drift**: `roadmap-status.md` marks Q3 #3 as Open while CHANGELOG 1.16.0 marks it Done. Same for Q3 #2 (`upgrade --anthropic`, marked Open in roadmap, Done in CHANGELOG 1.15). Roadmap not synced after recent merges.

## Action items (prioritized)

1. **Fix roadmap-status.md status drift for Q3 #2 and Q3 #3** — both marked Open but shipped in 1.15.0 and 1.16.0 respectively. Trivial fix; affects every external review run.
2. **Propose new roadmap item: team-settings.json runtime enforcement via Claude Code hooks** — PreToolUse hook on `Skill` tool that reads `.claude/team-settings.json` and refuses skill invocation that violates `blockedSkills` / `allowedSkills`. Closes the v1.16 credibility gap. Reviewer-proposed ICE: 240 (I=8, C=6, E=5). Slot above current Q3 #3 row, just below Q2 #2.
3. **Trim Phase 8.5 "Context review + compact" in tier-M pipeline.md** — C1–C12 is too much end-of-block process; fold C1–C3 into Phase 6 outcome checklist, drop C4–C12 or extract to optional skill.
4. **Decide on `/skill-review` audience** — currently shipped in user scaffolds, but reviewer reads it as maintainer-only. Either gate behind `--include-meta-skills`, move to maintainer path, or document its end-user use case.
5. **Quantify time-to-value in README** — "20 skills, 28 checks, 11 stacks, 4 tiers" is process surface. Add a one-line "what does week one cost a 5-person team" so the wizard's choice between tiers has concrete weight.
6. **Drop the "non-negotiable closing message" template** — ceremonial output; agent can derive a closing artifact from session state instead of requiring fill-ins.

## Divergence (single reviewer, so blanket attribution)

- **Claude (fresh)**: positions CDK's long-term defensible piece as "the skills themselves and the stack-aware patterns" rather than the governance scaffolding, on the assumption that Anthropic native primitives will subsume CLI-side governance. Implication for product strategy: invest in skill content depth (audit accuracy, stack patterns) ahead of governance breadth.

## Overall verdict

SHIP-WITH-RESERVATIONS. v1.16 is usable and breaks nothing. Action items above (in order) close the credibility gap and reduce the architecture debt curve.
