# Copilot Workspace Instructions — Todo App

## Project Overview
A full-stack Todo application with a Python FastAPI backend and React TypeScript frontend in a monorepo layout (`/api` and `/web`).

## Architecture — Backend (`/api`)

### 3-Layer Architecture (strictly enforced)

**Layer 1 — Routes (`app/routes/`)**
- FastAPI routers only. Receive HTTP requests, validate via Pydantic schemas, call Service layer, return responses.
- NO business logic. NO direct DB access. NO repository calls.

**Layer 2 — Services (`app/services/`)**
- All business rules live here. Call Repository layer only.
- Raise `HTTPException` for rule violations (404, 409, etc.).
- Call `commit()` after successful write operations.
- NO SQLAlchemy queries. NO HTTP knowledge beyond HTTPException.

**Layer 3 — Repositories (`app/repositories/`)**
- All SQLAlchemy queries. Accept `AsyncSession` injected via `Depends()`.
- Return ORM model objects.
- NO business logic. NO HTTP knowledge. Pure data operations.

### Dependency Injection Flow
```
get_db() [db/session.py]
  → injected into Repository via Depends()
  → Repository injected into Service via Depends()
  → Service injected into Route handler via Depends()
```

### Backend Conventions
- All operations are **async**: `AsyncSession`, `async_sessionmaker`, `create_async_engine`.
- Use `Annotated[Type, Depends()]` for dependency injection (modern FastAPI style).
- Pydantic v2 with `model_config = ConfigDict(from_attributes=True)`.
- Repository: return `Optional[Model]` for single lookups, `list[Model]` for collections.
- Use Python `logging` module, never `print()`.
- Return meaningful HTTP status codes: 201 (create), 204 (delete), 404/409 (errors).
- Type-hint every function parameter and return value.
- Docstrings: Google style.
- Import order: stdlib → third-party → local.
- Use f-strings for string formatting.
- No secrets in code — use environment variables via `python-dotenv`.

## Architecture — Frontend (`/web`)

### Folder Structure
| Folder | Purpose |
|--------|---------|
| `src/pages/` | Route-level page components |
| `src/components/` | Reusable UI components |
| `src/hooks/` | React Query hooks, one file per domain |
| `src/services/` | Axios API client functions |
| `src/types/` | TypeScript interfaces and types |
| `src/utils/` | Helper/utility functions |

### Frontend Conventions
- Functional components with arrow function syntax only. No class components.
- All props typed via interfaces (not inline types).
- React Query (TanStack) for all server state — no `useState` for API data.
- Axios instance in `src/services/api.ts` with `baseURL` from environment variable.
- Named exports only, no default exports.
- No `any` type. Use `unknown` + type narrowing if truly unknown.
- Handle loading and error states in every component that fetches data.

## General Rules
- No secrets or connection strings in code. Use environment variables.
- Error handling on every async operation.
- No `# type: ignore` in Python without written justification.
- All functions must have type hints and docstrings (Python) or TSDoc (TypeScript).
- Follow Conventional Commits for commit messages.
