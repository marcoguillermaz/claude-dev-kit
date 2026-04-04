# Quality Roadmap — Session File

**Branch**: `feat/quality-roadmap`
**Started**: 2026-04-04
**Status**: To Do
**Origin**: findings from `improvement-and-quality-check` session (Items 1-2 shipped in PR #43, research Items 3/4/7 completed)

---

## Context

CDK v1.7.0+ shipped with noise reduction and MIGRATION_COMMAND fix (271 integration checks). Research phase produced:
- Rubric re-score: 58.3% on mac-transcription-collector (native macOS/Swift project). Main gaps: web-centric skills, broken Stop hook command, uncustomized rules.
- Stack knowledge matrix: 11 skills analyzed across 10 stacks. perf-audit, security-audit, skill-dev identified as highest priority for adaptation.
- External LLM review prompt prepared, ready to execute.

These findings feed into 5 work items below.

---

## Items

### A. Fix low rubric score on mac-transcription-collector (from Item 3)

**Score**: 58.3% (target: >75%)
**Root causes**:
- D7 (Safety, weight 2x): Stop hook runs `xcodebuild test` without `-scheme` — always fails
- D8 (Coherence): Skills reference `lib/auth.ts`, Supabase, API routes — none exist in macOS project
- D5 (Skills): web templates in macOS project — security-audit checks RLS/routes, perf-audit exits
- D2 (Tech): broken test command across all files

**Actions**:
1. Fix Stop hook: CDK should interpolate project-specific test flags (e.g., `-scheme`) or detect-stack should capture them
2. Re-evaluate after Items B and C are implemented (stack-adapted skills will raise D5/D8)
3. User-side actions: fill domain terminology (D1), customize rules for local-app (D4)

**Depends on**: Items B, C

---

### B. Adapt perf-audit, security-audit, skill-dev for managed stacks (from Item 4)

**Priority**: High — directly impacts D5 score on all non-web projects

**perf-audit** (currently binary: web or exit):
- Add stack-specific profiling sections via interpolate placeholders
- Swift: Instruments, Time Profiler, Allocations, Energy Diagnostics
- Kotlin: Android Studio Profiler, systrace, LeakCanary
- Rust: cargo bench, cargo flamegraph, criterion
- Go: pprof, trace, benchmarks
- Python: cProfile, py-spy, memory_profiler
- Ruby: rack-mini-profiler, stackprof, derailed_benchmarks
- Java: JProfiler, VisualVM, JMH benchmarks
- dotnet: dotTrace, BenchmarkDotNet, PerfView
- Universal checks (all stacks): algorithmic complexity, memory allocation patterns, I/O bottlenecks

**security-audit** (currently Supabase/Next.js-specific):
- Separate auth check section by stack family
- Swift: Keychain API, App Transport Security, Data Protection, entitlements
- Kotlin: Android Keystore, EncryptedSharedPreferences, certificate pinning, ProGuard
- Rust: unsafe block audit, memory safety, dependency audit (cargo audit)
- Go: input validation, goroutine leaks, crypto library usage
- Python: injection (SQL, command), pickle deserialization, dependency audit (safety/pip-audit)
- Ruby: mass assignment, CSRF, Brakeman checks
- Java: deserialization, SQL injection, dependency audit (OWASP dependency-check)
- dotnet: configuration secrets, anti-forgery tokens, dependency audit

**skill-dev** (currently exits for non-web):
- Remove exit guard — code quality is universal
- Keep language-specific skip list (D1 Next.js imports, D9 useEffect = React only)
- Add language-specific checks:
  - Rust: clippy warnings, unnecessary clones, lifetime complexity
  - Go: go vet, errcheck, staticcheck patterns
  - Python: pylint/ruff patterns, type hint coverage
  - Swift: SwiftLint patterns, force unwrap audit
  - Kotlin: detekt patterns, null safety violations

**Implementation approach**: extend `interpolate()` with new placeholders:
- `[PERF_TOOL]`, `[PROFILER_COMMAND]` — per stack
- `[SECURITY_CHECKLIST_ITEMS]` — per stack family
- `[LINT_COMMAND]` — per stack
Mirrors existing `languageFromStack()` / `securityRuleVariant()` pattern.

**Files to modify**:
- `packages/cli/src/scaffold/index.js` — new interpolation maps
- `packages/cli/templates/tier-m/.claude/skills/perf-audit/SKILL.md`
- `packages/cli/templates/tier-m/.claude/skills/security-audit/SKILL.md`
- `packages/cli/templates/tier-m/.claude/skills/skill-dev/SKILL.md`
- Same for tier-l
- `packages/cli/test/integration/run.js` — new checks per stack

---

### C. Agnostic daily-use skills for all tiers (Phase 4 / Item 6)

**Obiettivo**: Tier S ha solo commit + arch-audit. Aggiungere skill adattate per uso quotidiano.

**Candidati per promozione a Tier S**:
1. `security-audit` (adapted per Item B) — security check is universal
2. `perf-audit` (adapted per Item B) — profiling is universal
3. Nuovo skill `simplify` — lightweight code review, stack-agnostico

**Implementation**:
- Copiare SKILL.md adattati in `templates/tier-s/.claude/skills/`
- Aggiornare `injectActiveSkills()` in `claude-md.js` per tier S
- Aggiornare integration tests
- Aggiornare FIRST_SESSION.md tier-s

**Depends on**: Item B (skills must be stack-adapted before promoting to all tiers)

---

### D. CI functional tests with rubric validation (Phase 3 / Item 5)

**Obiettivo**: validare output scaffold contro criteri rubric D1-D8 in CI.

**Sub-tasks**:

**D1. Script test in package.json**
- `"test": "node test/integration/run.js"` in `packages/cli/package.json`

**D2. Rubric check functions**
Automatable checks per dimensione:
- D1: `## Overview` presente, `[PROJECT_NAME]` risolto
- D2: nessun `[*_COMMAND]` placeholder, nessun npm in stack nativi
- D3: STOP gate count per tier (M>=2, L>=4)
- D4: security.md presente con variante corretta, regole in file separati
- D5: skill coerenti con feature flags
- D6: CLAUDE.md line count < 200 (fail) / < 100 (warn)
- D7: stop hook presente e risolto, deny list non-vuota
- D8: test command coerente tra CLAUDE.md e settings.json

**D3. Nuovi scenari per stack**
- 10 stack x tier-m = 10 nuovi scenari con scoring rubric

**D4. CI pipeline integration**
- Aggiungere `Run integration tests` a `.github/workflows/ci.yml`
- Soglia: D-score >= 1 per dimensione, overall >= 70%

---

### E. External LLM quality review (Item 7)

**Status**: Prompt pronto in `.claude/initiatives/external-review-prompt.md`

**Azioni**:
1. Eseguire il prompt su GPT-4, Gemini Pro, Mistral Large
2. Raccogliere risposte
3. Creare documento di sintesi con consensus findings
4. Estrarre priority action items
5. Aggiornare roadmap con findings

---

## Piano Esecutivo

```
Item B (skill adaptation)  →  Item C (tier S promotion)  →  Item A (re-score)
Item D (CI rubric tests)   →  (parallel, no dependency on B/C)
Item E (external review)   →  (parallel, no dependency)
```

**Priorita suggerita**:
1. Item B — massimo impatto su rubric score e qualita output
2. Item D — infrastruttura CI, previene regressioni
3. Item C — estende valore a Tier S
4. Item E — prospettiva esterna, informa roadmap
5. Item A — validazione finale dopo B+C

---

## Checkpoint

- [ ] Item A: Re-score mac-transcription-collector >75%
- [ ] Item B: perf-audit adapted for 10 stacks
- [ ] Item B: security-audit adapted for 10 stacks
- [ ] Item B: skill-dev adapted for 10 stacks
- [ ] Item C: Tier S skills promoted (3-4 skills)
- [ ] Item D: CI rubric tests integrated
- [ ] Item E: External LLM review executed and synthesized
