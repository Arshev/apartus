---
title: "FT-HW1-01: Property CRUD (Reference Implementation)"
doc_kind: feature
doc_function: canonical
purpose: Backend CRUD для Property с multi-tenant isolation. Эталонная имплементация паттернов для F2–F5.
derived_from:
  - ../../domain/problem.md
  - ../../domain/architecture.md
status: archived
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-HW1-01: Property CRUD

## What

### Problem

Для MVP Apartus нужна базовая иерархия Organization → Property → Unit. Эта фича закрывает уровень Property: CRUD endpoints с multi-tenant scoping и Pundit-авторизацией. Дополнительно — reference implementation для F2–F5 (Unit, Amenity, Branch, Property↔Branch).

### Scope

- `REQ-01` `POST/GET/PATCH/DELETE /api/v1/properties` и `GET /api/v1/properties/:id`.
- `REQ-02` Все запросы scoped через `Current.organization.properties`.
- `REQ-03` Поля: `name`, `address`, `property_type` (enum: apartment/hotel/house/hostel), `description` (optional, ≤5000).
- `REQ-04` Pundit policy `PropertyPolicy` с правилами по ролям (owner/manager/member).
- `REQ-05` Multi-tenant isolation: чужой `id` → 404, не 403.
- `REQ-06` Reference patterns зафиксированы для переиспользования (controller structure, error handling, spec shape, factory).

### Non-Scope

- `NS-01` Frontend UI (отложено до HW-2 FE2).
- `NS-02` Property photos (Active Storage) — позднее.
- `NS-03` Branch link (реализовано отдельно в FT-HW1-05).
- `NS-04` Фильтрация и поиск — позднее.

### Constraints

- `CON-01` Без service objects, стандартный Rails MVC.
- `CON-02` `organization_id` не permitted в params — задаётся через scope.
- `CON-03` Money fields отсутствуют в Property (нет `_cents`).

## How

### Solution

Стандартный Rails REST controller под `Api::V1::PropertiesController`, scoping через `Current.organization.properties`, `find_by(id: ...)` + `performed?` guards для 404, Pundit class-level и record-level authorize.

### Change Surface

| Surface | Why |
|---|---|
| `backend/app/models/property.rb` | Новая модель |
| `backend/app/controllers/api/v1/properties_controller.rb` | REST CRUD |
| `backend/app/policies/property_policy.rb` | Pundit rules |
| `backend/db/migrate/20260408155056_create_properties.rb` | Schema |
| `backend/spec/requests/api/v1/properties_spec.rb` | Request spec |
| `backend/spec/factories/properties.rb` | Factory |

### Flow

1. Request приходит с `Authorization` + `X-Organization-Id`.
2. `authenticate_user!` + `set_current_organization` заполняют `Current`.
3. Controller scope-ит через `Current.organization.properties`.
4. `find_by(id:)` + `performed?`; `authorize` через Pundit.
5. `if record.save/update` без rescue.

## Verify

### Exit Criteria

- `EC-01` Все 5 REST endpoints работают.
- `EC-02` Cross-org запрос даёт 404.
- `EC-03` Unauthorized role даёт 403.
- `EC-04` RSpec request spec покрывает happy path + auth + authz + validation + cross-org.

### Acceptance Scenarios

- `SC-01` Owner создаёт Property в своей организации → 201 + JSON.
- `SC-02` Member из другой организации запрашивает чужой id → 404.
- `SC-03` Member без permission пытается DELETE → 403.
- `SC-04` Invalid `property_type` → 422 с validation errors.

### Checks

| Check ID | Covers | How to check | Expected |
|---|---|---|---|
| `CHK-01` | EC-01..04, SC-01..04 | `bundle exec rspec spec/requests/api/v1/properties_spec.rb` | All green |

### Evidence

- `EVID-01` RSpec output: [`backend/spec/requests/api/v1/properties_spec.rb`](../../../backend/spec/requests/api/v1/properties_spec.rb) зелёный в CI.

## Historical Source

Оригинальные HW-1 артефакты (Brief/Spec/Plan) сохранены в `homeworks/hw-1/features/01-property-crud/`. Эта feature.md — migration snapshot с момента архивации (2026-04-09), canonical owner — именно этот файл.
