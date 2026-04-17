# Test Audit — Stack Patterns

Reference file for `/test-audit`. Contains grep patterns per check, organized by stack.
The executing agent reads this file at the start of Step 6. For each check, select the patterns matching the detected stack. Checks without a matching pattern produce `N/A - skipped for <stack>`.

---

## T1 — `.only` / focused test patterns

| Stack | Patterns | N/A? |
|---|---|---|
| **node** (jest/vitest/mocha) | `\b(it\|test\|describe)\.only\b`, `\bfit\(`, `\bfdescribe\(` | |
| **swift** (swift-testing) | `@Test\([^)]*\.disabled:\s*false[^)]*\.only` (rare - verify framework support) | |
| **python** | | N/A |
| **go** | | N/A |
| **rust** | | N/A |
| **java / kotlin** | | N/A |
| **dotnet** | | N/A |
| **ruby** | | N/A |

---

## T2 — Skipped test patterns

| Stack | Patterns |
|---|---|
| **node** (jest/vitest/mocha) | `\b(it\|test\|describe)\.skip\b`, `\bxit\(`, `\bxdescribe\(`, `\bit\.skip\.each\b` |
| **python** (pytest) | `@pytest\.mark\.skip\b`, `@pytest\.mark\.skipif\b`, `@unittest\.skip\b` |
| **go** | `t\.Skip\(`, `t\.SkipNow\(` |
| **rust** | `#\[ignore\]` |
| **swift** | `XCTSkip\(`, `throw XCTSkip` |
| **kotlin / java** | `@Disabled\b`, `@Ignore\b` |
| **dotnet** | `\[Fact\(Skip\s*=`, `\[SkippableFact\b` |
| **ruby** | `\bskip\b` inside describe/it blocks, `\bpending\b` |

---

## T3 — `.todo` placeholder patterns

| Stack | Patterns | N/A? |
|---|---|---|
| **node** | `\btest\.todo\(`, `\bit\.todo\(` | |
| **python** | test bodies containing only `pass # TODO` or `raise NotImplementedError` | |
| **go** | test bodies that only call `t.Skip("TODO")` | |
| Other stacks | | N/A unless obvious idiom exists |

---

## T4 — Empty test body patterns

Multiline regex - use with `multiline: true` where supported.

| Stack | Pattern |
|---|---|
| **node** | `\b(it\|test)\([^)]+\)\s*,?\s*\(?\)?\s*=>\s*\{\s*\}` (pair with AST-lite check for subsequent non-whitespace line) |
| **python** | `def test_\w+\([^)]*\):\s*(?:#[^\n]*\n\s*)*pass\s*$` |
| **go** | `func Test\w+\(t \*testing\.T\)\s*\{\s*\}` |
| **swift** | `func test\w+\(\)\s*\{\s*\}` |
| **rust** | `#\[test\]\s*fn \w+\(\)\s*\{\s*\}` |
| **java / kotlin** | `@Test\s*(?:public\s+)?void\s+\w+\(\)\s*\{\s*\}` |
| **dotnet** | `\[Fact\]\s*public\s+void\s+\w+\(\)\s*\{\s*\}` |

---

## T5 — Assertion patterns (any match = test has assertions)

| Stack / framework | Assertion patterns |
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

---

## T6 — Hardcoded sleep patterns

| Stack | Patterns |
|---|---|
| **node** | `setTimeout\([^,]+,\s*\d{3,}\)`, `\bawait\s+wait\(\d{3,}\)`, `\bawait\s+sleep\(\d{3,}\)`, `\bawait\s+new Promise\(r =>\s*setTimeout\(r,\s*\d{3,}\)` |
| **python** | `time\.sleep\(\s*\d` |
| **go** | `time\.Sleep\(\s*\d+\s*\*\s*time\.(Millisecond\|Second)\)` |
| **rust** | `thread::sleep\(\s*Duration::from_(millis\|secs)\b` |
| **swift** | `Thread\.sleep\(\b`, `RunLoop\.current\.run\(until:` |
| **java / kotlin** | `Thread\.sleep\(`, `delay\(` (Kotlin coroutines with hardcoded ms) |
| **dotnet** | `Thread\.Sleep\(\b`, `Task\.Delay\(\s*\d` |
| **ruby** | `\bsleep\s+\d` |

---

## T7 — Debug output patterns

| Stack | Patterns |
|---|---|
| **node** | `console\.(log\|debug\|info\|warn\|error)\(` |
| **python** | `^\s*print\(` |
| **go** | `fmt\.(Println\|Printf\|Print)\b` (flag as Low - sometimes intentional) |
| **rust** | `dbg!\b`, `eprintln!\b` |
| **swift** | `\bprint\(` |
| **java / kotlin** | `System\.out\.println\b`, `println\(` |
| **dotnet** | `Console\.(WriteLine\|Write)\b` |
| **ruby** | `\bputs\s`, `\bp\s+` |
