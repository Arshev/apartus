---
title: "FT-HW2-FE4: Amenities Catalog UI"
doc_kind: feature
doc_function: canonical
purpose: "Standalone amenities CRUD page + attach/detach amenities to units."
derived_from:
  - ../../domain/problem.md
  - ../../domain/schema.md
  - ../FT-HW1-03-amenities/feature.md
  - ../FT-HW2-FE1-organization-shell/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-HW2-FE4: Amenities Catalog UI

## What

### Problem

Backend amenities CRUD + attach/detach (FT-HW1-03) done. No UI exists.

### Scope

- `REQ-01` **Amenities list page** (`/amenities`): table with Name, Actions. CRUD inline or route-based.
- `REQ-02` **Create amenity**: form/dialog with `name` (required, unique per org). POST → 201 / 422.
- `REQ-03` **Edit amenity**: inline edit or route. PATCH → 200 / 422.
- `REQ-04` **Delete amenity**: confirmation dialog. DELETE → 200 / 409 (has attachments). 409 → error message "Удалите привязки к помещениям".
- `REQ-05` **Attach/detach on unit form**: in UnitFormView/UnitListView, amenity chips selector. `POST /units/:uid/amenities/:id` to attach, `DELETE` to detach. Read-only display in unit list (amenity count or chip list).
- `REQ-06` **Pinia amenities store**: `stores/amenities.js` — items, loading, error, fetchAll, create, update, destroy.
- `REQ-07` **API clients**: `api/amenities.js` (CRUD), `api/unitAmenities.js` (attach/detach).
- `REQ-08` **Router**: `/amenities` replaces placeholder. List page under shell.
- `REQ-09` **Tests**: store, API, list/form, attach/detach. Ratchet bump.

### Non-Scope

- `NS-01` Amenity categories/tags — post-MVP.
- `NS-02` Bulk attach.
- `NS-03` New npm packages / TypeScript.

### Constraints

- `ASM-01` Backend APIs work with demo seed.
- `CON-01` Frozen stack, Vuetify-only.
- `CON-02` Destroy with attachments → 409, not cascade. UI must show clear message.
- `DEC-01` **Dialog-based CRUD for amenities** — amenity has only `name`, route-based form is overkill. Create/edit via `v-dialog` inline on list page. Consistent with "simplicity first" pattern.

## How

### Solution

Amenities list with inline dialog CRUD (single page). Delete blocked on 409 with message. UnitFormView extended with amenity multi-select chips: on mount fetch org amenities + unit's current amenities; toggle chip → attach/detach API call.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `src/api/amenities.js` | new | CRUD wrapper |
| `src/api/unitAmenities.js` | new | attach/detach wrapper |
| `src/stores/amenities.js` | new | Pinia store |
| `src/views/AmenityListView.vue` | new | Table + dialog CRUD |
| `src/views/UnitFormView.vue` | code | Add amenity chips selector |
| `src/router/index.js` | code | Replace placeholder |
| `src/__tests__/` | test | Specs |
| `vitest.config.js` | config | Ratchet |

### Contracts

| ID | Endpoint | Notes |
|---|---|---|
| `CTR-01` | `GET /amenities` → `[{id, organization_id, name, ...}]` | |
| `CTR-02` | `POST /amenities {amenity: {name}}` → 201/422 | |
| `CTR-03` | `PATCH /amenities/:id` → 200/422 | |
| `CTR-04` | `DELETE /amenities/:id` → 200/409 | 409 = has attachments |
| `CTR-05` | `POST /units/:uid/amenities/:id` → 201 | attach |
| `CTR-06` | `DELETE /units/:uid/amenities/:id` → 204 | detach |

### Failure Modes

- `FM-01` 409 on delete → "Удалите привязки к помещениям перед удалением".
- `FM-02` 422 on create (duplicate name) → field error.
- `FM-03` Attach/detach fail → snackbar error, chips revert.

## Verify

### Acceptance Scenarios

- `SC-01` User opens `/amenities` → sees amenity list; 0 → empty state.
- `SC-02` User creates amenity via dialog → appears in list + snackbar.
- `SC-03` User edits amenity name → updated.
- `SC-04` User deletes amenity with no attachments → removed.
- `SC-05` User tries to delete amenity with attachments → 409 error shown.
- `SC-06` User on unit form toggles amenity chip → attach/detach API called.
- `SC-07` Coverage ratchet bumped.

### Negative / Edge

- `NEG-01` Duplicate name → 422 shown.
- `NEG-02` Attach already-attached → idempotent or error handled.

### Checks

| CHK | Covers | How | Evidence |
|---|---|---|---|
| `CHK-01` | SC, NEG | `yarn test` | `EVID-01` |
| `CHK-02` | simplify | review | `EVID-02` |
| `CHK-03` | ratchet | `yarn test:coverage` | `EVID-03` |
