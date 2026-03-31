# Todo Workspace

This repository currently contains documentation, prompts, and agent/skill
configuration for a Todo app monorepo.

## Current Contents

- `.github/copilot-instructions.md`: Shared project architecture and coding
  rules.
- `.github/instructions/`: Language-specific coding rules for Python and
  TypeScript.
- `.github/prompts/`: Reusable prompts for PRD, TRD, code review, and commit
  message generation.
- `.github/skills/`: Reusable skill definitions:
  - `test-runner.skill.yml`
  - `api-endpoint-generation.skill.yml`
  - `database-migration.skill.yml`
  - `performance-review.skill.yml`
  - `security-review.skill.yml`
- `.github/copilot/`: Focused agent profiles for backend and frontend tasks.

## Intended Monorepo Layout

```text
api/  # FastAPI backend
web/  # React + TypeScript frontend
```

Note: `api/` and `web/` are not present in this workspace yet.

## Recommended Next Steps

1. Add backend and frontend app folders (`api/` and `web/`).
2. Add root-level setup instructions for dependencies and environment files.
3. Add run and test commands once code is present.
4. Keep shared architecture rules centralized in `.github/` docs and mirror
   only role-specific guidance in `.vscode/agents/`.
