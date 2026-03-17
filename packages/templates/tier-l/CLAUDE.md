# [PROJECT_NAME] — Project Context

## Overview
[One paragraph: what the product does, who uses it, what problem it solves.]

## Tech Stack
- **Framework**: [e.g. Next.js 15, Express, Django, Rails]
- **Language**: [TypeScript / Python / Go / etc.]
- **Database**: [PostgreSQL + RLS / Prisma / Drizzle]
- **Auth**: [Auth mechanism]
- **Storage**: [File storage if any]
- **Email**: [Email provider if any]
- **Deploy**: [Platform + build command + run command]

## RBAC / Roles
| Role | Access |
|---|---|
| `[role_1]` | [what they can do] |
| `[role_2]` | [what they can do] |
| `[role_3]` | [what they can do] |

## Key Workflows
<!-- Document state machines here — approval flows, document lifecycle, etc. -->

```
[STATE_A] → [STATE_B] → [STATE_C]
          ↘ [STATE_REJECTED] (rejection_note required)
[STATE_REJECTED] → [STATE_A] (reopen)
```

## Key Commands
```bash
[INSTALL_COMMAND]
[DEV_COMMAND]
[BUILD_COMMAND]
[TEST_COMMAND]
[TYPE_CHECK_COMMAND]
[MIGRATION_COMMAND]
```

## Navigation by Role
| Role | Areas accessible |
|---|---|
| `[role_1]` | [pages / sections] |
| `[role_2]` | [pages / sections] |

## Coding Conventions
- Product UI language: **[Italian / English / other]**. Code/commits: **English**.
- Status/enum values: `UPPER_SNAKE_CASE`.
- Every API route: verify caller role before any operation.
- [Other non-obvious conventions.]

## Known Patterns
<!-- Add non-obvious gotchas here as you discover them. -->
<!-- Format: short title → what → why it matters → how to handle it -->

## Reference Documents
- **Session recovery**: `.claude/session/` — per-block session files.
- **Requirements**: `docs/requirements.md`
- **Progress tracker**: `docs/implementation-checklist.md`
- **Tech debt**: `docs/refactoring-backlog.md`
- **Architecture decisions**: `docs/adr/`
- **Entity contracts**: `docs/contracts/` — field × permission × validation matrices (if applicable)
- **Sitemap**: `docs/sitemap.md` — route × roles × key components (if applicable)
- **Dependency map**: `docs/dependency-map.md` — entity → surfaces lookup (if applicable)

## Environment
- `.env.local` — never commit. Key vars: [list names without values]
- Staging DB: [staging identifier]
- Production DB: [production identifier]
- **Hard rule**: staging credentials only in local dev. Production credentials only on production server.
