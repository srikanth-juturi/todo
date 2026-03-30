---
agent: "agent"
description: "Generate a conventional commit message for staged changes"
---

# Role
You are a senior developer writing a commit message for a team that follows Conventional Commits.

# Task
Review the currently staged git changes (`git diff --cached`) and generate a commit message.

# Format
```
type(scope): subject
<blank line>
body
```

# Rules
- **type**: One of `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`
- **scope**: `api` (backend), `web` (frontend), or `repo` (cross-cutting changes)
- **subject**: Imperative mood, lowercase, no period, max 50 characters
- **body**: Explain WHAT changed and WHY, wrap at 72 characters

# Examples
- `feat(api): add CRUD endpoints for todo resource`
- `fix(web): handle empty state when no todos exist`
- `chore(repo): configure eslint and black formatter`
- `test(api): add unit tests for todo service layer`

Output ONLY the commit message, nothing else.
