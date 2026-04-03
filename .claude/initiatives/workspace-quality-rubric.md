# Workspace Quality Rubric — Session File

**Branch**: `feat/workspace-quality-rubric`
**Started**: 2026-04-03
**Status**: Phase 1 - Research in progress
**Model**: Opus 4.6 (research + rubric definition phases)

---

## Obiettivo

Definire un rubric riutilizzabile per valutare la qualità di qualsiasi workspace AI scaffoldato (indipendente dallo stack), con le seguenti proprietà:

- Applicabile a qualsiasi progetto (non CDK-specific)
- Basato su criteri oggettivi e misurabili
- Usabile come baseline per validazioni ripetute (ogni round di scaffolding)
- Prima applicazione: mac-transcription-collector (Swift/macOS, Tier M, CDK v1.6.1)

**Scope**: Qualità strutturale + qualità del contenuto dei file workspace AI. Non solo "i file ci sono" (quello lo fa già doctor + audit-22check) ma "i file danno a Claude le informazioni giuste per lavorare efficacemente sul progetto".

---

## Valutazione Iniziale (2026-04-03)

### Cosa regge nell'impostazione

Il bisogno è reale. Il ciclo audit attuale (25 check) è autoreferenziale: CDK valida i propri template contro i propri test. Un metro esterno è più obiettivo. La sequenza "prima criteri, poi validazione" è corretta.

### Tre problemi identificati nell'impostazione originale

**1. "Progetti simili" come fonte di criteri - bassa resa.**
CDK è inusuale: multi-tier governance scaffold su Claude Code. Sul web si trovano cursor rules repos, CLAUDE.md community examples, blog posts Anthropic. Nessuno copre governance pipelines, STOP gates, skills-as-files. La ricerca esterna darebbe criteri generici.

Fonti più utili:
- Anthropic documentation ufficiale su CLAUDE.md e Claude Code
- Principi di design già incorporati in CDK (decisioni prese e perché)
- Analisi di cosa serve effettivamente a Claude per lavorare su un progetto

**2. Target ambiguo - due oggetti distinti:**
- Output su mac-transcription-collector: i file scaffoldati sono utili e corretti per quel progetto specifico?
- Template CDK: i template producono output di qualità per qualsiasi stack?

Round 5 ha validato l'integrità strutturale (file presenti, placeholder risolti). Manca la valutazione del contenuto.

**3. "Miglioramento incrementale continuo" = framework vivo, non deliverable di sessione.**
Separare: prima rubric usabile ora, poi decidere se diventa processo ricorrente.

---

## Informazioni Acquisite

### Stato corrente CDK (v1.6.1)

- 4 tier: 0 (Discovery), S (Fast Lane), M (Standard), L (Full)
- Doctor: 17 check di integrità strutturale
- Audit 25 check: valida template resolution, stop hooks, pipeline gates, placeholder risolti
- Integration tests: 233 check
- Round 5 su mac-transcription-collector: 24/25 PASS (check 5.2 e 6.3 sono user-side, non CDK bugs)

### Copertura attuale degli audit (cosa già misuriamo)

| Categoria | Coverage attuale |
|-----------|-----------------|
| File presenti (struttura) | PASS - doctor + audit |
| Placeholder risolti | PASS - audit check 2.x |
| Stop hook presente e funzionale | PASS - audit check 3.x |
| Pipeline gate count | PASS - audit check 1.x |
| Comandi nativi corretti (no npm fallback) | PASS - integration tests v1.6.1 |
| Playwright detection false positive | FIXED - v1.6.1 |
| Contenuto CLAUDE.md (qualità informativa) | NON MISURATO |
| Qualità skills (usabilità, completezza) | NON MISURATO |
| Qualità rules (efficacia, specificità) | NON MISURATO |
| Pipeline steps (chiarezza, actionability) | NON MISURATO |
| Coerenza cross-file | NON MISURATO |

### Gap identificato

L'audit corrente è **strutturale e meccanico**. Manca una dimensione **qualitativa e semantica**: i file non solo ci sono e hanno i placeholder risolti, ma *funzionano* come workspace AI?

---

## Piano Esecutivo — Opzione A: Rubric Riutilizzabile

### Fase 1 - Research (Opus 4.6)

**Obiettivo**: raccogliere fonti esterne autorevoli per ancorare il rubric

Fonti da esaminare:
1. Anthropic official docs su CLAUDE.md best practices
2. Claude Code documentation su memory, commands, hooks
3. Community patterns (cursor.directory, GitHub Copilot workspace conventions)
4. Analisi dei principi CDK già documentati in README + operational-guide

**Deliverable**: lista annotata di fonti + principi estratti, salvata in questo file (sezione "Research Output")

### Fase 2 - Definizione Dimensioni (Opus 4.6)

Identificare le dimensioni di valutazione. Draft iniziale:

| Dimensione | Descrizione |
|-----------|-------------|
| **D1 - Project Identity** | CLAUDE.md descrive il progetto in modo che Claude possa rispondere a "chi sono, cosa faccio, per chi" |
| **D2 - Tech Grounding** | Stack, comandi, framework specificati e corretti per il progetto reale |
| **D3 - Workflow Clarity** | Pipeline/processo di sviluppo definito, con gate e checkpoint chiari |
| **D4 - Rules Effectiveness** | Rules sono specifiche, actionable, non generiche |
| **D5 - Skills Completeness** | Skills coprono i task ripetitivi rilevanti per lo stack |
| **D6 - Context Hygiene** | Memory, context-review, files-guide permettono a Claude di avere contesto aggiornato |
| **D7 - Safety Guards** | Stop hooks, STOP gates, review points proteggono da azioni irreversibili |
| **D8 - Cross-file Coherence** | I file si riferiscono l'uno all'altro in modo consistente (no path broken, no contradictions) |

**Deliverable**: dimensioni finalizzate con descrizione e criteri di scoring

### Fase 3 - Scoring System (Opus 4.6)

Per ogni dimensione, definire:
- Criteri di valutazione (cosa osservare)
- Scala: 0 (assente/inutilizzabile), 1 (parziale), 2 (adeguato), 3 (eccellente)
- Esempi concreti per ogni livello (basati su CDK output reale)

**Deliverable**: rubric completo come documento standalone (`docs/workspace-quality-rubric.md`)

### Fase 4 - Validazione del Rubric (Opus 4.6)

Prima di applicarlo a mac-transcription-collector:
- Il rubric è applicabile a uno stack non-Swift (test su progetto noto)?
- I criteri sono oggettivi (stesso valutatore, stesso score)?
- Le dimensioni coprono tutto il gap identificato nella tabella sopra?

### Fase 5 - Prima Run (→ Opzione B)

Applicare il rubric a mac-transcription-collector come first run ufficiale.
Output: gap list + piano azioni prioritizzato (vedere sezione Opzione B).

---

## Opzione B — Validazione mac-transcription-collector (To Be)

**Prerequisito**: Rubric Opzione A completato e validato.

**Oggetto**: scaffold CDK v1.6.1, Tier M, Swift/macOS, in-place init su progetto esistente

**Output atteso**:
- Score per ogni dimensione D1-D8
- Gap list: cosa manca, cosa è generico, cosa è errato per il progetto specifico
- Action plan prioritizzato: P1 (blocca l'utilità), P2 (riduce qualità), P3 (nice-to-have)
- Delta: cosa deve cambiare nel progetto vs cosa deve cambiare nei template CDK

**Nota**: alcune gap saranno user-side (Discovery pass non completato, CLAUDE.md Tech Stack vuoto — check 5.2 Round 5). Il rubric deve distinguere gap CDK da gap user.

---

## Research Output

### Fonte 1: Anthropic Official Documentation

**URLs verificate**:
- `code.claude.com/docs/en/memory` - CLAUDE.md reference page
- `code.claude.com/docs/en/best-practices` - workspace best practices
- `code.claude.com/docs/en/context-window` - context budget visualization
- `code.claude.com/docs/en/hooks` - hooks vs CLAUDE.md distinction
- `code.claude.com/docs/en/skills` - skills as demand-loaded context

**Principi estratti**:

| ID | Principio | Fonte |
|----|-----------|-------|
| A1 | **Size discipline**: CLAUDE.md ≤ 200 righe. File più lunghi causano istruzioni ignorate - l'aderenza degrada con la dimensione | memory docs + best-practices |
| A2 | **Specificity over vagueness**: istruzioni concrete e verificabili ("Use 2-space indentation" non "Format code properly") | memory docs |
| A3 | **Signal-to-noise**: includere solo ciò che Claude non può inferire dal codice. Se Claude fa già la cosa giusta senza l'istruzione, rimuoverla | best-practices |
| A4 | **No contradictions**: regole in conflitto tra file causano comportamento arbitrario. Review periodica obbligatoria | memory docs |
| A5 | **Separation of concerns**: CLAUDE.md = contesto persistente, rules/ = istruzioni path-scoped, skills = workflow on-demand, hooks = enforcement deterministico | hooks docs + skills docs |
| A6 | **Emphasis tuning**: "IMPORTANT" o "YOU MUST" migliora l'aderenza su regole critiche | best-practices |
| A7 | **Verification is highest-leverage**: includere test, screenshot, output atteso per auto-verifica di Claude | best-practices |
| A8 | **Treat it like code**: versionare, revieware quando le cose vanno male, potare regolarmente, testare osservando se il comportamento cambia | best-practices |
| A9 | **Context is the constraint**: ogni token in CLAUDE.md compete con file reads, tool outputs e conversazione. CLAUDE.md caricato come user message a bassa priorità | context-window docs |
| A10 | **Import for scale**: usare `@path` imports per mantenere CLAUDE.md conciso referenziando docs dettagliati | memory docs |

### Fonte 2: Anthropic Engineering Blog

**URL**: `anthropic.com/engineering/effective-context-engineering-for-ai-agents`

| ID | Principio | Dettaglio |
|----|-----------|-----------|
| B1 | **Goldilocks zone**: istruzioni specifiche abbastanza da guidare, flessibili abbastanza da fornire euristiche. No logica if-else rigida, no guidance vaga | Blog post |
| B2 | **Examples over exhaustive rules**: esempi canonici e diversificati valgono più di mille parole di regole | Blog post |
| B3 | **Context rot**: l'accuratezza decresce con l'aumento dei token per limiti dell'architettura transformer | Blog post |
| B4 | **Structure with markup**: sezioni distinte con XML/Markdown headers per leggibilità | Blog post |

### Fonte 3: Community Patterns (cross-tool)

**Strumenti confrontati**: Cursor (.cursorrules), GitHub Copilot (.github/copilot-instructions.md), Claude Code (CLAUDE.md), Windsurf, Cline, Aider

| ID | Principio | Convergenza |
|----|-----------|-------------|
| C1 | **Tech stack declaration**: tutti i tool beneficiano di stack + versioni esplicite | Tutti i tool |
| C2 | **Actionable over aspirational**: "be specific" è il consiglio più comune cross-tool | Cursor + Copilot + Claude Code |
| C3 | **File path conventions**: definire dove vanno i file, come si chiamano | Cursor (forte), Claude Code (files-guide) |
| C4 | **Anti-patterns explicit**: dire cosa NON fare è efficace quanto dire cosa fare | Cursor community, CDK output-style |
| C5 | **Size budget per tool**: ogni tool ha un context budget - le istruzioni devono starci dentro | Tutti i tool |
| C6 | **Version control the config**: AI workspace files = codice, committati nel repo | Tutti i tool |

### Fonte 4: Principi CDK interni (README + operational-guide + templates)

**Principi di qualità già codificati in CDK**:

| ID | Principio | Dove codificato |
|----|-----------|-----------------|
| D1 | **Legibility**: lavoro visibile, auditabile, reviewable | README core statement |
| D2 | **Reversibility**: ogni azione significativa reversibile in minuti | README + STOP gates |
| D3 | **Traceability**: decisioni AI discoverable nella git history con attribution | README + commit skill |
| D4 | **Specification before code**: docs-first (Phase 1 → Phase 2) | pipeline.md Tier M/L |
| D5 | **Tiered complexity**: overhead di processo scala con blast radius | 4-tier architecture |
| D6 | **Mechanical → Structured → Judgment**: tre livelli di qualità verificabili | doctor → context-review → STOP gates |
| D7 | **13 context-review checks (C1-C13)**: secret hygiene, schema currency, path accuracy, duplication, canonical docs sync | context-review.md |
| D8 | **9 CLAUDE.md standards (S1-S9)**: density ≤200, content filter, specific language, progressive disclosure, hook enforcement | claudemd-standards.md |
| D9 | **9 pipeline standards (S1-S9)**: phase gates, testing pyramid, security checklist, docs-first, conventional commits | pipeline-standards.md |
| D10 | **Information hierarchy**: file diversi caricati in momenti diversi (session start vs Phase 0 vs Phase 1 vs on-demand) | files-guide.md |

### Sintesi: 5 meta-principi convergenti

Dalla ricerca emergono 5 principi trasversali a tutte le fonti:

1. **Context economy** (A1, A3, A9, B3, C5): lo spazio è finito - ogni token deve guadagnarsi il posto
2. **Specificity** (A2, A6, B1, C2, C4): istruzioni concrete, verificabili, con esempi - mai vaghe
3. **Separation of concerns** (A5, A10, C3, D5, D10): informazione giusta nel posto giusto, caricata al momento giusto
4. **Verifiability** (A7, A8, D6, D7): regole che possono essere testate, non solo dichiarate
5. **Coherence** (A4, B4, D7-D9): nessuna contraddizione cross-file, struttura consistente

---

## Azioni Future (fuori scope rubric)

- **Scaffoldare `.claude/commands/README.md`** in Tier M/L: spiega cosa sono i commands, quando usarli vs skills, come crearne uno. No file di esempio finti.
- **Non scaffoldare `agents/`**: pattern non documentato ufficialmente da Anthropic. Monitorare.
- **Menzionare `agents/` in files-guide.md** (Tier M/L): una riga come pattern emergente.

---

## Dimensioni Confermate (Fase 2)

| Dim | Nome | Cosa valuta | Meta-principio |
|-----|------|-------------|----------------|
| **D1** | Project Identity | CLAUDE.md risponde a "cos'è, cosa fa, per chi" - Claude può navigare il progetto senza chiedere | Specificity |
| **D2** | Tech Grounding | Stack, comandi build/test/lint, dipendenze chiave - corretti per il progetto reale | Specificity |
| **D3** | Workflow Clarity | Pipeline/fasi con gate espliciti. Claude sa cosa fare a ogni step e quando fermarsi | Verifiability |
| **D4** | Rules Effectiveness | Rules specifiche, actionable, no vagueness. Sicurezza, output-style, project-specific | Specificity + Verifiability |
| **D5** | Skills Completeness | Skills coprono task ripetitivi per lo stack. Frontmatter corretto, allowed-tools dichiarati. Meccanismo giusto per ogni tipo di automazione | Separation of concerns |
| **D6** | Context Economy | CLAUDE.md ≤ 200 righe. No duplicazione. Info nel file giusto (CLAUDE.md vs rules vs skills vs commands vs memory). Imports usati dove serve | Context economy |
| **D7** | Safety Guards | Stop hooks configurati e funzionali. STOP gates nel pipeline. Review points per azioni irreversibili | Verifiability |
| **D8** | Cross-file Coherence | Path references validi, nessuna contraddizione, nomi consistenti, tier boundaries rispettate | Coherence |

---

## Rubric v1.0

**Documento completo**: `docs/workspace-quality-rubric.md`

Struttura del rubric:
- 8 dimensioni (D1-D8) con pesi differenziati (1x-2x)
- Scala 0-3 per dimensione con definizioni precise ed esempi concreti
- Score normalizzato 0-100 (weighted sum / 30 x 100)
- Gap attribution: Tool-side (T), User-side (U), Design-side (D)
- Red flags per dimensione
- Score sheet template compilabile
- Interpretation guide (5 fasce: Unusable → Excellent)
- Action priority (P1 blocks utility → P3 optimization)

Ancoraggi:
- Anthropic official docs (A1-A10)
- Context engineering blog (B1-B4)
- Community cross-tool patterns (C1-C6)
- CDK internal principles (D1-D10)

---

## Fase 4 - Validazione

### Test 1: Applicabilità non-CDK
**Risultato**: PASS con riserva. Il rubric è applicabile a qualsiasi workspace ma D4/D5/D6/D7 hanno un ceiling implicito a score 2 per tool senza skills/hooks/path-scoped rules. Aggiunta nota "Tool ceiling" al rubric.

### Test 2: Oggettività criteri
**Risultato**: PASS con 2 fix applicati.
- D6.2 (removal test): reso meccanico con test a due step (1. info reperibile da file standard? 2. rimozione causa errore specifico e nominabile?)
- D4.5 (self-evident rules): annotato che la baseline dipende dal modello AI

Criteri residui con margine interpretativo accettabile: D3.5 (scales), D8.3 (contradictions). Non risolvibili completamente senza over-engineering.

### Test 3: Copertura gap
**Risultato**: PASS completo. 5/5 gap "NON MISURATO" dalla tabella Coverage sono coperti:
- Contenuto CLAUDE.md → D1 + D2
- Qualità skills → D5
- Qualità rules → D4
- Pipeline steps → D3
- Coerenza cross-file → D8

---

## Fase 5 — Prima Run: mac-transcription-collector

**Project**: mac-transcription-collector
**Date**: 2026-04-03
**Evaluator**: Claude Opus 4.6
**Workspace tool**: CDK v1.6.1
**Tier**: M (Standard)
**Stack**: Swift/macOS (Xcode project)

---

### D1 — Project Identity | Score: 0 | Weight: 1.0 | Weighted: 0.0

**Evidence**:
- CLAUDE.md line 4: `[One paragraph: what the product does, who uses it, what problem it solves.]` - placeholder, never filled
- No project purpose, no target user, no domain terminology
- Project name is the only identity signal

**Criteria breakdown**:
- 1.1 Project purpose: FAIL - placeholder
- 1.2 Target user: FAIL - not stated
- 1.3 Scope boundaries: FAIL - not stated
- 1.4 Domain terminology: FAIL - not applicable content to evaluate

**Red flags triggered**: Placeholder text present. No mention of what the project does.

**Attribution**: **User-side (U)** - CDK produced the template correctly, user did not fill it in.

---

### D2 — Tech Grounding | Score: 1 | Weight: 1.0 | Weighted: 1.0

**Evidence**:
- CLAUDE.md Tech Stack (lines 7-14): all fields are placeholders (`[e.g. Next.js 15, Express...]`)
- Key Commands (lines 30-37): partially filled - `swift run`, `xcodebuild build`, `xcodebuild test` are correct. But line 36 has `N` (literal placeholder for E2E) which is the correct CDK sentinel value
- Pipeline Phase 3 (lines 130-132): correctly uses `xcodebuild build` and `xcodebuild test` - matches CLAUDE.md
- Stop hook in settings.json: `xcodebuild test` - correct, matches

**Criteria breakdown**:
- 2.1 Tech stack: FAIL - all placeholder except commands
- 2.2 Commands runnable: PARTIAL - swift/xcodebuild commands are correct but Tech Stack section empty
- 2.3 Stack-specific conventions: FAIL - line 40-43 still has `[Italian / English / other]` and `[Other non-obvious conventions.]`
- 2.4 Dependencies match: CANNOT VERIFY - no tech stack declared to compare against

**Attribution**: Mixed - **User-side (U)** for unfilled Tech Stack section. **Tool-side (T, minor)** for the Key Commands section having an unexplained `N` sentinel that reads like a broken value to a new user.

---

### D3 — Workflow Clarity | Score: 3 | Weight: 1.5 | Weighted: 4.5

**Evidence**:
- pipeline.md: 282 lines, 8 phases + cross-cutting rules
- Phase 0 (session orientation) with CONTEXT_IMPORT check
- Phase 1 STOP gate with Mode A/B auto-selection
- Phase 1.5 conditional design review
- Phase 6 STOP gate with outcome checklist
- Phase 8.5 context review (C1-C12)
- Fast lane routing (Tier S for low blast radius)
- Tier 1/Tier 2 scope sweep with concrete dimension checklists
- Execution keywords defined and enforced
- Cross-cutting rules: never commit to main, green before commit, conventional commits

**Criteria breakdown**:
- 3.1 Phases defined: PASS - 8 phases with clear entry/exit criteria
- 3.2 Human review points: PASS - 2 STOP gates + Phase 1.5 conditional + Phase 8.5
- 3.3 Scope before implementation: PASS - Phase 1 mandatory scope sweep
- 3.4 Completion criteria: PASS - Phase 6 checklist with actual results
- 3.5 Complexity scaling: PASS - Tier S/M/L routing, Mode A/B auto-selection

**Red flags triggered**: none.

**Attribution**: **Tool-side positive** - CDK template produces an excellent pipeline for Tier M.

---

### D4 — Rules Effectiveness | Score: 2 | Weight: 1.0 | Weighted: 2.0

**Evidence**:
- 5 rules files (619 lines total): pipeline.md, security.md, output-style.md, git.md, context-review.md
- security.md: 6-point checklist, specific to API/auth/DB code, verifiable pass/fail
- output-style.md: 74 lines, concrete forbidden patterns with replacements
- git.md: branch naming, commit format, never-commit list
- context-review.md: 13 checks (C1-C13) with explicit pass/fail criteria

**Criteria breakdown**:
- 4.1 Specific and verifiable: PASS - "Auth check must be first operation" is verifiable
- 4.2 Security coverage: PARTIAL - security.md covers web API patterns (auth, SQL injection, RLS). For a Swift/macOS app without web APIs, some rules are inapplicable (RLS, API routes). No macOS-specific security rules (sandbox entitlements, keychain, TCC permissions)
- 4.3 Organized by concern: PASS - 5 separate files
- 4.4 Critical rules use emphasis: PASS - "never", "must be the first", bolded constraints
- 4.5 No self-evident rules: PASS - no "write clean code" type rules found

**Deduction rationale**: security.md assumes a web API stack. A Swift/macOS desktop app has a different attack surface (entitlements, local file access, App Sandbox, keychain). The rules are high quality but partially mismatched to the stack.

**Attribution**: **Tool-side (T)** - CDK's security.md template is web-oriented. Missing: stack-specific security rule generation for native apps.

---

### D5 — Skills Completeness | Score: 2 | Weight: 1.0 | Weighted: 2.0

**Evidence**:
- 5 skills: arch-audit, commit, perf-audit, security-audit, skill-dev
- 1 agent: dependency-scanner (correctly placed in agents/)
- commit skill: correctly configured, no placeholders, model: haiku
- arch-audit: correctly configured, fetches Anthropic docs
- perf-audit: has applicability check for native apps - will correctly bail out with "use Instruments instead" message
- security-audit: references `docs/sitemap.md` for target resolution - sitemap doesn't exist in this project (was scaffolded empty in docs/ but not created)
- skill-dev: correctly configured, generic (stack-agnostic)

**Criteria breakdown**:
- 5.1 Repetitive tasks automated: PASS - commit, audit suite present
- 5.2 Configured for stack: PARTIAL - perf-audit correctly handles native bail-out. security-audit assumes web routes. No Swift-specific skills (Instruments profiling, xctest patterns)
- 5.3 Right mechanism: PASS - skills for auto-triggered, agent for dependency scan
- 5.4 Dependencies declared: PASS - skills declare model, context, effort

**Deduction rationale**: skills are well-structured but web-centric. perf-audit handles the mismatch gracefully (bail-out). security-audit does not - it will try to audit "API routes" on a macOS desktop app.

**Attribution**: **Tool-side (T)** - CDK scaffolds web-oriented audit skills without stack-aware filtering (except perf-audit which was fixed in v1.6.1).

---

### D6 — Context Economy | Score: 2 | Weight: 1.5 | Weighted: 3.0

**Evidence**:
- CLAUDE.md: 74 lines (under 200 hard limit, under 100 optimal - PASS)
- Rules separated by concern (5 files in rules/)
- Skills demand-loaded (5 skills, not in CLAUDE.md)
- Agent persona in agents/ (not loaded at startup)
- No @-imports used (none needed at current size)
- files-guide.md: 11,471 bytes - reference doc explaining file hierarchy

**Criteria breakdown**:
- 6.1 Size budget: PASS - 74 lines, well under both thresholds
- 6.2 Removal test: PARTIAL - the unfilled placeholder sections in CLAUDE.md (Overview, Tech Stack, RBAC, Workflows, Known Patterns, Environment) consume ~40 lines of pure noise. Claude reads template comments and placeholders every session for zero benefit
- 6.3 Right file type: PASS - good separation between CLAUDE.md / rules / skills / agents
- 6.4 No duplication: PASS - no duplicate content found across files
- 6.5 Progressive disclosure: PARTIAL - no @-imports used, but not needed at current scale. Path-scoped rules not used (output-style.md has `description:` frontmatter but no `paths:` - loads every session even for non-prose tasks)

**Deduction rationale**: the unfilled placeholders are negative-value content. 40+ lines of `[placeholder]` text loaded every session. Until filled, these sections should ideally not exist.

**Attribution**: Mixed - **User-side (U)** for not filling placeholders. **Design-side (D)** - CDK could generate CLAUDE.md with placeholder sections commented out or excluded until user fills them, rather than shipping visible placeholders that consume context budget.

---

### D7 — Safety Guards | Score: 3 | Weight: 2.0 | Weighted: 6.0

**Evidence**:
- Stop hook: `xcodebuild test` - correct command, not a placeholder, 300s timeout
- `stop_hook_active` guard present (conditional bypass for non-test phases)
- permissions.deny: force push, push to main, rm -rf, DROP TABLE, TRUNCATE
- .gitignore: `.env`, `.env.local`, `.env.*.local`, `.env.production`, `*.pem`, `*.key`, `secrets/`, `credentials/`
- PostToolUse audit hook: logs Write/Edit/Bash calls to `~/.claude/audit/`
- SessionStart: audit logging + arch-audit overdue check
- StopFailure: logged to audit
- Pipeline: 2 STOP gates (Phase 1, Phase 6) + Phase 1.5 conditional
- context-review.md C1: grep for token patterns (sk_live_, sbp_, re_)
- Cross-cutting rule: "Never commit to main or staging directly"

**Criteria breakdown**:
- 7.1 Test enforcement: PASS - stop hook with real command
- 7.2 Destructive ops blocked: PASS - deny list covers force push, DB drops
- 7.3 Secrets protected: PASS - comprehensive .gitignore, C1 check
- 7.4 Human review for shared-state: PASS - push to main denied, STOP gates
- 7.5 Correct test command: PASS - `xcodebuild test` matches stack

**Red flags triggered**: none.

**Attribution**: **Tool-side positive** - CDK produces excellent safety configuration. Native command (`xcodebuild test`) correctly resolved.

---

### D8 — Cross-file Coherence | Score: 2 | Weight: 1.0 | Weighted: 2.0

**Evidence**:
- Test command consistency: `xcodebuild test` in CLAUDE.md (line 34), settings.json (stop hook), pipeline.md (Phase 3 line 132) - all match
- Build command consistency: `xcodebuild build` in CLAUDE.md (line 33), pipeline.md (line 131) - match
- Dev command: `swift run` in CLAUDE.md (line 32), pipeline.md Phase 5c (line 170) - match
- Reference docs: CLAUDE.md references `docs/requirements.md`, `docs/implementation-checklist.md`, `docs/refactoring-backlog.md`, `docs/adr/` - all exist on disk
- Pipeline references `docs/specs/` - exists (with archive/ subdir)
- Pipeline Phase 3b references `[API_TESTS_PATH]` - unresolved placeholder
- Pipeline Phase 4 references `N` as E2E command - correct sentinel for "not configured"
- permissions.allow includes `Bash(node:*)`, `Bash(npm:*)`, `Bash(npx:*)` - irrelevant for a Swift project (no node/npm in this project)
- security-audit skill references `docs/sitemap.md` - file does not exist

**Criteria breakdown**:
- 8.1 Path references valid: PARTIAL - most valid, security-audit → sitemap.md broken
- 8.2 Commands consistent: PASS - xcodebuild test/build/swift run match everywhere
- 8.3 No contradictions: PASS - no conflicting rules found
- 8.4 Tier-appropriate: PASS - Tier M features only
- 8.5 Skill/doc references: PARTIAL - `[API_TESTS_PATH]` unresolved in pipeline, permissions.allow has node/npm for a Swift project

**Deduction rationale**: minor coherence issues. The node/npm permissions are harmless but signal that the workspace wasn't fully adapted to the native stack. The `[API_TESTS_PATH]` placeholder in pipeline Phase 3b is an unresolved artifact.

**Attribution**: **Tool-side (T)** - CDK scaffolds node/npm permissions by default even for Swift projects. `[API_TESTS_PATH]` should be resolved or the Phase 3b section should be conditional.

---

### Score Summary

```
Project: mac-transcription-collector
Date: 2026-04-03
Evaluator: Claude Opus 4.6
Workspace tool: CDK v1.6.1
Tier: M (Standard)

| Dim | Score (0-3) | Weight | Weighted | Key gaps                              | Attribution |
|-----|-------------|--------|----------|---------------------------------------|-------------|
| D1  | 0           | 1.0    | 0.0      | All placeholder, no project identity  | U           |
| D2  | 1           | 1.0    | 1.0      | Tech Stack empty, conventions empty   | U + T minor |
| D3  | 3           | 1.5    | 4.5      | None                                  | —           |
| D4  | 2           | 1.0    | 2.0      | Security rules web-oriented           | T           |
| D5  | 2           | 1.0    | 2.0      | Skills web-oriented                   | T           |
| D6  | 2           | 1.5    | 3.0      | Placeholder noise in CLAUDE.md        | U + D       |
| D7  | 3           | 2.0    | 6.0      | None                                  | —           |
| D8  | 2           | 1.0    | 2.0      | node/npm perms, API_TESTS_PATH        | T           |
|-----|-------------|--------|----------|---------------------------------------|-------------|
| TOT |             | 10.0   | 20.5/30  |                                       | 68%         |

Final score: (20.5 / 30) x 100 = 68% — Functional
```

**Interpretation**: workspace works for routine tasks. Gaps in project identity (user-side: unfilled), stack-specific adaptation (tool-side: web-oriented defaults), and minor cross-file coherence issues.

---

### Gap List — Prioritized Actions

#### P1 — Blocks utility (fix immediately)

| # | Gap | Attribution | Action |
|---|-----|-------------|--------|
| P1.1 | CLAUDE.md Overview is placeholder | U | Fill: what mac-transcription-collector does, who uses it, what problem it solves |
| P1.2 | CLAUDE.md Tech Stack all placeholder | U | Fill: Swift, macOS, Xcode, any frameworks (SwiftUI/AppKit), data persistence layer |

#### P2 — Reduces quality (fix soon)

| # | Gap | Attribution | Action |
|---|-----|-------------|--------|
| P2.1 | security.md assumes web API stack | T | Create macOS-specific security rules: App Sandbox entitlements, keychain access patterns, TCC permissions, local file access validation |
| P2.2 | Placeholder noise in CLAUDE.md (~40 lines) | U + D | Fill remaining sections or remove unfilled placeholder sections to save context budget |
| P2.3 | Coding Conventions still placeholder | U | Fill: Swift naming conventions, UI language, project-specific rules |
| P2.4 | security-audit skill assumes web routes | T | Add applicability check for native apps (similar to perf-audit's bail-out) |

#### P3 — Optimization (nice-to-have)

| # | Gap | Attribution | Action |
|---|-----|-------------|--------|
| P3.1 | permissions.allow includes node/npm/npx | T | Replace with Swift-native: `Bash(swift:*)`, `Bash(xcodebuild:*)`, `Bash(xcrun:*)` |
| P3.2 | `[API_TESTS_PATH]` unresolved in pipeline Phase 3b | T | Resolve or make Phase 3b conditional on API presence |
| P3.3 | security-audit references non-existent docs/sitemap.md | T | Make sitemap.md reference conditional |
| P3.4 | No Swift-specific skills (Instruments, xctest patterns) | D | Consider adding native-stack skills in future CDK version |

#### Delta: CDK template changes vs user actions

| Action | Owner | Scope |
|--------|-------|-------|
| Fill CLAUDE.md placeholder sections | User | P1.1, P1.2, P2.2, P2.3 |
| Stack-aware permissions.allow (no node/npm for Swift) | CDK | P3.1 |
| security-audit applicability check for native apps | CDK | P2.4 |
| security.md native-stack variant | CDK | P2.1 |
| Conditional API_TESTS_PATH / Phase 3b | CDK | P3.2 |
| Conditional sitemap.md references in skills | CDK | P3.3 |

---

## Fase 6 — Stack-aware Content Specialization (Completata)

**Origine**: riflessione post-rubric. Il wizard rileva lo stack, ma il dato veniva usato solo per i comandi (livello 2). I file di governance restavano web-oriented nel contenuto semantico (livello 3). Il rubric ha quantificato il gap: D4 e D5 perdevano un punto su stack nativi.

**Principio applicato**: CDK resta stack-agnostic nella struttura e nel workflow. Content specialization aggiunta nei file dove lo stack determina il contenuto.

**Implementato**:

| Intervento | File modificati | Dettaglio |
|-----------|-----------------|-----------|
| security.md varianti | `templates/common/rules/security-native-apple.md`, `security-native-android.md`, `security-systems.md` + `security.md` (web, invariato) | 4 varianti: web (default), native-apple (Swift), native-android (Kotlin), systems (Rust/Go/.NET/Java senza API) |
| Selezione variante | `scaffold/index.js` → `securityRuleVariant()` | Seleziona in base a `techStack` + `hasApi`. Output sempre come `security.md` |
| permissions.deny | `scaffold/index.js` → `patchSettingsPermissions()` | Deny stack-specific: xcodebuild archive, cargo publish, gradlew publish, mvn deploy, gem push, twine upload, dotnet nuget push |
| CLAUDE.md auto-population | `scaffold/index.js` + `generators/claude-md.js` | `[FRAMEWORK_VALUE]` e `[LANGUAGE_VALUE]` risolti automaticamente da wizard data |
| security-audit applicability | `templates/tier-m/.claude/skills/security-audit/SKILL.md` + tier-l | Bail-out per native apps senza API (completato in P2) |

**Non implementato (fuori scope, come pianificato)**:
- Nuovi skill stack-specific (Instruments, Android Profiler)
- Pipeline varianti per stack (workflow correttamente agnostico)
- detect-stack.js stack family export (non necessario: logica diretta in securityRuleVariant)

---

## Checkpoint Corrente

- [x] Branch `feat/workspace-quality-rubric` creato
- [x] File di sessione creato con struttura completa
- [x] Fase 1: Research completata
- [x] Fase 2: Dimensioni confermate (D1-D8)
- [x] Fase 3: Rubric v1.0 completato (`docs/workspace-quality-rubric.md`)
- [x] Fase 4: Validazione rubric (3/3 test passed, 3 fix applicati)
- [x] Fase 5: Prima run su mac-transcription-collector — score 68% (Functional)
- [x] Fase 5b: P1-P3 completati — integration tests 233/233 PASS
  - P1: CLAUDE.md mac-transcription-collector compilato (Overview, Tech Stack, Conventions, Environment)
  - P2: security-audit applicability check aggiunto (tier-m + tier-l) — bail-out per stack nativi senza API
  - P3: stack-aware permissions.allow via patchSettingsPermissions() — 8 stack mappati (swift, kotlin, rust, dotnet, java, ruby, go, python)
- [x] Fix: CLAUDE.md auto-population — Framework e Language risolti automaticamente da wizard data (interpolate + generateClaudeMd). Fallback per framework non rilevato: italic hint. Native stacks: "N/A — native app". 233/233 tests PASS.
- [x] Fase 6: Stack-aware Content Specialization — completata
  - security.md: 4 varianti (web default, native-apple, native-android, systems) selezionate da securityRuleVariant() in base a techStack + hasApi
  - permissions.deny: stack-specific deny entries aggiunti (xcodebuild archive, cargo publish, gradlew publish, mvn deploy, gem push, twine upload, dotnet nuget push)
  - CLAUDE.md auto-population: Framework e Language risolti da wizard data
  - Integration tests: 249/249 PASS (16 nuovi check: 12 security variant selection + 4 deny verification)
