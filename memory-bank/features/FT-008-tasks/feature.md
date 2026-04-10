---
title: "FT-008: Tasks & Maintenance"
doc_kind: feature
doc_function: canonical
purpose: "Task management for property maintenance, cleaning, inspections."
derived_from:
  - ../../domain/problem.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-008: Tasks & Maintenance

## Scope

**Backend:**
- `REQ-01` Model `Task`: `organization_id` (FK), `property_id` (FK, optional), `unit_id` (FK, optional), `assigned_to_id` (FK User, optional), `title` (required), `description` (text), `status` (enum: pending/in_progress/completed), `priority` (enum: low/medium/high/urgent), `due_date` (date, optional), `category` (enum: cleaning/maintenance/inspection/other).
- `REQ-02` REST CRUD `/api/v1/tasks`. Filter by status, priority, property_id, assigned_to_id.
- `REQ-03` Backend specs.

**Frontend:**
- `REQ-04` `/tasks` — kanban board: 3 columns (pending / in_progress / completed). Cards show title, priority badge, due date, assignee.
- `REQ-05` Create/edit task via dialog.
- `REQ-06` Drag (click) to change status (move between columns).
- `REQ-07` API + store + specs.
- `REQ-08` Sidebar nav.

### Non-Scope

- `NS-01` Drag-and-drop (click-based column move for now).
- `NS-02` Recurring tasks.
- `NS-03` Checklists inside tasks.
