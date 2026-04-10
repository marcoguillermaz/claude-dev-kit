# mistral-large-latest Review — 2026-04-10

**Model**: mistral-large-latest | **Time**: 51.2s

---

Here's my rigorous evaluation of **claude-dev-kit (CDK)** across the five dimensions:

---

### 1. Architecture & Code Quality
**Grade: 3/5**

**Findings:**
1. **Double-write pattern is fragile** (scaffold/index.js + generators/claude-md.js):
   - The scaffold copies and interpolates files, then `generateClaudeMd()` re-reads the raw template and overwrites `CLAUDE.md`. This creates a race condition where user edits to `CLAUDE.md` between these steps could be lost (evidenced in `scaffoldTier()` and `generateClaudeMd()`).
   - **Evidence**: Line 120 in `scaffold/index.js` writes interpolated content, then `generateClaudeMd()` (line 20) overwrites it without checking for existing content.

2. **Test infrastructure is integration-heavy but lacks unit tests**:
   - 459 integration checks (run.js) validate file structures but ignore edge cases (e.g., malformed config, partial writes).
   - **Evidence**: No unit tests for `interpolate()`, `securityRuleVariant()`, or `pruneSkills()` functions, which contain complex logic.

3. **Extension model is rigid**:
   - Adding a new tier/stack requires modifying 5+ files (templates, generators, scaffold logic).
   - **Evidence**: `pruneSkills()` (line 150 in scaffold/index.js) hardcodes skill names, making extensions brittle.

**Recommendations:**
- Replace the double-write with a single-pass interpolation or use a diff/patch system.
- Add unit tests for core functions (e.g., `interpolate()`, `pruneSkills()`).
- Decouple tier/stack definitions from scaffold logic (e.g., use a manifest file).

---

### 2. Template Quality & Real-World Applicability
**Grade: 4/5**

**Findings:**
1. **Pipeline templates are practical but web-centric**:
   - Tier M/L pipelines (pipeline.md) include useful STOP gates and spec-first modes, but native stacks (Swift/Kotlin) get generic "exit guards" instead of adapted workflows.
   - **Evidence**: Line 45 in `pipeline.md` auto-selects "Spec-first" mode for Tier 2 sweeps, but native stacks lack equivalent patterns.

2. **Security rules are specific but lack depth for native stacks**:
   - Web rules (security.md) cover auth, input validation, and secrets well, but native variants (e.g., `security-native-apple.md`) are superficial.
   - **Evidence**: Line 10 in `security-audit/SKILL.md` stops audits for native apps with no guidance on entitlements or TCC permissions.

3. **Skills are comprehensive but overfit to Next.js/Supabase**:
   - `perf-audit/SKILL.md` assumes Next.js (e.g., `use client` checks) and ignores native performance tools (Instruments, Android Profiler).
   - **Evidence**: Line 50 in `perf-audit/SKILL.md` hardcodes `@next/bundle-analyzer` as the default tool.

**Recommendations:**
- Add native-specific pipeline phases (e.g., "App Sandbox Review" for Swift).
- Expand native security rules to cover platform-specific risks (e.g., Keychain access, JIT hardening).
- Make skills stack-agnostic (e.g., replace `use client` checks with generic "client/server boundary" logic).

---

### 3. Scope & Market Position
**Grade: 3/5**

**Findings:**
1. **Tech stack coverage is broad but shallow**:
   - 10 stacks × 4 tiers = 40 combinations, but native stacks (Swift/Kotlin) lack tier-specific adaptations.
   - **Evidence**: `workspace-quality-rubric.md` scores a Swift project at 68% due to web-centric skills.

2. **Target user is misaligned with tool complexity**:
   - "Builder PM and tech lead" may struggle with 30+ files in Tier L, but the tool lacks a "guided mode" for non-technical users.
   - **Evidence**: `README.md` claims simplicity but Tier L includes 11 pipeline phases and 4 STOP gates.

3. **Alternatives are simpler but less structured**:
   - `.cursorrules` and `.windsurfrules` are lightweight but lack CDK’s governance layers (e.g., STOP gates, skills).
   - **Gap**: CDK doesn’t support Cursor’s "rulesets" or Windsurf’s "context files" natively.

**Recommendations:**
- Add a "Lite" tier (10 files) for non-technical users.
- Integrate with Cursor/Windsurf via plugins (e.g., export CDK rules to `.cursorrules`).
- Focus on 3–4 stacks (Node/Python/Swift/Kotlin) and deepen their support.

---

### 4. Gap Analysis
**Grade: 2/5**

**Findings:**
1. **Native stacks are second-class citizens**:
   - Skills and rules default to web patterns, leaving native projects with superficial guidance.
   - **Evidence**: `security-audit/SKILL.md` (line 10) exits early for native apps with no alternative.

2. **CI/CD integration is minimal**:
   - `doctor` checks are not enforced in CI (only "CLI starts" is validated).
   - **Evidence**: `ci.yml` (not shown) only runs `doctor --ci`, ignoring 459 integration tests.

3. **No unit tests for core logic**:
   - Scaffold functions (e.g., `pruneSkills()`) lack unit tests, risking regressions.
   - **Evidence**: `run.js` tests file structures but not edge cases (e.g., malformed config).

**Recommendations:**
- Add native-specific skills (e.g., "App Sandbox Audit" for Swift).
- Enforce `doctor` checks in CI and add unit tests for scaffold functions.
- Document stack-specific limitations (e.g., "Swift projects score ~70% on the rubric").

---

### 5. Critical Assessment: What Would You Change?
**Grade: 3/5 (Current State)**

**Top 3 Fixes:**
1. **Eliminate the double-write pattern**:
   - Replace with a single-pass interpolation or use a diff/patch system to avoid overwriting user edits.

2. **Add native stack parity**:
   - Create native-specific pipeline phases (e.g., "App Store Review" for Swift) and skills (e.g., "TCC Permissions Audit").

3. **Enforce CI/CD for integration tests**:
   - Run the 459 integration tests in CI to catch regressions early.

**Top 3 Additions:**
1. **Guided mode for non-technical users**:
   - Add a "Lite" tier with 10 files and interactive setup (e.g., "Explain your project in 3 sentences").

2. **Stack-agnostic skills**:
   - Replace Next.js-specific checks (e.g., `use client`) with generic patterns (e.g., "client/server boundary").

3. **Cursor/Windsurf integration**:
   - Export CDK rules to `.cursorrules` or `.windsurfrules` for cross-tool compatibility.

**Remove/Simplify:**
- **Tier 0 (Discovery)**: Redundant with Tier S (3 files vs. 5 files). Merge into a single "Minimal" tier.
- **Overlapping skills**: Consolidate `perf-audit` and `security-audit` into a single "Audit" skill with stack-specific variants.

**Biggest Risk:**
- **Fragile scaffold pipeline**: The double-write pattern and lack of unit tests could lead to data loss or regressions in production.

---

### Overall Grade: **3.0/5**
**Executive Summary:**
Claude-dev-kit is a **promising but uneven** tool for AI-assisted development governance. Its strengths lie in structured pipelines (Tier M/L) and web-centric security/performance skills, but it suffers from architectural fragility (double-write pattern), shallow native stack support, and misaligned complexity for its target users. The tool’s 40-stack matrix is ambitious but spreads its quality thin, particularly for native projects. Immediate priorities should focus on fixing the scaffold pipeline, deepening native stack support, and simplifying the user experience.

**Priority Action List:**
1. Replace the double-write pattern with a single-pass interpolation system.
2. Add native-specific pipeline phases and skills (e.g., "App Sandbox Review" for Swift).
3. Enforce CI/CD for integration tests and add unit tests for core functions.
4. Create a "Lite" tier (10 files) for non-technical users.
5. Document stack-specific limitations (e.g., "Swift projects score ~70% on the rubric").