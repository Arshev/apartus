---
title: "FT-HW2-FE2: Properties UI"
doc_kind: feature
doc_function: canonical
purpose: "Property list, create/edit form с branch selector, delete. Первый domain UI, строящийся на FE1 reference patterns."
derived_from:
  - ../../domain/problem.md
  - ../../domain/architecture.md
  - ../../domain/schema.md
  - ../../domain/frontend.md
  - ../FT-HW1-01-property-crud/feature.md
  - ../FT-HW2-FE1-organization-shell/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-HW2-FE2: Properties UI

## What

### Problem

HW-1 backend полностью реализовал Property CRUD (FT-HW1-01): 5 REST endpoints, multi-tenant scoping, Pundit policies, validation. Но на frontend нет ни одного domain view — properties видны только через API. Пользователи УК не могут управлять объектами без прямых API-вызовов.

FE1 зафиксировал reference patterns (layout, store shape, route meta, Vuetify presets) и placeholder nav slot `/properties`. FE2 заменяет этот placeholder полноценным domain UI: список, создание, редактирование, удаление.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Frontend coverage ratchet | 33 | `floor(actual) - 1` после merge | `frontend/vitest.config.js` threshold |
| `MET-02` | Property CRUD user flows закрыты на UI | 0 из 4 (list/create/edit/delete) | 4 из 4 | SC-01..SC-04 pass |

### Scope

- `REQ-01` **Property list page** (`/properties`): таблица `v-data-table` с колонками Name, Address, Type, Branch, Actions. Данные загружаются из `GET /api/v1/properties`. Пустое состояние — `v-empty-state` с кнопкой «Добавить объект». Loading state — `v-progress-linear` по FE1 pattern.
- `REQ-02` **Create property**: кнопка «Добавить объект» открывает форму (отдельный route `/properties/new` или dialog — решение в `DEC-01`). Форма: `name` (required), `address` (required), `property_type` (v-select, enum apartment/hotel/house/hostel), `description` (v-textarea, optional, max 5000), `branch_id` (v-select, optional, загружается из `GET /api/v1/branches`). Submit → `POST /api/v1/properties`. Success → redirect на list + snackbar «Объект создан». Validation errors → маппятся на поля формы.
- `REQ-03` **Edit property**: клик по row или action icon → форма редактирования (`/properties/:id/edit` или dialog). Pre-populated из `GET /api/v1/properties/:id`. Submit → `PATCH /api/v1/properties/:id`. Success → redirect на list + snackbar «Объект обновлён».
- `REQ-04` **Delete property**: action icon → confirmation dialog → `DELETE /api/v1/properties/:id`. Success → удаление из list + snackbar «Объект удалён».
- `REQ-05` **Pinia properties store**: `stores/properties.js` по FE1 reference pattern (loading, error, items, fetchAll, create, update, destroy). Org-scoped через axios interceptor (`X-Organization-Id`).
- `REQ-06` **API client**: `api/properties.js` — thin axios wrapper (list, get, create, update, destroy). По паттерну `api/auth.js`.
- `REQ-07` **Branch selector data**: `api/branches.js` + загрузка списка branches для select в форме. Полноценный branches store (FE5) не создаём — достаточно inline fetch в компоненте формы или в properties store.
- `REQ-08` **Router integration**: `/properties` заменяет PlaceholderView на PropertyListView; добавляются `/properties/new` и `/properties/:id/edit` (если route-based form по DEC-01). Все с `meta.requiresAuth`.
- `REQ-09` **Тесты**: Vitest покрывает properties store (CRUD actions + loading/error), API client (mocked axios), Property form (validation, submit, branch selector), Property list (render, empty state, delete confirmation). Coverage ratchet поднимается.
- `REQ-10` **Validation UX**: backend validation errors (`422 full_messages`) маппятся на соответствующие поля формы. Client-side validation: `name` required, `address` required, `description` max 5000.

### Non-Scope

- `NS-01` Unit CRUD UI — FE3.
- `NS-02` Branch tree UI — FE5. FE2 использует flat branch list для selector.
- `NS-03` Amenities UI — FE4.
- `NS-04` Property photos / Active Storage — post-MVP.
- `NS-05` Фильтрация, поиск, пагинация — backend не поддерживает, FE2 показывает все properties org.
- `NS-06` i18n — строки inline русские.
- `NS-07` Новые npm пакеты.
- `NS-08` TypeScript.
- `NS-09` Полноценный branches Pinia store — только inline fetch для branch selector.

### Constraints / Assumptions

- `ASM-01` Backend `GET/POST/PATCH/DELETE /api/v1/properties` и `GET /api/v1/branches` работают корректно с demo seed.
- `ASM-02` FE1 shell (layout, auth store, router guards, mount helper) — stable reference.
- `ASM-03` Axios interceptor автоматически добавляет `Authorization` и `X-Organization-Id` headers.
- `CON-01` Стек заморожен: Vue 3 + Composition API (JS), Vuetify 3, Pinia, Vitest. Без новых зависимостей.
- `CON-02` Vuetify-only UI: `v-data-table`, `v-form`, `v-text-field`, `v-select`, `v-textarea`, `v-dialog`, `v-snackbar`.
- `CON-03` Backend возвращает `property_type` как string (`apartment`/`hotel`/`house`/`hostel`), не integer в JSON.
- `DEC-01` **Route-based vs dialog-based form.** Route-based (`/properties/new`, `/properties/:id/edit`) даёт shareable URL, browser back, простую навигацию; dialog-based — меньше routes, не покидаешь list. **Решение: route-based** — проще тестировать, соответствует REST-семантике, browser history работает из коробки, FE3–FE5 повторят этот паттерн.

## How

### Solution

Стандартный Vuetify CRUD UI поверх REST API. Pinia store (`properties.js`) по FE1 reference pattern (loading/error/items + async actions). API client (`api/properties.js`) по паттерну `api/auth.js`. Три route-based views: list, new, edit. Delete через confirmation dialog inline в list.

Branch selector в create/edit форме: inline `GET /api/v1/branches` через `api/branches.js`, кэш не нужен (branches обновляются редко, list маленький).

Validation: client-side через Vuetify `v-form` rules, backend errors маппятся по полю через helper.

Reference patterns из FE1, использованные в FE2:
1. **Layout composition** — PropertyListView/PropertyFormView рендерятся в `DefaultLayout → v-main → router-view`.
2. **Route meta + guard** — `meta.requiresAuth: true`.
3. **Pinia store shape** — `loading`, `error`, `items`, async actions с try/catch/finally.
4. **Vuetify density/spacing** — `v-data-table density="comfortable"`, consistent с shell nav.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `frontend/src/api/properties.js` | code (new) | Axios CRUD wrapper для properties endpoint |
| `frontend/src/api/branches.js` | code (new) | Axios GET wrapper для branches (branch selector) |
| `frontend/src/stores/properties.js` | code (new) | Pinia store: items, loading, error, CRUD actions |
| `frontend/src/views/PropertyListView.vue` | code (new) | v-data-table, empty state, delete dialog |
| `frontend/src/views/PropertyFormView.vue` | code (new) | v-form для create/edit с branch selector |
| `frontend/src/router/index.js` | code | Заменить placeholder `/properties` на PropertyListView; добавить `/properties/new`, `/properties/:id/edit` |
| `frontend/src/__tests__/` | test | Store, API client, list view, form view specs |
| `frontend/vitest.config.js` | config | Ratchet bump |
| `memory-bank/engineering/testing-policy.md` | doc | Обновить ratchet |

### Flow

1. Authenticated user кликает «Properties» в sidebar → router ведёт на `/properties`.
2. `PropertyListView` mount → `propertiesStore.fetchAll()` → `GET /api/v1/properties` → store.items заполняется → `v-data-table` рендерит rows.
3. User кликает «Добавить объект» → router на `/properties/new`.
4. `PropertyFormView` mount → `GET /api/v1/branches` (branch selector). User заполняет форму, submit → `propertiesStore.create(data)` → `POST /api/v1/properties`.
5. Success: router.push('/properties') + snackbar. Validation error: store.error → поля формы подсвечиваются.
6. User кликает edit icon → router на `/properties/:id/edit`. PropertyFormView mount с `props.id`, pre-fetch `GET /api/v1/properties/:id`.
7. User кликает delete icon → v-dialog confirmation → `propertiesStore.destroy(id)` → `DELETE /api/v1/properties/:id` → row удаляется.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | `GET /api/v1/properties` → `[{id, name, address, property_type, description, branch_id, organization_id, created_at, updated_at}]` | Backend / PropertyListView via store | Org-scoped через X-Organization-Id header |
| `CTR-02` | `POST /api/v1/properties` body `{property: {name, address, property_type, description, branch_id}}` → 201 + json / 422 + `{errors: [...]}` | PropertyFormView via store / Backend | `branch_id` optional, validated server-side |
| `CTR-03` | `PATCH /api/v1/properties/:id` → 200 / 422 | PropertyFormView via store / Backend | Same body as create |
| `CTR-04` | `DELETE /api/v1/properties/:id` → 200 / 404 | PropertyListView via store / Backend | |
| `CTR-05` | `GET /api/v1/branches` → `[{id, name, ...}]` | Backend / PropertyFormView branch selector | Flat list, no tree (FE5 concern) |
| `CTR-06` | Pinia `propertiesStore` shape: `{ items, loading, error, fetchAll, create, update, destroy }` | `stores/properties.js` / Views | По FE1 reference pattern |

### Failure Modes

- `FM-01` `fetchAll` возвращает 401 (token expired) → axios interceptor пытается refresh; при повторном 401 — auth store cleanup + redirect login (существующий flow).
- `FM-02` `create/update` возвращает 422 → `error` в store заполняется `full_messages`; форма показывает ошибки на полях.
- `FM-03` `destroy` возвращает 404 (race: уже удалено) → snackbar «Объект не найден», refetch list.
- `FM-04` Network error на любом CRUD → store.error = generic message, loading сбрасывается, UI не зависает.
- `FM-05` Branch selector fetch fail → branch select disabled с tooltip «Не удалось загрузить филиалы», форма по-прежнему submittable (branch_id optional).

### ADR Dependencies

| ADR | Current `decision_status` | Used for | Execution rule |
| --- | --- | --- | --- |
| [../../adr/ADR-002-no-typescript-frontend.md](../../adr/ADR-002-no-typescript-frontend.md) | accepted | JS only | Canonical input |
| [../../adr/ADR-006-axios-api-client.md](../../adr/ADR-006-axios-api-client.md) | accepted | Axios API client | Canonical input |

## Verify

### Exit Criteria

- `EC-01` Property list отображает все properties организации в `v-data-table` с name, address, type, branch, actions.
- `EC-02` Create property через форму сохраняет в backend и показывает в list.
- `EC-03` Edit property через форму обновляет в backend и отражается в list.
- `EC-04` Delete property через confirmation dialog удаляет из backend и из list.
- `EC-05` Branch selector в форме показывает branches текущей организации.
- `EC-06` Validation errors (422) маппятся на поля формы.
- `EC-07` Vitest suite зелёный; coverage ratchet поднят.
- `EC-08` Simplify review пройден.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `CTR-01`, `CON-02` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | `CTR-02`, `CTR-05`, `FM-02` | `EC-02`, `EC-05`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-03` | `CTR-03`, `FM-02` | `EC-03`, `SC-03` | `CHK-01` | `EVID-01` |
| `REQ-04` | `CTR-04`, `FM-03` | `EC-04`, `SC-04` | `CHK-01` | `EVID-01` |
| `REQ-05` | `CTR-06`, `FM-04` | `EC-01`..`EC-04`, `SC-01`..`SC-04` | `CHK-01` | `EVID-01` |
| `REQ-06` | `CTR-01`..`CTR-04`, `ASM-03` | `EC-01`..`EC-04` | `CHK-01` | `EVID-01` |
| `REQ-07` | `CTR-05`, `FM-05` | `EC-05`, `SC-02`, `SC-03` | `CHK-01` | `EVID-01` |
| `REQ-08` | `DEC-01` | `EC-01`..`EC-04`, `SC-01`..`SC-04` | `CHK-01` | `EVID-01` |
| `REQ-09` | — | `EC-07` | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` |
| `REQ-10` | `CTR-02`, `FM-02` | `EC-06`, `SC-05` | `CHK-01` | `EVID-01` |

### Acceptance Scenarios

- `SC-01` User открывает `/properties` → видит таблицу со всеми properties организации (name, address, type, branch name); при 0 properties — empty state с кнопкой «Добавить объект».
- `SC-02` User кликает «Добавить объект» → форма с полями name/address/type/description/branch; заполняет, submit → redirect на list, новый property в таблице, snackbar «Объект создан».
- `SC-03` User кликает edit на существующем property → форма pre-filled; меняет name, submit → redirect на list, name обновлён, snackbar «Объект обновлён».
- `SC-04` User кликает delete → confirmation dialog «Удалить объект?» → confirm → property исчезает из list, snackbar «Объект удалён».
- `SC-05` User создаёт property с пустым name → client-side validation «Обязательное поле»; user отправляет невалидный property_type (через API) → 422, ошибка отображается на поле.
- `SC-06` Coverage ratchet в `vitest.config.js` поднят с 33 до `floor(actual) - 1` и зафиксирован в `testing-policy.md`.

### Negative / Edge

- `NEG-01` Network error при загрузке list → loading скрывается, error banner «Не удалось загрузить объекты», retry button.
- `NEG-02` Попытка удалить уже удалённый property (race) → 404 → snackbar «Объект не найден», list refetch.
- `NEG-03` Branch selector fetch fail → select disabled, форма по-прежнему submittable без branch.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`..`EC-06`, `SC-01`..`SC-06`, `NEG-01`..`NEG-03` | `cd frontend && yarn test` | Vitest suite зелёный | `artifacts/ft-hw2-fe2/verify/chk-01/vitest.log` |
| `CHK-02` | `EC-08` | Simplify review | Нет premature abstractions, дублирования, ad-hoc CSS | `artifacts/ft-hw2-fe2/verify/chk-02/notes.md` |
| `CHK-03` | `EC-07`, `SC-06` | `cd frontend && yarn test:coverage` | Threshold поднят, CI зелёный | `artifacts/ft-hw2-fe2/verify/chk-03/coverage-summary.txt` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `artifacts/ft-hw2-fe2/verify/chk-01/` |
| `CHK-02` | `EVID-02` | `artifacts/ft-hw2-fe2/verify/chk-02/` |
| `CHK-03` | `EVID-03` | `artifacts/ft-hw2-fe2/verify/chk-03/` |

### Evidence

- `EVID-01` Vitest run log с passing specs (store, API client, list view, form view).
- `EVID-02` Simplify review notes.
- `EVID-03` Coverage summary + ratchet diff.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Vitest log | local run / CI | `artifacts/ft-hw2-fe2/verify/chk-01/vitest.log` | `CHK-01` |
| `EVID-02` | Markdown notes | reviewer | `artifacts/ft-hw2-fe2/verify/chk-02/notes.md` | `CHK-02` |
| `EVID-03` | Coverage summary | local run | `artifacts/ft-hw2-fe2/verify/chk-03/coverage-summary.txt` | `CHK-03` |
