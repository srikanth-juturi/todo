# Copilot Customization Setup — Complete Reference

> **Last Updated:** 2026-03-30
> **Phase:** 0 — Foundation & Copilot Setup
> **Status:** All artifacts created

---

## Table of Contents

1. [Overview: The Copilot Customization Hierarchy](#overview-the-copilot-customization-hierarchy)
2. [File-by-File Breakdown](#file-by-file-breakdown)
3. [How All Files Work Together](#how-all-files-work-together)
4. [Quick Reference Table](#quick-reference-table)
5. [Usage Examples](#usage-examples)
6. [Terminology & Concepts](#terminology--concepts)

---

## Overview: The Copilot Customization Hierarchy

Think of this as a **layered system of instructions**:

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: Custom Instructions                                │
│ (.github/copilot-instructions.md)                           │
│ Always-on, workspace-wide rules                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: Language Instructions                              │
│ (.github/instructions/*.instructions.md)                    │
│ Auto-scoped by file pattern (applyTo)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: Agents, Skills, Prompts (Manual Activation)       │
│ @api, @web, #commit-message, test-runner, etc.            │
│ You or Copilot invoke these explicitly                      │
└─────────────────────────────────────────────────────────────┘
```

### Activation Spectrum

```
Always on ◄──────────────────────────────────► Manual only

Instructions → Language Instructions → Skills → Agents → Prompt Files
(silent)       (scoped, silent)     (auto)    (invoked) (invoked)
```

---

## File-by-File Breakdown

### FILE 1: `.github/copilot-instructions.md`

**Type:** Custom Instructions (always-on)
**Scope:** Entire workspace
**Activation:** Automatic — Copilot reads this before every suggestion
**Size:** ~2 KB

#### What it is
The **workspace constitution** — a single YAML-free markdown file that Copilot reads automatically on every suggestion. It defines the overall architecture and general rules that apply to all code.

#### How it works
- Copilot loads this file in the background **before generating ANY code**
- No manual invocation needed — it's **always active**
- Applies to **every file** in your repo (unless overridden by more specific instructions)
- Silently guides all Copilot suggestions, completions, and chat answers

#### What's inside
```markdown
📋 Project Overview (monorepo with /api and /web)
📋 3-Layer Architecture (Routes → Services → Repositories)
📋 Dependency Injection Flow (get_db → Repository → Service → Route)
📋 Backend Conventions
   - All operations async (AsyncSession, async_sessionmaker)
   - Type hints on everything
   - Pydantic v2 with ConfigDict
   - Use logging module, never print()
   - Meaningful HTTP status codes (201, 204, 404, 409)
📋 Frontend Conventions
   - Functional components only
   - React Query for all server state
   - Named exports by default
   - No `any` type
📋 General Rules
   - No secrets in code (use environment variables)
   - Error handling on every async operation
   - Full type hints and docstrings
   - Conventional Commits for messages
```

#### Practical Example

**Without this file:**
```
You: "@api write a service method to get all todos"
Copilot: [generates a method, but doesn't know your 3-layer
          architecture. Might put SQL queries directly in service]

Result:
  def get_todos():
      todos = db.query(Todo).all()  # ❌ SQL in service layer
      return todos                   # ❌ No type hints
```

**With this file:**
```
You: "@api write a service method to get all todos"
Copilot: [already knows 3-layer architecture from instructions]

Result:
  async def get_todos(
      repository: Annotated[TodoRepository, Depends(get_todo_repository)]
  ) -> list[TodoResponse]:
      """Fetch all todos from the repository.

      Args:
          repository: The TodoRepository dependency.

      Returns:
          A list of TodoResponse DTOs.
      """
      todos = await repository.get_all()
      logger.info(f"Fetched {len(todos)} todos")
      return [TodoResponse.model_validate(t) for t in todos]  # ✅ Full types
```

#### Why it matters
- **Eliminates context debt** — you don't repeat "use async" in every prompt
- **Enforces consistency** — all Copilot suggestions follow the same rules
- **Onboards new team members** — they see The Architecture the moment they open the repo
- **Reduces token usage** — Copilot gets context automatically instead of you typing it

---

### FILE 2: `.github/instructions/python.instructions.md`

**Type:** Language Instruction (auto-scoped)
**Scope:** Only `api/**/*.py` files
**Activation:** Automatic when editing Python files in `/api`
**Size:** ~1.5 KB

#### What it is
Python-specific rules that **only activate** when Copilot works on Python files. Layered **on top of** `copilot-instructions.md`.

#### How it works
```yaml
---
applyTo: "api/**/*.py"  # ← SCOPES this file to only Python in /api
---
```

- When you edit `/api/app/routes/todo_router.py`, Copilot loads **both**:
  - `copilot-instructions.md` (general rules)
  - `python.instructions.md` (Python-specific rules)
- When you edit `/web/src/components/Todo.tsx`, Copilot loads **only**:
  - `copilot-instructions.md` (general rules)
  - `typescript.instructions.md` (TypeScript rules)

This prevents **cross-contamination** — Python conventions never bleed into TypeScript suggestions.

#### What's inside

```markdown
## Async Pattern
- Use `async def` for ALL route handlers, service methods, and repository methods
- Use `await` for every database operation
- Never mix sync and async

## Type Hints
- Type-hint every function parameter and return value
- Use `Optional[Model]` for lookups that may return None
- Use `list[Model]` (lowercase) for collections, not `List[Model]`
- Use `Annotated[Type, Depends()]` for dependency injection

## Dependency Injection
- Route handlers receive Services via Depends()
- Services receive Repositories via Depends()
- Repositories receive AsyncSession via Depends(get_db)
- Example signature:
  async def get_todos(
      service: Annotated[TodoService, Depends(get_todo_service)]
  ) -> list[TodoResponse]:

## Pydantic Schemas
- Use Pydantic v2 with model_config = ConfigDict(from_attributes=True)
- Separate schemas for Create, Update, and Response
- Use Field() for validation constraints

## SQLAlchemy Models
- Use DeclarativeBase (SQLAlchemy 2.x style)
- Use Mapped[] and mapped_column() for column definitions
- Define __tablename__ explicitly

## Error Handling
- Services raise HTTPException with appropriate status codes
- 404 for not found, 409 for conflicts
- Always include a detail message

## Logging
- Use logging.getLogger(__name__) at module level
- logger.info() for operations, logger.error() for failures
- Never use print()

## Docstrings
- Google style on all public functions
- Include Args, Returns, and Raises sections

## Import Order
- Standard library imports first
- Third-party imports second (fastapi, sqlalchemy, pydantic)
- Local imports third (app.models, app.schemas)
```

#### Concrete Example

**In `/api/app/services/todo_service.py`:**

Without the instruction:
```python
def get_todos():
    todos = session.query(Todo).all()
    print(f"Got {len(todos)} todos")  # ❌ Using print()
    return todos                      # ❌ No type hints
```

With the instruction:
```python
async def get_todos(
    repository: Annotated[TodoRepository, Depends(get_todo_repository)]
) -> list[TodoResponse]:
    """Fetch all todos from the repository.

    Args:
        repository: The TodoRepository dependency.

    Returns:
        A list of TodoResponse DTOs.
    """
    todos = await repository.get_all()
    logger.info(f"Fetched {len(todos)} todos")  # ✅ Using logger
    return [TodoResponse.model_validate(t) for t in todos]  # ✅ Full type hints
```

#### Why it matters
- **Prevents syntax errors** — async/await patterns enforced at suggestion time
- **Accelerates development** — Copilot generates production-ready Python automatically
- **Type safety** — full type hints prevent runtime errors and improve IDE support

---

### FILE 3: `.github/instructions/typescript.instructions.md`

**Type:** Language Instruction (auto-scoped)
**Scope:** Only `web/src/**/*.{ts,tsx}` files
**Activation:** Automatic when editing TypeScript files in `/web`
**Size:** ~1.8 KB

#### What it is
React/TypeScript-specific rules that **only activate** for `.ts` and `.tsx` files in `/web`. Layered **on top of** `copilot-instructions.md`.

#### How it works
```yaml
---
applyTo: "web/src/**/*.{ts,tsx}"  # ← Scopes to TypeScript/React files only
---
```

#### What's inside

```markdown
## Component Style
- Functional components with arrow function syntax only
- No class components
- No React.FC type annotation
- Example:
  interface TodoItemProps {
    todo: Todo;
    onToggle: (id: number) => void;
  }
  export const TodoItem = ({ todo, onToggle }: TodoItemProps) => {
    // component body
  };

## Props & Types
- Define props as named interfaces, NEVER inline types
- All interfaces go in src/types/ (one file per domain)
- No `any` type. Use `unknown` + type narrowing if needed
- Use `interface` for object shapes, `type` for unions/intersections

## Data Fetching
- Use React Query (TanStack Query) for ALL server state
- NO useState + useEffect for API data — use useQuery and useMutation
- Custom hooks in src/hooks/ (one file per domain)
- Example:
  export const useTodos = () => {
    return useQuery({
      queryKey: ['todos'],
      queryFn: todoService.getAll,
    });
  };

## API Layer
- Axios instance in src/services/api.ts with baseURL from env
- Service functions in src/services/ (one file per domain)
- Service functions return typed data, not raw Axios responses
- Example:
  export const todoService = {
    getAll: async (): Promise<Todo[]> => {
      const { data } = await api.get<Todo[]>('/todos');
      return data;  // ✅ Unwrapped
    },
  };

## State Management
- Server state: React Query (fetched data, caching, sync)
- UI state: React useState (modals, form inputs, toggles)
- No global state library needed for this app

## Error & Loading States
- Every component using useQuery MUST handle isLoading and isError
- Show user-friendly error messages, not raw errors

## Exports
- Prefer named exports
- Use default exports only for page/route files when required by router

## Styling
- Use CSS Modules or Tailwind utility classes
- NO inline styles (no style={{ }} props)
```

#### Concrete Example

**In `/web/src/hooks/useTodos.ts`:**

Without the instruction:
```typescript
export default function useTodos() {  // ❌ Default export
  const [todos, setTodos] = useState([]);  // ❌ useState for server data
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTodos = async () => {
      setLoading(true);
      const res = await fetch('/api/todos');  // ❌ Direct fetch
      setTodos(await res.json());
    };
    fetchTodos();
  }, []);

  return { todos, loading };
}
```

With the instruction:
```typescript
export const useTodos = () => {  // ✅ Named export
  return useQuery({               // ✅ React Query only
    queryKey: ['todos'],
    queryFn: todoService.getAll,
  });
};
```

#### Why it matters
- **Enforces React Query patterns** — prevents prop drilling, stale data, manual cache management
- **Type safety** — eliminates accidental `any` types
- **Performance** — Copilot suggests memoization, query keys, deduplication automatically

---

### FILE 4: `.github/prompts/commit-message.prompt.md`

**Type:** Prompt File (manual invocation)
**Scope:** Entire repository
**Activation:** Manual via `#commit-message.prompt.md` in Copilot Chat
**Size:** ~1 KB

#### What it is
A **reusable prompt template** for generating Conventional Commit messages. Instead of retyping the entire prompt every time, you invoke the file by name.

#### How it works

**In VS Code:**
1. Open Copilot Chat (`Ctrl+Shift+I`)
2. Switch to **Agent** mode
3. Type: `#commit-message.prompt.md`
4. Copilot loads the file as its system instructions
5. Say: "Generate a commit message for staged changes"
6. Copilot shows the staged changes and generates a message

#### What's inside

```markdown
---
mode: "agent"
description: "Generate a conventional commit message for staged changes"
---

# Role
You are a senior developer writing a commit message for a team
that follows Conventional Commits.

# Task
Review git diff --cached and generate a commit message.

# Format
type(scope): subject
<blank line>
body

# Rules
- type ∈ {feat, fix, refactor, test, docs, chore, ci}
- scope: 'api' or 'web' or 'repo'
- subject: Imperative mood, lowercase, no period, max 50 chars
- body: Explain WHAT changed and WHY, wrap at 72 chars

# Examples
- feat(api): add CRUD endpoints for todo resource
- fix(web): handle empty state when no todos exist
- chore(repo): configure eslint and black formatter
```

#### Workflow

```bash
cd d:/UpSkill
git add api/app/routes/todo_router.py api/app/services/todo_service.py

# Open Copilot Chat, Agent mode, type: #commit-message.prompt.md
# Copilot shows:
# ────────────────────────────────────
# feat(api): implement todo service layer
#
# Add TodoService with async methods for CRUD operations.
# Services call repositories and raise HTTPException for violations.
# Includes logging and proper type hints throughout.
# ────────────────────────────────────

git commit -m "feat(api): implement todo service layer

Add TodoService with async methods for CRUD operations.
Services call repositories and raise HTTPException for violations.
Includes logging and proper type hints throughout."
```

#### Why it matters
- **No more inconsistent formats** — every commit follows Conventional Commits
- **Team consistency** — all developers generate the same message style
- **Enables automation** — CI/CD can automatically parse type and scope
- **Saves time** — Copilot writes the message for you instead of manually typing

---

### FILE 5: `.github/prompts/code-review.prompt.md`

**Type:** Prompt File (manual invocation)
**Scope:** Current branch vs main
**Activation:** Manual via `#code-review.prompt.md` in Copilot Chat
**Size:** ~1.5 KB

#### What it is
A **pre-PR quality gate** that runs comprehensive code review against architecture, security, types, tests, and code quality.

#### How it works

**In VS Code:**
1. Open Copilot Chat
2. Switch to **Agent** mode
3. Type: `#code-review.prompt.md`
4. Copilot reviews all changed files in current branch vs main
5. Returns a markdown table of findings or "✅ All checks passed"

#### What's inside (the checklist)

```markdown
---
mode: "agent"
description: "Run a pre-PR code review on changed files"
---

# Role
You are a senior software architect conducting a code review
before a pull request is merged.

# Task
Review all files changed in current branch vs main.
1. Determine base branch (prefer main, else master, else remote HEAD)
2. Run: git diff <base>...HEAD --name-only
3. Examine each changed file

# Checklist — Evaluate every file against these criteria:

1. **Architecture Boundaries**
   - Routes only call Services?
   - Services only call Repositories?
   - No SQLAlchemy imports in routes/services (except type hints)?
   - No HTTPException in repositories?

2. **Security**
   - No hardcoded secrets/connection strings/API keys?
   - All user input validated via Pydantic schemas?
   - No raw SQL strings (use ORM only)?

3. **Type Safety**
   - Python: Every function has full type hints?
   - TypeScript: No `any` type?

4. **Error Handling**
   - Services return meaningful HTTP status codes?
   - Frontend components handle loading/error states?
   - No bare except: clauses?

5. **Test Coverage**
   - Every new public function has tests?
   - Edge cases covered (empty, not found, duplicate)?

6. **Code Quality**
   - No print() in Python [use logging]?
   - No console.log() [except intentional debug]?
   - No commented-out code?
   - Docstrings on all public functions?

# Output Format
Markdown table:

| File | Line(s) | Issue | Severity | Suggestion |
|------|---------|-------|----------|------------|

Severity: 🔴 Critical | 🟡 Warning | 🔵 Info

If no issues: "✅ All checks passed. Ready to merge."
```

#### Workflow

```bash
# After finishing feature branch (feat/add-categories):
git add .
git commit -m "feat(api): add category routes and services"

# Before pushing, open Copilot and invoke:
# #code-review.prompt.md

# Copilot outputs:
# ────────────────────────────────────────────────────────
# | File | Line(s) | Issue | Severity | Suggestion |
# |------|---------|-------|----------|------------|
# | api/app/routes/category_router.py | 25 | No HTTPException for 404 case | 🔴 Critical | Raise HTTPException(status_code=404) when category not found |
# | api/app/services/category_service.py | 12 | Missing return type hint | 🟡 Warning | Add -> Optional[Category] |
# | web/src/components/CategoryForm.tsx | 45 | Unused variable 'tempName' | 🔵 Info | Remove unused variable |

# Fix issues, commit again, then push
git push origin feat/add-categories
```

#### Why it matters
- **Catches issues before PR merge** — prevents architecture violations, security problems, type errors
- **Enforces team standards** — everyone gets the same review checklist
- **Reduces manual review burden** — catches low-hanging fruit so human reviewers focus on logic
- **Blocks risky patterns** — ensures SQLAlchemy doesn't leak into routes, prevents hard-coded secrets

---

### FILE 6: `.github/prompts/prd.prompt.md`

**Type:** Prompt File (manual invocation)
**Scope:** Feature-level requirements
**Activation:** Manual via `#prd.prompt.md` in Copilot Chat
**Size:** ~1.2 KB

#### What it is
A **Product Requirements Document generator** that turns a feature idea into a structured PRD. Used at the start of feature development.

#### How it works

**In VS Code:**
1. Open Copilot Chat
2. Switch to **Agent** mode
3. Type: `#prd.prompt.md`
4. Copilot prompts: "What feature would you like to define?"
5. You describe the feature (e.g., "Add categories to organize todos")
6. Copilot generates a complete PRD

#### Output Structure

```markdown
## Feature Name
A clear, concise title.

## Problem Statement
What user problem does this solve? Why is it important?

## User Stories
Given/When/Then format:
- Given [context], When [action], Then [expected result]
- Write 3-5 user stories covering the main flows

## Acceptance Criteria
Checkboxes for each testable requirement:
- [ ] Users can create a new category
- [ ] Category name is required and max 100 characters
- [ ] Users can see all their categories

## API Contract
For each endpoint:
- HTTP method and path
- Request body (JSON shape)
- Response body (JSON shape)
- Status codes and meanings

## UI Wireframe Description
Text-based description of the UI layout and interactions.

## Out of Scope
What this feature does NOT include (prevents scope creep).
```

#### Example Output

```markdown
## Feature: Categories for Todos

## Problem Statement
Users have lots of todos mixed together. They need to organize them
by project, priority, or type to stay productive.

## User Stories
- Given I'm logged in, When I click "New Category", Then I can create
  a category with a name and optional description
- Given I have a category, When I add a todo, Then I can assign it to
  the category
- Given I have categorized todos, When I filter by category, Then I see
  only todos in that category

## Acceptance Criteria
- [ ] Create a new category via UI with name (required, max 100 chars)
- [ ] Display all categories in sidebar
- [ ] Delete a category (optionally reassign todos)
- [ ] Todos show their category in the list view
- [ ] Filter todos by category

## API Contract
POST /api/v1/categories
  Request: { name: "Projects", description: "My work tasks" }
  Response: { id: 1, name: "Projects", created_at: "2026-03-30T..." }
  201 Created, 422 Validation Error

## UI Wireframe Description
Sidebar lists all categories as clickable links. Each category page
shows filtered todos. A "New Category" button opens a modal form.

## Out of Scope
- Sharing categories with other users
- Category-specific permissions
- Bulk operations on categories
```

#### Why it matters
- **Prevents vague requirements** — forces you to think through the feature before coding
- **Generates shared understanding** — non-technical stakeholders can review the PRD
- **Creates test cases naturally** — acceptance criteria become test cases
- **Enables parallel work** — teammates can read PRD and start work independently

---

### FILE 7: `.github/prompts/trd.prompt.md`

**Type:** Prompt File (manual invocation)
**Scope:** Technical implementation plan
**Activation:** Manual via `#trd.prompt.md` in Copilot Chat
**Size:** ~1.4 KB

#### What it is
A **Technical Requirements Document generator** that translates a PRD into a step-by-step implementation plan. Used after the PRD is approved.

#### How it works

**In VS Code:**
1. Open Copilot Chat
2. Switch to **Agent** mode
3. Type: `#trd.prompt.md`
4. Copilot prompts: "Paste the PRD or describe the feature"
5. You paste the PRD from Step 6
6. Copilot generates a complete TRD with:
   - Files to create/modify
   - Database migration strategy
   - API endpoints with signatures
   - Dependency injection wiring
   - Error handling strategy
   - Test cases

#### Output Structure

```markdown
## Overview
One paragraph summarizing the technical approach.

## Architecture Decisions
Key decisions and their rationale (why we chose this over alternatives).

## Files to Create / Modify
| File Path | Action | Purpose |

## Database Changes
- New tables with columns, types, constraints
- New columns on existing tables
- Alembic migration instructions

## API Endpoints
| Method | Path | Request Body | Response | Status Codes |

## Dependency Injection Wiring
Show how get_db → Repository → Service → Route is wired.
Include exact function signatures.

## Error Handling Strategy
| Scenario | HTTP Code | Error Detail |

## Test Plan
### Unit Tests (Backend)
- List test cases for service and repository layers

### Component Tests (Frontend)
- List test cases for hooks and components
```

#### Example Output

```markdown
## Overview
Add a Category resource to the todo app. Categories are containers
for organizing todos. Each todo can optionally belong to one category.

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| api/app/models/category.py | Create | SQLAlchemy Category ORM model |
| api/app/schemas/category.py | Create | Pydantic Category request/response DTOs |
| api/app/repositories/category_repository.py | Create | Category CRUD operations |
| api/app/services/category_service.py | Create | Category business logic |
| api/app/routes/category_router.py | Create | FastAPI category endpoints |
| alembic/versions/001_create_categories.py | Create | Add categories table migration |
| api/app/models/todo.py | Modify | Add category_id foreign key |

## API Endpoints

| Method | Path | Request | Response | Codes |
|--------|------|---------|----------|-------|
| POST | /api/v1/categories | CategoryCreate | CategoryResponse | 201, 422 |
| GET | /api/v1/categories | — | list[CategoryResponse] | 200 |
| GET | /api/v1/categories/{id} | — | CategoryResponse | 200, 404 |
| PUT | /api/v1/categories/{id} | CategoryUpdate | CategoryResponse | 200, 404, 422 |
| DELETE | /api/v1/categories/{id} | — | — | 204, 404 |

## Error Handling Strategy

| Scenario | HTTP Code | Error Detail |
|----------|-----------|-------------|
| Category not found | 404 | "Category with id {id} not found" |
| Duplicate category name | 409 | "Category with name '{name}' already exists" |
| Invalid input (name empty) | 422 | Pydantic validation error |

## Test Plan

### Backend Unit Tests
- test_create_category_success()
- test_create_category_duplicate_name()
- test_get_category_not_found()
- test_update_category_success()
- test_delete_category_success()

### Frontend Component Tests
- test_CategoryForm_creates_new_category()
- test_CategoryList_displays_all_categories()
- test_CategoryFilter_filters_todos_by_category()
```

#### Why it matters
- **Bridges PRD and code** — gives developers exact file paths, API signatures, test cases
- **Prevents architecture mismatches** — forces layer boundaries to be explicit
- **Paralyzes analysis** — developers don't waste time deciding where to put code
- **Enables pair programming with AI** — developers and Copilot work from the same technical spec

---

### FILE 8: `.vscode/agents/api-agent.agent.yml`

**Type:** Custom Agent (manual invocation)
**Scope:** Backend (`/api` directory)
**Activation:** Manual via `@api` in Copilot Chat
**Size:** ~1 KB

#### What it is
An **explicit Copilot persona** optimized for backend development. Unlike instructions (which are passive), agents are active — you talk **to** them, and they respond as an expert.

#### How it works

**In VS Code Copilot Chat:**
```
You: "@api create a repository method to find todos by category"

Copilot (as @api): [responds as an expert FastAPI developer who knows
                    your 3-layer architecture, async patterns, type hints]

Result: Generated repository method that:
- Lives in app/repositories/
- Is async and fully typed
- Uses prepared statements
- Returns Optional[list[Todo]]
- Includes docstrings
```

#### What's inside

```yaml
name: api
description: "Backend agent for FastAPI Python API in /api"

instructions: |
  You are an expert Python/FastAPI developer working exclusively in /api.

  ## Architecture you enforce
  - 3-layer: Routes → Services → Repositories
  - Routes (app/routes/): FastAPI routers, input validation, service calls
  - Services (app/services/): Business logic, raises HTTPException
  - Repositories (app/repositories/): SQLAlchemy queries, returns ORM models

  ## File layout
  - Models: app/models/
  - Schemas: app/schemas/
  - DB: app/db/session.py
  - Entry: app/main.py
  - Migrations: alembic/

  ## Tech Stack
  - Python 3.11+, FastAPI, SQLAlchemy 2.x async
  - Pydantic v2, Alembic, python-dotenv
  - SQL Server via aioodbc

  ## Rules
  - All async def with type hints and docstrings
  - logging module (never print)
  - No secrets in code
  - Meaningful HTTP status codes
```

#### Key Advantage

**Instructions are passive** → guide all suggestions silently
**Agents are active** → you have a conversation with an expert

```
Example:
  You: "@api add soft delete to the Todo model"
  @api: [generates]
    1. Migration adding is_deleted boolean column
    2. Model updated with is_deleted field
    3. Repository filter_active() method added
    4. Service updated to filter soft-deleted todos
  [You never explain any of these steps — @api knows your architecture]
```

#### Why it matters
- **Eliminates back-and-forth** — agent already knows where code goes, what patterns to use
- **Maintains coherence** — agent generates code that respects your 3-layer boundary
- **Accelerates development** — one prompt generates multiple files

---

### FILE 9: `.vscode/agents/web-agent.agent.yml`

**Type:** Custom Agent (manual invocation)
**Scope:** Frontend (`/web` directory)
**Activation:** Manual via `@web` in Copilot Chat
**Size:** ~1 KB

#### What it is
An **explicit Copilot persona** optimized for React/TypeScript frontend development.

#### How it works

**In VS Code Copilot Chat:**
```
You: "@web build a TodoCategoryFilter component with loading state"

Copilot (as @web): [responds as an expert React developer, generates:
- Component with proper TypeScript interfaces
- Uses React Query hook from src/hooks/
- Handles isLoading and isError states
- Returns typed JSX
- Named exports]
```

#### What's inside

```yaml
name: web
description: "Frontend agent for React TypeScript app in /web"

instructions: |
  You are an expert React/TypeScript developer working exclusively in /web.

  ## File layout
  - Pages: src/pages/
  - Components: src/components/
  - Hooks: src/hooks/ (React Query, one per domain)
  - Services: src/services/ (Axios, one per domain)
  - Types: src/types/ (interfaces, one per domain)

  ## Data fetching pattern
  Component → useQuery hook → service function → Axios → API

  ## Tech Stack
  - React 18, TypeScript, Vite
  - React Query (TanStack Query)
  - Axios with baseURL from env

  ## Rules
  - Functional components with arrow functions
  - Props as named interfaces (no inline types)
  - No `any` type
  - Named exports
  - React Query for all server state
  - Handle loading/error states
  - No console.log() (use logger)
  - CSS Modules or Tailwind (no inline styles)
```

#### Difference from `@api`

| | `@api` | `@web` |
|---|---|---|
| **Knows** | FastAPI, SQLAlchemy, 3-layer | React, TypeScript, React Query |
| **Generates** | Routes, services, migrations | Components, hooks, services |
| **Patterns** | Async/await, dependency injection | useQuery/useMutation, Axios |

#### Why it matters
- **Frontend and backend are different worlds** — each agent knows its own ecosystem
- **Prevents leaky abstractions** — `@api` never suggests React patterns, `@web` never suggests SQL

---

### FILE 10: `.github/skills/test-runner.skill.yml`

**Type:** Skill (auto-triggered)
**Scope:** Entire repository
**Activation:** Auto when you ask about tests or modify test files
**Size:** ~1 KB

#### What it is
An **auto-triggered Copilot capability** that intelligently runs the right test suite (pytest or vitest) based on context.

#### How it works

**Auto-triggered scenarios:**

```
Scenario 1: You ask Copilot something
You: "Can you run the tests?"
→ Copilot detects test-runner skill is relevant
→ Auto-activates test-runner
→ Asks: "Backend tests (pytest) or frontend tests (vitest)?"

Scenario 2: You modify a test file
You: [edit api/tests/test_todo_service.py, save]
→ Copilot auto-offers: "Run pytest to verify your changes?"

Scenario 3: You ask about coverage
You: "Do we have test coverage for the todo service?"
→ Copilot auto-activates test-runner with coverage flag
→ Runs: pytest --cov=api.services.todo_service
→ Analyzes results and reports
```

#### What's inside

```yaml
name: test-runner
description: "Runs backend pytest or frontend vitest"

instructions: |
  You are a test execution assistant.

  ## Detection Rules
  - If working in /api or mentions backend tests:
    Run: Set-Location api; python -m pytest -v --tb=short
    Fallback: py -m pytest (if 'python' not in PATH)

  - If working in /web or mentions frontend tests:
    Run: Set-Location web; npx vitest run

  ## Reporting
  After execution:
  - Total tests: X
  - Passed: X ✅
  - Failed: X ❌
  - For each failure:
    - Test name
    - File and line number
    - Brief error description
    - Suggested fix

  ## Rules
  - Never modify test files to make them pass
  - If missing dependencies, suggest install command
  - If missing env vars, point to .env.example
```

#### Practical Workflow

```bash
# You're working on the todo service
cd api/app/services

# You finish a new feature and save todo_service.py
# Copilot's test-runner auto-offers:
# "Would you like me to run pytest to verify your changes?"

# Click "Yes"
# Copilot runs:
# Set-Location api; python -m pytest -v --tb=short

# Output:
# ────────────────────────────────────
# test session starts == platform win32, Python 3.11.0 ==
# collected 12 tests
#
# tests/services/test_todo_service.py::test_get_all_todos PASSED
# tests/services/test_todo_service.py::test_create_todo PASSED
# tests/services/test_todo_service.py::test_create_todo_duplicate FAILED
#   AssertionError: Expected HTTPException(409) but got 500
#   Suggested fix: Add uniqueness check in TodoService.create()
#
# ============== 11 passed, 1 failed in 2.34s ===============
```

#### Why it matters
- **Reduces context switching** — don't need to manually run tests, Copilot does it
- **Faster feedback** — see test results in chat, not in terminal
- **Intelligent suggestions** — "Run tests?" only appears when relevant

---

### FILE 11: `.github/skills/api-endpoint-generation.skill.yml` (Teammate Created)

**Type:** Skill (auto-triggered)
**Scope:** Backend API routes
**Activation:** Auto when you create a new route file or ask "generate an endpoint"
**Size:** ~1.5 KB

#### What it is
Auto-generates FastAPI endpoint boilerplate with proper signatures, validation, dependency injection, and error handling.

#### When it triggers

```
Scenario 1: You create a new route file
You: [save web/src/routes/category_router.py]
→ Copilot auto-offers: "Generate endpoint stubs for categories?"

Scenario 2: You ask for an endpoint
You: "@api generate an endpoint to delete a todo by id"
→ Copilot auto-activates API endpoint generation
→ Generates complete DELETE /todos/{id} endpoint with:
  - Proper HTTPException handling (404, 409, etc.)
  - Type hints
  - Docstrings
  - Service dependency injection
  - Correct status codes
```

#### What it generates

```python
# Copilot generates something like:
@router.delete("/todos/{todo_id}", status_code=204)
async def delete_todo(
    todo_id: int,
    service: Annotated[TodoService, Depends(get_todo_service)]
) -> None:
    """Delete a todo by ID.

    Args:
        todo_id: The ID of the todo to delete.
        service: The TodoService dependency.

    Raises:
        HTTPException: 404 if todo not found.
    """
    await service.delete(todo_id)
```

#### Why it matters
- **Prevents boilerplate fatigue** — Copilot writes the decorator, signature, docstring
- **Enforces patterns** — dependency injection, type hints, error handling always correct
- **Accelerates CRUD operations** — generate all 5 endpoints (GET, POST, PUT, DELETE, PATCH) quickly

---

### FILE 12: `.github/skills/database-migration.skill.yml` (Teammate Created)

**Type:** Skill (auto-triggered)
**Scope:** Database schema changes
**Activation:** Auto when you modify a model or ask "create a migration"
**Size:** ~1.5 KB

#### What it is
Auto-generates Alembic database migrations when you modify a SQLAlchemy model.

#### When it triggers

```
Scenario 1: You modify a model
You: [add a new field to api/app/models/todo.py]
You: [save the file]
→ Copilot auto-offers: "Create Alembic migration for this change?"

Scenario 2: You ask for a migration
You: "@api add a priority field to the todo model and create migration"
→ Copilot generates:
  1. Model change: priority: Mapped[int] = mapped_column(default=0)
  2. Migration: alembic/versions/002_add_priority_to_todo.py
```

#### What it generates

```python
# alembic/versions/002_add_priority_to_todo.py
"""Add priority field to Todo model."""
from alembic import op
import sqlalchemy as sa

revision = '002_add_priority'
down_revision = '001_create_categories'

def upgrade() -> None:
    op.add_column('todo',
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0')
    )

def downgrade() -> None:
    op.drop_column('todo', 'priority')
```

#### Why it matters
- **Eliminates manual migration writing** — Copilot generates the SQL
- **Handles SQL Server specifics** — knows about IDENTITY, constraints, etc.
- **Includes rollback logic** — downgrade() ensures reversibility

---

### FILE 13: `.github/skills/performance-review.skill.yml` (Teammate Created)

**Type:** Skill (auto-triggered)
**Scope:** Entire codebase
**Activation:** Auto when you ask "is this performant?" or before PR
**Size:** ~1.5 KB

#### What it is
Auto-triggered security audit that analyzes code for performance bottlenecks.

#### When it triggers

```
Scenario 1: You ask Copilot
You: "Is this service performant?"
→ Copilot auto-activates performance-review
→ Analyzes code and reports:
  - N+1 query problems
  - Missing indexes
  - Unoptimized joins
  - Unnecessary API calls
  - Missing React Query caching

Scenario 2: Before PR merge
You: "#code-review.prompt.md"
→ performance-review auto-runs as part of review
→ Flags performance issues as "Warnings"
```

#### What it checks

```
🔍 Backend Performance
- N+1 query detection
  Bad: for todo in todos: details = repo.get_details(todo.id)
  Good: details = repo.get_all_with_details()

- Missing indexes on foreign keys
- Unoptimized joins (nested loops vs set operations)
- Missing pagination on list endpoints
- Inefficient filtering/sorting

🔍 Frontend Performance
- Unnecessary re-renders (missing React.memo, useCallback)
- Missing React Query deduplication
- Fetch on every render (missing dependency arrays)
- Large bundles (missing code-splitting)
- Missing image optimization
```

#### Why it matters
- **Catches performance problems early** — before they hit production
- **Prevents N+1 queries** — super common SQLAlchemy mistake
- **Improves user experience** — faster API responses, smoother UI

---

### FILE 14: `.github/skills/security-review.skill.yml` (Teammate Created)

**Type:** Skill (auto-triggered)
**Scope:** Entire codebase
**Activation:** Auto when you ask "is this secure?" or before PR
**Size:** ~1.5 KB

#### What it is
Auto-triggered security audit that scans code for vulnerabilities and compliance issues.

#### When it triggers

```
Scenario 1: You ask Copilot
You: "Is this code secure?"
→ Copilot auto-activates security-review
→ Scans all files and reports vulnerabilities

Scenario 2: Before PR merge
You: "#code-review.prompt.md"
→ security-review auto-runs as part of review
→ Flags security issues as "🔴 Critical"

Scenario 3: You mention secrets
You: "I hardcoded the DB connection string in main.py"
→ security-review auto-activates
→ Suggests immediate fix: use environment variables
```

#### What it checks

```
🔒 Code Secrets
- Hardcoded passwords, API keys, connection strings
- AWS credentials, private keys
- JWT secrets

🔒 Injection Attacks
- SQL injection (raw SQL strings — should use ORM)
- Command injection (os.system with user input)
- XSS (unsanitized HTML)

🔒 Authentication/Authorization
- Missing authentication on protected routes
- Weak password policies
- No rate limiting on sensitive endpoints

🔒 CORS & Headers
- CORS configured too permissively
- Missing security headers (CSP, X-Frame-Options)
- Exposing sensitive data in response headers

🔒 Dependency Vulnerabilities
- Outdated packages with known CVEs
- Insecure deserialization
- Unsafe pickle usage
```

#### Example Detection

```python
# Copilot flags as CRITICAL:

# ❌ BAD - Hardcoded secret
DATABASE_URL = "mssql+aioodbc://sa:P@ssw0rd@localhost:1433/TodoDB"

# ✅ GOOD - Use environment variable
DATABASE_URL = os.getenv("DATABASE_URL", default="mssql+aioodbc://...")

# ❌ BAD - SQL injection risk
query = f"SELECT * FROM todos WHERE id = {user_id}"
db.execute(query)

# ✅ GOOD - Use ORM
todo = await repository.get_by_id(user_id)

# ❌ BAD - Missing auth check
@router.delete("/todos/{id}")
async def delete_todo(id: int):  # Any user can delete any todo!
    ...

# ✅ GOOD - Check ownership
@router.delete("/todos/{id}")
async def delete_todo(
    id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[TodoService, Depends()]
):
    await service.delete(id, current_user.id)  # Verify ownership
```

#### Why it matters
- **Prevents security vulnerabilities in production** — catches issues before deployment
- **Enforces compliance** — regulations like GDPR require security audits
- **Protects user data** — prevents breaches from hardcoded secrets, injection attacks

---

## How All Files Work Together

### The Complete Feature Development Workflow

```
PHASE: Add Categories to Todos

┌─────────────────────────────────────────────────────────┐
│ STEP 1: Define Requirements                             │
│ You: "We need categories for organizing todos"          │
│ Invoke: #prd.prompt.md                                  │
│ Result: Complete PRD document                           │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Create Technical Plan                           │
│ You: Show PRD to #trd.prompt.md                         │
│ Result: TRD with files, endpoints, migrations, tests    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Generate Backend Code                           │
│ You: "@api create the category model, schema, repo"     │
│ Copilot: [Generates with python.instructions guidance]  │
│ copilot-instructions.md: [Silently ensures 3-layer]     │
│ Result: Category model, schema, repository layer        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 4: Generate API Endpoints                          │
│ You: "@api generate CRUD endpoints for categories"      │
│ Skill: api-endpoint-generation auto-triggers            │
│ Result: Complete FastAPI routes with error handling     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 5: Generate Database Migration                     │
│ Skill: database-migration auto-triggers                 │
│ Result: Alembic migration file with upgrade/downgrade   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 6: Generate Frontend Code                          │
│ You: "@web create hooks and components for categories"  │
│ Copilot: [Generates with typescript.instructions guide] │
│ Result: useCategoriesHook, CategoryList component       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 7: Run Tests                                       │
│ You: "Run the tests"                                    │
│ Skill: test-runner auto-triggers                        │
│ Result: pytest and vitest run, failures highlighted     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 8: Code Review                                     │
│ You: Invoke #code-review.prompt.md                      │
│ Skills: security-review + performance-review auto-run   │
│ Result: Table of findings (architecture, security, etc) │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 9: Fix Findings                                    │
│ You: Fix issues flagged in code review                  │
│ Copilot: Run tests again to verify fixes                │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 10: Commit                                         │
│ You: git add . && Invoke #commit-message.prompt.md      │
│ Result: "feat(api): add category endpoints and service" │
│        "feat(web): add category hooks and components"   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 11: Push to GitHub                                 │
│ Create Pull Request                                      │
│ GitHub Actions run CI/CD (hints from our commits)       │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Reference Table

| File | Type | Activation | Purpose | Size |
|------|------|-----------|---------|------|
| `.github/copilot-instructions.md` | Instructions | Always | Workspace architecture | 2 KB |
| `.github/instructions/python.instructions.md` | Instructions | Auto on `api/**/*.py` | Python conventions | 1.5 KB |
| `.github/instructions/typescript.instructions.md` | Instructions | Auto on `web/src/**/*.{ts,tsx}` | React/TypeScript conventions | 1.8 KB |
| `.github/prompts/commit-message.prompt.md` | Prompt | Manual `#commit-message` | Generate conventional commits | 1 KB |
| `.github/prompts/code-review.prompt.md` | Prompt | Manual `#code-review` | Pre-PR quality gate | 1.5 KB |
| `.github/prompts/prd.prompt.md` | Prompt | Manual `#prd` | Generate product requirements | 1.2 KB |
| `.github/prompts/trd.prompt.md` | Prompt | Manual `#trd` | Generate technical requirements | 1.4 KB |
| `.vscode/agents/api-agent.agent.yml` | Agent | Manual `@api` | Backend expert persona | 1 KB |
| `.vscode/agents/web-agent.agent.yml` | Agent | Manual `@web` | Frontend expert persona | 1 KB |
| `.github/skills/test-runner.skill.yml` | Skill | Auto-triggered | Run tests intelligently | 1 KB |
| `.github/skills/api-endpoint-generation.skill.yml` | Skill | Auto-triggered | Generate FastAPI endpoints | 1.5 KB |
| `.github/skills/database-migration.skill.yml` | Skill | Auto-triggered | Generate Alembic migrations | 1.5 KB |
| `.github/skills/performance-review.skill.yml` | Skill | Auto-triggered | Performance audit | 1.5 KB |
| `.github/skills/security-review.skill.yml` | Skill | Auto-triggered | Security audit | 1.5 KB |

---

## Usage Examples

### Example 1: Create a new endpoint with all guides active

```
1. You modify api/app/routes/todo_router.py
2. Notification appears: "Copilot is ready"
3. You type a prompt:
   "@api add a PUT /todos/{id} endpoint to update a todo"
4. Copilot loads:
   - copilot-instructions.md (3-layer architecture)
   - python.instructions.md (async, type hints, Annotated[])
   - @api agent instructions (FastAPI expertise)
   - Skill: api-endpoint-generation (auto-handles boilerplate)
5. Result: Complete endpoint with validation, status codes, docstrings
```

### Example 2: Write a component that follows team patterns

```
1. You create web/src/components/TodoList.tsx
2. You type:
   "@web create a TodoList component that fetches todos via React Query"
3. Copilot loads:
   - copilot-instructions.md (React Query for server state)
   - typescript.instructions.md (functional components, no `any`)
   - @web agent instructions (React expertise)
4. Result: Component with:
   - Proper TypeScript interfaces for props
   - useQuery hook from dedicated hook file
   - Loading and error state handling
   - Named exports
```

### Example 3: Run tests and get smart suggestions

```
1. You finish editing api/app/services/todo_service.py
2. Copilot suggests: "Would you like to run tests?"
3. You click "Yes"
4. Skill: test-runner auto-triggers
5. Runs: pytest -v --tb=short
6. Result shows failures with suggested fixes
```

---

## Terminology & Concepts

### Instructions
Passive guidance that applies to all code in a scope. Read automatically by Copilot before generating any suggestion. Never invoked manually.

### Language Instructions
Instructions scoped to specific file patterns via `applyTo`. E.g., Python rules only activate on `api/**/*.py`.

### Prompt Files
Reusable prompt templates saved in `.github/prompts/`. Invoked manually with `#filename.prompt.md` in Copilot Chat.

### Agents
Active Copilot personas invoked with `@name`. You have a conversation with an agent as if talking to an expert in that domain.

### Skills
Auto-triggered Copilot capabilities that activate when Copilot detects they're relevant. No manual invocation needed.

### RTACCO Pattern
Framework for writing clear prompts: Role, Task, Audience, Context, Constraints, Output. Used in prompt files and agent definitions.

### 3-Layer Architecture
- **Presentation (Routes)**: HTTP interface
- **Business Logic (Services)**: Domain rules
- **Data Access (Repositories)**: Database operations

### Dependency Injection
Pattern where dependencies are passed into functions (via `Depends()` in FastAPI) instead of creating them inside. Enables testing and loose coupling.

### React Query
State management library for server data. Handles caching, synchronization, and deduplication automatically. Replaces need for `useState` + `useEffect` for API calls.

---

## Getting Started

Now that you have all artifacts in place:

1. **Phase 0 is complete** — all customization is ready
2. **Next phase**: Phase 1 — Basic Todo CRUD (backend + frontend)
3. **Use the agents and prompts** to generate code, not manual typing
4. **Use prompt files** (`#code-review`, `#commit-message`) in every commit cycle
5. **Let skills auto-trigger** — they'll activate when you need them

This is a **complete, enterprise-grade AI-assisted development environment** for your Todo app.

---

**Questions? Ask them now before proceeding to Phase 1.**
