---
applyTo: "web/src/**/*.{ts,tsx}"
---

# TypeScript / React Instructions

## Component Style
- Functional components with arrow function syntax only.
- No class components. No `React.FC` — type props directly.
- Example:
  ```tsx
  interface TodoItemProps {
    todo: Todo;
    onToggle: (id: number) => void;
  }

  export const TodoItem = ({ todo, onToggle }: TodoItemProps) => {
    // component body
  };
  ```

## Props & Types
- Define props as named interfaces, not inline types.
- All interfaces go in `src/types/` — one file per domain (todo.ts, category.ts).
- No `any` type. Use `unknown` + type narrowing if type is truly unknown.
- Use `interface` for object shapes, `type` for unions/intersections.

## Data Fetching
- Use React Query (TanStack Query) for ALL server state.
- No `useState` + `useEffect` for API data — use `useQuery` and `useMutation`.
- Custom hooks in `src/hooks/` — one file per domain (useTodos.ts, useCategories.ts).
- Example:
  ```tsx
  export const useTodos = () => {
    return useQuery({
      queryKey: ['todos'],
      queryFn: todoService.getAll,
    });
  };
  ```

## API Layer
- Axios instance in `src/services/api.ts` with `baseURL` from `import.meta.env.VITE_API_BASE_URL`.
- Service functions in `src/services/` — one file per domain.
- Service functions return typed data, not raw Axios responses.
- Example:
  ```tsx
  export const todoService = {
    getAll: async (): Promise<Todo[]> => {
      const { data } = await api.get<Todo[]>('/todos');
      return data;
    },
  };
  ```

## State Management
- Server state: React Query (fetched data, caching, sync).
- UI state: React `useState` (modals, form inputs, toggles).
- No global state library needed for this app.

## Error & Loading States
- Every component that uses `useQuery` must handle `isLoading` and `isError`.
- Show user-friendly error messages, not raw error objects.

## Exports
- Use named exports only, no default exports.
- Exception: page components may use default export if required by router.

## Styling
- Use CSS Modules or Tailwind utility classes.
- No inline styles (no `style={{ }}` props).
