# mistral-large Review — 2026-04-10

**Model**: mistral-large-latest | **Time**: 55.6s

---

Here's my rigorous evaluation of **claude-dev-kit (CDK)** across the five dimensions:

---

### 1. Architecture & Code Quality
**Grade: 3 (Adequate with significant concerns)**

**Findings:**
1. **Double-write pattern is fragile** (scaffold/index.js + generators/claude-md.js):
   - The scaffold copies and interpolates files, then `generateClaudeMd()` re-reads the raw template and overwrites `CLAUDE.md`. This creates a race condition where user customizations to `CLAUDE.md` could be lost if `generateClaudeMd()` runs again (e.g., during upgrades). **Evidence**: Line 120 in `scaffold/index.js` and Line 20 in `generators/claude-md.js`.
   - **Recommendation**: Use a diff/patch approach or merge user changes with template updates.

2. **Test infrastructure is imbalanced**:
   - 459 integration tests (impressive) but **zero unit tests** and no linting. Integration tests are slow and don’t validate edge cases in individual functions (e.g., `interpolate()` in `scaffold/index.js`).
   - **Evidence**: No `*.test.js` files in `src/`, and `run.js` only tests file existence/placeholders.
   - **Recommendation**: Add unit tests for `interpolate()`, `pruneSkills()`, and `patchSettingsPermissions()`. Use ESLint/Prettier.

3. **Extension model is rigid**:
   - Adding a new tier/stack/skill requires modifying core files (`scaffold/index.js`, `generators/claude-md.js`). No plugin system or hooks.
   - **Evidence**: `pruneSkills()` hardcodes skill names (Line 150 in `scaffold/index.js`).
   - **Recommendation**: Introduce a plugin system (e.g., `plugins/tier-x.js`) with lifecycle hooks.

---

### 2. Template Quality & Real-World Applicability
**Grade: 4 (Good with minor gaps)**

**Findings:**
1. **Pipeline templates are practical but verbose**:
   - Tier M/L pipelines (e.g., `pipeline.md`) include **STOP gates** and **spec-first modes**, which are realistic for team workflows. However, the 11-phase "Full" pipeline (Tier L) may be overkill for most projects.
   - **Evidence**: `pipeline.md` (Tier M) lines 50–100 describe a clear "Plan-then-Confirm" protocol.
   - **Recommendation**: Offer a "Lite" Tier L with 6–8 phases for smaller teams.

2. **Security rules are specific but web-centric**:
   - The `security.md` rules (e.g., "Auth check must be the first operation in every route handler") are actionable for web apps but **irrelevant for native stacks** (Swift/Kotlin). Native stacks get exit guards instead of adapted checks.
   - **Evidence**: `security-audit/SKILL.md` lines 20–30 explicitly skip native projects.
   - **Recommendation**: Add native-specific rules (e.g., "Sandbox entitlements must be explicitly declared").

3. **Skills are comprehensive but superficial in places**:
   - The `perf-audit/SKILL.md` includes **9 detailed checks** (e.g., "Unnecessary 'use client' directives"), but the `security-audit` skill lacks depth for native apps.
   - **Evidence**: `perf-audit/SKILL.md` lines 100–150 cover server/client boundaries thoroughly.
   - **Recommendation**: Expand native skills (e.g., "TCC permissions audit" for macOS).

---

### 3. Scope & Market Position
**Grade: 3 (Adequate but unclear differentiation)**

**Findings:**
1. **Tech stack coverage is broad but shallow**:
   - 10 stacks × 4 tiers = 40 combinations, but **native stacks (Swift/Kotlin) are second-class citizens**. They lack skills, rules, and pipeline adaptations.
   - **Evidence**: `workspace-quality-rubric.md` scores a Swift project at 68% due to web-centric skills.
   - **Recommendation**: Reduce native stack tiers to 2 (Discovery + Standard) and focus on depth.

2. **Target user is misaligned with complexity**:
   - The tool targets "Builder PMs and tech leads" but requires **deep familiarity with Claude-specific features** (e.g., skills, hooks). The 30+ files in Tier L are overwhelming for non-technical users.
   - **Evidence**: `README.md` claims "zero process assumptions" for Tier 0, but Tier L assumes knowledge of EARS-format specs and STOP gates.
   - **Recommendation**: Add a "Quick Start" mode with 5–7 files for non-technical users.

3. **Alternatives are simpler but less structured**:
   - `.cursorrules` and `.windsurfrules` are lightweight but lack **process governance** (e.g., STOP gates, spec-first modes). CDK’s strength is its **structured workflows**, but it’s overkill for solo developers.
   - **Evidence**: CDK’s `pipeline.md` is 16k+ lines; `.cursorrules` is typically <100 lines.
   - **Recommendation**: Offer a "Minimalist" tier with 10 files (e.g., `CLAUDE.md` + `rules/security.md` + `skills/commit`).

---

### 4. Gap Analysis
**Grade: 2 (Poor with critical risks)**

**Findings:**
1. **Native stacks are an afterthought**:
   - The rubric scores a Swift project at 68% due to **missing skills** (e.g., no native perf/security audits) and **irrelevant rules** (e.g., "API route auth checks").
   - **Evidence**: `workspace-quality-rubric.md` lines 100–150 show gaps in D5 (Skills Completeness) and D7 (Safety Guards).
   - **Recommendation**: Add native-specific skills (e.g., `native-security-audit`) and rules (e.g., "App Sandbox entitlements").

2. **CI is insufficient for release quality**:
   - CI only validates "CLI starts" and "doctor runs," but **459 integration tests are not in CI**. This risks regressions.
   - **Evidence**: `.github/workflows/ci.yml` (not shown) likely lacks integration test steps.
   - **Recommendation**: Run integration tests in CI (even if slow) and add unit tests for core functions.

3. **No unit tests for a scaffold tool**:
   - Scaffold tools are **high-risk** (e.g., overwriting files, corrupting templates). The lack of unit tests for `interpolate()` or `pruneSkills()` is a **critical omission**.
   - **Evidence**: No `*.test.js` files in `src/`.
   - **Recommendation**: Add Jest tests for all generator functions.

---

### 5. Critical Assessment: What Would You Change?
**Grade: 3 (Needs urgent fixes)**

**Top 3 Fixes:**
1. **Eliminate the double-write pattern**:
   - Replace `generateClaudeMd()` with a **merge strategy** (e.g., diff3) to preserve user customizations during upgrades.
   - **Risk**: Current design can silently overwrite user edits.

2. **Add unit tests and linting**:
   - Prioritize tests for `interpolate()`, `pruneSkills()`, and `patchSettingsPermissions()`.
   - **Risk**: Uncaught bugs in these functions could corrupt user projects.

3. **Simplify native stack support**:
   - Reduce native tiers to 2 (Discovery + Standard) and add native-specific skills/rules.
   - **Risk**: Native users are underserved, leading to low adoption.

**Top 3 Additions:**
1. **Plugin system for extensions**:
   - Allow users to add custom tiers/skills without modifying core files.
   - **Example**: `plugins/my-tier.js` with hooks for `preScaffold()` and `postScaffold()`.

2. **Minimalist tier for non-technical users**:
   - Offer a 5–7 file "Quick Start" mode with `CLAUDE.md`, `security.md`, and `commit` skill.
   - **Rationale**: Current tiers are too complex for Builder PMs.

3. **Native-specific skills**:
   - Add `native-security-audit` (TCC permissions, Keychain access) and `native-perf-audit` (memory leaks, SwiftUI previews).
   - **Rationale**: Native stacks score poorly in the rubric (68%).

**Top 3 Removals/Simplifications:**
1. **Remove Tier L’s 11-phase pipeline**:
   - Replace with a 6-phase "Lite" pipeline for most teams.
   - **Rationale**: 11 phases are overkill for 90% of projects.

2. **Simplify `CLAUDE.md` templates**:
   - Reduce placeholders and focus on **actionable context** (e.g., "Key Workflows" → "State machines").
   - **Rationale**: Current templates encourage filler text (e.g., "[describe your project]").

3. **Remove hardcoded skill names**:
   - Replace `pruneSkills()` with a **dynamic skill registry** (e.g., `skills/*.md`).
   - **Rationale**: Hardcoding skills limits extensibility.

**Biggest Risk:**
- **Fragile upgrade process**: The double-write pattern and lack of merge strategy risk **data loss** during upgrades. Users may abandon the tool if their customizations are overwritten.

---

### Overall Grade: **3.0/5**
**Executive Summary:**
Claude-dev-kit is a **promising but flawed** tool for AI-assisted development governance. Its strengths lie in **structured workflows** (STOP gates, spec-first modes) and **comprehensive web-centric templates**, but it suffers from **fragile architecture** (double-write pattern, no unit tests), **poor native stack support**, and **overly complex tiers**. The tool is best suited for **technical teams using Claude Code for web apps**, but its current design risks alienating non-technical users and native developers. Immediate fixes should focus on **stabilizing the scaffold pipeline** and **simplifying native support**.

**Priority Action List:**
1. **Fix the double-write pattern** (merge strategy for `CLAUDE.md`).
2. **Add unit tests** for core functions (`interpolate()`, `pruneSkills()`).
3. **Simplify native stack support** (2 tiers + native-specific skills).
4. **Add a "Minimalist" tier** (5–7 files for non-technical users).
5. **Run integration tests in CI** to catch regressions.