# Severity Reference Scale (P2)

**Version**: 1.0
**Created**: 2026-04-14
**Bundled with**: `/skill-review` skill (for export to user projects)
**Status**: reference scale used by SKILLS at runtime to classify findings they detect in user projects.

**Scope**: domain-neutral. Applies across UI, security, API, testing, migration, accessibility, docs, architecture, performance.

**Non-scope**: this scale is NOT used by the framework to classify review-time findings. Review-time findings use the review-layer scale defined in `review-framework.md`. The two scales share labels and are aligned per the operational definition below.

---

## The four levels

### Critical

**Technical criteria (any one qualifies)**:
- Violation of a hard invariant (security, data integrity, compliance requirement).
- Causes data loss or irreversible state change.
- Blocks a core user workflow.
- Exposes secrets, credentials, or PII.

**User-pain criteria (all must hold to keep the Critical label)**:
- False-positive rate < 10%. A check with higher FP rate cannot be Critical even if technical severity is high. Reason: high FP on a blocking level destroys user trust in the tool.
- Remediation is clear (user knows what to do).
- The finding is actionable without external research.

**Pipeline action**: fix before moving to the next phase. Do not proceed with open Criticals.

---

### High

**Technical criteria (any one qualifies)**:
- Significant defect with user-facing impact, recoverable but painful.
- Performance degradation visible to the user.
- Violation of a documented convention that affects maintainability across the team.
- Missing functionality that was promised by scope.

**User-pain criteria**:
- FP rate < 25%.
- Remediation is clear or at most requires reading one reference document.
- The finding is actionable within the current work session.

**Pipeline action**: fix before release / Phase 6 GO. Flag in the outcome checklist with planned resolution.

---

### Medium

**Technical criteria**:
- Quality issue that degrades experience but does not block.
- Maintenance burden that will compound over time.
- Inconsistency with patterns established elsewhere in the codebase.
- Non-critical convention violation.

**User-pain criteria**:
- Higher FP rate tolerated (up to 40%) if remediation is clear.
- Remediation may require judgment or context.

**Pipeline action**: register in the relevant backlog (`refactoring-backlog.md` or equivalent) with an ID prefix, OR fix if trivial (< 5 minutes).

---

### Low

**Technical criteria**:
- Cosmetic issue.
- Minor optimization.
- Style preference.
- Documentation polish.

**User-pain criteria**: not relevant — cosmetic findings by definition have negligible user pain.

**Pipeline action**: ignore, register opportunistically, or fix if encountered during other work.

---

## FP-rate cap rule

A check with high false-positive rate cannot be labeled Critical regardless of technical severity. The cap:

| Technical severity | FP rate cap for label |
|---|---|
| Critical | < 10% |
| High | < 25% |
| Medium | < 40% |
| Low | no cap |

**Why**: a Critical label blocks the pipeline. If half the Criticals are false positives, the user disables the skill. Better to label one level below and preserve trust.

---

## User-pain dimensions

Every severity decision weights four dimensions:

1. **False-positive rate**: how often the check fires when nothing is wrong.
2. **Actionability**: whether the user knows what action to take from the finding alone.
3. **Remediation clarity**: whether the fix path is obvious or requires diagnosis.
4. **Invocation context**: whether the skill is clearly the right tool for the user's current task.

A finding with high technical severity but low actionability is labeled one level below its technical tier. A Critical technical issue with vague remediation becomes High. A High issue that requires cross-file diagnosis becomes Medium.

---

## Decision tree

Apply in order. First match wins.

```
1. Is the consequence irreversible, data-loss-inducing, or blocking core workflow?
   -> Yes, and FP rate < 10%  => Critical
   -> Yes, but FP rate >= 10% => High (cap applied)
   -> No  => go to 2

2. Is the consequence user-facing, painful, but recoverable?
   -> Yes, and remediation is clear, FP rate < 25% => High
   -> Yes, but remediation unclear OR FP rate >= 25% => Medium (cap applied)
   -> No  => go to 3

3. Is it a quality issue or maintenance burden?
   -> Yes => Medium
   -> No  => Low
```

---

## Domain calibration examples

Examples are abstract to remain domain-neutral. Each skill may add stack-specific examples post-scaffold via its own calibration section.

### UI / visual

| Severity | Example finding |
|---|---|
| Critical | Token that breaks dark mode when the stack uses dark mode (consequence: unreadable content for a subset of users) |
| High | Missing empty/error/loading state on a data-driven component |
| Medium | Inconsistent spacing across sibling sections |
| Low | Slight font weight variation within same hierarchy level |

### Accessibility

| Severity | Example finding |
|---|---|
| Critical | Form input without associated label (consequence: blocks screen-reader users entirely) |
| High | Color contrast < 4.5:1 on primary body text |
| Medium | Focus indicator present but low visibility |
| Low | Heading hierarchy skips one level without structural reason |

### API

| Severity | Example finding |
|---|---|
| Critical | Endpoint returns sensitive data without auth check |
| High | Endpoint missing rate limit on public surface |
| Medium | Inconsistent error code taxonomy across related endpoints |
| Low | Verbose error messages that could be more terse |

### Security

| Severity | Example finding |
|---|---|
| Critical | Secret committed to repo; SQL injection vector on a write path |
| High | CSRF token missing on state-changing form |
| Medium | Logs include request body that may contain PII |
| Low | Security header present but not in strictest mode |

### Testing

| Severity | Example finding |
|---|---|
| Critical | `.only` leaked to a committed test file (disables all other tests in the suite) |
| High | Zero coverage on a file modified in the current block |
| Medium | Test has no assertion (passes trivially) |
| Low | Test name does not describe the scenario |

### Migration

| Severity | Example finding |
|---|---|
| Critical | Destructive migration (DROP, TRUNCATE) without documented backup plan |
| High | Adding NOT NULL to large table without backfill strategy |
| Medium | Dropping index without confirming zero query usage |
| Low | Migration file name inconsistent with convention |

### Docs

| Severity | Example finding |
|---|---|
| Critical | Example code contains an actual security vulnerability or secret |
| High | README mentions a command or file that does not exist |
| Medium | Typo in a technical term that affects searchability |
| Low | Formatting inconsistency between sections |

### Performance

| Severity | Example finding |
|---|---|
| Critical | Render-blocking path > 3s on primary user flow; memory leak on long-running process |
| High | Bundle > 1MB gzipped on initial load; database query on hot path without index |
| Medium | Unoptimized image > 500KB without reason |
| Low | Micro-optimization opportunity at sub-millisecond level |

### Architecture

| Severity | Example finding |
|---|---|
| Critical | Circular dependency in core module that prevents build; god class controlling business logic + persistence + UI |
| High | Layering violation coupling UI directly to database; duplication of core logic across 3+ modules |
| Medium | Abstraction leak (implementation detail exposed through public interface) |
| Low | Naming inconsistency (camelCase vs snake_case within same module) |

### Commit / Git

| Severity | Example finding |
|---|---|
| Critical | Secret committed to repo; destructive history rewrite on shared branch |
| High | Conventional-commit format violation that breaks automated changelog; commit merging unrelated features |
| Medium | Commit too large to review (>500 lines diff) |
| Low | Capitalization inconsistency in commit message |

---

## Operational "aligned" definition (link to review-layer)

The review-layer scale (in `review-framework.md`) and this runtime scale are **aligned** iff:

1. They use identical labels Critical / High / Medium / Low.
2. Each label is defined by a shared criterion set: **consequence severity + reversibility + scope + user-pain (FP rate + actionability)**.
3. A finding classified at level X by this scale would be classified at level X by the review layer when evaluating whether the skill correctly labeled it.

**Test of alignment**: pick a runtime finding produced by a skill. Apply the review-layer severity rubric to the same finding. If both land on the same label, the skill is aligned. If they diverge, either the skill is miscalibrated or the scales are not aligned.

---

## Fix-routing rule

When a review finds that a skill miscalibrated a severity:

- **Miscalibration in 1 skill only**: fix at skill level. Relabel the runtime severity in the skill's check list.
- **Miscalibration pattern in ≥2 skills for the same check type**: framework defect. Fix this scale (P2) first, then re-apply to all affected skills.

This rule prevents the "fix at skill level always" fallacy — when the miscalibration is caused by an unclear P2 scale, patching individual skills just creates inconsistent debt.

---

## Anti-patterns when labeling

Avoid these during skill design and during runtime classification.

1. **Domain-emotion labeling**: labeling based on how important the domain feels rather than on the decision tree. "Colors feel important" is not a reason to default to Critical.
2. **Volume-driven inflation**: labeling a class Critical because the skill finds many instances. Volume changes roadmap prioritization, not severity.
3. **Ignoring FP rate**: labeling Critical without evidence the check has low FP rate. A noisy Critical erodes trust.
4. **Ignoring actionability**: labeling a finding High when the user will not know what to do with it. Move down one level.
5. **Inherited habits from pilot project**: labels that made sense in the project where the skill was originally written but are arbitrary in other stacks. Flag during project-agnosticity check.
6. **Stack-specific severity defaults**: e.g., treating any hardcoded color as Critical is a UI-specific habit. Not applicable to CLI or backend-only stacks.
7. **Recency bias**: labeling based on how recently you saw a similar pattern rather than on the decision tree. A fresh memory of a painful bug inflates severity for unrelated findings. Re-anchor on the rubric, not on the last case seen.
8. **Severity inheritance**: copying the severity of a similar check from another skill without re-evaluating technical + user-pain criteria for the new context. A check that is Critical in a security skill may be Medium in a docs skill.
9. **Reviewer-pain projection**: labeling based on the reviewer's discomfort while auditing rather than the user's pain when the finding fires. "This was annoying to diagnose" is not a severity signal — the user may never see the diagnosis path.

---

## Calibration examples (for reviewer drift protection)

These examples are referenced by P5 (`CALIBRATION_KIT.md`). Read before starting a review cycle and at Phase 9 midpoint. Two per level: the typical canonical case + one edge case that drifts toward the wrong label without explicit anchoring.

**Canonical Critical (typical)**:
- A UI skill flags `Color.red` in a SwiftUI project as "hardcoded color". This is a false positive because `Color.red` is a system-adaptive color that respects dark mode. The misclassification is Critical on the skill itself because it makes the skill produce wrong output on an entire stack.

**Canonical Critical (edge)**:
- A security-audit skill detects SQL injection by greping only `${...}` interpolation. It misses `+` string concatenation, which is the dominant pattern in older code. The gap is Critical because the skill produces a green verdict while the vulnerability exists — false negative on a hard invariant. Drift risk: a reviewer who sees the grep pattern may label this Medium ("incomplete coverage"). Anchor: consequence is "pipeline green on actual vulnerability" → Critical.

**Canonical High (typical)**:
- A security-audit skill does not check for secrets in logs. The gap is High because logs commonly leak secrets, but skilled users know to check manually.

**Canonical High (edge)**:
- A UI skill labels every cross-origin image load as Critical for CSP compliance. On an API-only project with no frontend, this fires on test fixtures and is meaningless — invocation context ignored. The misclassification is High: the skill is running where it should not have been invoked, and labels create noise that erodes trust. Drift risk: reviewer sees "CSP" and labels Critical on technical severity. Anchor: user-pain cap — FP rate on wrong stack is ~100%, drops below Critical per the cap rule.

**Canonical Medium (typical)**:
- An api-design skill reports inconsistent pagination conventions across endpoints as "inconsistent". Medium because the finding is real but remediation requires team-level decision.

**Canonical Medium (edge)**:
- An arch-audit skill reports a cyclomatic complexity score of 18 for a function without specifying a threshold or remediation target. The metric is real but the finding is not actionable without the reviewer defining "too complex". Medium because the issue exists but remediation clarity is absent. Drift risk: reviewer inflates to High on "complexity = maintenance debt" framing. Anchor: actionability rubric — no clear fix path pushes down one level.

**Canonical Low (typical)**:
- A test-audit skill reports a test name that does not follow convention. Low because the test works correctly; the finding is stylistic.

**Canonical Low (edge)**:
- An arch-audit skill outputs "this module could be reorganized for clarity" without naming the current defect, the proposed structure, or a concrete move. The finding is not wrong but has zero actionability and no remediation path. Low because it is effectively a style preference. Drift risk: reviewer labels Medium on "architecture matters" framing. Anchor: no concrete target → cosmetic tier.

---

## Versioning

Bump this scale when:
- Labels change (unlikely — would break every skill).
- Decision tree changes.
- User-pain dimensions expand.
- FP-rate caps are recalibrated based on observed data.

On bump: trigger retroactive re-application per the framework's freeze rule (framework v1.2, section "Retroactive re-application of emerging principles").
