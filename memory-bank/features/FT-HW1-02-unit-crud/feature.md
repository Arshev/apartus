---
title: "FT-HW1-02: Unit CRUD"
doc_kind: feature
doc_function: canonical
purpose: Backend nested CRUD для Unit под Property с multi-tenant isolation.
derived_from:
  - ../FT-HW1-01-property-crud/feature.md
  - ../../adr/ADR-012-class-level-authorize-nested-controllers.md
status: archived
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-HW1-02: Unit CRUD

## What

### Problem

Property владеет Unit-ами (room/apartment/bed/studio). Нужен nested CRUD API, повторяющий F1 паттерны с поправкой на nested resource и class-level authorization.

### Scope

- `REQ-01` `POST/GET/PATCH/DELETE /api/v1/properties/:property_id/units`.
- `REQ-02` `organization_id` не хранится на Unit — derived через `unit.property.organization_id`.
- `REQ-03` Поля: `name`, `unit_type`, `capacity` (1..100), `status`.
- `REQ-04` `UnitPolicy` class-level, record-level isolation через scope контроллера.
- `REQ-05` Collision "чужой property_id + нет прав" → 404, не 403 (инвариант не раскрытия).

### Non-Scope

- `NS-01` Frontend UI (HW-2 FE3).
- `NS-02` Unit photos.
- `NS-03` Amenities — отдельная фича FT-HW1-03.

### Constraints

- `CON-01` Следовать F1 паттерну, но с class-level `authorize Unit`.
- `CON-02` Order: `find_property → authorize Unit → find_unit` (см. ADR-012).

## How

### Solution

Nested controller `Api::V1::UnitsController`, scope через `property.units.find_by(id: ...)`. `UnitPolicy` не обращается к `record`.

### Change Surface

| Surface | Why |
|---|---|
| `backend/app/models/unit.rb` | Новая модель |
| `backend/app/controllers/api/v1/units_controller.rb` | Nested REST CRUD |
| `backend/app/policies/unit_policy.rb` | Class-level Pundit rules |
| `backend/db/migrate/..._create_units.rb` | Schema |
| `backend/spec/requests/api/v1/units_spec.rb` | Request spec |
| `backend/config/routes.rb` | Nested route |

## Verify

### Exit Criteria

- `EC-01` 5 REST endpoints работают как nested.
- `EC-02` Cross-org чужой property_id → 404.
- `EC-03` AC4 collision: чужой property_id + unauthorized → 404, не 403.

### Acceptance Scenarios

- `SC-01` Owner создаёт Unit в своём Property → 201.
- `SC-02` Member чужой организации → 404.
- `SC-03` Unauthorized role на своём Property → 403.
- `SC-04` Чужой property_id + unauthorized role → 404 (AC4 collision).

### Checks

| Check ID | Covers | How | Expected |
|---|---|---|---|
| `CHK-01` | все EC/SC | `bundle exec rspec spec/requests/api/v1/units_spec.rb` | Green |

### Evidence

- `EVID-01` RSpec green, [`backend/spec/requests/api/v1/units_spec.rb`](../../../backend/spec/requests/api/v1/units_spec.rb).

## Historical Source

`homeworks/hw-1/features/02-unit-crud/`.
