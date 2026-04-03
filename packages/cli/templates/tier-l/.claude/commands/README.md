# Custom Commands

Custom commands are reusable prompt templates you invoke with `/command-name` in Claude Code.

## When to use commands vs skills vs rules

| Mechanism | Use when | Loaded |
|---|---|---|
| **Commands** (this dir) | Reusable prompts you run on demand (e.g. `/review`, `/deploy-checklist`) | On invocation only |
| **Skills** (`.claude/skills/`) | Multi-step audit workflows with structured output | On invocation only |
| **Rules** (`.claude/rules/`) | Constraints that apply to every session automatically | Every session |

## How to create a command

1. Create a Markdown file in this directory: `.claude/commands/my-command.md`
2. Write the prompt template as the file content
3. Use `$ARGUMENTS` to accept user input: `/my-command some input here`
4. Invoke with `/my-command` in any Claude Code session

## Example

```markdown
# .claude/commands/review.md

Review the following files for correctness, security issues, and adherence
to the project conventions in CLAUDE.md:

$ARGUMENTS

Output: a numbered list of findings with severity (critical / major / minor).
```

Usage: `/review src/api/users.ts src/api/auth.ts`

## Tips

- Keep commands focused on a single task
- Reference project files (CLAUDE.md, rules) for context - Claude reads them automatically
- Commands in subdirectories work too: `.claude/commands/db/migrate-check.md` → `/db/migrate-check`
- Commands are project-specific and committed to git - the whole team can use them
