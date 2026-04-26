## Claude (general-purpose, fresh context) Review — CDK 1.16.0
Date: 2026-04-26
Focus area: general

### 1. Strongest aspect
The Stop hook + CODEOWNERS + `team-settings.json` triad is the strongest piece, and specifically the **Stop hook**: it is a mechanically enforced contract (`npm test || decision: block`) that fires inside Claude Code itself and prevents the agent from declaring done while red. Cursor rules, `.cursorrules`, Aider conventions, and raw `CLAUDE.md` are all advisory text that the model can rationalize past. CDK turns "tests must pass" from a prompt instruction into a runtime gate. Pair that with the 28-check `doctor` validating the scaffold and the new `team-settings.json` propagating `minTier` / `allowedSkills` / `blockedSkills` across clones, and CDK is the only tool in the bundle's competitive set that ships *enforcement* rather than *suggestion*.

### 2. Weakest aspect
**Governance is enforced only when the user runs the CDK CLI.** The 1.16.0 release notes admit it directly: "Claude Code sessions can still invoke skills directly" because `Skill()` permission rules aren't in Anthropic's documented public schema. This is a credibility hole. The whole pitch is mechanical enforcement, but the headline 1.16 feature (`team-settings.json`) is bypassed by typing `/security-audit` in a session — the exact path most users take. A team adopting CDK for "team-wide governance" (README claim) gets advisory governance with extra steps. Until upstream lands or you ship a Stop-hook-style runtime check that reads `team-settings.json`, this feature is positioning ahead of capability.

A secondary weakness: the bundle never quantifies **time-to-value**. There are 28 doctor checks, 20 skills, 11 stacks, 4 tiers, 8 phases at Tier M, 14 at Tier L, and a 295-line pipeline.md with two STOP gates and a Phase 8.5 context review. A 5–10 person team needs to know the cost of this in week one, and the README does not say.

### 3. Competitive position
Versus `.cursorrules` / Windsurf / Aider conventions / raw `CLAUDE.md`: these are single-file prompt augmentations. CDK is structurally different — multi-file scaffold, conditional skill installation per project flags, stack-specific variants, doctor validation, CLI lifecycle (`init`/`upgrade`/`add`/`doctor`). A senior engineer cannot replicate this in an afternoon. They can replicate a `CLAUDE.md` and a Stop hook in an afternoon — that is roughly Tier 0 — but they cannot replicate `/security-audit` SKILL.md (15 numbered checks A1–A14, native NS1–NS6, framework-aware grep patterns externalized to PATTERNS.md) without a week of work, and they cannot maintain it against Anthropic spec drift without the drift tracker.

Versus Claude Code's native skills/permissions: CDK is a **content layer** on top, not a competitor. It is meaningful only because the native layer is bare. The risk is exactly the gap exposed in #2: as Anthropic ships native team policy, native skill permissions, and native `Skill()` permission rules, CDK's CLI-side enforcement becomes redundant and CDK is reduced to "a curated skill library with a wizard." The defensible piece long-term is the **skills themselves** (security-audit, infra-audit, compliance-audit) and the **stack-aware patterns**, not the governance scaffolding.

Versus a $20/month subscription: a Cursor/Windsurf user gets fast inline completion and a chat panel; CDK gets you a 4-tier development *process*. These solve different problems. CDK competes with "team standards docs + a senior reviewer," not with Cursor.

### 4. Adoption barrier
**The pitch a 5–10 engineer team would respond to**: "Your AI-generated PRs are inconsistent and reviewers can't tell whether tests actually ran. CDK ships a Stop hook that blocks task completion until tests pass, plus 20 audit skills that run before merge. One `npx mg-claude-dev-kit init`. CODEOWNERS gate `.claude/` so the rules can't be silently weakened."

**The objection that kills the deal**:
1. *"Why a separate tool? We already have ESLint, our CI, and a `CLAUDE.md`."* The Tier M pipeline.md is 295 lines with two STOP gates, a Phase 8.5 context review, three audit tracks, and a "non-negotiable closing message." That is a lot of *new* process in a project that already has process. The wizard needs a clear "what does this replace?" answer, plus an ROI claim grounded in something concrete (e.g., "reduced AI-generated regressions by X% in 3 pilot projects"). The README only states "used on 2-3 real projects, npm adoption metric not yet validated."
2. *"Single maintainer, npm package name confusion (`mg-` prefix), no SOC 2 / no enterprise reference."* For Tier L / enterprise the bundle is ahead of itself.
3. *"How do I know skills won't drift from Anthropic's spec next month?"* The drift tracker exists but isn't surfaced to the user as a guarantee.

### 5. Single highest-impact improvement
**Close the team-settings enforcement gap by shipping a Stop-hook-equivalent runtime check.** Specifically: write a SessionStart hook (or PreToolUse hook on the Skill tool) that reads `.claude/team-settings.json` and refuses a session/skill invocation that violates `minTier` / `blockedSkills` / `allowedSkills`. This converts the headline 1.16 feature from "advisory at the CLI" to "mechanical at runtime" — which is the entire CDK pitch.

This does **not** map to a current roadmap item. The closest is Q3 #3 (`team-settings.json`, ICE 175), which is marked Open in `roadmap-status.md` but Done in CHANGELOG 1.16.0 — a status drift between the two files I'd flag separately. The 1.16.0 release note explicitly defers native enforcement to "v1.17+" without an issue number.

**Propose a new roadmap item**: "team-settings.json runtime enforcement via Claude Code hooks." Rough ICE: I=8 (rescues the credibility of the entire 1.16 release and the team-adoption pitch), C=6 (depends on hook capabilities, but PreToolUse hooks are documented and SessionStart is already used for the weekly arch-audit reminder, so the mechanism is proven within CDK), E=5 (one hook, JSON read, exit code; harder part is the test matrix). ICE ≈ **240** — would slot above the current Q3 #3 (175) and just below Q2 #2 (245).

Why this beats the alternatives:
- VitePress site (Q2 #3, ICE 432) is documentation. It does not move adoption if the product has a credibility gap.
- `cdk sync` (Q3 #5, ICE 120) is a nice-to-have for multi-repo orgs and CDK has zero of those publicly validated.
- Q3 #6 enterprise skills are content addition into a tool whose enforcement story is incomplete.

### 6. Architecture concern
Three real maintenance burdens visible in the bundle:

1. **Combinatorial template explosion: 11 stacks × 4 tiers × 20+ skills × hasApi/hasDb/hasFrontend/hasDesignSystem flags.** The CHANGELOG flags the symptom: the v1.15 `--anthropic` registry intentionally ships *one file* because anything that goes through `interpolate()` or section stripping needs a "transformation-aware compare" that doesn't exist yet. As skill count grows 20→40→100, the count of (template × stack × tier × flag) combinations grows multiplicatively and the absence of transformation-aware diff means upgrade either drifts silently or floods users with `REVIEW_REQUIRED`. This is the architectural debt to watch.

2. **Pipeline complexity per tier.** Tier M's pipeline.md is 295 lines with 11 phases (0, 1, 1.5, 2, 3, 3b, 4, 5b, 5c, 5d, 6, 8, 8.5 — note: numbered 0 through 8.5 with multiple sub-phases, no Phase 7), three audit Tracks A/B/C inside Phase 5d, a "non-negotiable closing message," conditional Phase 4 activation, and a detailed Phase 8 commit sequence. Tier L is 14 phases. This is the kind of artifact that grows by accretion every release. Suggest a **phase budget** ceiling per tier and force consolidation before adding.

3. **Doctor check inflation.** 28 checks today, +1 per release on the trajectory shown (26→27 in 1.15, 27→28 in 1.16). Without a tier or severity grouping at the user output level, doctor becomes a "wall of warnings" and users learn to ignore it. The `--report` JSON change in 1.16 helps CI but not interactive users.

Less concerning but worth naming: the 295-line tier-M pipeline file lives alongside Tier L and Discovery variants. Drift between scaffolded files (in user projects) and template files (upstream) is the structural risk that the `--anthropic` flag is trying to address — keep watching this.

### 7. What should be removed
**Trim, not delete:**

- **The "Phase 8.5 - Context review + compact" section in tier-M pipeline.md.** C1–C12 (twelve checks, mix of grep-only and judgment) is too much process at the *end* of every block. This is the kind of section a team will silently drop in week two. Either fold C1–C3 into Phase 6 outcome checklist as machine-checkable items and delete C4–C12, or split context-review into its own optional skill invoked when triggered.

- **The "non-negotiable closing message" template** ("Block complete ✅ - [Block name]..."). Anthropic's house style for output is leaner than this and the CDK tool was supposed to *enforce* mechanical things, not require ceremonial ones. If you want a closing artifact, derive it from session state instead of asking the human to fill in a template that the agent could autogenerate.

- **Tier 0 "Discovery" might not pull its weight as a tier.** Per the README, "Discovery" is "Stop hook only" — i.e., one file. If a user is in pure exploration, the cost of a wizard run for one Stop hook is high. Consider collapsing Tier 0 to a single `npx mg-claude-dev-kit add hook stop` shortcut and reserving "tier" terminology for S/M/L.

- **`/skill-review` shipping in user scaffolds.** Looking at the README table, `/skill-review` is described as a "Quality review pipeline for skill portfolios" — that is a tool for CDK maintainers, not for end-user projects scaffolding their own work. If users aren't authoring skill portfolios, this skill is dead weight in their `.claude/skills/`. Confirm intended audience and either gate it behind `--include-meta-skills` or move it to a maintainer-only path.

- **Tier S vs Tier M distinction at the pipeline level might be too thin** to justify two separate template trees long-term. "4 steps with 1 scope-confirm" vs "8 phases with 2 STOP gates" — the gap is mostly about audit track invocation. Worth measuring: do real users on Tier S ever advance to M, or do they rewrite from scratch? If the latter, S is a leaky pre-tier and M is the real entry point.

### Overall assessment
CDK has a real, defensible insight (mechanical enforcement of test-passing inside the agent) and an unusually substantive skill library, but the bundle reveals a credibility gap between the marketing ("team-wide governance") and the implementation ("CLI-only enforcement, native rules tracked for v1.17+"). The architecture risks (template combinatorics, pipeline accretion, doctor inflation) are early-stage but real, and the single-maintainer + 2–3 real users data point should keep ambitions calibrated. The 1.16 release ships in a usable state and breaks no existing scaffolds, but the headline feature underdelivers on its own pitch.

SHIP-WITH-RESERVATIONS — release stands, but the team-settings runtime-enforcement gap is the next thing to close, ahead of any docs site or new skill.
