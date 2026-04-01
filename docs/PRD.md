# Product Requirements Document — Todo AI Application

> **Date:** April 1, 2026
> **Application:** Single-user Todo app (FastAPI + React TypeScript monorepo)
> **Audience:** Full-stack developers building with GitHub Copilot Agent mode
> **Convention:** Backend API and Frontend UI are built side-by-side within every phase.

---

## Delivery Phases Overview

| Phase | Title | Core Features |
|---|---|---|
| 1 | Core Todo CRUD | Create · Read · Update · Delete · Mark complete |
| 2 | Organization | Categories · Tags · Labels |
| 3 | Task Enrichment | Priority levels · Due dates · Reminders |
| 4 | Filtering, Sorting, Search & Bulk Actions | Query params · Search · Bulk complete/delete |
| 5 | Subtasks, Reordering & UX Polish | Checklists · Drag-and-drop · Pagination · Optimistic updates |

---

---

## Phase 1 — Core Todo CRUD

### Problem Statement

Users need a reliable foundation to create, view, update, and delete tasks. Without a working CRUD flow for both the API and the UI, no subsequent phase can be built or tested. This phase delivers the minimum viable product.

### User Stories

- **Given** I am on the main page, **When** I submit a new todo title, **Then** the todo appears at the top of the list marked as incomplete.
- **Given** a todo exists, **When** I click its toggle control, **Then** its completion state flips and the UI reflects the change immediately.
- **Given** a todo exists, **When** I edit its title or description and save, **Then** the updated values are persisted and displayed.
- **Given** a todo exists, **When** I click delete and confirm, **Then** the todo is permanently removed from the list.
- **Given** I submit a todo with an empty or whitespace-only title, **When** the form is validated, **Then** an inline error is shown and no request is sent.

### Acceptance Criteria

#### Backend
- [ ] `POST /api/v1/todos` creates a todo; returns `201` with the created resource.
- [ ] `GET /api/v1/todos` returns all todos ordered by creation date descending.
- [ ] `GET /api/v1/todos/{id}` returns one todo or `404` if not found.
- [ ] `PUT /api/v1/todos/{id}` updates title, description, or completion state; returns the updated resource or `404`.
- [ ] `DELETE /api/v1/todos/{id}` removes the todo; returns `204` on success or `404` if not found.
- [ ] Title is required; max 255 characters; whitespace-only is rejected with `422`.
- [ ] Description is optional; max 1000 characters.

#### Frontend
- [ ] Todo list page renders all todos; shows a loading state during the initial fetch.
- [ ] Create form validates title client-side before any request is sent.
- [ ] Each todo row shows title, description, a completion toggle, an edit control, and a delete control.
- [ ] Inline edit mode allows updating the title and description without navigating away.
- [ ] A user-readable error message is shown when any request fails.
- [ ] The todo list is refreshed automatically after every create, update, or delete.

### Edge Cases & Error States

- **Whitespace-only title** → `422`; UI shows inline validation message before submission.
- **Title exceeds 255 characters** → `422`; UI validates character count in real time.
- **Todo not found** → `404` with `{"detail": "Todo not found"}`.
- **Network error** → error message shown; existing list is not cleared.

### Out of Scope

- Category, tag, priority, due date fields (Phases 2–3).
- Filtering or sorting (Phase 4).
- Subtasks, pagination, drag-and-drop (Phase 5).

### Open Questions

- Should delete be a soft-delete (archive) or hard-delete? This determines the database schema before Phase 1 is implemented.
- Should the last-updated timestamp be exposed in the todo response from Phase 1?

---

---

## Phase 2 — Organization (Categories & Tags)

### Problem Statement

A flat, unorganised list becomes unusable as it grows. Users need to group todos by project (categories) and apply flexible cross-cutting labels (tags) so they can navigate and organise their work at a glance.

### User Stories

- **Given** I create a category "Work", **When** I create or edit a todo, **Then** I can assign it to "Work" from a dropdown.
- **Given** a todo has a category, **When** I view the list, **Then** a coloured category badge is shown on the todo row.
- **Given** I try to delete a category that has todos assigned, **When** I confirm, **Then** the deletion is rejected with an explanation.
- **Given** I type a tag "urgent" on a todo and save, **When** the tag is new, **Then** it is created globally and the tag chip appears on the todo.
- **Given** I click a tag chip, **When** the click registers, **Then** only todos with that tag are shown.
- **Given** I try to create two categories with the same name, **When** I submit, **Then** an error tells me the name is already taken.

### Acceptance Criteria

#### Backend
- [ ] `GET /api/v1/categories`, `POST /api/v1/categories`, `GET /api/v1/categories/{id}`, `PUT /api/v1/categories/{id}`, `DELETE /api/v1/categories/{id}` are all implemented.
- [ ] Category name is required; max 100 characters; must be unique (case-insensitive) — duplicate returns `409`.
- [ ] `GET /api/v1/tags`, `POST /api/v1/tags`, `GET /api/v1/tags/{id}`, `PUT /api/v1/tags/{id}`, `DELETE /api/v1/tags/{id}` are all implemented.
- [ ] Tag name is required; max 50 characters; must be unique (case-insensitive) — duplicate returns `409`.
- [ ] `POST /api/v1/todos` and `PUT /api/v1/todos/{id}` accept an optional `category_id` and an optional list of `tag_ids`.
- [ ] Todo response includes `category_id`, `category_name`, and a list of associated tags.
- [ ] A non-existent `category_id` or `tag_id` in a todo payload returns `404`.
- [ ] Deleting a category that has at least one todo assigned returns `409 "Category has assigned todos"`.
- [ ] Deleting a tag removes its associations with all todos; the todos themselves are unaffected.

#### Frontend
- [ ] Category and tag lists are fetched and cached; used to populate form controls.
- [ ] Todo create/edit form includes a category dropdown (default: no category) and a tag token input with autocomplete from existing tags.
- [ ] Each todo row displays a category badge and tag chips where applicable.
- [ ] Clicking a tag chip activates a tag filter showing only todos with that tag.
- [ ] The todo list refreshes after any category or tag assignment is changed.

### Edge Cases & Error States

- **Duplicate category or tag name** → `409`; UI shows an inline error message.
- **Assigning a non-existent category or tag** → `404` from server; UI shows error toast.
- **Empty category or tag name** → `422`; UI blocks submission.
- **Removing all tags from a todo** → send an empty tag list; all associations are removed.

### Out of Scope

- Category colour picker (fixed palette only).
- Nested or hierarchical categories.
- A todo belonging to more than one category simultaneously.
- Filtering by multiple tags at once (Phase 4 covers single-tag filter).

### Open Questions

- Should deleting a category automatically set affected todos' category to none (cascade to null), or always block until todos are reassigned?
- Should updating a todo's tags replace all existing tags or support a delta (add/remove) list?

---

---

## Phase 3 — Task Enrichment (Priority, Due Dates & Reminders)

### Problem Statement

Tasks have different urgency and deadlines. Users need to signal importance with a priority level and attach due dates so they can see what is overdue, due today, or upcoming — and receive a reminder before a deadline passes.

### User Stories

- **Given** I create a todo and select "High" priority, **When** the todo renders, **Then** a red priority indicator is shown on the row.
- **Given** I set a due date on a todo and that date has passed without completion, **When** I view the list, **Then** the todo is visually marked as overdue.
- **Given** a todo is due today, **When** I view the list, **Then** it shows an amber "Due today" indicator distinct from the overdue indicator.
- **Given** I set a reminder on a todo, **When** that time arrives, **Then** a browser notification is shown.
- **Given** I sort by "Due Date: Earliest", **When** the list renders, **Then** todos without a due date appear last.

### Acceptance Criteria

#### Backend
- [ ] The todo resource includes three new optional fields: `priority` (one of: `low`, `medium`, `high`, or none), `due_date` (date only, no time), and `reminder_at` (date and time).
- [ ] Create and update endpoints accept all three new fields as optional.
- [ ] Todo response exposes all three fields.
- [ ] `GET /api/v1/todos` accepts a `priority` filter (`high`, `medium`, `low`, or `none`) and a `due` filter (`overdue`, `today`, `upcoming`, `no_date`).
- [ ] Sorting can be done by priority (high → medium → low → none) and by due date (no-date entries sort last).
- [ ] Invalid values for `priority` or `due` filter return `422`.

#### Frontend
- [ ] Todo create/edit form includes a priority selector (High / Medium / Low / None) and a date picker for due date.
- [ ] Todo create/edit form includes a datetime picker for reminders; the field can be cleared.
- [ ] Each todo row shows a colour-coded priority indicator: High = red, Medium = amber, Low = blue, none = no indicator.
- [ ] Each todo row shows an overdue indicator (red) or "Due today" indicator (amber) based on the current date.
- [ ] The UI requests browser notification permission the first time a reminder is set.
- [ ] If notification permission is denied, a warning icon is shown on todos that have a reminder set.

### Edge Cases & Error States

- **Due date set in the past** → allowed; no validation error (users may log past tasks).
- **Reminder set without a due date** → allowed independently.
- **Reminder time already passed on save** → saved successfully; browser notification fires immediately on the next UI check.
- **Notifications permission denied** → reminder is stored; no notification fires; UI shows warning icon.
- **Invalid date format** → `422`; must conform to ISO 8601.

### Out of Scope

- Server-side push or email reminders (browser Notification API only).
- Recurring due dates.
- Calendar view.
- AI-based priority suggestions.

### Open Questions

- Should `reminder_at` be an absolute datetime or relative to the due date (e.g. "1 hour before")?
- Should overdue todos automatically float to the top of the list, or only when explicitly sorted by due date?

---

---

## Phase 4 — Filtering, Sorting, Search & Bulk Actions

### Problem Statement

As the todo count grows, users cannot find or manage tasks by scrolling alone. Server-side filtering, combined sorting, and a live search narrow the list instantly. Bulk actions then let users clean up many items in one gesture.

### User Stories

- **Given** I select "High" from the priority filter, **When** the request fires, **Then** only high-priority todos are shown.
- **Given** I type "meet" in the search box and wait, **Then** only todos whose title contains "meet" (case-insensitive) are shown.
- **Given** active filters return no results, **When** the list renders, **Then** a message "No todos match your filters" is shown with a "Clear filters" action.
- **Given** I click "Mark all complete" and confirm, **When** the operation finishes, **Then** all incomplete todos are marked done in a single operation.
- **Given** I click "Delete completed" and confirm, **When** the operation finishes, **Then** all completed todos are permanently removed.
- **Given** I change any filter, **When** the URL updates, **Then** the filter state survives a browser refresh.

### Acceptance Criteria

#### Backend
- [ ] `GET /api/v1/todos` accepts: `status` (all / completed / pending), `category_id`, `tag_id`, `priority` (high / medium / low / none), `due` (overdue / today / upcoming / no_date), `search` (text), `sort_by` (creation date / title / priority / due date / position), `order` (asc / desc).
- [ ] All active filters are combined with AND logic; filtering is applied server-side.
- [ ] Text search is case-insensitive and matches any part of the title; wildcard characters are escaped to prevent injection.
- [ ] Default behaviour (no params): sorted by creation date descending, all statuses.
- [ ] Invalid filter values return `422` with a message listing the valid options.
- [ ] `PATCH /api/v1/todos/bulk-complete` marks all incomplete todos as complete; returns `200` with a count of affected todos.
- [ ] `DELETE /api/v1/todos/bulk-completed` deletes all completed todos; returns `200` with a count of deleted todos.
- [ ] Both bulk endpoints operate as a single atomic transaction; any failure rolls back completely.

#### Frontend
- [ ] Filter bar renders controls for: status, category, tag, priority, due date range, sort field, sort direction, and a search input with a short debounce delay.
- [ ] All active filter values are reflected in the URL query string so links are shareable and state survives a page refresh.
- [ ] "Clear filters" resets all controls to their defaults.
- [ ] Empty-state messages distinguish between "no todos exist" and "no todos match the current filters".
- [ ] "Mark all complete" is disabled when every visible todo is already complete.
- [ ] "Delete completed" is disabled when no completed todos exist; a confirmation dialog is shown before the action fires.
- [ ] The todo list refreshes automatically after any bulk action.

### Edge Cases & Error States

- **Filter references a deleted category or tag** → API returns an empty list (not `404`); UI shows the empty state.
- **Bulk action finds nothing to act on** → returns `200` with `{"affected": 0}`; UI shows "Nothing to update".
- **Bulk transaction fails on the server** → full rollback; UI shows error toast.
- **Bulk delete while a filter is active** → all completed todos are deleted globally, not just the currently visible ones; a tooltip communicates this behaviour.

### Out of Scope

- Saving named filter presets.
- Filtering by multiple tags simultaneously (single-tag filter only).
- Full-text search engine integration.
- Undo for bulk operations.

### Open Questions

- Should "Mark all complete" respect the active filter and only mark visible todos, or always operate globally?
- Should the text search also match the description field in addition to the title?

---

---

## Phase 5 — Subtasks, Reordering & UX Polish

### Problem Statement

Power users need sub-step tracking within tasks, a way to sequence their list in a personal order, and a UI that stays fast and stable with hundreds of todos. This phase completes the product with subtasks, drag-and-drop reordering, pagination, and optimistic UI updates.

### User Stories

- **Given** I expand a todo and add a subtask, **When** the subtask is saved, **Then** it appears as a checklist item; the collapsed row shows a progress counter (e.g. "2 / 5 done").
- **Given** I drag a todo row to a new position and release, **When** the drop lands, **Then** the list reorders instantly and the order is preserved on the next page load.
- **Given** I have 200 todos and load the page, **When** the initial fetch completes, **Then** only the first 20 are shown; a "Load more" control fetches the next batch.
- **Given** I toggle a todo and the request is in flight, **When** waiting for the server, **Then** the UI already shows the new state; if the server rejects it, the UI reverts and shows an error message.
- **Given** I am a keyboard-only user and focus a todo row, **When** I use keyboard shortcuts, **Then** I can toggle, edit, delete, and reorder the item without a mouse.

### Acceptance Criteria

#### Backend
- [ ] A subtasks resource exists as a child of todos; each subtask has a title (max 255 chars), a completion state, a position for ordering, and a creation timestamp.
- [ ] Creating a subtask requires a valid parent todo; returns `201`.
- [ ] Updating a subtask allows changing its title or completion state; returns the updated subtask.
- [ ] Deleting a subtask returns `204`; deleting a parent todo removes all its subtasks automatically.
- [ ] Single-todo response includes the full list of subtasks.
- [ ] Todo list response includes a subtask count and completed subtask count per todo (not the full subtask list).
- [ ] A `position` field is added to todos to support manual ordering.
- [ ] A batch reorder endpoint accepts a list of todo IDs with their new positions; updates are atomic.
- [ ] `GET /api/v1/todos` supports sorting by position (unpositioned todos sort last).
- [ ] `GET /api/v1/todos` supports `page` (minimum 1) and `page_size` (default 20, maximum 100) parameters.
- [ ] The paginated response includes: items, total count, current page, page size, and total page count.

#### Frontend
- [ ] Each todo row has an expandable section listing its subtasks as a checklist.
- [ ] An inline form within the expanded row allows adding a new subtask.
- [ ] The collapsed row shows a progress pill (completed / total) when subtasks exist.
- [ ] Completing all subtasks does not automatically complete the parent todo.
- [ ] Drag handles are visible on todo rows when the list is in custom (position) order; they are hidden when any other sort is active.
- [ ] Dragging a row to a new position updates the list order immediately; the new order is sent to the batch reorder endpoint on drop.
- [ ] Keyboard shortcuts allow moving a focused todo up or down in the list, triggering the same reorder.
- [ ] The list uses a "Load more" button pattern to fetch subsequent pages.
- [ ] Toggle and delete operations update the UI immediately, before the server responds; any server rejection reverts the change with a toast notification.
- [ ] A loading skeleton renders during the initial fetch to prevent layout shift.
- [ ] A rendering failure in the todo list does not crash the rest of the page.
- [ ] All interactive controls are reachable and operable by keyboard.
- [ ] All automated tests pass; coverage on data-fetching logic is at least 80%.

### Edge Cases & Error States

- **Subtask title is empty or whitespace** → `422`; UI blocks submission.
- **Parent todo not found when creating a subtask** → `404 "Todo not found"`.
- **Subtask not found** → `404 "Subtask not found"`.
- **Batch reorder includes an unknown todo ID** → `404`; the entire batch is rejected; no partial updates.
- **Two browser tabs reorder concurrently** → last write wins; no conflict detection required.
- **A new todo has no position set** → it sorts after all positioned todos; it receives a position on its first drag.
- **Drag is cancelled (Escape key or drop outside the list)** → the optimistic reorder is rolled back; the original order is restored.
- **Page number exceeds total pages** → returns `200` with an empty items array.
- **Page size exceeds maximum of 100** → `422`.
- **Optimistic update is rejected by the server** → UI reverts to its previous state; toast: "Change could not be saved".
- **API response cannot be parsed** → a generic error message is shown; the error is not an unhandled exception.

### Out of Scope

- Subtasks nested more than one level deep.
- Due dates or priority on subtasks.
- Promoting a subtask to a top-level todo.
- Dragging a todo between categories.
- Touch or mobile drag-and-drop.
- Infinite scroll (Load more button only).
- PWA or offline support.
- Dark mode.

### Open Questions

- Should `PATCH /todos/reorder` accept the full ordered list or only the items that changed positions?
- Should "Mark all complete" (Phase 4) and drag reorder (Phase 5) respect the active filter or always operate globally?
- Confirm pagination out-of-range behaviour: return `200` with empty items (documented above) or `404`?
