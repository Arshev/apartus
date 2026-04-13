---
title: "FT-002: Reservations"
doc_kind: feature
doc_function: canonical
purpose: "Full-stack Reservation CRUD: бронирования юнитов, check-in/check-out, блокировка дат, связь с Guest. Backend + Frontend."
derived_from:
  - ../../domain/problem.md
  - ../../domain/architecture.md
  - ../../domain/schema.md
  - ../FT-001-guests/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-002: Reservations

## What

### Problem

MVP core workflow WF-02: ручное создание бронирований, визуальный календарь, статусы, check-in/check-out, блокировка дат. Без этого Apartus — каталог объектов, не PMS.

### Scope

**Backend:**

- `REQ-01` Model `Reservation`: `unit_id` (FK), `guest_id` (FK, optional — блокировки без гостя), `check_in` (date, required), `check_out` (date, required, > check_in), `status` (enum: confirmed/checked_in/checked_out/cancelled), `guests_count` (integer, ≥1), `total_price_cents` (integer, ≥0, default 0), `notes` (text, optional). Multi-tenant через unit.property.organization.
- `REQ-02` **Date overlap validation**: два confirmed/checked_in бронирования одного unit не могут пересекаться по датам. Cancelled — не блокируют. Custom validation + DB exclusion constraint.
- `REQ-03` REST API `CRUD /api/v1/reservations`. Org-scoped: `Current.organization.units.joins(:property)` → reservations. Query params: `unit_id` (filter by unit), `from`/`to` (date range filter для календаря). 404 cross-org.
- `REQ-04` **Status transitions**: confirmed → checked_in → checked_out; confirmed → cancelled; checked_in → cancelled (early departure). `PATCH /api/v1/reservations/:id/check_in`, `PATCH .../check_out`, `PATCH .../cancel` — dedicated endpoints.
- `REQ-05` Backend specs: request spec, model spec (overlap validation, status transitions), factory.

**Frontend:**

- `REQ-06` API client `api/reservations.js`: list (with filters), get, create, update, destroy, checkIn, checkOut, cancel.
- `REQ-07` Pinia store `stores/reservations.js`.
- `REQ-08` `ReservationListView.vue` (`/reservations`): table с unit name, guest name, check_in/out, status, price, actions. Filter by status. Status badges с цветами.
- `REQ-09` `ReservationFormView.vue` (`/reservations/new`, `/reservations/:id/edit`): форма с unit selector (v-select из всех units org), guest selector (v-select из guests), date pickers, guests_count, total_price, notes. Unit selector группирован по property.
- `REQ-10` **Status actions**: кнопки Check-in / Check-out / Cancel на list и form. Цветовые badges: confirmed=blue, checked_in=green, checked_out=grey, cancelled=red.
- `REQ-11` Router + sidebar nav.
- `REQ-12` Frontend specs + ratchet bump.

### Non-Scope

- `NS-01` Visual calendar view (day/week/month grid) — post-MVP, FT-002 использует table view.
- `NS-02` Pricing calculation (FT-003) — total_price_cents вводится вручную.
- `NS-03` Availability check widget для гостей.
- `NS-04` Recurring reservations.
- `NS-05` Notifications / email при статусе.
- `NS-06` New packages / TypeScript.

### Constraints

- `ASM-01` Guest model (FT-001) exists.
- `ASM-02` Units nested under Properties, org-scoped.
- `CON-01` Frozen stack.
- `CON-02` Money fields — integer cents (ADR-004). `total_price_cents` → отображается как рубли с копейками.
- `CON-03` Date overlap — DB-level exclusion constraint + model validation.
- `DEC-01` **Table view, not calendar grid** — calendar grid (NS-01) оставлен на post-MVP. Table достаточна для ручного управления на MVP.
- `DEC-02` **Flat /reservations route** (не nested под units) — бронирования просматриваются по организации целиком, с фильтром по unit.

## How

### Solution

Reservation belongs_to Unit + optional Guest. Org-scoped через join units → properties → organization. Date overlap prevented by model validation + DB exclusion constraint (daterange && operator). Status machine via dedicated action endpoints. Frontend: table list with status filters + route-based form with unit/guest selectors.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `backend/db/migrate/xxx_create_reservations.rb` | new | Schema + exclusion constraint |
| `backend/app/models/reservation.rb` | new | Model + validations + overlap |
| `backend/app/controllers/api/v1/reservations_controller.rb` | new | CRUD + status actions |
| `backend/app/policies/reservation_policy.rb` | new | Pundit |
| `backend/config/routes.rb` | code | reservations resource + member routes |
| `backend/spec/` | new | Request + model specs, factory |
| `backend/db/seeds.rb` | code | Demo reservations |
| `frontend/src/api/reservations.js` | new | API client |
| `frontend/src/stores/reservations.js` | new | Pinia store |
| `frontend/src/views/ReservationListView.vue` | new | Table + status actions |
| `frontend/src/views/ReservationFormView.vue` | new | Create/edit form |
| `frontend/src/router/index.js` | code | Routes |
| `frontend/src/components/AppSidebar.vue` | code | Nav item |
| `frontend/src/__tests__/` | test | Specs |

### Contracts

| ID | Endpoint | Notes |
|---|---|---|
| `CTR-01` | `GET /reservations?unit_id=&from=&to=&status=` | Filtered list. Response: `[{id, unit_id, unit_name, property_name, guest_id, guest_name, check_in, check_out, status, guests_count, total_price_cents, notes, created_at}]` |
| `CTR-02` | `POST /reservations {reservation: {unit_id, guest_id, check_in, check_out, guests_count, total_price_cents, notes}}` | 201/422 |
| `CTR-03` | `PATCH /reservations/:id` | 200/422 |
| `CTR-04` | `DELETE /reservations/:id` | 200/404 |
| `CTR-05` | `PATCH /reservations/:id/check_in` | 200/422 (wrong status) |
| `CTR-06` | `PATCH /reservations/:id/check_out` | 200/422 |
| `CTR-07` | `PATCH /reservations/:id/cancel` | 200/422 |

### Failure Modes

- `FM-01` Date overlap → 422 "Даты пересекаются с другим бронированием".
- `FM-02` Invalid status transition → 422 "Невозможный переход статуса".
- `FM-03` check_out ≤ check_in → 422.
- `FM-04` Unit/Guest not found in org → 404.

## Verify

### Acceptance Scenarios

- `SC-01` User creates reservation: selects unit, guest, dates, price → appears in list.
- `SC-02` User clicks Check-in on confirmed reservation → status changes to checked_in (green badge).
- `SC-03` User clicks Check-out → checked_out (grey).
- `SC-04` User cancels reservation → cancelled (red).
- `SC-05` User tries to create overlapping reservation → 422 error shown.
- `SC-06` User edits reservation dates/guest/price.
- `SC-07` User deletes reservation.
- `SC-08` Reservation without guest (date block) — guest_id null.

### Checks

| CHK | How |
|---|---|
| `CHK-01` | `bundle exec rspec spec/requests/api/v1/reservations_spec.rb` |
| `CHK-02` | `cd frontend && yarn test` |
| `CHK-03` | `cd frontend && yarn test:coverage` |
