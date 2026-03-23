# claude-dev-kit — Product Brief

> Strategic context for the team. Not referenced by Claude during coding sessions — kept here to pass Anthropic's CLAUDE.md inclusion test.

---

## Core principle

Claude generates, humans decide.

## Core problem solved

Mancanza di processo condiviso — non è un problema di Claude né dell'umano, è l'assenza di un accordo esplicito su come collaborare. Claude Code amplifica il process debt preesistente.

## Target users

**Primario**: il Builder PM e il tech lead — persone con abbastanza background tecnico per lavorare end-to-end con Claude Code e che hanno bisogno di un processo riproducibile e revisionabile per farlo in modo affidabile. Il creatore del progetto è un PM: questo non è un target aspirazionale, è il target reale.

**Secondario**: il team di engineering che usa Claude Code e vuole struttura senza inventarsela da zero.

**Pitch duale**: chi già usa Claude Code ha bisogno di struttura e reviewability. Chi lo valuta ha bisogno di fiducia nel processo. Due messaggi, un prodotto.

## Product scope (perimeter)

- **Stack**: agnostico di default. Template specializzati (Next.js, Supabase, FastAPI...) come estensioni opzionali — non nel core.
- **Tier model**: progressione lineare per progetto (si parte da 0, si sale di tier con la complessità). Il Fast Lane esiste sempre per task rapidi in parallelo.
- **Governance processo + qualità**: intenzionalmente inseparabili. Le audit skills sono parte del processo di chiusura blocco, non un modulo separato.
- **Permissions**: area di valore ancora inesplorata — da sviluppare, specialmente per Tier L.
- **Familiarity assumption**: i tier stessi guidano il livello di familiarità atteso. Tier 0 = zero assunzioni. Tier L = utente esperto.

## Roadmap

- **Context Builder** — tool separato che PRECEDE claude-dev-kit. Intervista guidata tra Claude e l'utente (PM, Dev, Designer) per definire stack, team, obiettivi, vincoli. Output: contesto strutturato che claude-dev-kit consuma per scaffoldare il tier giusto automaticamente. Questo è il prodotto che abbassa la barriera di ingresso per il Product Trio non-developer.
- Template specializzati per stack comuni (estensioni, non core)
- Espansione governance permessi (settings.json allow/deny tier-appropriate)
