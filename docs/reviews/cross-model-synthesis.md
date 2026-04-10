# Cross-Model Synthesis - CDK External Review

**Date**: 2026-04-10
**Models**: GPT-4.1, Gemini 2.5 Pro, Mistral Large, Perplexity sonar-pro
**Purpose**: independent critical assessment - checklist for alignment block

---

## Score summary

| Dimension | GPT-4.1 | Gemini 2.5 Pro | Mistral Large | Avg |
|---|---|---|---|---|
| 1. Architecture & Code Quality | 2 | 3 | 3 | 2.7 |
| 2. Template Quality & Applicability | 3 | 5 | 4 | 4.0 |
| 3. Scope & Market Position | 4 | 4 | 3 | 3.7 |
| 4. Gap Analysis | 2 | 2 | 2 | 2.0 |
| 5. Critical Assessment | 2 | 3 | 3 | 2.7 |
| **Overall** | **2.6** | **3.4** | **3.0** | **3.0** |

**Strongest dimension**: Template quality (4.0) - all models recognize pipeline design, security rules, and skills as the project's core strength. Gemini calls them "the crown jewel" (5/5).

**Weakest dimension**: Gap analysis (2.0) - unanimous. Native support, CI coverage, and test strategy have critical holes.

**Notable**: GPT-4.1 is the harshest reviewer (2.6 overall). With the better model, architecture dropped from 3 to 2 and templates from 4 to 3 - the analysis is more specific about separation-of-concerns issues and native coverage gaps.

---

## Consensus findings (3/3 models agree)

### C1 - Double-write pattern is the biggest architectural risk

`scaffold/index.js` copies and interpolates all template files including CLAUDE.md. Then `generateClaudeMd()` in `claude-md.js` re-reads the raw template and overwrites the file with its own logic. Two code paths produce the same file. Changes in one path are silently lost by the other.

- **GPT-4.1**: "fragile - changes made between the two writes are lost. Creates risk of race conditions"
- **Gemini**: "most significant architectural flaw - creates two sources of truth, directly violating DRY"
- **Mistral**: "creates a race condition where user edits could be lost"

**Action**: consolidate CLAUDE.md generation into a single authoritative function.

### C2 - Zero unit tests for complex core functions

`interpolate()`, `pruneSkills()`, `patchSettingsPermissions()`, `securityRuleVariant()` contain branching logic across 10 stacks and 4 tiers. No unit tests exist.

- **GPT-4.1**: "not sufficient for a tool with complex file system and template logic"
- **Gemini**: "refactoring is high-risk and debugging failures is slow"
- **Mistral**: "459 integration checks validate file structures but ignore edge cases (malformed config, partial writes)"

**Action**: add unit test suite targeting the 4 core functions.

### C3 - Integration tests not in CI

459 checks exist locally. GitHub Actions runs only "CLI starts" + "doctor runs". A broken scaffold for any stack/tier ships undetected.

- **GPT-4.1**: "regressions in file structure or placeholder resolution could go undetected"
- **Gemini**: "critical process failure - a code change could break 9 of 10 stacks"
- **Mistral**: "risks regressions"

**Action**: add `node packages/cli/test/integration/run.js` to CI workflow.

### C4 - Native stacks are second-class citizens

Swift, Kotlin, Rust get exit guards in skills instead of real checks. Rubric scored Swift at 68%. Security-audit and perf-audit bail out for native apps.

- **GPT-4.1**: "not acceptable - native teams get little to no actionable guidance"
- **Gemini**: "claiming support for Swift and Kotlin is misleading when the core value doesn't function"
- **Mistral**: "native stacks lack tier-specific adaptations"

**Action**: build real native checks or reclassify native support as experimental.

### C5 - No linting or formatting

All three models flag absence of ESLint/Prettier as basic hygiene gap.

**Action**: add ESLint + Prettier, enforce in CI.

### C6 - Extension model is rigid

Adding a new tier/stack/skill requires changes across 5+ files. No manifest, no plugin system.

- **GPT-4.1**: "no metadata or manifest describing tiers - adding a new tier requires manual directory and code changes"
- **Gemini**: "pattern is clear and repeatable but requires changes in several places"
- **Mistral**: "pruneSkills() hardcodes skill names, making extensions brittle"

**Action**: evaluate manifest-driven approach. Lower priority than C1-C5.

---

## Majority findings (2/3 models)

### M1 - Tier L pipeline may be too complex

Gemini and Mistral flag 11 phases as potentially overkill. GPT-4.1 notes "process fatigue" risk.

**Assessment**: the tiered model already offers simpler options (Tier S/M). Monitor for user feedback.

### M2 - Missing CI/runtime enforcement

GPT-4.1 and Gemini both suggest a `cdk audit --ci` command to bridge local governance and CI pipelines.

**Assessment**: strong product idea. Add to roadmap Phase 4.

### M3 - Cursor/Windsurf interop

Mistral and GPT-4.1 both note CDK doesn't export to `.cursorrules` or `.windsurfrules`.

**Assessment**: low effort, high reach. Worth exploring after core fixes.

---

## Divergent findings

| Finding | Model | Assessment |
|---|---|---|
| Template quality is "crown jewel" (5/5) | Gemini only | GPT-4.1 gives 3/5, Mistral 4/5. Gemini had full payload and saw more depth. |
| Manifest/metadata system for extension | GPT-4.1 only | Good idea but premature without community contributors. |
| Merge Tier 0 into Tier S | Mistral only | Disagree - Tier 0 serves a distinct discovery purpose (3 files vs 4-step pipeline). |
| Consolidate perf-audit + security-audit | Mistral only | Disagree - separation allows targeted execution. |
| Interactive `cdk configure` wizard | Gemini only | Good UX. Lower priority than core fixes. |

---

## Market intelligence (Perplexity sonar-pro)

### Competitive landscape

**No direct competitor** for multi-tier, multi-IDE governance scaffolding.

| Tool | Focus | Gap vs CDK |
|---|---|---|
| @paulduvall/claude-dev-toolkit | Custom commands, security hooks | Single-tool, no tiers, no multi-stack |
| carlrannaberg/claudekit | Session hooks, context tools | Navigation focus, not governance |
| @constellos/claude-code-kit | TypeScript SDK for extensions | Developer SDK, not end-user scaffold |

No .cursorrules generators, .windsurfrules scaffolders, or "AI coding governance" frameworks found.

### Demand signals

- **Weak explicit demand**: no public discussions on structured AI governance
- **Indirect**: security hooks and config templates gaining traction in npm ecosystem
- **Recommendation**: seed discussions on r/ClaudeAI, r/cursor

### Distribution and positioning

- npm CLI is standard - no competitor has IDE extensions
- Strongest differentiator: multi-tier + multi-IDE + multi-stack
- Target persona (Builder PM / tech lead) validated
- Positioning: "universal AI dev governance CLI"

---

## Alignment block checklist

### Phase 1 - Foundation (CI + test infrastructure)

| # | Action | Addresses | Effort |
|---|---|---|---|
| 1.1 | Add integration tests to CI workflow | C3 | S |
| 1.2 | Add ESLint + Prettier, enforce in CI | C5 | S |
| 1.3 | Add unit test framework (Node test runner) | C2 | S |
| 1.4 | Unit tests for `interpolate()` - all 10 stacks + edge cases | C2 | M |
| 1.5 | Unit tests for `pruneSkills()`, `patchSettingsPermissions()`, `securityRuleVariant()` | C2 | M |

### Phase 2 - Architecture (double-write elimination)

| # | Action | Addresses | Effort |
|---|---|---|---|
| 2.1 | Audit current CLAUDE.md generation flow end-to-end | C1 | S |
| 2.2 | `scaffoldTier()` copies all files except CLAUDE.md | C1 | M |
| 2.3 | Single `generateClaudeMd()` produces final CLAUDE.md from raw template | C1 | M |
| 2.4 | Verify 459 integration checks pass after refactor | C1 | S |
| 2.5 | Unit tests for refactored generation path | C1, C2 | S |

### Phase 3 - Native stack depth

| # | Action | Addresses | Effort |
|---|---|---|---|
| 3.1 | Design native security-audit checks (Keychain, TCC, entitlements, sandbox, signing) | C4 | M |
| 3.2 | Design native perf-audit checks (memory, Instruments, launch time, SwiftUI) | C4 | M |
| 3.3 | Implement security-audit native path (replace exit guard) | C4 | L |
| 3.4 | Implement perf-audit native path | C4 | L |
| 3.5 | Re-run rubric on mac-transcription-collector - target >= 80% | C4 | S |
| 3.6 | Update README and rubric docs | C4 | S |

### Phase 4 - Roadmap (from majority/divergent findings)

| # | Action | Source | Priority |
|---|---|---|---|
| 4.1 | Design `cdk audit --ci` command | M2 (GPT-4.1 + Gemini) | High |
| 4.2 | Evaluate .cursorrules/.windsurfrules export | M3 (Mistral + GPT-4.1) | Medium |
| 4.3 | Seed community discussions (r/ClaudeAI, r/cursor) | Perplexity | Medium |
| 4.4 | Evaluate manifest-driven extension model | C6 | Low |
| 4.5 | Design `cdk configure` interactive wizard | Gemini | Low |

---

## Review execution metadata

| Model | Payload | Time | Notes |
|---|---|---|---|
| GPT-4.1 | compact (6K/file) | 38.0s | OpenAI Tier 1 (30K TPM) - truncated. Harshest reviewer. |
| Gemini 2.5 Pro | full | 84.1s | Best detail, most specific evidence. Only 5/5 for templates. |
| Mistral Large | compact (6K/file) | 51.2s | Free tier, 500 on first attempt, succeeded on retry. |
| Perplexity sonar-pro | search prompt | 18.0s | 7 sources cited. Market data thin - early-stage category. |

**Payload note**: GPT-4.1 and Mistral received files truncated at 6K chars each. Their line-number citations are approximate. Gemini received the full ~214KB payload and produced the most grounded analysis. When OpenAI tier increases (>$50 spend), re-run with full payload for all.

**Re-run target**: after Phase 1-2, re-run to measure improvement. Goal: overall >= 4.0.
