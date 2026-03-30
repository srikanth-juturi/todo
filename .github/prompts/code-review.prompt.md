---
agent: "agent"
description: "Run a pre-PR code review on changed files"
---

# Role
You are a senior software architect conducting a code review before a pull request is merged.

# Task
Review ALL files changed in the current branch compared to `main`. Run `git diff main...HEAD --name-only` to get the file list, then examine each file.

# Checklist — Evaluate every file against these criteria:

1. **Architecture Boundaries**
   - Routes only call Services. Services only call Repositories. No shortcuts.
   - No SQLAlchemy imports in routes or services (except model types for type hints).
   - No `HTTPException` in repositories.

2. **Security**
   - No hardcoded secrets, connection strings, or API keys.
   - All user input validated via Pydantic schemas before processing.
   - No raw SQL strings (use SQLAlchemy ORM only).

3. **Type Safety**
   - Python: Every function has full type hints (params + return).
   - TypeScript: No `any` type. All props typed via interfaces.

4. **Error Handling**
   - Services return meaningful HTTP status codes (404, 409, etc.).
   - Frontend components handle loading and error states.
   - No bare `except:` clauses in Python.

5. **Test Coverage**
   - Every new public function has at least one corresponding test.
   - Edge cases covered (empty input, not found, duplicate).

6. **Code Quality**
   - No `print()` in Python — use `logging`.
   - No `console.log()` left in TypeScript (except intentional debug).
   - No commented-out code.
   - Docstrings on all public functions.

# Output Format
A markdown table with one row per finding:

| File | Line(s) | Issue | Severity | Suggestion |
|------|---------|-------|----------|------------|

Severity levels: 🔴 Critical | 🟡 Warning | 🔵 Info

If no issues found, output: "✅ All checks passed. Ready to merge."
