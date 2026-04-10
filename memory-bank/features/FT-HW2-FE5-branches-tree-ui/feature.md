---
title: "FT-HW2-FE5: Branches Tree UI"
doc_kind: feature
doc_function: canonical
purpose: "Branch CRUD с client-side tree visualization из flat API."
derived_from:
  - ../../domain/problem.md
  - ../../domain/schema.md
  - ../FT-HW1-04-branches/feature.md
  - ../FT-HW2-FE1-organization-shell/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-HW2-FE5: Branches Tree UI

## What

### Problem

Backend branch CRUD (FT-HW1-04) delivers flat list API with `parent_branch_id` adjacency. No UI exists. Managers need to see/manage org structure visually.

### Scope

- `REQ-01` **Branch tree page** (`/branches`): render flat API data as visual tree using Vuetify `v-treeview` or recursive `v-list`. Roots = items where `parent_branch_id` is null. Children nested visually.
- `REQ-02` **Create branch**: dialog with `name` (required) + optional `parent_branch_id` (v-select from existing branches). POST → 201 / 422.
- `REQ-03` **Edit branch**: dialog pre-filled. PATCH → 200 / 422. Can change parent (cycle detected → 422 shown).
- `REQ-04` **Delete branch**: confirmation. DELETE → 200 / 422 (has children or linked properties → error shown).
- `REQ-05` **Pinia branches store**: `stores/branches.js` — items (flat), loading, error, fetchAll, create, update, destroy. Computed `tree` builds nested structure client-side.
- `REQ-06` **API client**: reuse existing `api/branches.js` (already has `list()`); add `get`, `create`, `update`, `destroy`.
- `REQ-07` **Client-side tree builder**: pure function `buildTree(flatItems)` → nested `[{...branch, children: [...]}]`. Used by store computed.
- `REQ-08` **Router**: `/branches` replaces placeholder. Last nav slot.
- `REQ-09` **Tests**: store (incl. tree builder), API, tree view. Ratchet bump.

### Non-Scope

- `NS-01` Drag-and-drop tree rearrangement.
- `NS-02` Branch depth limit enforcement on frontend (backend handles cycle detection).
- `NS-03` New npm packages / TypeScript.

### Constraints

- `ASM-01` Backend branches API works. Destroy returns 422 if has children/properties.
- `CON-01` Frozen stack, Vuetify-only.
- `CON-02` Backend returns flat list, frontend builds tree. No tree endpoint.
- `DEC-01` **v-treeview vs recursive v-list.** Vuetify 3 has `v-treeview`. Use it — built-in expand/collapse, activatable, native Vuetify. If stub issues in tests → fallback to recursive list.

## How

### Solution

Flat branch list fetched once. Store computed `tree` transforms via `buildTree()` pure function. `v-treeview` renders. Create/edit via dialog with parent selector. Delete dialog handles 422 for dependents.

`buildTree(items)`: index by id → iterate, attach each to parent's children array → return roots.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `src/api/branches.js` | code | Add get/create/update/destroy (list already exists) |
| `src/stores/branches.js` | new | Pinia store with flat items + computed tree |
| `src/views/BranchTreeView.vue` | new | v-treeview + dialog CRUD |
| `src/router/index.js` | code | Replace placeholder |
| `src/__tests__/` | test | Store (incl. buildTree), API, view |
| `vitest.config.js` | config | Ratchet |

### Contracts

| ID | Endpoint | Notes |
|---|---|---|
| `CTR-01` | `GET /branches` → `[{id, organization_id, parent_branch_id, name, ...}]` | Flat |
| `CTR-02` | `POST /branches {branch: {name, parent_branch_id}}` → 201/422 | |
| `CTR-03` | `PATCH /branches/:id` → 200/422 | Cycle → 422 |
| `CTR-04` | `DELETE /branches/:id` → 200/422 | Children/properties → 422 |

### Failure Modes

- `FM-01` Cycle on edit parent → 422 → field error.
- `FM-02` Delete with children → 422 → "Удалите дочерние филиалы".
- `FM-03` Delete with linked properties → 422 → "Отвяжите объекты".

## Verify

### Acceptance Scenarios

- `SC-01` User opens `/branches` → sees tree with nested branches; 0 → empty state.
- `SC-02` User creates root branch → appears in tree root.
- `SC-03` User creates child branch (selects parent) → appears nested.
- `SC-04` User edits branch name → updated in tree.
- `SC-05` User deletes leaf branch → removed.
- `SC-06` User tries to delete branch with children → error shown.
- `SC-07` Coverage ratchet bumped.

### Negative / Edge

- `NEG-01` Edit parent to create cycle → 422 shown.
- `NEG-02` Single root branch → tree renders without collapse issues.

### Checks

| CHK | Covers | How | Evidence |
|---|---|---|---|
| `CHK-01` | SC, NEG | `yarn test` | `EVID-01` |
| `CHK-02` | simplify | review | `EVID-02` |
| `CHK-03` | ratchet | `yarn test:coverage` | `EVID-03` |
