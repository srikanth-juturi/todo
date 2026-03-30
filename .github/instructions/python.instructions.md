---
applyTo: "api/**/*.py"
---

# Python / FastAPI Instructions

## Async Pattern
- Use `async def` for ALL route handlers, service methods, and repository methods.
- Use `await` for every database operation.
- Never mix sync and async — no `run_sync()` workarounds.

## Type Hints
- Type-hint every function parameter and return value.
- Use `Optional[Model]` for lookups that may return None.
- Use `list[Model]` (lowercase) for collections, not `List[Model]`.
- Use `Annotated[Type, Depends()]` for dependency injection parameters.

## Dependency Injection
- Route handlers receive Services via `Depends()`.
- Services receive Repositories via `Depends()`.
- Repositories receive `AsyncSession` via `Depends(get_db)`.
- Example signature:
  ```python
  async def get_todos(
      service: Annotated[TodoService, Depends(get_todo_service)]
  ) -> list[TodoResponse]:
  ```

## Pydantic Schemas
- Use Pydantic v2 with `model_config = ConfigDict(from_attributes=True)`.
- Separate schemas for Create, Update, and Response.
- Example: `TodoCreate`, `TodoUpdate`, `TodoResponse`.
- Use `Field()` for validation constraints (min_length, max_length, etc.).

## SQLAlchemy Models
- Use `DeclarativeBase` (SQLAlchemy 2.x style).
- Use `Mapped[]` and `mapped_column()` for column definitions.
- Define `__tablename__` explicitly on every model.

## Error Handling
- Services raise `HTTPException` with appropriate status codes.
- 404 for not found, 409 for conflicts, 422 for validation (auto by FastAPI).
- Always include a `detail` message in HTTPException.

## Logging
- Use `logging.getLogger(__name__)` at module level.
- Log at appropriate levels: `logger.info()` for operations, `logger.error()` for failures.
- Never use `print()`.

## Docstrings
- Google style docstrings on all public functions.
- Include Args, Returns, and Raises sections where applicable.

## Import Order
- Standard library imports first.
- Third-party imports second (fastapi, sqlalchemy, pydantic).
- Local imports third (app.models, app.schemas, app.services).
- Blank line between each group.
