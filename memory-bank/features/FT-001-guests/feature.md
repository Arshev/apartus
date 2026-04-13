---
title: "FT-001: Guests (Minimum CRM)"
doc_kind: feature
doc_function: canonical
purpose: "Full-stack Guest CRUD: карточка гостя, контактные данные, история (подготовка к бронированиям). Backend + Frontend."
derived_from:
  - ../../domain/problem.md
  - ../../domain/architecture.md
  - ../../domain/schema.md
  - ../../engineering/coding-style.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-001: Guests (Minimum CRM)

## What

### Problem

MVP требует связь Reservation → Guest (WF-04 в problem.md). Модели Guest нет — бронирования невозможно привязать к гостю. Это blocking dependency для FT-002-reservations.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
|---|---|---|---|---|
| `MET-01` | Guest CRUD flows (backend + frontend) | 0/4 | 4/4 | SC pass |
| `MET-02` | Coverage ratchet | 98 | `floor(actual) - 1` | vitest.config.js |

### Scope

**Backend:**

- `REQ-01` Model `Guest`: `organization_id` (FK), `first_name` (required), `last_name` (required), `email` (optional, unique per org if present), `phone` (optional), `notes` (text, optional). Multi-tenant scoped.
- `REQ-02` REST API `GET/POST/PATCH/DELETE /api/v1/guests`, `GET /api/v1/guests/:id`. Org-scoped via `Current.organization.guests`. 404 on cross-org. Pundit policy (owner/manager full, member read-only).
- `REQ-03` Migration: `create_guests` с FK, indexes, unique partial index on `[organization_id, LOWER(email)] WHERE email IS NOT NULL`.
- `REQ-04` Backend specs: request spec (happy + auth + authz + validation + cross-org), model spec, factory.

**Frontend:**

- `REQ-05` API client `api/guests.js`: list, get, create, update, destroy.
- `REQ-06` Pinia store `stores/guests.js`: items, loading, error + CRUD actions (FE2 pattern).
- `REQ-07` `GuestListView.vue` (`/guests`): `v-data-table` с name, email, phone, actions. Empty state. Delete confirmation. Search/filter by name later (NS).
- `REQ-08` `GuestFormView.vue` (`/guests/new`, `/guests/:id/edit`): route-based form. Fields: first_name, last_name, email, phone, notes.
- `REQ-09` Router: `/guests`, `/guests/new`, `/guests/:id/edit` с `requiresAuth`. Sidebar nav item.
- `REQ-10` Frontend specs: store, API, list view, form view. Coverage ratchet bump.
- `REQ-11` Validation UX: backend 422 errors mapped to form fields. Client-side: first_name + last_name required.

### Non-Scope

- `NS-01` Reservation link (FT-002).
- `NS-02` Guest history / timeline.
- `NS-03` Search / filter / pagination.
- `NS-04` Guest import (CSV).
- `NS-05` Duplicate detection beyond email uniqueness.
- `NS-06` New npm packages / TypeScript.

### Constraints / Assumptions

- `ASM-01` HW-1 backend patterns (controller, policy, spec) stable.
- `ASM-02` HW-2 frontend patterns (store, API, views) stable.
- `CON-01` Frozen stack. No new gems/packages.
- `CON-02` Vuetify-only UI.
- `CON-03` Email uniqueness per org only if email present (partial unique index).
- `DEC-01` **Route-based form** (consistent with Properties/Units pattern, not dialog — guests have 5+ fields).

## How

### Solution

Standard Rails CRUD (mirror Properties pattern) + standard Vue CRUD (mirror FE2). Guest belongs_to Organization, scoped via Current.organization.guests. Frontend consumes all 5 endpoints.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `backend/app/models/guest.rb` | new | Model |
| `backend/app/controllers/api/v1/guests_controller.rb` | new | REST CRUD |
| `backend/app/policies/guest_policy.rb` | new | Pundit |
| `backend/db/migrate/xxx_create_guests.rb` | new | Schema |
| `backend/spec/requests/api/v1/guests_spec.rb` | new | Request spec |
| `backend/spec/models/guest_spec.rb` | new | Model spec |
| `backend/spec/factories/guests.rb` | new | Factory |
| `backend/config/routes.rb` | code | Add guests resource |
| `frontend/src/api/guests.js` | new | API client |
| `frontend/src/stores/guests.js` | new | Pinia store |
| `frontend/src/views/GuestListView.vue` | new | List + delete |
| `frontend/src/views/GuestFormView.vue` | new | Create/edit form |
| `frontend/src/router/index.js` | code | Add routes |
| `frontend/src/components/AppSidebar.vue` | code | Add nav item |
| `frontend/src/__tests__/` | test | All specs |
| `frontend/vitest.config.js` | config | Ratchet |

### Contracts

| ID | Endpoint | Response | Notes |
|---|---|---|---|
| `CTR-01` | `GET /guests` | `[{id, organization_id, first_name, last_name, email, phone, notes, created_at, updated_at}]` | |
| `CTR-02` | `POST /guests {guest: {...}}` | 201 + json / 422 | |
| `CTR-03` | `GET /guests/:id` | json / 404 | |
| `CTR-04` | `PATCH /guests/:id` | 200 / 422 | |
| `CTR-05` | `DELETE /guests/:id` | 200 / 404 | |

### Failure Modes

- `FM-01` 401 → auth refresh flow.
- `FM-02` 422 → validation errors mapped to form.
- `FM-03` 404 on delete (race) → snackbar + refetch.
- `FM-04` Duplicate email per org → 422 "Email already taken".

### ADR Dependencies

None new. Uses existing patterns from ADR-001 (monorepo), ADR-002 (no TS), ADR-006 (axios), ADR-012 (class-level authorize).

## Verify

### Exit Criteria

- `EC-01` Backend: all 5 REST endpoints work, request spec green.
- `EC-02` Frontend: guest list, create, edit, delete functional.
- `EC-03` Multi-tenant: cross-org → 404.
- `EC-04` Validation: 422 errors shown on form.
- `EC-05` Tests green (backend + frontend), coverage ratchet bumped.
- `EC-06` Simplify review passed.

### Traceability matrix

| REQ | Acceptance | Checks |
|---|---|---|
| `REQ-01`..`REQ-04` | `SC-01`..`SC-04`, `EC-01`, `EC-03` | `CHK-01` |
| `REQ-05`..`REQ-11` | `SC-01`..`SC-04`, `EC-02`, `EC-04` | `CHK-02`, `CHK-03` |

### Acceptance Scenarios

- `SC-01` User opens `/guests` → sees guest table; 0 → empty state with add button.
- `SC-02` User creates guest (first_name, last_name, email, phone) → appears in list + snackbar.
- `SC-03` User edits guest → updated in list.
- `SC-04` User deletes guest → confirmation → removed.
- `SC-05` User creates guest with duplicate email in same org → 422 error shown.
- `SC-06` Backend: cross-org guest request → 404.
- `SC-07` Coverage ratchet bumped.

### Negative / Edge

- `NEG-01` Empty first_name → client validation error.
- `NEG-02` Email optional — blank email allowed, no uniqueness conflict.
- `NEG-03` Delete already-deleted → 404 → snackbar.

### Checks

| CHK | Covers | How |
|---|---|---|
| `CHK-01` | EC-01, EC-03, SC-06 | `cd backend && bundle exec rspec spec/requests/api/v1/guests_spec.rb` |
| `CHK-02` | EC-02, EC-04, SC-01..SC-05 | `cd frontend && yarn test` |
| `CHK-03` | EC-05, SC-07 | `cd frontend && yarn test:coverage` |
| `CHK-04` | EC-06 | Simplify review |
