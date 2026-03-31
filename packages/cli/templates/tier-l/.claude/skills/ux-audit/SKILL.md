---
name: ux-audit
description: Analyse user experience quality across key app flows. Simulates real user journeys using Playwright, evaluates 7 dimensions (task completion, consistency, feedback, navigation, cognitive load, error recovery, user confidence) anchored to ISO 9241-11, Nielsen's 10 Heuristics, and Baymard form research. Includes heuristic sweep (H3/H5/H6/H8/H9), Baymard form checklist (BF1-BF6), and wasted-click detection. Produces a severity-ranked report (Critical / Major / Minor). Requires the dev server running on localhost.
user-invocable: true
model: sonnet
context: fork
argument-hint: [flow:<flow-id>|role:<role>|full] [target:page:<route>|target:role:<role>|target:section:<section>]
allowed-tools: Read, Glob, Grep, mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_type, mcp__playwright__browser_click, mcp__playwright__browser_wait_for, mcp__playwright__browser_evaluate, mcp__playwright__browser_fill_form, mcp__playwright__browser_press_key
---

## Configuration (fill in before first run)

> Replace these placeholders:
> - `[DEV_URL]` — e.g. `http://localhost:3000`
> - `[LOGIN_ROUTE]` — your login page path, e.g. `login`, `signin`, `auth/login`
> - `[SITEMAP_OR_ROUTE_LIST]` — e.g. `docs/sitemap.md`
> - `[TEST_ACCOUNTS]` — email/password pairs per role
>
> Then fill in the **Flow catalog** (Step 5) with your project's key user journeys.
> Start with 3–5 Priority 1 flows covering the most critical tasks per role.

---

## Step 0 — Mode + target detection

Parse `$ARGUMENTS`:

**Mode** (which flows to run):
- `flow:<id>` → run a specific flow only (e.g. `flow:create-invoice`)
- `role:<role>` → run all flows for a specific role
- `full` → run all flows including Priority 2
- No mode keyword → **standard** — run all Priority 1 flows for all roles

**Target** (filters to a specific area — applied on top of mode):
- `target:page:/some-route` → only flows that touch this route
- `target:role:<role>` → only flows for that role
- `target:section:<name>` → only flows in that functional area
- No target → no filter

Mode and target are **independent**. `full target:section:invoices` = all invoice flows including P2.

Announce at start:
`Running ux-audit in [STANDARD | FLOW:<id> | ROLE:<role> | FULL] mode — scope: [FULL | target: <resolved description>]`

---

## Step 0.5 — Screenshot directory setup

Before any navigation, create the temp screenshot directory:
```bash
mkdir -p /tmp/ux-audit-screenshots
```
All screenshots during this session go into `/tmp/ux-audit-screenshots/`. This keeps screenshots out of the project directory and simplifies cleanup.

---

## Step 1 — Load architecture context

Read in parallel:
1. `[SITEMAP_OR_ROUTE_LIST]` — full route inventory, sub-hierarchies, role mapping
2. `docs/ui-components.md` (if present) — component contracts, form structures

From sitemap sub-hierarchies, build a mental model of:
- What tabs exist per page
- What states each page can be in (empty, loading, error, data)
- What actions are available per role
- Which flows are newly implemented (check `docs/implementation-checklist.md` if present) — these need extra scrutiny

---

## Step 2 — Pre-flight check

Navigate to `[DEV_URL]`. If not reachable:
> ❌ Dev server not running. Start it then re-run `/ux-audit`.

Record the base URL. If redirected to `/[LOGIN_ROUTE]`, record that a session must be established first.

---

## Step 3 — UX evaluation framework

Apply these 7 dimensions to every flow simulated. Dimensions are anchored to ISO 9241-11 (Effectiveness / Efficiency / Satisfaction) and Nielsen's 10 Usability Heuristics for rigour and comparability.

| Dimension | ISO anchor | Nielsen heuristic | Question | What to look for |
|---|---|---|---|---|
| **D1 — Task completion** | Effectiveness | H1 Visibility of status | Can the user finish the task without confusion? | Dead ends, missing CTAs, ambiguous button labels, unexpected redirects |
| **D2 — Interaction consistency** | Effectiveness | H4 Consistency & standards | Do similar operations work the same way across sections? | CRUD patterns across different entity types |
| **D3 — Feedback clarity** | Effectiveness | H1 Visibility · H9 Error recovery | Does the user always know what happened? | Toast presence/absence, loading states, success/error messaging, state changes; **error message quality: Specific ✅ / Generic ⚠️ / Absent ❌** |
| **D4 — Navigation clarity** | Efficiency | H4 Consistency · H6 Recognition | Does the user always know where they are? | Page titles, breadcrumbs, back affordances, active sidebar state, role-specific routes |
| **D5 — Cognitive load** | Efficiency | H8 Minimalist design | How many decisions or pieces of info per screen? | Form fields per step, actions per card, info density, label clarity; Baymard optimal: ≤8 fields per step |
| **D6 — Error recovery** | Effectiveness | H9 Recognize/diagnose/recover | When something goes wrong, is the path forward clear? | Validation messages, retry affordances, empty state guidance, rejection states |
| **D7 — User confidence** | Satisfaction | H3 User control · H5 Error prevention | Does the user feel in control and certain of the outcome? | Confirmation dialogs before destructive/irreversible actions; cancel paths in all dialogs and forms; reassurance copy on irreversible operations; no silent success (action appears to work but no visible state change); positive feedback beyond toast (page reflects new state). **Apply C1–C5 checks per flow — see structured framework below.** |

**D7 structured framework — apply per flow:**

| Check | What to verify | PASS | FAIL |
|---|---|---|---|
| C1 — Cancel path | Every dialog and multi-step form has a functional Cancel button | Returns to correct state, no unintended side effect (no draft saved) | No cancel button, or cancel causes data loss |
| C2 — Destructive guard | Irreversible actions trigger confirmation BEFORE execution | Confirmation dialog with action name + consequence description | Single-click execute without confirmation |
| C3 — Silent success prevention | Every state-changing action has visible confirmation | Toast + page reflects new state | Toast absent OR page unchanged after action |
| C4 — Constraint visibility | Read-only constraints explicitly communicated | Label, tooltip, or disabled button with explanation | Functionality silently absent without explanation |
| C5 — Positive feedback | Multi-step flows confirm outcome explicitly | Explicit success state, not just redirect to list | Redirect to list with no success indication |

Record per flow: `C1:[✅/❌/N/A] C2:[✅/❌/N/A] C3:[✅/❌/N/A] C4:[✅/❌/N/A] C5:[✅/❌/N/A]`

**Severity scale:**
- **Critical** — user cannot complete a core task (blocker)
- **Major** — user is confused or slowed significantly (friction)
- **Minor** — small inconsistency or suboptimal pattern (polish)

---

## Step 4 — Component context load

Before simulating each flow, read the primary page file and key components involved in that flow. Specifically look for:
- Form field count and labels — are they clear and unambiguous?
- CTA button labels — are they action-oriented (verb + noun) or vague?
- Post-submit behavior — does the code show a redirect, modal close, or toast?
- Empty state handling — is there a meaningful empty state or just a blank area?
- Error state handling — are validation errors per-field or only at submit?

### Baymard form checklist (apply to every flow involving a form)

Source: Baymard Institute — 4,400+ moderated usability sessions.

For each form in the flow, during code inspection verify:

| # | Check | Good practice | Baymard finding |
|---|---|---|---|
| BF1 | Error message content | Field-specific: "Amount must be positive" | 98% of sites use generic messages — users cannot recover |
| BF2 | Inline validation timing | Fires on `onBlur` or post-submit — NOT `onChange` | Premature validation disrupts typing and increases errors |
| BF3 | Positive inline validation | Shows ✓ or green border after correction | Reduces user anxiety; confirms correction was accepted |
| BF4 | Required/optional labeling | Required = `*`; Optional fields explicitly labeled | Unlabeled optional fields cause over-completion |
| BF5 | Multi-step progress | "Step N of M" — exact count, not vague percentage | Accurate progress reduces abandonment in multi-step flows |
| BF6 | Field count per step | ≤ 8 fields without stepper; flag if exceeded | Optimal: 6–8 fields. Average: 11.3 (Baymard e-commerce data) |

Record BF1–BF6 verdict for each form. Include in D3/D5/D6 analysis as evidence.

This code context MUST be referenced in the D1–D7 analysis. Don't rely purely on what Playwright shows.

---

## Step 5 — Flow catalog

> **Configure this section for your project before running.**
> Define 3–5 Priority 1 flows covering the most critical tasks per role.
> Use the structure below as a template. Replace `[Configure flows in docs/sitemap.md]` with your actual flows.

**[Configure flows in docs/sitemap.md]**

Example structure for each flow:

#### F1 — [Role]: [task name]
**Role**: [role] · **Credential**: [email] / [password]
**Read before simulating**: `[primary page file]` + `[key component file]`
**Steps**:
1. Login → `/`
2. Navigate to `/[section]`
3. Trigger the primary action (CTA)
4. Fill required fields
5. Submit
6. Verify: success feedback + result in list/detail
7. **D7 check**: trigger validation on a required field (leave blank, submit) → is a confirmation needed before submit? Is cancel button present?

**Evaluate**: D1 (is the CTA discoverable?), D3 (success feedback present? + BF1 message quality), D5 (form field count vs BF6), D6 (validation messages specific per BF1?), D7 (cancel path present? Reassurance copy?)

Add Priority 2 flows for `full` mode — less critical but important journeys.

---

## Step 6 — Flow simulation

For each flow in scope:

1. **Code context load** (Step 4): read primary page file + key components. Apply Baymard form checklist (BF1–BF6) to any form in the flow.
2. **Setup**: login with correct credentials (reuse session if same role as previous flow)
3. **DOM preflight** after each navigate:
   ```js
   ({
     loaded: document.readyState === 'complete',
     hasMain: (document.querySelector('main')?.innerText?.length ?? 0) > 30,
     noError: !document.title.toLowerCase().includes('error') &&
               !document.body.innerText.includes('Application error')
   })
   ```
   If `hasMain === false` → flag and report, do not simulate the flow.
4. **Execute steps** as listed, taking a screenshot at each significant state change:
   - Initial page load
   - After each interaction (form open, field filled, submitted, redirected)
   - Error state (if triggerable without data setup)
5. **Measure per flow**:
   - **Total clicks** to complete task (target: ≤ 3 for primary actions)
   - **Wasted clicks**: clicks that produced no navigation or visible DOM change within 300ms — note each one as a discoverability failure candidate
   - **Form field count** (target: ≤ 8 per step per BF6)
   - **Error message quality rating**: Specific ✅ / Generic ⚠️ / Absent ❌ (per D3/BF1)
   - **Redirect count** after submission (target: ≤ 1)
   - **Confirmation dialogs present**: Yes / No for each destructive action attempted
6. **Evaluate** against D1–D7, referencing both what Playwright shows and code context

### Login helper
```
1. browser_navigate [DEV_URL]/[LOGIN_ROUTE]
2. If at /: check sidebar/header for correct role indicator
   - If wrong role: find sign-out → click → confirm → wait for /[LOGIN_ROUTE]
3. browser_type email field
4. browser_type password field
5. browser_click submit
6. browser_wait_for url contains [DEV_URL]/
```

---

## Step 7 — Analysis pass

After simulation, for each flow apply a structured analysis:

**Per dimension (D1–D7)**:
- What did you observe in the browser?
- What does the code tell you about the intended behavior?
- Does it meet the expectation for that dimension?
- If not: what is the specific friction point?
- What is the severity (Critical / Major / Minor)?
- What is the concrete fix?

**Cross-flow consistency check**:
- Do all "new record" forms follow the same pattern? (CTA placement, field order, submit label, post-submit behavior, cancel path)
- Do all detail pages have equivalent back navigation?
- Do all list pages have the same empty state pattern?
- Are CRUD patterns consistent across different entity types?

### Heuristic sweep (after all flows — 5 checks)

Run these 5 heuristic checks across the full set of pages visited during simulation. These are cross-cutting patterns not captured by individual flow steps.

Source: Nielsen Norman Group — 10 Usability Heuristics for User Interface Design (original 1994, updated 2020).

| H# | Heuristic | What to check | Flag if |
|---|---|---|---|
| H3 | User control & freedom | Every dialog and multi-step form has a functional Cancel button. Verify dismiss returns to correct state with no unintended side effects (no draft saved, no partial commit). | Any dialog without a clear exit, or cancel causes data loss |
| H5 | Error prevention | Destructive or irreversible actions (delete record, approve/reject, revoke, cancel application) trigger a confirmation dialog BEFORE execution — not after. | Any destructive action that executes on single click without confirmation |
| H6 | Recognition vs recall | Form fields have persistent visible labels — not just placeholder text that disappears on focus/fill. User should not need to remember what a field asked. | Any input relying solely on placeholder for its label |
| H8 | Minimalist design | Each screen shows only information needed for the current task. Identify any UI element with low information value that adds visual noise or competes with primary content. | Any page where the eye has nowhere obvious to start |
| H9 | Error diagnosis | Validation error messages name the specific field AND tell the user what correction is needed (not just that one is needed). | Any generic "This field is required" without the specific constraint |

Record each heuristic check result as: ✅ Pass / ⚠️ Issue found / ❌ Violation. Include in report.

---

## Step 8 — Report

```
## UX Audit — [DATE] — [MODE] — [TARGET]
### Reference: [SITEMAP_OR_ROUTE_LIST] · flows F[N]–F[N]
### Framework: ISO 9241-11 (Effectiveness/Efficiency/Satisfaction) · Nielsen's 10 Heuristics · Baymard Form Research
### Scope: task completion · consistency · feedback · navigation · cognitive load · error recovery · user confidence
### Out of scope: token compliance → /ui-audit | Responsiveness → /responsive-audit

---

### Executive summary

| Severity | Count | Top issue |
|---|---|---|
| Critical | N | [one-line description] |
| Major | N | [one-line description] |
| Minor | N | [one-line description] |

---

### Flow results

#### F[N] — [Flow name] — [Role]

- **Task completion**: [steps taken] / [total clicks] clicks / [wasted clicks] wasted
- **Form**: [field count] fields · Error messages: Specific ✅/Generic ⚠️/Absent ❌ · Cancel path: Yes/No · Confirmation on destructive: Yes/No/N/A
- **D7 user confidence**: C1:[✅/❌/N/A] C2:[✅/❌/N/A] C3:[✅/❌/N/A] C4:[✅/❌/N/A] C5:[✅/❌/N/A]
- **Baymard form**: BF1:[✅/⚠️] BF2:[✅/⚠️] BF3:[✅/⚠️] BF4:[✅/⚠️] BF5:[✅/⚠️] BF6:[✅/⚠️]
- **Code context**: [key finding from reading the component — 2-3 bullet points]
- **Outcome**: ✅ Completed without friction / ⚠️ Completed with friction / ❌ Could not complete

**Findings:**

| # | Dimension | ISO | Severity | Observation | Fix |
|---|---|---|---|---|---|
| UX-[N] | D[N] — [name] | Eff/Eff/Sat | Critical/Major/Minor | [what was observed + code reference] | [concrete suggestion] |

**Screenshots**: [list filenames]

---

[Repeat for each flow]

---

### Heuristic sweep results

| H# | Heuristic | Result | Affected pages | Finding |
|---|---|---|---|---|
| H3 | User control & freedom | ✅/⚠️/❌ | [routes] | [or "Pass"] |
| H5 | Error prevention | ✅/⚠️/❌ | [routes] | |
| H6 | Recognition vs recall | ✅/⚠️/❌ | [routes] | |
| H8 | Minimalist design | ✅/⚠️/❌ | [routes] | |
| H9 | Error diagnosis | ✅/⚠️/❌ | [routes] | |

---

### Cross-flow consistency gaps

| Pattern | Routes compared | Gap | Severity |
|---|---|---|---|
| [e.g. Post-submit redirect] | /[entity-a]/new vs /[entity-b]/new | [difference] | Minor |

---

### Prioritised fix list

Order by severity, then by impact (flows affected):

1. **[UX-N]** · Critical · [one-line fix description]
2. **[UX-N]** · Major · [one-line fix description]
...

---

### What's working well
[2–4 positive observations — patterns that are clear, consistent, and worth preserving]

### Skipped flows
[List any flows skipped due to missing test accounts or preflight failures]
```

---

## Step 9 — Final offer

After the report:

> "Would you like to explore any specific finding further? I can:
> - **ASCII Wireframe**: propose the detailed design for a specific fix via `/frontend-design`
> - **Heuristic deep-dive**: analyse a specific heuristic in detail across all pages (e.g. H5 on all flows with destructive actions)
> - Compare two specific sections for pattern consistency
> - Generate a fix checklist to integrate into the backlog (`docs/refactoring-backlog.md`)"

**Do NOT apply code changes directly.** UX findings require design decisions before implementation.

---

## Step 10 — Screenshot cleanup

After the report is delivered and the improvement offer is presented, clean up the temp directory:
```bash
rm -rf /tmp/ux-audit-screenshots
```
Run this unconditionally at session end — screenshots are only needed during analysis.
