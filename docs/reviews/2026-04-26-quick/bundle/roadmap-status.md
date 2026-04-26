# Roadmap Status — Q1-Q4 2026

Single source of truth for development status of roadmap items.
Updated at block start (start date) and block closure (end date, PR).
**Prioritization**: ICE framework (Impact × Confidence × Ease, scored 2026-04-17).

**GitHub Project**: claude-dev-kit Roadmap (project #1)
**Milestones**: Q1 (#1), Q2 (#2), Q3 (#3), Q4 (#4)

## Strategic frame

**Target segments**: solo devs (Tier S) -> small teams (Tier M) -> enterprise (Tier L)
**Distribution**: open-source CLI (MIT) + paid SaaS layer
**Defensible moat**: (1) mechanical enforcement (STOP hooks, test gating), (2) stack-aware depth (11 stacks x 4 tiers), (3) cross-project governance (analytics, compliance, historical data)
**Positioning**: Claude Code only - maximum depth, no multi-tool dilution

---

## Q1 — Foundation and de-risking (closed)

| # | Issue | Title | Status | Start | End | PR |
|---|---|---|---|---|---|---|
| 1 | — | Template engine refactor (skill-registry.js) | Done | 2026-03-28 | 2026-04-02 | #46 |
| 2 | #55 | Skill scaffolder CLI (`cdk new skill`) | Done | 2026-04-12 | 2026-04-12 | #73 |
| 3 | #56 | Anthropic drift tracker (GitHub Action) | Done | 2026-04-12 | 2026-04-12 | #74 |
| 4 | #62 | Agent-to-skill conversion | Done | 2026-04-12 | 2026-04-12 | #75 |
| 5a | #58 | New skill: /test-audit | Done | 2026-04-13 | 2026-04-13 | #79 |
| 5b | #59 | New skill: /migration-audit | Done | 2026-04-13 | 2026-04-13 | #76 |
| 5c | #60 | New skill: /accessibility-audit | Done | 2026-04-13 | 2026-04-13 | #77, #78 |
| 6 | — | Tier L freeze policy | Done | 2026-04-08 | 2026-04-10 | #44 |
| 7 | — | Pipeline v2: body purity + reference files (17 skills) | Done | 2026-04-14 | 2026-04-17 | #87 |
| 8 | — | New skill: /skill-review (quality review pipeline) | Done | 2026-04-14 | 2026-04-17 | #87 |

## Q2 — Correctness, documentation, skill breadth

| # | Issue | Title | ICE | Status | Start | End | PR |
|---|---|---|---|---|---|---|---|
| 1 | — | `add skill` / `add rule` commands | — | Done | 2026-04-05 | 2026-04-08 | #46 |
| 2 | #90 | Anthropic spec compliance: `allowed-tools` syntax fix + progressive disclosure (>500 lines) | 441 | Done | 2026-04-24 | 2026-04-24 | v1.11.0 |
| 3 | #57 | Public documentation site (VitePress) | 432 | Open | — | — | — |
| 4 | #61 | New skill: /doc-audit (Q1 spillover) | 320 | Done | 2026-04-24 | 2026-04-24 | #112 |
| 5 | #91 | `doctor` expansion: cross-file scaffold validation (skill↔CLAUDE.md↔settings.json) | 294 | Done | 2026-04-24 | 2026-04-24 | v1.12.0 |
| 6 | — | CONTRIBUTING.md overhaul | 256 | Done | 2026-04-02 | 2026-04-25 | #46 + #114 |
| 7 | #66 | New skills: /compliance-audit, /api-contract-audit, /infra-audit | 245 | Done | 2026-04-25 | 2026-04-25 | #113 |
| 8 | — | External review prompt template: update to v1.10.0 + parameterize | 162 | Open | — | — | — |

## Q3 — Community, DX, team primitives

| # | Issue | Title | ICE | Status | Start | End | PR |
|---|---|---|---|---|---|---|---|
| 1 | #92 | Expand to 20+ skills total | 210 | Done | — | 2026-04-25 | reached via v1.13.0 + v1.14.0 |
| 2 | #93 | `upgrade --anthropic` auto-upgrade command | 210 | Open | — | — | — |
| 3 | #94 | `team-settings.json` (org-wide skill and model restrictions) | 175 | Open | — | — | — |
| 4 | — | MCP ecosystem reassessment | 168 | Open | — | — | — |
| 5 | #64 | `cdk sync` command | 120 | Open | — | — | — |
| 6 | #97 | Enterprise skills: /dependency-audit, /debt-triage, /privacy-audit | 112 | Open | — | — | — |
| 7 | #95 | VS Code extension (rule/skill management, doctor integration) | 105 | Open | — | — | — |
| 8 | #96 | Deep stack specialization for 3 priority stacks | 105 | Open | — | — | — |
| 9 | #65 | First Contribution campaign | 90 | Open | — | — | — |

## Q4 — Ecosystem and SaaS exploration

| # | Issue | Title | ICE | Status | Start | End | PR |
|---|---|---|---|---|---|---|---|
| 1 | #67 | Opt-in CLI telemetry | 100 | Open | — | — | — |
| 2 | #99 | Public skill registry on docs site | 96 | Open | — | — | — |
| 3 | — | Case study program (5+ anonymized case studies) | 84 | Open | — | — | — |
| 4 | — | Formal Anthropic partnership pitch | 60 | Open | — | — | — |
| 5 | #98 | `cdk sync` automation via GitHub Action | 60 | Open | — | — | — |
| 6 | #63 | SaaS MVP: web wizard + dashboard | 54 | Open | — | — | — |

## Backlog — Unscheduled (dependency-blocked or demand-unvalidated)

| # | Title | ICE | Blocker |
|---|---|---|---|
| 1 | Skill analytics dashboard (usage, pass/fail, time-to-remediate) | 54 | Needs user base + data pipeline |
| 2 | GitHub MCP for pipeline merge/push (#68) | 48 | MCP ecosystem immature |
| 3 | SSO integration (GitHub/GitLab OAuth for teams) | 45 | Depends on SaaS MVP |
| 4 | Compliance reporting with profiles (SOC 2, HIPAA, GDPR) | 32 | No enterprise customers to validate profiles |
| 5 | Custom STOP gate configuration via SaaS UI | 20 | Depends on SaaS MVP |
| 6 | SaaS general availability (billing, hardened, documented) | 18 | Depends on SaaS MVP |

---

## Skill expansion plan

Priority-ranked by ICE score. Original 3-model consensus (GPT-4.1, Gemini 2.5 Pro, Mistral Large) used for skill selection; ICE used for sequencing.

| Rank | Skill | Target Q | Status |
|---|---|---|---|
| 1 | /test-audit | Q1 | Done (PR #79) |
| 2 | /migration-audit | Q1 | Done (PR #76) |
| 3 | /accessibility-audit | Q1 | Done (PR #77) |
| 4 | /doc-audit | Q2 | Done (PR #112) |
| 5 | /compliance-audit | Q2 | Done (PR #113, GDPR active) |
| 6 | /api-contract-audit | Q2 | Done (PR #113) |
| 7 | /infra-audit | Q2 | Done (PR #113) |
| 8 | /dependency-audit | Q3 | Open (#97) |
| 9 | /debt-triage | Q3 | Open (#97) |
| 10 | /privacy-audit | Q3 | Open (#97) |

---

## Source files for open items

Reference material preserved for when roadmap items are worked on.

| File | Covers roadmap item |
|---|---|
| `docs/reviews/anthropic-spec-deviations.md` | Q2 #2 — `allowed-tools` syntax (§2.4), file >500 lines (§2.5), spec reference table (§1) |
| `docs/reviews/scaffold-verification-prompt.md` | Q2 #5 — 5-section checklist (A-E) for post-scaffold validation |
| `docs/reviews/external-review-prompt-v1.9.md` | Q2 #8 — 7-question template, needs version number update |

---

## ICE scoring reference

Scored 2026-04-17. Formula: Impact (1-10) × Confidence (1-10) × Ease (1-10).

| Item | I | C | E | ICE |
|---|---|---|---|---|
| Anthropic spec compliance | 7 | 9 | 7 | 441 |
| Public docs site (VitePress) | 9 | 8 | 6 | 432 |
| /doc-audit | 5 | 8 | 8 | 320 |
| Doctor expansion | 6 | 7 | 7 | 294 |
| CONTRIBUTING.md overhaul | 4 | 8 | 8 | 256 |
| New skills Q2 (compliance, api-contract, infra) | 7 | 7 | 5 | 245 |
| Expand to 20+ skills | 6 | 7 | 5 | 210 |
| `upgrade --anthropic` | 5 | 7 | 6 | 210 |
| `team-settings.json` | 7 | 5 | 5 | 175 |
| MCP ecosystem reassessment | 4 | 6 | 7 | 168 |
| External review prompt update | 2 | 9 | 9 | 162 |
| `cdk sync` | 6 | 4 | 5 | 120 |
| Enterprise skills Q3 | 7 | 4 | 4 | 112 |
| VS Code extension | 7 | 5 | 3 | 105 |
| Deep stack specialization | 7 | 5 | 3 | 105 |
| Opt-in CLI telemetry | 5 | 4 | 5 | 100 |
| Public skill registry | 6 | 4 | 4 | 96 |
| First Contribution campaign | 6 | 3 | 5 | 90 |
| Case study program | 7 | 3 | 4 | 84 |
| Anthropic partnership pitch | 10 | 2 | 3 | 60 |
| `cdk sync` via GitHub Action | 5 | 3 | 4 | 60 |
| SaaS MVP | 9 | 3 | 2 | 54 |
| Skill analytics dashboard | 6 | 3 | 3 | 54 |
| GitHub MCP | 4 | 3 | 4 | 48 |
| SSO integration | 5 | 3 | 3 | 45 |
| Compliance reporting | 8 | 2 | 2 | 32 |
| Custom STOP gate via SaaS | 5 | 2 | 2 | 20 |
| SaaS GA | 9 | 2 | 1 | 18 |
