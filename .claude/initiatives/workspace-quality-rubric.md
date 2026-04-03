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

*(da compilare in Fase 1)*

---

## Rubric Draft

*(da compilare in Fase 3)*

---

## Checkpoint Corrente

- [x] Branch `feat/workspace-quality-rubric` creato
- [x] File di sessione creato con struttura completa
- [ ] Fase 1: Research - da eseguire con Opus 4.6
- [ ] Fase 2: Dimensioni finalizzate
- [ ] Fase 3: Rubric completo
- [ ] Fase 4: Validazione rubric
- [ ] Fase 5: Prima run su mac-transcription-collector (Opzione B)
