# claude-dev-kit — Product Brief

> Strategic context for the team. Not referenced by Claude during coding sessions — kept here to pass Anthropic's CLAUDE.md inclusion test.

---

## Core principle

Claude generates, humans decide.

## Core problem solved

Lack of shared process — the issue is neither Claude nor the human, it is the absence of an explicit agreement on how to collaborate. Claude Code amplifies pre-existing process debt.

## Target users

**Primary**: the Builder PM and tech lead — people with enough technical background to work end-to-end with Claude Code who need a reproducible and reviewable process to do so reliably. The project creator is a PM: this is not an aspirational target, it is the real one.

**Secondary**: the engineering team using Claude Code that wants structure without having to invent it from scratch.

**Dual pitch**: those already using Claude Code need structure and reviewability. Those evaluating it need confidence in the process. Two messages, one product.

## Product scope (perimeter)

- **Stack**: agnostic by default. Specialised templates (Next.js, Supabase, FastAPI…) as optional extensions — not in the core.
- **Tier model**: linear progression per project (start at 0, move up tiers with complexity). The Fast Lane always exists for quick parallel tasks.
- **Process + quality governance**: intentionally inseparable. Audit skills are part of the block-closure process, not a separate module.
- **Permissions**: a value area still unexplored — to be developed, especially for Tier L.
- **Familiarity assumption**: the tiers themselves guide the expected familiarity level. Tier 0 = zero assumptions. Tier L = experienced user.

## Roadmap

- **Context Builder** — a separate tool that PRECEDES claude-dev-kit. A guided interview between Claude and the user (PM, Dev, Designer) to define stack, team, goals, and constraints. Output: structured context that claude-dev-kit consumes to scaffold the right tier automatically. This is the product that lowers the entry barrier for the non-developer Product Trio.
- Specialised templates for common stacks (extensions, not core)
- Permissions governance expansion (settings.json allow/deny tier-appropriate)
