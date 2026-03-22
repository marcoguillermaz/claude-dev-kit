# claude-dev-kit — Project Context

## Overview
CLI tool that installs a governance layer on top of Claude Code. Four tiers from minimal discovery to full pipeline governance. Stack-agnostic, npm-distributable.

**Core principle**: Claude generates, humans decide.
**Core problem solved**: mancanza di processo condiviso — non è un problema di Claude né dell'umano, è l'assenza di un accordo esplicito su come collaborare. Claude Code amplifica il process debt preesistente.
**Target primario**: il Builder PM e il tech lead — persone con abbastanza background tecnico per lavorare end-to-end con Claude Code e che hanno bisogno di un processo riproducibile e revisionabile per farlo in modo affidabile. Il creatore del progetto è un PM: questo non è un target aspirazionale, è il target reale.
**Target secondario**: il team di engineering che usa Claude Code e vuole struttura senza inventarsela da zero.
**Pitch duale**: chi già usa Claude Code ha bisogno di struttura e reviewability. Chi lo valuta ha bisogno di fiducia nel processo. Due messaggi, un prodotto.

## Product Scope (perimeter)
- **Stack**: agnostico di default. Template specializzati (Next.js, Supabase, FastAPI...) come estensioni opzionali — non nel core.
- **Tier model**: progressione lineare per progetto (si parte da 0, si sale di tier con la complessità). Il Fast Lane esiste sempre per task rapidi in parallelo.
- **Governance processo + qualità**: intenzionalmente inseparabili. Le audit skills sono parte del processo di chiusura blocco, non un modulo separato.
- **Permissions**: area di valore ancora inesplorata — da sviluppare, specialmente per Tier L.
- **Familiarity assumption**: i tier stessi guidano il livello di familiarità atteso. Tier 0 = zero assunzioni. Tier L = utente esperto.

## Roadmap (orientamento)
- Pubblicazione npm (prossimo step operativo)
- **Context Builder** — tool separato che PRECEDE claude-dev-kit. Intervista guidata tra Claude e l'utente (PM, Dev, Designer) per definire stack, team, obiettivi, vincoli. Output: contesto strutturato che claude-dev-kit consuma per scaffoldare il tier giusto automaticamente. Questo è il prodotto che abbassa la barriera di ingresso per il Product Trio non-developer.
- Template specializzati per stack comuni (estensioni, non core)
- Espansione governance permessi (settings.json allow/deny tier-appropriate)

## Tech Stack
- **Runtime**: Node.js ≥ 18, ESM modules
- **CLI framework**: Commander + Inquirer + Chalk + Ora
- **Package**: `packages/cli/` — main CLI source
- **Templates**: `packages/templates/` — tier-specific scaffold files

## Key Commands
```bash
node packages/cli/src/index.js init        # run the init wizard locally
node packages/cli/src/index.js doctor      # run health checks
node packages/cli/src/index.js --help      # list all commands
```

## Project Structure
```
packages/
  cli/src/
    commands/     ← init-greenfield.js, init-in-place.js, doctor.js, upgrade.js
    scaffold/     ← index.js (interpolate + copyTemplateDir)
    generators/   ← claude-md.js, readme.js, context-import.js
    utils/        ← print-plan.js, detect-stack.js
  templates/
    tier-0/       ← Discovery: 3 files only
    tier-s/       ← Fast Lane: 4-step pipeline
    tier-m/       ← Standard: 8 phases, 2 STOP gates
    tier-l/       ← Full: 11 phases, 4 STOP gates + R1–R4
    common/       ← shared files (context-review.md, files-guide.md, rules/)
```

## Conventions
- Placeholder syntax: `[PLACEHOLDER_NAME]` — always uppercase with underscores
- All placeholders must be handled in `scaffold/index.js` → `interpolate()`
- Templates are stack-agnostic — no framework-specific assumptions
- Tier boundaries are strict: no Tier L features in Tier M templates
- `doctor.js` check count must match what README + operational-guide document

## Interaction Protocol
**Perimeter questions** (scope, vision, user, future): always use the `AskUserQuestion` tool — never present as inline text. Max 4 questions per call, each with 2–4 options. Open-ended questions get representative options + "Other" for custom input.

## Reference Documents
- `README.md` — public-facing, must stay in sync with all template/CLI changes
- `docs/operational-guide.docs` — full reference, must stay in sync
- Both updated as mandatory final step after every round of changes (standing rule)

## Current Version
`v0.5.3` — all four tiers stable, publishing to npm pending.
