---
title: "FT-HW2-FE3: Units UI"
doc_kind: feature
doc_function: canonical
purpose: "Unit list/form под Property. Nested CRUD UI с amenity chips (read-only, FE4 полноценное)."
derived_from:
  - ../../domain/problem.md
  - ../../domain/schema.md
  - ../FT-HW1-02-unit-crud/feature.md
  - ../FT-HW2-FE1-organization-shell/feature.md
  - ../FT-HW2-FE2-properties-ui/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-HW2-FE3: Units UI

## What

### Problem

Backend Unit CRUD (FT-HW1-02) реализован: 5 nested REST endpoints под `/api/v1/properties/:property_id/units`. На frontend нет UI для управления юнитами — менеджеры УК не видят помещений в объектах.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
|---|---|---|---|---|
| `MET-01` | Coverage ratchet | 51 | `floor(actual) - 1` | `vitest.config.js` |
| `MET-02` | Unit CRUD flows | 0/4 | 4/4 | SC pass |

### Scope

- `REQ-01` **Unit list** на странице property (`/properties/:propertyId/units`): `v-data-table` с Name, Type, Capacity, Status, Actions. Данные из `GET /api/v1/properties/:propertyId/units`. Empty state «Нет помещений» + кнопка добавить.
- `REQ-02` **Create unit**: route `/properties/:propertyId/units/new`. Форма: `name` (required), `unit_type` (v-select: room/apartment/bed/studio), `capacity` (v-text-field number, 1..100, required), `status` (v-select: available/maintenance/blocked). Submit → `POST`. Success → redirect list + snackbar.
- `REQ-03` **Edit unit**: route `/properties/:propertyId/units/:id/edit`. Pre-filled form. Submit → `PATCH`. Redirect + snackbar.
- `REQ-04` **Delete unit**: confirmation dialog → `DELETE`. Delete returns 204. Remove from list + snackbar.
- `REQ-05` **Pinia units store**: `stores/units.js` — `items`, `loading`, `error`, `propertyId`, `fetchAll(propertyId)`, `create`, `update`, `destroy`. Store re-fetches when `propertyId` changes.
- `REQ-06` **API client**: `api/units.js` — list, get, create, update, destroy, all nested under `/properties/:propertyId/units`.
- `REQ-07` **Router**: `/properties/:propertyId/units` (list), `/properties/:propertyId/units/new`, `/properties/:propertyId/units/:id/edit`. Все `requiresAuth`.
- `REQ-08` **Property context**: Unit list page показывает property name в breadcrumb/title. Data из properties store или inline fetch `GET /api/v1/properties/:propertyId`.
- `REQ-09` **Navigation from property list**: action icon или row click на property → navigate to units list. Back link в units list → `/properties`.
- `REQ-10` **Тесты**: store, API, list view, form view. Coverage ratchet bump.
- `REQ-11` **Validation UX**: 422 errors маппятся. Client-side: name required, capacity 1..100.

### Non-Scope

- `NS-01` Amenity attach/detach UI — FE4. Units list может показывать amenity count read-only.
- `NS-02` Branches UI — FE5.
- `NS-03` Bulk operations.
- `NS-04` Фильтрация/пагинация.
- `NS-05` Новые npm пакеты.
- `NS-06` TypeScript.

### Constraints / Assumptions

- `ASM-01` Properties API + Units API работают с demo seed.
- `ASM-02` FE2 properties store stable.
- `CON-01` Frozen stack.
- `CON-02` Vuetify-only.
- `CON-03` Unit endpoints nested: `/properties/:property_id/units[/:id]`. `property_id` — route param, не body.

## How

### Solution

Nested CRUD UI по FE2 паттерну. Units store scoped по `propertyId` — при навигации к другому property refetch. API client принимает `propertyId` первым аргументом. Три route-based views (list/new/edit). Delete inline dialog.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `src/api/units.js` | new | Nested axios CRUD wrapper |
| `src/stores/units.js` | new | Pinia store scoped to propertyId |
| `src/views/UnitListView.vue` | new | Table + empty state + delete dialog |
| `src/views/UnitFormView.vue` | new | Create/edit form |
| `src/router/index.js` | code | Add unit routes |
| `src/views/PropertyListView.vue` | code | Add "units" action link per row |
| `src/__tests__/` | test | Store, API, views specs |
| `vitest.config.js` | config | Ratchet bump |

### Contracts

| ID | Input / Output | Notes |
|---|---|---|
| `CTR-01` | `GET /properties/:pid/units` → `[{id, property_id, name, unit_type, capacity, status, ...}]` | |
| `CTR-02` | `POST /properties/:pid/units` body `{unit: {name, unit_type, capacity, status}}` → 201/422 | |
| `CTR-03` | `PATCH /properties/:pid/units/:id` → 200/422 | |
| `CTR-04` | `DELETE /properties/:pid/units/:id` → 204/404 | |

### Failure Modes

- `FM-01` 401 → auth refresh flow (existing).
- `FM-02` 422 → error mapped to form fields.
- `FM-03` 404 on delete (race) → snackbar + refetch.
- `FM-04` Property not found (bad propertyId) → redirect to `/properties` with error.

## Verify

### Exit Criteria

- `EC-01` Unit list renders under property context.
- `EC-02` Create/edit/delete work end-to-end.
- `EC-03` Validation errors display.
- `EC-04` Tests green, ratchet bumped.
- `EC-05` Simplify review passed.

### Traceability matrix

| REQ | Acceptance refs | Checks |
|---|---|---|
| `REQ-01` | `SC-01`, `EC-01` | `CHK-01` |
| `REQ-02` | `SC-02`, `EC-02` | `CHK-01` |
| `REQ-03` | `SC-03`, `EC-02` | `CHK-01` |
| `REQ-04` | `SC-04`, `EC-02` | `CHK-01` |
| `REQ-05`..`REQ-09` | `SC-01`..`SC-04` | `CHK-01` |
| `REQ-10` | `EC-04`, `SC-06` | `CHK-01`, `CHK-03` |
| `REQ-11` | `EC-03`, `SC-05` | `CHK-01` |

### Acceptance Scenarios

- `SC-01` User navigates to property → clicks "Units" → sees unit table; 0 units → empty state.
- `SC-02` User creates unit with name/type/capacity/status → appears in list + snackbar.
- `SC-03` User edits unit → updated in list + snackbar.
- `SC-04` User deletes unit → confirmation → removed + snackbar.
- `SC-05` User submits empty name → client validation error.
- `SC-06` Coverage ratchet bumped in `vitest.config.js`.

### Negative / Edge

- `NEG-01` Network error on list fetch → error alert + retry.
- `NEG-02` Delete already-deleted unit → 404 → snackbar + refetch.
- `NEG-03` Navigate to units of non-existent property → redirect `/properties`.

### Checks

| CHK | Covers | How | Evidence |
|---|---|---|---|
| `CHK-01` | SC, NEG | `yarn test` | `EVID-01` |
| `CHK-02` | EC-05 | Simplify review | `EVID-02` |
| `CHK-03` | EC-04 | `yarn test:coverage` | `EVID-03` |

### Evidence

- `EVID-01` Vitest log.
- `EVID-02` Simplify notes.
- `EVID-03` Coverage summary.
