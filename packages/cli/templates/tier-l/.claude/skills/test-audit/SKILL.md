---
name: test-audit
description: Static test-suite quality audit - coverage from lcov/Istanbul/Cobertura/go/tarpaulin reports, pyramid shape (unit/integration/e2e ratio), anti-patterns (.only leaks, skipped tests, no-assertion tests, hardcoded sleeps). Stack-aware across 11 supported stacks.
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:path:<dir>|target:file:<glob>|target:coverage:<path>|mode:all]
allowed-tools: Read, Glob, Grep, Bash
---

## Scope for v1

- **Static analysis only.** Parses coverage reports produced by the project's test runner. Does not execute tests, does not re-run the suite, does not query CI history.
- **Flaky-test detection is deferred.** Detecting non-deterministic failures requires multiple runs or CI-history access, both out of scope for the first ship. Tracked as future-work item `TEST-flake-detection`.
- **Live flake / performance probes**: revisit after real usage.

---

## Configuration (adapt before first run)

> Replace these placeholders:
> - `[TEST_PATH]` - primary location of test files (e.g. `src/**/*.test.ts`, `tests/`, `spec/`, `Tests/`, `src/test/`)
> - `[COVERAGE_PATH]` - location of coverage reports if non-standard (e.g. `coverage/lcov.info`, `reports/coverage.xml`)
> - `[APP_SOURCE_PATH]` - path to application source (for colocated-test detection) - e.g. `src/`, `app/`, `lib/`

---

## Step 0 - Target resolution

Parse `$ARGUMENTS` for a `target:` or `mode:` token.

| Pattern | Meaning |
|---|---|
| `target:path:<dir>` | Audit tests under a specific directory only (e.g. `target:path:src/auth`) |
| `target:file:<glob>` | Audit files matching the glob (e.g. `target:file:**/*.integration.test.ts`) |
| `target:coverage:<path>` | Force a specific coverage report path instead of auto-detection |
| `mode:all` / no argument | **Full audit - every discovered test file and auto-detected coverage report.** |

**STRICT PARSING**: derive target ONLY from explicit text in `$ARGUMENTS`. Do NOT infer from conversation context, recent blocks, or memory.

Announce: `Running test-audit - scope: [FULL | target: <resolved>] - stack: <pending detection>`

---

## Step 1 - Stack detection

Detect the primary stack in this priority order. First matching marker wins.

| Stack | Marker file(s) |
|---|---|
| **node-ts** | `tsconfig.json` + `package.json` |
| **node-js** | `package.json` (no `tsconfig.json`) |
| **python** | `pyproject.toml` or `requirements.txt` or `setup.py` |
| **go** | `go.mod` |
| **rust** | `Cargo.toml` |
| **swift** | `Package.swift` or `*.xcodeproj` / `*.xcworkspace` |
| **kotlin** | `build.gradle.kts` or `build.gradle` with `kotlin(` plugin |
| **dotnet** | `*.csproj` or `*.sln` |
| **ruby** | `Gemfile` |
| **java** | `pom.xml` or `build.gradle` (no Kotlin plugin) |
| **generic** | None of the above |

If stack is **generic**: run T1-T8 with generic patterns only, skip framework-specific coverage parsing, announce `No known stack detected - running generic test-quality checks only.`

Update announcement: `Running test-audit - scope: [...] - stack: <detected>`

---

## Step 2 - Framework detection

Within the detected stack, identify the test framework. Parses `package.json` scripts, config files, and dependency declarations.

| Stack | Framework detection |
|---|---|
| **node-ts / node-js** | (a) `vitest` in `devDependencies` or `vitest.config.*` present -> **vitest** (b) `jest` in devDeps or `jest.config.*` -> **jest** (c) `mocha` in devDeps or `.mocharc*` -> **mocha** (d) `"test": "node --test"` in scripts -> **node:test** (e) none -> **unknown** |
| **python** | (a) `pytest` in `[tool.pytest.ini_options]` of `pyproject.toml` or `pytest.ini` -> **pytest** (b) `import unittest` in any test file -> **unittest** (c) none -> **unknown** |
| **go** | Always **testing** (stdlib). Presence of `testify` in `go.mod` noted. |
| **rust** | Always **cargo test**. Tarpaulin presence in dev-dependencies noted. |
| **swift** | (a) `import Testing` in any test file -> **swift-testing** (b) `import XCTest` -> **XCTest** (c) both -> **hybrid** |
| **kotlin** | (a) `kotest-` in dependencies -> **Kotest** (b) `junit` -> **JUnit** (c) none -> **unknown** |
| **dotnet** | (a) `xunit` NuGet package -> **xUnit** (b) `NUnit` -> **NUnit** (c) `MSTest.TestFramework` -> **MSTest** (d) none -> **unknown** |
| **ruby** | (a) `rspec` in `Gemfile` -> **RSpec** (b) `minitest` -> **Minitest** (c) none -> **unknown** |
| **java** | (a) `junit-jupiter` in `pom.xml` or `build.gradle` -> **JUnit 5** (b) `junit` 4.x -> **JUnit 4** (c) `testng` -> **TestNG** (d) none -> **unknown** |

Record: `Framework: <name>` - used to select the correct grep patterns in Step 6.

---

## Step 3 - Test file discovery

Glob by stack convention. Include both co-located and directory-based tests.

| Stack | Glob patterns |
|---|---|
| **node-ts / node-js** | `**/*.test.{ts,tsx,js,jsx,mjs}`, `**/*.spec.{ts,tsx,js,jsx,mjs}`, `**/__tests__/**/*.{ts,tsx,js,jsx,mjs}`, `tests/**/*.{ts,tsx,js,jsx,mjs}` |
| **python** | `test_*.py`, `*_test.py`, `tests/**/*.py` |
| **go** | `**/*_test.go` |
| **rust** | `tests/**/*.rs`, any `src/**/*.rs` with `#[cfg(test)]` module |
| **swift** | `Tests/**/*.swift`, `*Tests/**/*.swift` |
| **kotlin** | `src/test/**/*.kt`, `src/androidTest/**/*.kt` |
| **dotnet** | `**/*Tests*.cs`, `**/*Test.cs`, under any `*.Tests.csproj` |
| **ruby** | `spec/**/*_spec.rb`, `test/**/*_test.rb` |
| **java** | `src/test/**/*.java` |

Respect `target:path:` / `target:file:` if provided.

Announce: `Discovered N test files across K layers.`

If `N == 0`: output `No test files found. Skipping static checks. Coverage reports still parsed if available.` and continue to Step 4.

---

## Step 4 - Coverage report parsing (C1-C3)

Auto-detect coverage report formats. Honor `target:coverage:<path>` if provided.

### C1 - lcov.info (node, rust with tarpaulin --out Lcov)

Search paths: `coverage/lcov.info`, `coverage/lcov-report/`, `lcov.info`, `reports/lcov.info`.

Parse by scanning lines:
- `SF:<file>` starts a file block.
- `LF:<n>` = lines found, `LH:<n>` = lines hit. File coverage = `LH / LF * 100`.
- `BRF:<n>` = branches found, `BRH:<n>` = branches hit.
- `end_of_record` terminates the file block.

Report: total line %, total branch %, files < 50% (top 10 by SLOC), files at 0% (top 10).

### C2 - Istanbul JSON (node)

Search paths: `coverage/coverage-summary.json`, `coverage/coverage-final.json`.

Parse JSON. For `coverage-summary.json`: read the `total` key (`lines.pct`, `branches.pct`, `functions.pct`, `statements.pct`). For `coverage-final.json`: aggregate per-file `s` (statements) / `b` (branches) / `f` (functions).

Report: line %, branch %, function %, statement %.

### C3 - Cobertura XML (python, java, dotnet)

Search paths: `coverage.xml`, `cobertura.xml`, `coverage/cobertura-coverage.xml`, `build/reports/cobertura/coverage.xml`.

Parse XML: `<coverage line-rate="0.873" branch-rate="0.712">` at root. Per-package and per-class rates in child elements.

Report: line %, branch %, top uncovered classes.

### C3 (go) - `coverage.out`

Search paths: `coverage.out`, `cover.out`, `.coverage/coverage.out`.

Parse format: `mode: <mode>\n<file>:<start>,<end> <stmts> <count>`. Total % = `stmts_hit / stmts_total`. Use `Bash` with `go tool cover -func=<file>` if `go` is on PATH for a cleaner summary.

### C3 (rust) - tarpaulin JSON

Search paths: `tarpaulin-report.json`, `target/tarpaulin/report.json`.

Parse JSON: `files[].coverage` percentages, aggregate weighted by file SLOC.

### C3 (swift) - xcresult bundle *(optional)*

If `*.xcresult` directory exists AND `xcrun` is on PATH: run `xcrun xccov view --report --json <file>.xcresult` and parse JSON output. Skip gracefully if xcrun is unavailable (CI or Linux).

### Report format

```
## Coverage (source: <format>)
- Total lines: <X>%
- Branches: <Y>% (if available)
- Functions: <Z>% (if available)
- Files below 50%: <N>
- Files at 0%: <N>
```

### Severity mapping

- Total < 50% line coverage -> **High**
- Total < 80% line coverage -> **Medium**
- Any changed file in the current block at 0% coverage -> **Critical** (requires git diff cross-check; if git history unavailable, report as **High**)
- No coverage report detected -> nudge: `No coverage report detected. Pass target:coverage:<path> or run <test-command> with coverage flag to generate one.` - no severity, just a note.

---

## Step 5 - Pyramid shape (P1-P3)

Classify each test file discovered in Step 3:

| ID | Layer | Path / content heuristic |
|---|---|---|
| **P1** | Unit | Colocated `*.test.*` / `*.spec.*` next to source, or under `tests/unit/**`, `__tests__/**`, `test/unit/**`, `spec/unit/**`, `src/test/**/unit/**`. Default bucket if nothing else matches. |
| **P2** | Integration | Path contains `integration/`, or filename matches `*.integration.test.*` / `*.integration.spec.*` / `*_integration_test.*`. |
| **P3** | E2E | Path contains `e2e/`, `end-to-end/`, `uat/`, `system/`, or filename matches `*.e2e.*`. File imports `@playwright/test`, `cypress`, `detox`, `selenium`, `webdriverio`, `appium`, or (python) `playwright`, `splinter`. |

Compute `N_unit / N_integration / N_e2e` and their percentages of total.

**Verdicts** (target pyramid: ~70/20/10):

| Condition | Severity | Note |
|---|---|---|
| `N_e2e > 30%` | **Medium** | Inverted pyramid - E2E-heavy suite is slow and brittle |
| `N_integration > 50%` | **Medium** | Middle-heavy - consider splitting into unit vs E2E |
| `N_unit == 0 AND total > 0` | **High** | No unit tests - every change goes through slow layers |
| Only one layer present | **Medium** | Narrow coverage - regressions in untested layers will slip through |
| Within 50-85% unit / 10-35% integration / 2-20% E2E | **OK** | Report as balanced |

Report:

```
## Pyramid
- Unit: <N> (<P>%)
- Integration: <N> (<P>%)
- E2E: <N> (<P>%)
- Verdict: [balanced | inverted | middle-heavy | narrow | unit-absent]
```

---

## Step 6 - Static anti-pattern checks (T1-T8)

Run per stack. Checks without a stack-specific pattern produce `N/A - skipped for <stack>`, not false positives.

### T1 - `.only` / `fit` / `fdescribe` committed

**Critical.** Focused tests in committed code break CI: suite passes locally but skips everything except the focused case.

Patterns:
- **node** (jest/vitest/mocha): `\b(it|test|describe)\.only\b`, `\bfit\(`, `\bfdescribe\(`
- **swift** (swift-testing): `@Test\([^)]*\.disabled:\s*false[^)]*\.only` - rare, check if framework supports
- **python / go / rust / java / kotlin / dotnet / ruby**: generally no equivalent; skip with `N/A`

Report each match with `FILE:LINE`. If ≥ 2 files have matches, escalate to T8.

### T2 - Skipped tests

**Medium** per match; **High** if skipped tests > 10% of suite.

Patterns:
- **node**: `\b(it|test|describe)\.skip\b`, `\bxit\(`, `\bxdescribe\(`, `\bit\.skip\.each\b`
- **python**: `@pytest\.mark\.skip\b`, `@pytest\.mark\.skipif\b`, `@unittest\.skip\b`
- **go**: `t\.Skip\(`, `t\.SkipNow\(`
- **rust**: `#\[ignore\]`
- **swift**: `XCTSkip\(`, `throw XCTSkip`
- **kotlin / java**: `@Disabled\b`, `@Ignore\b`
- **dotnet**: `\[Fact\(Skip\s*=`, `\[SkippableFact\b`
- **ruby**: `\bskip\b` inside `describe`/`it` blocks, `\bpending\b`

Report: count and top 10 with file:line.

### T3 - `.todo` placeholders

**Low.** Placeholder tests that never fail. Flag when count grows; not actionable per instance.

Patterns:
- **node**: `\btest\.todo\(`, `\bit\.todo\(`
- **python**: test bodies containing only `pass # TODO` or `raise NotImplementedError`
- **go**: test bodies that only call `t.Skip("TODO")`
- Other stacks: `N/A` unless obvious idiom exists

Report: count only.

### T4 - Empty test bodies

**High.** Empty tests always pass and create false confidence.

Patterns (whole-body empty or whitespace/comments only):
- **node**: `\b(it|test)\([^)]+\)\s*,?\s*\(?\)?\s*=>\s*\{\s*\}` (multiline false-pos-prone; pair with AST-lite check via grep for subsequent non-whitespace line)
- **python**: `def test_\w+\([^)]*\):\s*(?:#[^\n]*\n\s*)*pass\s*$`
- **go**: `func Test\w+\(t \*testing\.T\)\s*\{\s*\}`
- **swift**: `func test\w+\(\)\s*\{\s*\}`
- **rust**: `#\[test\]\s*fn \w+\(\)\s*\{\s*\}`
- **java / kotlin**: `@Test\s*(?:public\s+)?void\s+\w+\(\)\s*\{\s*\}`
- **dotnet**: `\[Fact\]\s*public\s+void\s+\w+\(\)\s*\{\s*\}`

Report: each match with file:line.

### T5 - Tests without assertions

**High.** Test that runs code paths without verifying outcomes.

Heuristic: within a detected test body, grep for at least one of the stack's assertion patterns:

| Stack / framework | Assertion patterns (any match = OK) |
|---|---|
| **vitest / jest** | `expect\(`, `assert\b`, `toBe\(`, `toEqual\(`, `toMatch\b` |
| **mocha + chai** | `expect\(`, `should\.`, `assert\.` |
| **pytest** | `\bassert\b` |
| **unittest** | `self\.assert\w+\b`, `self\.fail\b` |
| **go** | `t\.Error\b`, `t\.Errorf\b`, `t\.Fatal\b`, `t\.Fatalf\b`, `require\.`, `assert\.` |
| **rust** | `assert!\b`, `assert_eq!\b`, `assert_ne!\b`, `debug_assert` |
| **swift XCTest** | `XCTAssert\w*\(`, `XCTFail\(` |
| **swift-testing** | `#expect\(`, `#require\(` |
| **junit / kotest** | `assertEquals\b`, `assertThat\b`, `shouldBe\b`, `Assertions\.` |
| **xunit / nunit / mstest** | `Assert\.`, `Should\.` |
| **rspec** | `expect\(`, `should\b`, `is_expected` |
| **minitest** | `assert_\w+\b`, `refute_\w+\b` |

Flag any test body that lacks all of its framework's patterns.

Report: each match with file:line. Expect some false positives (helper-only tests, integration setup) - mark findings as `probable` when the body is very short or wraps another function.

### T6 - Hardcoded sleeps in tests

**Medium.** Sleep-based waits are the primary source of flaky tests.

Patterns (numeric sleep ≥ 500ms or any use in test paths):
- **node**: `setTimeout\([^,]+,\s*\d{3,}\)`, `\bawait\s+wait\(\d{3,}\)`, `\bawait\s+sleep\(\d{3,}\)`, `\bawait\s+new Promise\(r =>\s*setTimeout\(r,\s*\d{3,}\)`
- **python**: `time\.sleep\(\s*\d`
- **go**: `time\.Sleep\(\s*\d+\s*\*\s*time\.(Millisecond|Second)\)`
- **rust**: `thread::sleep\(\s*Duration::from_(millis|secs)\b`
- **swift**: `Thread\.sleep\(\b`, `RunLoop\.current\.run\(until:`
- **java / kotlin**: `Thread\.sleep\(`, `delay\(` (Kotlin coroutines) with hardcoded ms
- **dotnet**: `Thread\.Sleep\(\b`, `Task\.Delay\(\s*\d`
- **ruby**: `\bsleep\s+\d`

Report: each match with file:line and duration.

### T7 - Debug output left in tests

**Low.** Doesn't affect correctness but adds noise.

Patterns (inside test files only):
- **node**: `console\.(log|debug|info|warn|error)\(`
- **python**: `^\s*print\(`
- **go**: `fmt\.(Println|Printf|Print)\b` (flag as Low only - sometimes intentional)
- **rust**: `dbg!\b`, `eprintln!\b`
- **swift**: `\bprint\(`
- **java / kotlin**: `System\.out\.println\b`, `println\(`
- **dotnet**: `Console\.(WriteLine|Write)\b`
- **ruby**: `\bputs\s`, `\bp\s+`

Report: count only. Do not list individually unless count > 20.

### T8 - Multiple `.only` across files (broken CI)

**Critical.** Derived from T1: if ≥ 2 distinct files contain T1 matches, the CI gate is broken in a non-obvious way (each file contributes a focused case, so several cases run but most are skipped).

Report: one aggregate finding with the list of affected files.

---

## Step 7 - Report and backlog decision gate

### Output format

```
## Test Audit - [DATE] - [SCOPE] - stack: [STACK] / framework: [FRAMEWORK]

### Executive summary
[2-5 bullets - Critical and High findings only. Write concrete facts: file names, line, impact.
If nothing Critical/High: state that explicitly.
Example bullets:
- "`.only` committed in 3 files - CI is skipping all other tests (T1/T8 Critical)"
- "Line coverage is 34% overall with 12 files at 0% (C Critical)"
- "No unit tests detected; all N tests are E2E - pyramid inverted (P Major)"]

### Suite maturity assessment
| Dimension | Rating | Notes |
|---|---|---|
| Coverage | strong / adequate / weak | [total line %, files at 0%] |
| Pyramid shape | strong / adequate / weak | [unit % / integration % / e2e %] |
| Focus discipline | strong / adequate / weak | [T1+T8 count] |
| Assertion discipline | strong / adequate / weak | [T5 count] |
| Determinism | strong / adequate / weak | [T6 hardcoded sleeps] |
| Hygiene | strong / adequate / weak | [T2 skipped %, T4 empty, T7 noise] |
| Release readiness | ready / conditional / blocked | [blocked = any Critical; conditional = High findings exist] |

### Check verdicts
| # | Check | Verdict | Findings |
|---|---|---|---|
| C1-C3 | Coverage | [OK/warn] | [total %, files flagged] |
| P1-P3 | Pyramid | [OK/warn] | [layer breakdown] |
| T1 | .only committed | [OK/warn] | [N matches] |
| T2 | Skipped tests | [OK/warn] | [N matches, % of suite] |
| T3 | .todo placeholders | [OK/warn] | [N] |
| T4 | Empty test bodies | [OK/warn] | [N] |
| T5 | Tests without assertions | [OK/warn] | [N probable] |
| T6 | Hardcoded sleeps | [OK/warn] | [N] |
| T7 | Debug output | [OK/warn] | [N] |
| T8 | Multi-file .only | [OK/warn] | [N files] |

### Prioritized findings
For each finding with severity Medium or above:
[SEVERITY] [ID] [check] - [file:line] - [excerpt] - [impact] - [fix] - [effort: S=<1h / M=half day / L=day+]

### Quick wins
[Findings that meet all three: (a) Medium or High, (b) effort S, (c) single-file fix]
Format: "TEST-[n]: [one-line description]"
If no quick wins: state explicitly.
```

### Backlog decision gate

Present all findings with severity Medium or above as a numbered decision list, sorted Critical -> High -> Medium:

```
Found N findings at Medium or above. Which to add to backlog?

[1] [CRITICAL] TEST-? - file:line - one-line description
[2] [HIGH]     TEST-? - file:line - one-line description
[3] [MEDIUM]   TEST-? - file:line - one-line description
...

Reply with numbers to include (e.g. "1 2 4"), "all", or "none".
```

**Wait for explicit user response before writing anything.**

Then write ONLY the approved entries to `docs/refactoring-backlog.md`:
- Assign ID: `TEST-[n]` (next available after existing TEST entries)
- Add row to priority index
- Add full detail section with: issue, evidence (file:line + excerpt), fix suggestion, effort, risk

### Severity guide

- **Critical**: `.only` committed in any file (T1); multi-file `.only` breaking CI (T8); coverage at 0% on a file changed in the current block (C)
- **High**: Overall line coverage < 50% (C); empty test bodies (T4); tests without assertions (T5); skipped tests > 10% of suite (T2); no unit tests exist (P, unit-absent)
- **Medium**: Line coverage 50-80% (C); inverted pyramid, E2E > 30% (P); middle-heavy pyramid, integration > 50% (P); narrow pyramid, only one layer (P); hardcoded sleeps in tests (T6); skipped tests ≤ 10% of suite (T2)
- **Low**: `.todo` placeholders (T3); debug output left in tests (T7)

---

## Execution notes

- Do NOT modify any test file. Audit only.
- Do NOT execute tests or the test runner. Coverage reports must already exist on disk.
- `target:coverage:<path>` bypasses auto-detection; accept absolute or project-relative path.
- If git history is available, cross-reference C Critical findings against `git diff HEAD~1` (files changed in the most recent commit) to distinguish "0% on pre-existing file" (High) from "0% on file changed in this block" (Critical). If git is not available, downgrade all 0% findings to High.
- This skill complements the Phase 3 test execution (which runs `[TEST_COMMAND]` but never inspects the suite itself). Run in Phase 5d Track C after Phase 3 passes.
- After the report, ask: `Vuoi che prepari le correzioni per i fix identificati?` Reply with `yes` only after the user has signed off on the specific findings.
