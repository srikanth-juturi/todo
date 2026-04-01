# Technical Requirements Document — Todo AI Application

> **Date:** April 1, 2026
> **Source:** PRD — Todo AI Application (all 5 phases)
> **Stack:** FastAPI (Python 3.11+) · SQLAlchemy 2.x async · SQL Server · React 18 · TypeScript strict · TanStack React Query v5 · Axios · Vite · Vitest

---

## Feature Summary

Full-stack single-user Todo application built in 5 incremental phases. Each phase delivers backend and frontend together. The backend follows a strict 3-layer architecture (Routes → Services → Repositories) with async SQLAlchemy. The frontend follows a layered pattern (Pages → Components → Hooks → Services → Types).

---

## Phase 1 — Core Todo CRUD

### Database Changes

**New table: `todos`**

| Column | Type | Constraints |
|---|---|---|
| `id` | `INT IDENTITY(1,1)` | PRIMARY KEY |
| `title` | `NVARCHAR(255)` | NOT NULL |
| `description` | `NVARCHAR(1000)` | NULL |
| `is_completed` | `BIT` | NOT NULL, DEFAULT 0 |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT GETDATE() |
| `updated_at` | `DATETIME2` | NOT NULL, DEFAULT GETDATE() |

**Alembic:**
```bash
alembic revision --autogenerate -m "create_todos_table"
alembic upgrade head
```

---

### API Contract

| Method | Path | Request Body | Response | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/v1/todos` | — | `list[TodoResponse]` | 200 |
| `POST` | `/api/v1/todos` | `TodoCreate` | `TodoResponse` | 201, 422 |
| `GET` | `/api/v1/todos/{id}` | — | `TodoResponse` | 200, 404 |
| `PUT` | `/api/v1/todos/{id}` | `TodoUpdate` | `TodoResponse` | 200, 404, 422 |
| `DELETE` | `/api/v1/todos/{id}` | — | — | 204, 404 |

---

### Backend Implementation

#### Generation order: Model → Schemas → Repository → Service → Dependencies → Router → main.py

**Files to create:**

| File | Purpose |
|---|---|
| `api/app/db/base.py` | `DeclarativeBase` |
| `api/app/db/session.py` | async engine, `async_sessionmaker`, `get_db()` |
| `api/app/config.py` | `pydantic-settings` `Settings` (DB URL from `.env`) |
| `api/app/models/__init__.py` | re-export all models |
| `api/app/models/todo.py` | `Todo` ORM model |
| `api/app/schemas/__init__.py` | re-export all schemas |
| `api/app/schemas/todo.py` | `TodoCreate`, `TodoUpdate`, `TodoResponse` |
| `api/app/repositories/__init__.py` | re-export |
| `api/app/repositories/todo_repository.py` | `TodoRepository` |
| `api/app/services/__init__.py` | re-export |
| `api/app/services/todo_service.py` | `TodoService` |
| `api/app/dependencies/__init__.py` | re-export |
| `api/app/dependencies/todo.py` | `get_todo_repository`, `get_todo_service` |
| `api/app/routes/__init__.py` | re-export |
| `api/app/routes/todo_router.py` | `APIRouter` for `/api/v1/todos` |
| `api/app/main.py` | FastAPI app, CORS, router registration |
| `api/alembic/versions/001_create_todos.py` | migration |

**Key implementation patterns:**

```python
# app/models/todo.py
class Todo(Base):
    __tablename__ = "todos"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime2, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime2, server_default=func.now(), onupdate=func.now())

# app/schemas/todo.py
class TodoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)

class TodoCreate(TodoBase): pass

class TodoUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_completed: bool | None = None

class TodoResponse(TodoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_completed: bool
    created_at: datetime
    updated_at: datetime

# app/repositories/todo_repository.py — methods: get_all, get_by_id, create, update, delete
# app/services/todo_service.py — raises HTTPException(404), calls session.commit() + session.refresh()
# app/routes/todo_router.py — APIRouter(prefix="/api/v1/todos", tags=["todos"])
```

**Whitespace-only title validation** — add a `@field_validator` on `title` in `TodoBase`:
```python
@field_validator("title")
@classmethod
def title_not_blank(cls, v: str) -> str:
    if not v.strip():
        raise ValueError("Title must not be blank")
    return v
```

---

### Error Handling Strategy

| Scenario | HTTP Code | Detail Message |
|---|---|---|
| Todo not found | 404 | `"Todo not found"` |
| Blank/whitespace title | 422 | `"Title must not be blank"` |
| Title > 255 chars | 422 | Pydantic auto |
| Description > 1000 chars | 422 | Pydantic auto |

---

### Frontend Implementation

#### Generation order: Types → Service → Hooks → Components → Page

**Files to create:**

| File | Purpose |
|---|---|
| `web/src/types/todo.ts` | `Todo`, `TodoCreate`, `TodoUpdate` interfaces |
| `web/src/types/index.ts` | barrel export |
| `web/src/services/api.ts` | Axios instance (`baseURL` from `VITE_API_BASE_URL`) |
| `web/src/services/todoService.ts` | `getAll`, `getById`, `create`, `update`, `remove` |
| `web/src/hooks/useTodos.ts` | `useTodos`, `useCreateTodo`, `useUpdateTodo`, `useDeleteTodo` |
| `web/src/components/TodoItem.tsx` | row: title, description, toggle, edit, delete |
| `web/src/components/TodoForm.tsx` | create + inline-edit form with client-side validation |
| `web/src/components/LoadingSkeleton.tsx` | placeholder rows during fetch |
| `web/src/components/EmptyState.tsx` | empty list prompt |
| `web/src/pages/TodosPage.tsx` | composes list + form |

**Key patterns:**

```typescript
// src/types/todo.ts
export interface Todo {
  id: number; title: string; description: string | null;
  isCompleted: boolean; createdAt: string; updatedAt: string;
}
export interface TodoCreate { title: string; description?: string; }
export interface TodoUpdate { title?: string; description?: string; isCompleted?: boolean; }

// src/hooks/useTodos.ts
export const useTodos = () => useQuery({ queryKey: ['todos'], queryFn: todoService.getAll });
export const useCreateTodo = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: todoService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }) });
};
// pattern repeats for useUpdateTodo, useDeleteTodo
```

---

### Testing Plan

**Backend (pytest + pytest-asyncio):**

| Test | Layer |
|---|---|
| `test_create_todo_valid_payload_returns_201` | Route |
| `test_create_todo_blank_title_returns_422` | Route |
| `test_get_todos_empty_returns_empty_list` | Service |
| `test_get_todo_not_found_raises_404` | Service |
| `test_update_todo_success_returns_updated` | Service |
| `test_delete_todo_not_found_raises_404` | Service |
| `test_repository_create_persists_record` | Repository |

**Frontend (Vitest + RTL):**

| Test | Target |
|---|---|
| renders loading skeleton during fetch | `TodosPage` |
| renders todo list on success | `TodosPage` |
| shows inline error when title is blank | `TodoForm` |
| calls createTodo on valid submit | `TodoForm` |
| toggle fires updateTodo with flipped isCompleted | `TodoItem` |
| delete button shows confirmation then fires deleteTodo | `TodoItem` |
| shows error toast on mutation failure | `TodoItem` |

---

### Breaking Changes
None — Phase 1 is the initial implementation.

---

---

## Phase 2 — Organization (Categories & Tags)

### Database Changes

**New table: `categories`**

| Column | Type | Constraints |
|---|---|---|
| `id` | `INT IDENTITY(1,1)` | PRIMARY KEY |
| `name` | `NVARCHAR(100)` | NOT NULL, UNIQUE |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT GETDATE() |

**New table: `tags`**

| Column | Type | Constraints |
|---|---|---|
| `id` | `INT IDENTITY(1,1)` | PRIMARY KEY |
| `name` | `NVARCHAR(50)` | NOT NULL, UNIQUE |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT GETDATE() |

**New table: `todo_tags`**

| Column | Type | Constraints |
|---|---|---|
| `todo_id` | `INT` | FK → todos(id) ON DELETE CASCADE |
| `tag_id` | `INT` | FK → tags(id) ON DELETE CASCADE |
| — | — | PRIMARY KEY (todo_id, tag_id) |

**Modified table: `todos`** — add column `category_id INT NULL REFERENCES categories(id)`

**Alembic:**
```bash
alembic revision --autogenerate -m "create_categories_tags_todo_tags"
alembic upgrade head
```

---

### API Contract

| Method | Path | Request Body | Response | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/v1/categories` | — | `list[CategoryResponse]` | 200 |
| `POST` | `/api/v1/categories` | `CategoryCreate` | `CategoryResponse` | 201, 409, 422 |
| `GET` | `/api/v1/categories/{id}` | — | `CategoryResponse` | 200, 404 |
| `PUT` | `/api/v1/categories/{id}` | `CategoryUpdate` | `CategoryResponse` | 200, 404, 409, 422 |
| `DELETE` | `/api/v1/categories/{id}` | — | — | 204, 404, 409 |
| `GET` | `/api/v1/tags` | — | `list[TagResponse]` | 200 |
| `POST` | `/api/v1/tags` | `TagCreate` | `TagResponse` | 201, 409, 422 |
| `GET` | `/api/v1/tags/{id}` | — | `TagResponse` | 200, 404 |
| `PUT` | `/api/v1/tags/{id}` | `TagUpdate` | `TagResponse` | 200, 404, 409, 422 |
| `DELETE` | `/api/v1/tags/{id}` | — | — | 204, 404 |
| `POST` | `/api/v1/todos` | `TodoCreate` + `category_id?`, `tag_ids?` | `TodoResponse` | 201, 404, 422 |
| `PUT` | `/api/v1/todos/{id}` | `TodoUpdate` + `category_id?`, `tag_ids?` | `TodoResponse` | 200, 404, 422 |

**`TodoResponse` additions:** `category_id: int | None`, `category_name: str | None`, `tags: list[TagResponse]`

---

### Backend Implementation

**Files to create:**

| File | Purpose |
|---|---|
| `api/app/models/category.py` | `Category` ORM model |
| `api/app/models/tag.py` | `Tag` ORM model + `todo_tags` association table |
| `api/app/schemas/category.py` | `CategoryCreate`, `CategoryUpdate`, `CategoryResponse` |
| `api/app/schemas/tag.py` | `TagCreate`, `TagUpdate`, `TagResponse` |
| `api/app/repositories/category_repository.py` | `CategoryRepository` |
| `api/app/repositories/tag_repository.py` | `TagRepository` |
| `api/app/services/category_service.py` | `CategoryService` |
| `api/app/services/tag_service.py` | `TagService` |
| `api/app/dependencies/category.py` | `get_category_repository`, `get_category_service` |
| `api/app/dependencies/tag.py` | `get_tag_repository`, `get_tag_service` |
| `api/app/routes/category_router.py` | `APIRouter(prefix="/api/v1/categories")` |
| `api/app/routes/tag_router.py` | `APIRouter(prefix="/api/v1/tags")` |
| `api/alembic/versions/002_categories_tags.py` | migration |

**Files to modify:**

| File | Change |
|---|---|
| `api/app/models/todo.py` | Add `category_id FK`, `relationship("Category")`, `relationship("Tag", secondary=todo_tags)` |
| `api/app/schemas/todo.py` | Add `category_id`, `category_name`, `tags` to `TodoResponse`; add `category_id`, `tag_ids` to `TodoCreate`/`TodoUpdate` |
| `api/app/repositories/todo_repository.py` | Add `selectinload(Todo.category)`, `selectinload(Todo.tags)` to all queries; add `sync_tags()` helper |
| `api/app/services/todo_service.py` | Validate `category_id` and each `tag_id` exist before create/update |
| `api/app/main.py` | Register `category_router`, `tag_router` |

**Case-insensitive uniqueness** — enforce in service before insert:
```python
existing = await self.repository.get_by_name(name.strip().lower())
if existing:
    raise HTTPException(status_code=409, detail="Category name already exists")
```
Store name as provided; query with `func.lower(Category.name) == name.strip().lower()`.

---

### Error Handling Strategy

| Scenario | HTTP Code | Detail Message |
|---|---|---|
| Duplicate category name | 409 | `"Category name already exists"` |
| Duplicate tag name | 409 | `"Tag name already exists"` |
| Category not found | 404 | `"Category not found"` |
| Tag not found | 404 | `"Tag not found"` |
| Delete category with todos | 409 | `"Category has assigned todos"` |
| Invalid `category_id` on todo | 404 | `"Category not found"` |
| Invalid `tag_id` in list | 404 | `"Tag {id} not found"` |

---

### Frontend Implementation

**Files to create:**

| File | Purpose |
|---|---|
| `web/src/types/category.ts` | `Category`, `CategoryCreate`, `CategoryUpdate` |
| `web/src/types/tag.ts` | `Tag`, `TagCreate`, `TagUpdate` |
| `web/src/services/categoryService.ts` | `getAll`, `create`, `update`, `remove` |
| `web/src/services/tagService.ts` | `getAll`, `create`, `update`, `remove` |
| `web/src/hooks/useCategories.ts` | `useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory` |
| `web/src/hooks/useTags.ts` | `useTags`, `useCreateTag`, `useDeleteTag` |
| `web/src/components/CategoryBadge.tsx` | coloured badge from fixed 8-colour palette |
| `web/src/components/TagChip.tsx` | clickable pill; `onClick` sets tag filter state |

**Files to modify:**

| File | Change |
|---|---|
| `web/src/types/todo.ts` | Add `categoryId`, `categoryName`, `tags` to `Todo`; add `categoryId?`, `tagIds?` to `TodoCreate`/`TodoUpdate` |
| `web/src/components/TodoForm.tsx` | Add category `<select>` populated from `useCategories`; add tag token-input with autocomplete from `useTags` |
| `web/src/components/TodoItem.tsx` | Render `<CategoryBadge>` and `<TagChip>` list |
| `web/src/types/index.ts` | Export new types |

---

### Testing Plan

**Backend:**

| Test | Layer |
|---|---|
| `test_create_category_success_returns_201` | Route |
| `test_create_category_duplicate_name_returns_409` | Service |
| `test_delete_category_with_todos_returns_409` | Service |
| `test_create_todo_with_invalid_category_id_returns_404` | Service |
| `test_create_todo_with_tag_ids_associates_tags` | Service |
| `test_delete_tag_removes_associations_not_todos` | Service |

**Frontend:**

| Test | Target |
|---|---|
| category dropdown populates from useCategories | `TodoForm` |
| selecting a category includes categoryId in create payload | `TodoForm` |
| CategoryBadge renders name with colour class | `CategoryBadge` |
| TagChip click sets tag filter | `TagChip` |
| tag token input creates new tag on enter | `TodoForm` |

---

### Breaking Changes

| Change | Impact |
|---|---|
| `TodoResponse` gains `category_id`, `category_name`, `tags` | Frontend `Todo` type must be extended before deployment |
| `todos` table gains `category_id` column | Existing rows: `NULL` — no data loss |

---

---

## Phase 3 — Task Enrichment (Priority, Due Dates & Reminders)

### Database Changes

**Modified table: `todos`** — add three nullable columns:

| Column | Type | Constraints |
|---|---|---|
| `priority` | `NVARCHAR(10)` | NULL — values: `'high'`, `'medium'`, `'low'` |
| `due_date` | `DATE` | NULL |
| `reminder_at` | `DATETIME2` | NULL |

**Alembic:**
```bash
alembic revision --autogenerate -m "add_priority_due_date_reminder"
alembic upgrade head
```

---

### API Contract

All changes are additions to existing todo endpoints. No new endpoints.

**`TodoCreate` / `TodoUpdate` new optional fields:**

| Field | Type | Validation |
|---|---|---|
| `priority` | `"high" \| "medium" \| "low" \| null` | Pydantic `Literal` or `Enum` |
| `due_date` | `date \| null` | ISO 8601 date |
| `reminder_at` | `datetime \| null` | ISO 8601 datetime |

**`TodoResponse` new fields:** `priority`, `due_date`, `reminder_at`

**New query params on `GET /api/v1/todos`:**

| Param | Values |
|---|---|
| `priority` | `high \| medium \| low \| none` |
| `due` | `overdue \| today \| upcoming \| no_date` |

**Extended `sort_by` values:** `priority`, `due_date`

---

### Backend Implementation

**Files to modify:**

| File | Change |
|---|---|
| `api/app/models/todo.py` | Add `priority`, `due_date`, `reminder_at` columns |
| `api/app/schemas/todo.py` | Add fields to `TodoCreate`, `TodoUpdate`, `TodoResponse`; add `PriorityEnum` |
| `api/app/repositories/todo_repository.py` | Add `priority` and `due` filter clauses; add `priority`/`due_date` sort cases |
| `api/alembic/versions/003_add_enrichment_fields.py` | migration |

**Priority enum:**
```python
class PriorityEnum(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"
```

**`due` filter logic in repository:**
```python
today = date.today()
if due_filter == "overdue":
    stmt = stmt.where(Todo.due_date < today, Todo.is_completed == False)
elif due_filter == "today":
    stmt = stmt.where(Todo.due_date == today)
elif due_filter == "upcoming":
    stmt = stmt.where(Todo.due_date > today)
elif due_filter == "no_date":
    stmt = stmt.where(Todo.due_date == None)
```

**Priority sort (CASE expression):**
```python
from sqlalchemy import case
priority_order = case(
    (Todo.priority == "high", 1),
    (Todo.priority == "medium", 2),
    (Todo.priority == "low", 3),
    else_=4,
)
stmt = stmt.order_by(priority_order.asc() if order == "asc" else priority_order.desc())
```

---

### Error Handling Strategy

| Scenario | HTTP Code | Detail Message |
|---|---|---|
| Invalid `priority` value | 422 | Pydantic enum error |
| Invalid `due` filter value | 422 | Pydantic / query param validator |
| Invalid date format on `due_date` | 422 | Pydantic auto |

---

### Frontend Implementation

**Files to create:**

| File | Purpose |
|---|---|
| `web/src/components/PriorityBadge.tsx` | High=red, Medium=amber, Low=blue, none=hidden |
| `web/src/components/DueDateIndicator.tsx` | Overdue=red, today=amber, future=neutral |
| `web/src/utils/reminderScheduler.ts` | `scheduleReminders(todos)` — sets `setTimeout` per `reminder_at` |

**Files to modify:**

| File | Change |
|---|---|
| `web/src/types/todo.ts` | Add `priority`, `dueDate`, `reminderAt` to `Todo`, `TodoCreate`, `TodoUpdate` |
| `web/src/components/TodoForm.tsx` | Add priority `<select>`, date input for `dueDate`, datetime input for `reminderAt` |
| `web/src/components/TodoItem.tsx` | Render `<PriorityBadge>` and `<DueDateIndicator>` |
| `web/src/hooks/useTodos.ts` | Call `scheduleReminders` after every successful fetch; request `Notification` permission on first reminder save |

**Reminder scheduler pattern:**
```typescript
// utils/reminderScheduler.ts
export const scheduleReminders = (todos: Todo[]) => {
  todos.forEach(todo => {
    if (!todo.reminderAt || todo.isCompleted) return;
    const msUntil = new Date(todo.reminderAt).getTime() - Date.now();
    if (msUntil > 0) {
      setTimeout(() => {
        new Notification(`Reminder: ${todo.title}`);
      }, msUntil);
    } else {
      // already past — fire immediately
      new Notification(`Reminder: ${todo.title}`);
    }
  });
};
```

---

### Testing Plan

**Backend:**

| Test | Layer |
|---|---|
| `test_create_todo_with_priority_persists_value` | Service |
| `test_filter_todos_by_priority_high_returns_correct_set` | Repository |
| `test_filter_todos_due_overdue_excludes_completed` | Repository |
| `test_sort_todos_by_priority_nulls_last` | Repository |
| `test_invalid_priority_value_returns_422` | Route |

**Frontend:**

| Test | Target |
|---|---|
| PriorityBadge renders red for high, amber for medium | `PriorityBadge` |
| DueDateIndicator shows overdue class when date is past | `DueDateIndicator` |
| reminder saves with correct datetime value | `TodoForm` |
| scheduleReminders calls Notification for past reminder_at | `reminderScheduler` |

---

### Breaking Changes

| Change | Impact |
|---|---|
| `TodoResponse` gains `priority`, `due_date`, `reminder_at` | Frontend type update required |
| `todos` table gains 3 columns | Existing rows: all `NULL` — no data loss |

---

---

## Phase 4 — Filtering, Sorting, Search & Bulk Actions

### Database Changes

No schema changes. All filtering/sorting is applied at query time.

---

### API Contract

**Extended `GET /api/v1/todos` query params (full set):**

| Param | Type | Values / Notes |
|---|---|---|
| `status` | string | `all` \| `completed` \| `pending` — default `all` |
| `category_id` | int | filter by category |
| `tag_id` | int | filter by tag |
| `priority` | string | `high` \| `medium` \| `low` \| `none` |
| `due` | string | `overdue` \| `today` \| `upcoming` \| `no_date` |
| `search` | string | case-insensitive LIKE on title |
| `sort_by` | string | `created_at` \| `title` \| `priority` \| `due_date` \| `position` — default `created_at` |
| `order` | string | `asc` \| `desc` — default `desc` |

**New endpoints:**

| Method | Path | Request Body | Response | Status Codes |
|---|---|---|---|---|
| `PATCH` | `/api/v1/todos/bulk-complete` | — | `{"affected": int}` | 200, 500 |
| `DELETE` | `/api/v1/todos/bulk-completed` | — | `{"affected": int}` | 200, 500 |

---

### Backend Implementation

**Files to modify:**

| File | Change |
|---|---|
| `api/app/repositories/todo_repository.py` | Add all filter/sort clauses; `bulk_complete()`, `bulk_delete_completed()` methods |
| `api/app/services/todo_service.py` | Add `get_all_filtered()`, `bulk_complete()`, `bulk_delete_completed()` |
| `api/app/routes/todo_router.py` | Add query params to `GET /`; add `PATCH /bulk-complete`, `DELETE /bulk-completed` routes |

**Filter query param schema (use `Annotated` query params):**
```python
class TodoFilterParams(BaseModel):
    status: Literal["all", "completed", "pending"] = "all"
    category_id: int | None = None
    tag_id: int | None = None
    priority: Literal["high", "medium", "low", "none"] | None = None
    due: Literal["overdue", "today", "upcoming", "no_date"] | None = None
    search: str | None = Field(None, max_length=200)
    sort_by: Literal["created_at", "title", "priority", "due_date", "position"] = "created_at"
    order: Literal["asc", "desc"] = "desc"
```

**Search injection prevention:**
```python
if search:
    escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    stmt = stmt.where(func.lower(Todo.title).like(f"%{escaped.lower()}%", escape="\\"))
```

**Bulk operations — atomic transaction:**
```python
# In repository — both methods executed within the service's session
async def bulk_complete(self) -> int:
    result = await self.session.execute(
        update(Todo).where(Todo.is_completed == False).values(is_completed=True)
    )
    return result.rowcount

async def bulk_delete_completed(self) -> int:
    result = await self.session.execute(
        delete(Todo).where(Todo.is_completed == True)
    )
    return result.rowcount
# Service calls session.commit() once after either method
```

---

### Error Handling Strategy

| Scenario | HTTP Code | Detail Message |
|---|---|---|
| Invalid `status` value | 422 | Lists valid options |
| Invalid `sort_by` value | 422 | Lists valid options |
| Invalid `priority` filter | 422 | Lists valid options |
| Invalid `due` filter | 422 | Lists valid options |
| Bulk transaction DB failure | 500 | `"Bulk operation failed"` |

---

### Frontend Implementation

**Files to create:**

| File | Purpose |
|---|---|
| `web/src/components/FilterBar.tsx` | status tabs, category/tag/priority selects, due filter, sort controls, search input |
| `web/src/components/BulkActions.tsx` | "Mark all complete" + "Delete completed" buttons with disabled states |
| `web/src/components/ConfirmDialog.tsx` | reusable modal; used by delete-completed and delete-todo |
| `web/src/utils/filterParams.ts` | serialize/deserialize filter state to/from URL `URLSearchParams` |

**Files to modify:**

| File | Change |
|---|---|
| `web/src/hooks/useTodos.ts` | Accept `TodoFilterParams` object; pass as Axios params; include in `queryKey` |
| `web/src/pages/TodosPage.tsx` | Read filter state from URL; pass to `useTodos`; render `<FilterBar>` and `<BulkActions>` |

**URL filter state pattern:**
```typescript
// pages/TodosPage.tsx
const [searchParams, setSearchParams] = useSearchParams();
const filters = filterParams.fromURL(searchParams); // deserialize
// on filter change:
setSearchParams(filterParams.toURL(filters));       // serialize back
```

**Bulk action hooks:**
```typescript
// hooks/useTodos.ts
export const useBulkComplete = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: todoService.bulkComplete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });
};
export const useBulkDeleteCompleted = () => { /* same pattern */ };
```

---

### Testing Plan

**Backend:**

| Test | Layer |
|---|---|
| `test_filter_todos_by_status_pending_excludes_completed` | Repository |
| `test_filter_todos_by_search_case_insensitive_matches` | Repository |
| `test_filter_todos_search_with_percent_char_is_escaped` | Repository |
| `test_bulk_complete_returns_correct_affected_count` | Service |
| `test_bulk_complete_when_all_done_returns_zero` | Service |
| `test_bulk_delete_completed_is_atomic_on_failure` | Repository |

**Frontend:**

| Test | Target |
|---|---|
| filter change updates URL query string | `TodosPage` |
| page refresh preserves active filters from URL | `TodosPage` |
| clear filters resets all controls to defaults | `FilterBar` |
| bulk-complete button disabled when all complete | `BulkActions` |
| delete-completed shows ConfirmDialog before firing | `BulkActions` |
| empty state shows "no match" copy when filters active | `EmptyState` |

---

### Breaking Changes

| Change | Impact |
|---|---|
| `GET /api/v1/todos` gains many query params | Fully backward-compatible; all params optional |
| Two new endpoints (`/bulk-complete`, `/bulk-completed`) | Additive — no existing contract changed |

---

---

## Phase 5 — Subtasks, Reordering & UX Polish

### Database Changes

**New table: `subtasks`**

| Column | Type | Constraints |
|---|---|---|
| `id` | `INT IDENTITY(1,1)` | PRIMARY KEY |
| `todo_id` | `INT` | NOT NULL, FK → todos(id) ON DELETE CASCADE |
| `title` | `NVARCHAR(255)` | NOT NULL |
| `is_completed` | `BIT` | NOT NULL, DEFAULT 0 |
| `position` | `INT` | NOT NULL, DEFAULT 0 |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT GETDATE() |

**Modified table: `todos`** — add column `position INT NULL`

**Alembic:**
```bash
alembic revision --autogenerate -m "add_subtasks_todo_position"
alembic upgrade head
```

---

### API Contract

| Method | Path | Request Body | Response | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/v1/todos/{id}/subtasks` | `SubtaskCreate` | `SubtaskResponse` | 201, 404, 422 |
| `PUT` | `/api/v1/todos/{id}/subtasks/{sub_id}` | `SubtaskUpdate` | `SubtaskResponse` | 200, 404, 422 |
| `DELETE` | `/api/v1/todos/{id}/subtasks/{sub_id}` | — | — | 204, 404 |
| `PATCH` | `/api/v1/todos/reorder` | `list[TodoPositionItem]` | `{"updated": int}` | 200, 404 |

**`TodoPositionItem`:** `{ "id": int, "position": int }`

**Updated `GET /api/v1/todos` list response** — each item gains:
`subtask_count: int`, `completed_subtask_count: int`

**Updated `GET /api/v1/todos/{id}` single response** — gains:
`subtasks: list[SubtaskResponse]`

**`GET /api/v1/todos` pagination params:**

| Param | Type | Default | Max |
|---|---|---|---|
| `page` | int ≥ 1 | 1 | — |
| `page_size` | int | 20 | 100 |

**Paginated response envelope:**
```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "pages": 3
}
```

---

### Backend Implementation

**Files to create:**

| File | Purpose |
|---|---|
| `api/app/models/subtask.py` | `Subtask` ORM model |
| `api/app/schemas/subtask.py` | `SubtaskCreate`, `SubtaskUpdate`, `SubtaskResponse` |
| `api/app/schemas/pagination.py` | `PaginatedResponse[T]` generic schema |
| `api/app/repositories/subtask_repository.py` | `SubtaskRepository` (get_by_todo, create, update, delete) |
| `api/app/services/subtask_service.py` | `SubtaskService` |
| `api/app/dependencies/subtask.py` | `get_subtask_repository`, `get_subtask_service` |
| `api/app/routes/subtask_router.py` | `APIRouter(prefix="/api/v1/todos/{todo_id}/subtasks")` |
| `api/alembic/versions/004_add_subtasks_position.py` | migration |

**Files to modify:**

| File | Change |
|---|---|
| `api/app/models/todo.py` | Add `position: Mapped[int \| None]`, `relationship("Subtask", cascade="all, delete-orphan")` |
| `api/app/schemas/todo.py` | Add `subtask_count`, `completed_subtask_count` to list schema; add `subtasks` to single-item schema; wrap list response in `PaginatedResponse` |
| `api/app/repositories/todo_repository.py` | Add `page`/`page_size` params; add `COUNT` subquery for subtasks; add `update_positions()` bulk method |
| `api/app/services/todo_service.py` | Add `reorder()`, `get_all_paginated()` |
| `api/app/routes/todo_router.py` | Add `PATCH /reorder`; update `GET /` return type to `PaginatedResponse[TodoResponse]` |
| `api/app/main.py` | Register `subtask_router` |

**Reorder atomic update pattern:**
```python
# repository
async def update_positions(self, items: list[TodoPositionItem]) -> int:
    ids = [item.id for item in items]
    existing = await self.session.execute(select(Todo.id).where(Todo.id.in_(ids)))
    found_ids = {row[0] for row in existing}
    missing = set(ids) - found_ids
    if missing:
        raise ValueError(f"Todo IDs not found: {missing}")
    for item in items:
        await self.session.execute(
            update(Todo).where(Todo.id == item.id).values(position=item.position)
        )
    return len(items)
# service calls session.commit() once after repository returns
```

---

### Error Handling Strategy

| Scenario | HTTP Code | Detail Message |
|---|---|---|
| Subtask: blank title | 422 | Pydantic auto |
| Subtask: parent todo not found | 404 | `"Todo not found"` |
| Subtask not found | 404 | `"Subtask not found"` |
| Reorder: unknown todo ID in batch | 404 | `"Todo IDs not found: {ids}"` |
| page_size > 100 | 422 | Pydantic auto |

---

### Frontend Implementation

**Files to create:**

| File | Purpose |
|---|---|
| `web/src/types/subtask.ts` | `Subtask`, `SubtaskCreate`, `SubtaskUpdate` |
| `web/src/services/subtaskService.ts` | `create`, `update`, `remove` |
| `web/src/hooks/useSubtasks.ts` | `useCreateSubtask`, `useUpdateSubtask`, `useDeleteSubtask` |
| `web/src/hooks/usePaginatedTodos.ts` | `useInfiniteQuery`-based hook with "load more" |
| `web/src/components/SubtaskList.tsx` | checklist inside expanded todo row |
| `web/src/components/SubtaskForm.tsx` | inline input; adds subtask on Enter |
| `web/src/components/ErrorBoundary.tsx` | class component; catches render errors in todo list |

**Files to modify:**

| File | Change |
|---|---|
| `web/src/types/todo.ts` | Add `subtaskCount`, `completedSubtaskCount`, optional `subtasks` |
| `web/src/types/index.ts` | Export `Subtask`, `SubtaskCreate`, `SubtaskUpdate` |
| `web/src/components/TodoItem.tsx` | Add expand/collapse toggle; render `<SubtaskList>` + `<SubtaskForm>`; show progress pill; add drag handle; optimistic toggle/delete with rollback |
| `web/src/components/TodoList.tsx` (create if needed) | Wrap with `<DndContext>`; render `<SortableContext>`; render `<ErrorBoundary>` |
| `web/src/pages/TodosPage.tsx` | Switch to `usePaginatedTodos`; render "Load more" button; show drag handles only when `sort_by === 'position'` |

**Drag-and-drop pattern (`@dnd-kit/core` + `@dnd-kit/sortable`):**
```typescript
// components/TodoList.tsx
const sensors = useSensors(useSensor(PointerSensor));

const handleDragEnd = ({ active, over }: DragEndEvent) => {
  if (!over || active.id === over.id) return;
  // 1. Compute new positions from reordered array
  // 2. Optimistic update: setOptimisticOrder(newOrder)
  // 3. Call reorderTodos.mutate(positionPayload) — reverts on error
};
```

**Keyboard reorder shortcut:**
```typescript
// components/TodoItem.tsx
onKeyDown={(e) => {
  if (e.altKey && e.key === 'ArrowUp') moveUp(todo.id);
  if (e.altKey && e.key === 'ArrowDown') moveDown(todo.id);
}}
```

**Optimistic update pattern:**
```typescript
// hooks/useTodos.ts — useUpdateTodo
useMutation({
  mutationFn: todoService.update,
  onMutate: async (updated) => {
    await qc.cancelQueries({ queryKey: ['todos'] });
    const previous = qc.getQueryData(['todos']);
    qc.setQueryData(['todos'], (old: Todo[]) =>
      old.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    return { previous };
  },
  onError: (_err, _vars, ctx) => {
    qc.setQueryData(['todos'], ctx?.previous);
    toast.error("Change could not be saved");
  },
  onSettled: () => qc.invalidateQueries({ queryKey: ['todos'] }),
});
```

---

### Testing Plan

**Backend:**

| Test | Layer |
|---|---|
| `test_create_subtask_valid_returns_201` | Route |
| `test_create_subtask_blank_title_returns_422` | Route |
| `test_create_subtask_todo_not_found_returns_404` | Service |
| `test_delete_todo_cascades_to_subtasks` | Repository |
| `test_reorder_with_unknown_id_raises_404` | Service |
| `test_reorder_all_valid_ids_is_atomic` | Repository |
| `test_get_todos_paginated_returns_envelope` | Route |
| `test_page_size_exceeds_max_returns_422` | Route |
| `test_get_todos_list_includes_subtask_counts` | Repository |

**Frontend:**

| Test | Target |
|---|---|
| expanding a todo row renders SubtaskList | `TodoItem` |
| SubtaskForm submits on Enter and clears input | `SubtaskForm` |
| progress pill shows correct completed/total | `TodoItem` |
| optimistic toggle updates UI before response | `useTodos` |
| optimistic toggle reverts on mutation error | `useTodos` |
| drag-end calls reorderTodos with correct positions | `TodoList` |
| Alt+ArrowUp moves todo up in list | `TodoItem` |
| Load more button calls fetchNextPage | `TodosPage` |
| ErrorBoundary renders fallback on child throw | `ErrorBoundary` |

---

### Breaking Changes

| Change | Impact |
|---|---|
| `GET /api/v1/todos` response changes from `list[TodoResponse]` to paginated envelope | **Breaking** — frontend must switch to `usePaginatedTodos` before deploying Phase 5 backend |
| `GET /api/v1/todos/{id}` response gains `subtasks` array | Additive — backward-compatible |
| `todos` table gains `position` column | Existing rows: `NULL` — no data loss |
| New `subtasks` table | Additive |

> ⚠️ **Deploy order for Phase 5:** Deploy backend first (envelope response), then frontend. Do not deploy them independently — the frontend from Phase 4 will break against the Phase 5 paginated response.

---

---

## Copilot Agent Mode Prompts

Execute in this exact order within each phase.

### Phase 1 — Core Todo CRUD

```
@api Generate the Todo ORM model in api/app/models/todo.py using SQLAlchemy 2.x Mapped/mapped_column. Fields: id (PK), title (String 255, not null), description (String 1000, nullable), is_completed (Boolean, default False), created_at (DateTime2, server_default now), updated_at (DateTime2, server_default now, onupdate now). Use DeclarativeBase from api/app/db/base.py.
```
```
@api Generate Pydantic v2 schemas in api/app/schemas/todo.py: TodoBase (title with field_validator rejecting blank strings, max_length=255; description optional max 1000), TodoCreate, TodoUpdate (all optional), TodoResponse (from_attributes=True, adds id, is_completed, created_at, updated_at).
```
```
@api Generate TodoRepository in api/app/repositories/todo_repository.py with async methods: get_all() ordered by created_at desc, get_by_id(id), create(payload), update(id, payload), delete(id). Use select/update/delete statements, return ORM models or None.
```
```
@api Generate TodoService in api/app/services/todo_service.py. Inject TodoRepository. get_all, get_by_id (raise 404 if None), create, update (raise 404 if None), delete (raise 404 if None). Call session.commit() and session.refresh() after writes.
```
```
@api Generate dependency functions in api/app/dependencies/todo.py: get_todo_repository and get_todo_service using Annotated + Depends chain.
```
```
@api Generate todo_router in api/app/routes/todo_router.py: GET /, POST / (201), GET /{id}, PUT /{id}, DELETE /{id} (204). Wire Annotated service dependency. Correct status codes. Register router in api/app/main.py with prefix /api/v1.
```
```
@api Generate Alembic migration for the todos table. Run: alembic revision --autogenerate -m "create_todos_table" then alembic upgrade head.
```
```
@web Generate the Todo TypeScript types in web/src/types/todo.ts (Todo, TodoCreate, TodoUpdate) and re-export from web/src/types/index.ts. Create the Axios instance in web/src/services/api.ts using VITE_API_BASE_URL.
```
```
@web Generate web/src/services/todoService.ts with functions: getAll, getById, create, update, remove. All call the Axios instance.
```
```
@web Generate web/src/hooks/useTodos.ts with useTodos (useQuery), useCreateTodo, useUpdateTodo, useDeleteTodo (all useMutation + invalidateQueries on success).
```
```
@web Generate TodoForm, TodoItem, LoadingSkeleton, EmptyState components and the TodosPage. TodoForm validates title client-side (no blank). TodoItem shows title, description, toggle, inline edit, delete with confirmation. TodosPage shows skeleton on load, empty state when no todos.
```
```
@web Generate Vitest + RTL tests for TodoForm (blank title validation), TodoItem (toggle, delete), and TodosPage (loading, empty state, populated list). Mock todoService with vi.mock.
```
```
@api Generate pytest tests for TodoService (mock AsyncMock repository): test_get_all, test_get_by_id_not_found, test_create, test_update_not_found, test_delete_not_found. Name pattern: test_<action>_<condition>_<expected>.
```

### Phase 2 — Organization

```
@api Generate Category ORM model (api/app/models/category.py): id, name (String 100, unique index), created_at. Generate Tag model (api/app/models/tag.py): id, name (String 50, unique index), created_at. Generate todo_tags association Table with cascade. Add category_id FK and relationships to Todo model.
```
```
@api Generate schemas for category.py and tag.py (Create/Update/Response). Add category_id, category_name, tag_ids (input), tags (output list[TagResponse]) to TodoCreate, TodoUpdate, TodoResponse.
```
```
@api Generate CategoryRepository and TagRepository. TodoRepository: add selectinload for category and tags in all queries; add sync_tags helper that replaces todo.tags with looked-up Tag objects.
```
```
@api Generate CategoryService: create (409 on duplicate name, case-insensitive), get_by_id, update, delete (409 if todos assigned), get_all. Generate TagService: same pattern (no block on delete). TodoService: validate category_id and each tag_id before create/update.
```
```
@api Generate dependency files for category and tag. Generate category_router and tag_router. Register both in main.py.
```
```
@api Generate Alembic migration for categories, tags, todo_tags tables and todos.category_id column.
```
```
@web Add Category and Tag TypeScript types. Create categoryService.ts and tagService.ts. Create useCategories and useTags hooks.
```
```
@web Add category <select> and tag token-input with autocomplete to TodoForm. Create CategoryBadge (colour from fixed palette indexed by category id % 8) and TagChip (clickable, sets tag filter). Render both in TodoItem.
```
```
@api Generate backend tests: test_create_category_duplicate_name_returns_409, test_delete_category_with_todos_returns_409, test_create_todo_with_invalid_category_id_returns_404, test_sync_tags_replaces_all_associations.
```
```
@web Generate frontend tests: CategoryBadge renders colour class, TagChip click activates filter, TodoForm category dropdown populated from useCategories.
```

### Phase 3 — Task Enrichment

```
@api Add priority (PriorityEnum: high/medium/low), due_date (Date nullable), reminder_at (DateTime nullable) to Todo model, TodoCreate, TodoUpdate, TodoResponse schemas.
```
```
@api Update TodoRepository.get_all to accept priority and due filter params. Add CASE expression for priority sort. Add due_date ascending sort with NULLs last.
```
```
@api Generate Alembic migration for priority, due_date, reminder_at columns on todos.
```
```
@web Add priority, dueDate, reminderAt to Todo, TodoCreate, TodoUpdate types. Add priority <select>, date picker, datetime picker to TodoForm. Create PriorityBadge and DueDateIndicator components. Render in TodoItem.
```
```
@web Create web/src/utils/reminderScheduler.ts. Call scheduleReminders(todos) in useTodos onSuccess. Request Notification permission in useCreateTodo/useUpdateTodo when reminderAt is set.
```
```
@api Generate tests: test_filter_priority_high, test_filter_due_overdue, test_sort_priority_nulls_last, test_invalid_priority_returns_422.
```
```
@web Generate tests: PriorityBadge colour mapping, DueDateIndicator overdue detection, reminderScheduler fires Notification mock.
```

### Phase 4 — Filtering, Sorting, Search & Bulk Actions

```
@api Add TodoFilterParams model (all query params with Literal types and defaults). Update TodoRepository.get_all to accept and apply all filters. Add search with LIKE escaping. Add bulk_complete and bulk_delete_completed repository methods.
```
```
@api Add bulk_complete and bulk_delete_completed to TodoService. Add PATCH /bulk-complete and DELETE /bulk-completed routes to todo_router. Update GET / to accept all filter params via Depends(TodoFilterParams).
```
```
@web Create web/src/utils/filterParams.ts (serialize/deserialize filter state to URLSearchParams). Update useTodos to accept filter object and include in queryKey.
```
```
@web Create FilterBar component (status, category, tag, priority, due, sort, search with 300ms debounce). Create BulkActions component (disabled states, confirmation dialog). Create ConfirmDialog reusable component. Update TodosPage to read/write filter state from URL.
```
```
@api Generate tests: test_filter_status_pending, test_search_case_insensitive, test_search_percent_escaped, test_bulk_complete_count, test_bulk_complete_all_done_zero, test_invalid_sort_by_returns_422.
```
```
@web Generate tests: filter state persists in URL, clear filters resets all, bulk-complete disables when all done, delete-completed shows confirm dialog, empty state copy differs with/without filters.
```

### Phase 5 — Subtasks, Reordering & UX Polish

```
@api Generate Subtask ORM model (api/app/models/subtask.py). Add relationship to Todo with cascade all,delete-orphan. Generate SubtaskCreate, SubtaskUpdate, SubtaskResponse schemas. Add subtask_count and completed_subtask_count to TodoResponse (computed via subquery in repository).
```
```
@api Generate SubtaskRepository (get_by_todo, get_by_id, create, update, delete). Generate SubtaskService (validate parent todo exists). Generate subtask dependency file and subtask_router (POST/PUT/DELETE under /api/v1/todos/{todo_id}/subtasks). Register in main.py.
```
```
@api Add position column to Todo model and migration. Add update_positions(items) atomic bulk method to TodoRepository. Add reorder(items) to TodoService (raises 404 on missing IDs). Add PATCH /api/v1/todos/reorder route.
```
```
@api Add page and page_size params to TodoRepository.get_all. Add PaginatedResponse[T] generic schema in api/app/schemas/pagination.py. Update GET /api/v1/todos route to return PaginatedResponse[TodoResponse].
```
```
@api Generate Alembic migration for subtasks table and todos.position column.
```
```
@api Generate tests: test_create_subtask_valid, test_create_subtask_blank_title_422, test_delete_todo_cascades_subtasks, test_reorder_missing_id_raises_404, test_get_todos_paginated_envelope, test_page_size_over_max_422.
```
```
@web Add Subtask types. Create subtaskService.ts and useSubtasks hook. Create SubtaskList and SubtaskForm components. Add expandable subtask section to TodoItem. Show progress pill on collapsed row.
```
```
@web Install @dnd-kit/core @dnd-kit/sortable. Create TodoList component wrapping DndContext + SortableContext. Implement handleDragEnd with optimistic reorder and PATCH /todos/reorder mutate on drop. Add Alt+ArrowUp/Down keyboard handler on TodoItem.
```
```
@web Implement optimistic update with rollback in useUpdateTodo and useDeleteTodo (onMutate snapshot, onError restore, onSettled invalidate). Add loading skeleton (LoadingSkeleton) and ErrorBoundary component.
```
```
@web Switch TodosPage to usePaginatedTodos (useInfiniteQuery). Render "Load more" button. Show drag handles only when sort_by === 'position'.
```
```
@web Generate tests: subtask expand/collapse, SubtaskForm submit on Enter, progress pill count, optimistic toggle reverts on error, drag-end calls reorder mutation, Alt+ArrowUp moves item, Load more calls fetchNextPage, ErrorBoundary renders fallback.
```

---

## Global Breaking Changes Summary

| Phase | Breaking Change | Mitigation |
|---|---|---|
| 2 | `TodoResponse` gains `category_id`, `category_name`, `tags` | Deploy backend first; extend frontend `Todo` type to match |
| 3 | `TodoResponse` gains `priority`, `due_date`, `reminder_at` | Additive; existing frontend ignores unknown fields |
| 5 | `GET /api/v1/todos` changes from `list[TodoResponse]` to paginated envelope | **Must** deploy backend + frontend together; Phase 4 frontend will break against Phase 5 backend |
