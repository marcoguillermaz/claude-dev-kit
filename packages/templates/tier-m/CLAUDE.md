# [PROJECT_NAME] — Project Context

## Overview
[One paragraph: what the product does, who uses it, what problem it solves.]

## Tech Stack
- **Framework**: [e.g. Next.js 15, Express, Django, Rails]
- **Language**: [TypeScript / Python / Go / etc.]
- **Database**: [PostgreSQL / SQLite / MongoDB]
- **Auth**: [Auth mechanism]
- **Storage**: [File storage if any]
- **Email**: [Email provider if any]
- **Deploy**: [Platform + build command + run command]

## RBAC / Roles
| Role | Access |
|---|---|
| `[role_1]` | [what they can do] |
| `[role_2]` | [what they can do] |

## Key Workflows
<!-- State machines, approval flows, document lifecycle — anything with states -->

```
[STATE_A] → [STATE_B] → [STATE_C]
          ↘ [STATE_D] (with note required)
```

## Key Commands
```bash
[INSTALL_COMMAND]
[DEV_COMMAND]
[BUILD_COMMAND]
[TEST_COMMAND]
[TYPE_CHECK_COMMAND]
```

## Coding Conventions
- Product UI language: **[Italian / English / other]**. Code/commits: **English**.
- Status/enum values: `UPPER_SNAKE_CASE`.
- Every API route: verify caller role before any operation.
- [Other non-obvious conventions.]

## Known Patterns
<!-- Add non-obvious gotchas here as you discover them. -->
<!-- Format: what → why it matters → how to handle it -->

## Reference Documents
- **Requirements**: `docs/requirements.md`
- **Progress tracker**: `docs/implementation-checklist.md`
- **Tech debt**: `docs/refactoring-backlog.md`
- **Architecture decisions**: `docs/adr/`

## Environment
- `.env.local` — never commit. Key vars: [list names without values]
- Staging: [staging URL]
- Production: [production URL]
