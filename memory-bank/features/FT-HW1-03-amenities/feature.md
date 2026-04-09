---
title: "FT-HW1-03: Amenities (M:N)"
doc_kind: feature
doc_function: canonical
purpose: Catalog Amenity per organization + M:N attach/detach к Unit через has_many :through.
derived_from:
  - ../FT-HW1-01-property-crud/feature.md
  - ../../adr/ADR-013-has-many-through-m2n.md
status: archived
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-HW1-03: Amenities

## What

### Problem

Unit может иметь набор удобств (WiFi, kitchen и т.д.). Каталог per-organization, M:N связь к Unit. Паттерн `has_many :through` становится canonical для всех будущих M:N.

### Scope

- `REQ-01` `POST/GET/PATCH/DELETE /api/v1/amenities` — flat catalog CRUD per organization.
- `REQ-02` `POST/DELETE /api/v1/units/:unit_id/amenities/:id` — attach/detach.
- `REQ-03` Uniqueness: case-insensitive per organization.
- `REQ-04` `Amenity#before_destroy` блокирует удаление, если есть unit_amenities → 409 с сообщением.
- `REQ-05` DB-level `ON DELETE RESTRICT` на `amenity_id` как второй рубеж.
- `REQ-06` `UnitAmenity` — явная join-модель.

### Non-Scope

- `NS-01` Frontend UI (HW-2 FE4).
- `NS-02` Категории/иконки/описания amenities (отложено до реального product feedback).
- `NS-03` Global (system) catalog — только per-org.

### Constraints

- `CON-01` `has_many :through`, не HABTM (ADR-013).
- `CON-02` `organization_id` immutable после create.

## How

### Solution

`Amenity` модель, `UnitAmenity` join, `AmenitiesController` (flat), nested attach/detach в `UnitAmenitiesController`.

### Change Surface

| Surface | Why |
|---|---|
| `backend/app/models/amenity.rb` | Model + before_destroy |
| `backend/app/models/unit_amenity.rb` | Join model |
| `backend/app/models/unit.rb` | `has_many :amenities through: :unit_amenities` |
| `backend/app/controllers/api/v1/amenities_controller.rb` | Flat CRUD |
| `backend/app/controllers/api/v1/unit_amenities_controller.rb` | Attach/detach |
| Migrations + specs + factories | — |

## Verify

### Exit Criteria

- `EC-01` Flat CRUD работает per organization.
- `EC-02` Attach/detach работает, uniqueness enforced.
- `EC-03` Удаление Amenity с активным usage → 409 с сообщением "amenity in use".
- `EC-04` Case-insensitive uniqueness per org.

### Acceptance Scenarios

- `SC-01` Owner создаёт Amenity "WiFi" → 201.
- `SC-02` Попытка создать "wifi" в той же org → 422 (uniqueness).
- `SC-03` Attach amenity к unit → 201; повторный attach → 422.
- `SC-04` Destroy amenity with attached units → 409.
- `NEG-01` Cross-org attach (чужой amenity_id) → 404.

### Checks

| Check ID | Covers | How | Expected |
|---|---|---|---|
| `CHK-01` | все EC/SC/NEG | `bundle exec rspec spec/requests/api/v1/amenities_spec.rb spec/requests/api/v1/unit_amenities_spec.rb spec/models/amenity_spec.rb` | Green |

### Evidence

- `EVID-01` RSpec green в CI.

## Historical Source

`homeworks/hw-1/features/03-amenities/`.
