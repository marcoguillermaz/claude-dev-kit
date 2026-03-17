---
name: ux-audit
description: Analyse user experience quality across key app flows. Simulates real user journeys using Playwright, evaluates task completion, interaction consistency, feedback clarity, navigation structure, and cognitive load. Produces a severity-ranked report (Critical / Major / Minor) with concrete fix suggestions. Requires the dev server running on localhost.
user-invocable: true
model: sonnet
context: fork
argument-hint: [flow:<flow-id>|role:<role>|full]
allowed-tools: Read, Glob, Grep, mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_type, mcp__playwright__browser_click, mcp__playwright__browser_wait_for, mcp__playwright__browser_evaluate, mcp__playwright__browser_fill_form, mcp__playwright__browser_press_key
---

## Configuration (fill in before first run)

> Replace these placeholders:
> - `[DEV_URL]` — e.g. `http://localhost:3000`
> - `[SITEMAP_OR_ROUTE_LIST]` — e.g. `docs/sitemap.md`
> - `[TEST_ACCOUNTS]` — email/password pairs per role
>
> Then fill in the **Flow catalog** (Step 4) with your project's key user journeys.
> Start with 3–5 Priority 1 flows covering the most critical tasks per role.

---

## Mode detection

Check `$ARGUMENTS`:
- Empty / not provided → **standard mode** — run all Priority 1 flows
- `flow:<id>` → run a specific flow only (e.g. `flow:create-invoice`)
- `role:<role>` → run all flows for a specific role
- `full` → run all flows including Priority 2

Announce at start: `Running ux-audit in [STANDARD | FLOW:<id> | ROLE:<role> | FULL] mode.`

---

## Step 1 — Load architecture context

Read in parallel:
1. `[SITEMAP_OR_ROUTE_LIST]` — route inventory, role mapping, page sub-hierarchies
2. `docs/ui-components.md` (if present) — component contracts, form structures

Build a mental model of: what tabs exist per page, what states each page can be in, what actions are available per role.

---

## Step 2 — Pre-flight check

Navigate to `[DEV_URL]`. If not reachable:
> ❌ Dev server not running. Start it then re-run `/ux-audit`.

---

## Step 3 — UX evaluation framework

Apply these 6 dimensions to every flow simulated:

| Dimension | Question | What to look for |
|---|---|---|
| **D1 — Task completion** | Can the user finish the task without confusion? | Dead ends, missing CTAs, ambiguous button labels |
| **D2 — Interaction consistency** | Do similar operations work the same way across sections? | CRUD patterns across different entity types |
| **D3 — Feedback clarity** | Does the user always know what happened? | Toast/notification presence, loading states, success/error messaging |
| **D4 — Navigation clarity** | Does the user always know where they are? | Page titles, breadcrumbs, back affordances, active sidebar state |
| **D5 — Cognitive load** | How many decisions or pieces of info per screen? | Form fields per step, actions per card, information density |
| **D6 — Error recovery** | When something goes wrong, is the path forward clear? | Validation messages, retry affordances, empty state guidance |

Severity scale:
- **Critical** — user cannot complete a core task (blocker)
- **Major** — user is confused or slowed significantly (friction)
- **Minor** — small inconsistency or suboptimal pattern (polish)

---

## Step 4 — Flow catalog

> **Configure this section for your project before running.**
> Define 3–5 Priority 1 flows covering the most critical tasks per role.
> Example structure:
>
> #### F1 — [Role]: [task name]
> **Role**: [role] · **Credential**: [email] / [password]
> **Steps**:
> 1. Login → `/`
> 2. Navigate to `/[section]`
> 3. Trigger the primary action (CTA)
> 4. Fill required fields
> 5. Submit
> 6. Verify: success feedback + result in list/detail
>
> **Evaluate**: D1 (is the CTA discoverable?), D3 (success feedback present?), D5 (form field count?), D6 (validation messages clear?)
>
> Add Priority 2 flows for `full` mode — less critical but important journeys.

---

## Step 5 — Flow simulation

For each flow in scope:

1. **Setup**: login with correct credentials (reuse session if same role as previous flow)
2. **Execute steps** as listed, taking a screenshot at each significant state change:
   - Initial page load
   - After each interaction (form open, field filled, submitted, redirected)
   - Error state (if triggerable without complex data setup)
3. **Measure**:
   - Click count to complete task (target: ≤ 3 for primary actions)
   - Form field count (target: ≤ 6 for a single form without stepper)
   - Redirect count (target: ≤ 1 after submission)
4. **Evaluate** against D1–D6, noting severity per finding

### Login helper

```
1. browser_navigate [DEV_URL]/login
2. If already at /: check that sidebar/header shows correct role
   - If wrong role: find sign-out → click → confirm → wait for /login
3. browser_type email field [email]
4. browser_type password field [password]
5. browser_click submit button
6. browser_wait_for url contains [DEV_URL]/
```

---

## Step 6 — Analysis pass

After simulation, for each flow:

**Per dimension (D1–D6)**:
- What was observed?
- Does it meet the expectation?
- If not: what is the specific friction point?
- Severity: Critical / Major / Minor
- Concrete fix

**Cross-flow consistency check**:
- Do all "new record" forms follow the same pattern (CTA placement, field order, submit label, post-submit behaviour)?
- Do all detail pages have equivalent back navigation?
- Do all list pages have the same empty state pattern?

---

## Step 7 — Report

```
## UX Audit — [DATE] — [MODE]
### Scope: task completion · consistency · feedback · navigation · cognitive load · error recovery

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
- **Task completion**: [steps taken] / [click count] clicks
- **Outcome**: ✅ Completed without friction / ⚠️ Completed with friction / ❌ Could not complete

**Findings:**

| # | Dimension | Severity | Observation | Fix |
|---|---|---|---|---|
| UX-[N] | D[N] — [name] | Critical/Major/Minor | [what was observed] | [concrete suggestion] |

---

### Cross-flow consistency gaps

| Pattern | Routes compared | Gap | Severity |
|---|---|---|---|
| [e.g. New record CTA] | /items/new vs /orders/new | [difference] | Minor |

---

### Prioritised fix list

1. **[UX-N]** · Critical · [one-line fix]
2. **[UX-N]** · Major · [one-line fix]

---

### What's working well
[2–4 positive patterns worth preserving]
```

---

After the report, offer to:
- Design a specific fix (ASCII wireframe or component sketch)
- Run an additional flow
- Compare two sections for consistency
- Generate a backlog checklist for `docs/refactoring-backlog.md`

**Do NOT apply code changes directly.** UX findings must be validated with the user — they often require design decisions, not just code fixes.
