---
title: Apartus Architecture
doc_kind: domain
doc_function: canonical
purpose: Bounded contexts, стек, конвенции данных, обработка ошибок и границы модулей Apartus.
derived_from:
  - ../dna/governance.md
  - problem.md
status: active
audience: humans_and_agents
canonical_for:
  - apartus_tech_stack
  - module_boundaries
  - data_conventions
  - api_conventions
  - error_handling_conventions
---

# Architecture

## Stack

### Backend

- Ruby on Rails 8 (API-only)
- PostgreSQL (нативный, без Docker — см. [`../adr/ADR-008-no-docker-compose-local.md`](../adr/ADR-008-no-docker-compose-local.md))
- Pundit для authorization policies
- Встроенный Rails 8 auth + JWT (access 15m / refresh 30d) — см. [`../adr/ADR-003-rails-8-builtin-auth.md`](../adr/ADR-003-rails-8-builtin-auth.md) и [`../adr/ADR-009-jwt-access-refresh-tokens.md`](../adr/ADR-009-jwt-access-refresh-tokens.md)
- RSpec + FactoryBot + Shoulda Matchers
- Solid Queue / Solid Cache / Solid Cable (без Redis)

### Frontend

- Vue.js 3 (Composition API), **чистый JavaScript, без TypeScript** — см. [`../adr/ADR-002-no-typescript-frontend.md`](../adr/ADR-002-no-typescript-frontend.md)
- Vuetify 3 (UI kit)
- Vite (build)
- Pinia (state)
- Vue Router 4
- Axios для API клиента — см. [`../adr/ADR-006-axios-api-client.md`](../adr/ADR-006-axios-api-client.md)
- Vitest для тестов

### Repo layout

Monorepo — см. [`../adr/ADR-001-monorepo-structure.md`](../adr/ADR-001-monorepo-structure.md):

```text
apartus/
├── backend/     Rails API
├── frontend/    Vue SPA
└── memory-bank/ durable knowledge layer
```

## Module Boundaries

| Context | Owns | Must not depend on directly |
|---|---|---|
| `backend/app/controllers/api/v1` | HTTP contract, auth, routing | внутренние детали frontend |
| `backend/app/models` | доменные инварианты, валидации, associations | HTTP/view слой |
| `backend/app/policies` | авторизационные правила (Pundit) | — |
| `frontend/src/stores` (Pinia) | клиентское состояние | DOM компоненты напрямую |
| `frontend/src/views` + `components` | презентационный слой | backend internals |
| `frontend/src/services` (api) | HTTP contract с backend | — |

Правила:

- Модуль владеет своим state и публичными контрактами.
- Межмодульные зависимости проходят через явный API (REST `/api/v1` для frontend↔backend).
- Backend controllers scope всё через `Current.organization` (multi-tenant isolation invariant).

## API Conventions

- REST префикс: `/api/v1`
- Авторизация: `Authorization: Bearer <jwt_access_token>`
- Organization scoping: `X-Organization-Id: <id>` header задаёт текущую организацию на запрос
- JSON responses
- Health check: `GET /api/v1/health` → `{ status: "ok" }` (см. [`../adr/ADR-007-api-health-endpoint.md`](../adr/ADR-007-api-health-endpoint.md))

## Data Conventions

- **Money fields** — integer с суффиксом `_cents` (например `total_cents`). Никаких float/decimal/money gem. См. [`../adr/ADR-004-integer-cents-for-money.md`](../adr/ADR-004-integer-cents-for-money.md).
- **Primary keys** — стандартные bigint (см. [`../adr/ADR-005-bigint-primary-keys.md`](../adr/ADR-005-bigint-primary-keys.md)). Без UUID.
- **Enums** — Rails enums с `validate: true`, хранение как integer.
- **Timestamps** — `created_at` + `updated_at` на всех таблицах.
- **Foreign keys** — `belongs_to` с DB-level constraints.
- **Soft delete** — не используется, если не решено иначе в ADR.
- **Multi-tenant isolation** — все org-scoped ресурсы включают `organization_id` FK (за исключением Unit, который derives через Property — см. [`schema.md`](schema.md)).

## Error Handling

- Pundit violations → `Api::V1::BaseController` имеет `rescue_from Pundit::NotAuthorizedError → 403` (см. reference [`../features/FT-HW1-01-property-crud/feature.md`](../features/FT-HW1-01-property-crud/feature.md)).
- Record-not-found на чужом ресурсе → **404 без раскрытия существования**, реализуется через `find_by` + `performed?`, не через глобальный `rescue_from RecordNotFound`.
- Валидации — через `if record.save` / `if record.update`, без `rescue RecordInvalid`.
- Nested controllers (Unit под Property) — порядок: `find_property → authorize Class → find_unit`, коллизия "нет прав + чужой parent" даёт 404, не 403 (см. [`../adr/ADR-012-class-level-authorize-nested-controllers.md`](../adr/ADR-012-class-level-authorize-nested-controllers.md)).

## Concurrency

MVP пока не содержит конкурентных критических секций (календарь бронирований — следующая фаза). Когда появится double-booking prevention — завести ADR на locking pattern.

## Configuration Ownership

- Rails `config/` — canonical schema backend-конфигурации.
- Env vars — в `.env`, naming без единого префикса (текущий стиль Rails: `DATABASE_URL`, `JWT_SECRET`, и т.д.).
- Frontend config — `frontend/.env` с Vite-префиксом `VITE_*`.
- Подробности: [`../ops/config.md`](../ops/config.md).
