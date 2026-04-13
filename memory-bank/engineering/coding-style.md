---
title: Apartus Coding Style
doc_kind: engineering
doc_function: convention
purpose: Конвенции кода Apartus для backend (Ruby/Rails) и frontend (Vue 3 / JS), включая reference implementations.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Coding Style

## Language

- **Chat / комментарии / обсуждения с пользователем** — русский.
- **Код, комментарии в коде, имена переменных, commit messages** — английский.
- **UI копии** — русский (основной), английский как вторичный (планируется).

## Tooling

- **Backend:** `rubocop-rails-omakase` (встроен в Rails 8), `rubocop` стандартный.
- **Frontend:** ESLint + Prettier (если сконфигурены), Vue 3 official style guide.
- Pre-commit hooks опциональны, но локально запускать `bundle exec rubocop` / `yarn lint` до коммита.

## General Rules

- Предпочитай минимальную локальную сложность premature абстракциям.
- Комментарии только там, где нужен "why" или boundary condition. Не описывай "что" — код сам говорит.
- Не переписывай несвязанный код только ради единообразия. Не делай drive-by refactors.
- При touch-up — следуй существующему локальному стилю файла.

## Backend (Ruby / Rails 8)

### Structure

- Standard Rails MVC, без service objects (пока не требуется).
- REST API контроллеры под `app/controllers/api/v1/`.
- Pundit policies в `app/policies/`.
- FactoryBot factories в `spec/factories/`.

### Conventions

- **Scoping через `Current.organization`** во всех org-scoped контроллерах. Не загружать ресурс без scope.
- **404 на чужой `id`** — через `find_by` + `performed?`, не через глобальный `rescue_from RecordNotFound`.
- **Валидации** — `if record.save` / `if record.update`, не `rescue RecordInvalid`.
- **Pundit NotAuthorizedError → 403** — через `rescue_from` в `Api::V1::BaseController`.
- **organization_id не permitted** в `permitted_params` — задаётся через scope.
- **Money fields** — integer, суффикс `_cents` (см. [`../adr/ADR-004-integer-cents-for-money.md`](../adr/ADR-004-integer-cents-for-money.md)).
- **Enums** — Rails enums c `validate: true`, integer storage.

### Nested controllers pattern

Для nested ресурсов (Unit под Property) порядок: `find_parent → authorize Class → find_nested`. Инвариант "не раскрывать существование" сильнее точности ответа. Подробности: [`../adr/ADR-012-class-level-authorize-nested-controllers.md`](../adr/ADR-012-class-level-authorize-nested-controllers.md).

### Reference Implementations (HW-1)

Эталонные паттерны для новых фич той же формы. **F1 — reference для F2–F5 CRUD.**

- **CRUD controller:** [`backend/app/controllers/api/v1/properties_controller.rb`](../../backend/app/controllers/api/v1/properties_controller.rb)
- **Pundit policy:** [`backend/app/policies/property_policy.rb`](../../backend/app/policies/property_policy.rb)
- **Request spec:** [`backend/spec/requests/api/v1/properties_spec.rb`](../../backend/spec/requests/api/v1/properties_spec.rb)
- **Factory:** [`backend/spec/factories/properties.rb`](../../backend/spec/factories/properties.rb)
- **Migration:** [`backend/db/migrate/20260408155056_create_properties.rb`](../../backend/db/migrate/20260408155056_create_properties.rb)

Canonical feature package: [`../features/FT-HW1-01-property-crud/feature.md`](../features/FT-HW1-01-property-crud/feature.md).

## Frontend (Vue 3 / JavaScript)

### Frontend Structure

- `<script setup>` Composition API.
- Pinia для shared state, не props drilling.
- Vuetify 3 компоненты как базовый UI kit.
- API клиенты — в `src/services/api/`, axios с interceptors.

### Frontend Conventions

- **No TypeScript** — см. [`../adr/ADR-002-no-typescript-frontend.md`](../adr/ADR-002-no-typescript-frontend.md).
- **Composition API** — canonical стиль; Options API только для унаследованного кода.
- **JSDoc** опционально для публичных функций/composables.
- **Файлы компонентов** — PascalCase (`PropertyList.vue`), composables — `useFoo.js`.
- **Store** — `defineStore('name', () => { ... })` setup style.
- **Routes** — meta `{ requiresAuth: true }` защищается guards.

### Full-Stack Delivery Rule

Каждый новый backend endpoint сопровождается frontend surface'ом в том же feature:

1. **API client** (`src/api/<resource>.js`) — thin axios wrapper
2. **Pinia store** (`src/stores/<resource>.js`) — items/loading/error + CRUD actions
3. **View** (`src/views/<Resource>*.vue`) — list + form + delete
4. **Router** — route с `meta.requiresAuth`
5. **Tests** — store spec + API spec + view spec

Backend-only delivery допустим только как промежуточный шаг внутри одной feature с явным `STEP-*` для frontend в `implementation-plan.md`. Закрытие feature без UI — gap, требующий `DEC-*` или `NS-*` с deadline.

### Reference Implementations (Frontend, HW-2)

- **Shell / layout:** [`frontend/src/views/DashboardView.vue`](../../frontend/src/views/DashboardView.vue), [`frontend/src/layouts/DefaultLayout.vue`](../../frontend/src/layouts/DefaultLayout.vue)
- **CRUD store:** [`frontend/src/stores/properties.js`](../../frontend/src/stores/properties.js)
- **API client:** [`frontend/src/api/properties.js`](../../frontend/src/api/properties.js)
- **List + delete:** [`frontend/src/views/PropertyListView.vue`](../../frontend/src/views/PropertyListView.vue)
- **Route-based form:** [`frontend/src/views/PropertyFormView.vue`](../../frontend/src/views/PropertyFormView.vue)
- **Dialog CRUD:** [`frontend/src/views/AmenityListView.vue`](../../frontend/src/views/AmenityListView.vue)
- **Nested CRUD:** [`frontend/src/views/UnitListView.vue`](../../frontend/src/views/UnitListView.vue) (scoped to property)
- **Client-side tree:** [`frontend/src/stores/branches.js`](../../frontend/src/stores/branches.js) (`buildTree`)
- **Test helper:** [`frontend/src/__tests__/helpers/mountWithVuetify.js`](../../frontend/src/__tests__/helpers/mountWithVuetify.js)

## SQL / Migrations

- **Не трогать существующие миграции** — см. [`autonomy-boundaries.md`](autonomy-boundaries.md).
- Новые миграции — idempotent где возможно, с явными `null: false`, `default:`, `foreign_key: true`.
- Partial unique indexes через `where:` clause (см. Branch).

## Constraints

- Не добавлять новые gems / npm пакеты без явного согласования с пользователем.
- Не реализовывать auth — он уже есть в hw-0.
- Не добавлять TypeScript на frontend.
- Не менять monorepo структуру.
- Не делать drive-by cleanups.
