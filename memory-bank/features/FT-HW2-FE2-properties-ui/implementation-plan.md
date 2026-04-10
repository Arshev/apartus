---
title: "FT-HW2-FE2: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации Properties UI. Discovery context, шаги, test strategy."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_hw2_fe2_scope
  - ft_hw2_fe2_architecture
  - ft_hw2_fe2_acceptance_criteria
---

# План имплементации

## Цель

Заменить placeholder `/properties` полноценным CRUD UI: list (v-data-table), create/edit form (route-based), delete (confirmation dialog), Pinia store, API client. Поднять coverage ratchet.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
|---|---|---|---|
| `frontend/src/api/auth.js` | Thin axios wrapper для auth endpoints | Паттерн для `api/properties.js` и `api/branches.js` | Повторить: export async function, import apiClient, return response.data |
| `frontend/src/api/client.js` | Axios instance с interceptors (auth token + org id + refresh) | Base client для всех API calls | Импортировать `apiClient` |
| `frontend/src/stores/auth.js` | Pinia store с loading/error/async actions | Reference shape для properties store | Копировать: `ref(null)`, `ref(false)`, `try/catch/finally { loading = false }` |
| `frontend/src/views/PlaceholderView.vue` | Placeholder «Скоро» на `/properties` | Будет заменён PropertyListView | Удалить route, оставить файл (используется FE3–FE5) |
| `frontend/src/router/index.js` | Placeholder route `/properties` → PlaceholderView | Заменить component, добавить `/properties/new`, `/properties/:id/edit` | |
| `frontend/src/__tests__/helpers/mountWithVuetify.js` | Mount helper с Vuetify stubs | Для тестов компонентов FE2 | Расширить stubs если нужны v-data-table, v-dialog, v-snackbar |
| `backend/.../properties_controller.rb` | REST controller, response shape `{ id, organization_id, branch_id, name, address, property_type, description, created_at, updated_at }` | Contract CTR-01..04 | JSON shape — basis для store.items type |
| `backend/.../branches_controller.rb` | GET /api/v1/branches → `[{ id, name, parent_branch_id, ... }]` | Contract CTR-05 | Flat list для branch selector |

## Test Strategy

| Test surface | Canonical refs | Planned automated coverage | Required suites | Manual-only |
|---|---|---|---|---|
| `stores/properties.js` | `REQ-05`, `CTR-06`, `FM-01`..`FM-04`, `SC-01`..`SC-04` | fetchAll (happy + error), create (happy + 422), update (happy + 422), destroy (happy + 404) | `yarn test` | none |
| `api/properties.js` | `REQ-06`, `CTR-01`..`CTR-04` | Mocked axios: list, get, create, update, destroy return correct shapes | `yarn test` | none |
| `api/branches.js` | `REQ-07`, `CTR-05` | Mocked axios: list returns branches | `yarn test` | none |
| `PropertyListView.vue` | `REQ-01`, `REQ-04`, `SC-01`, `SC-04`, `NEG-01`, `NEG-02` | Render table rows, empty state, delete dialog, error state | `yarn test` | none |
| `PropertyFormView.vue` | `REQ-02`, `REQ-03`, `REQ-10`, `SC-02`, `SC-03`, `SC-05`, `NEG-03` | Create mode, edit mode (pre-fill), validation errors, branch selector | `yarn test` | none |
| Router | `REQ-08` | Covered by existing guards spec + new route existence check | `yarn test` | none |

## Open Questions / Ambiguities

| OQ | Question | Blocks | Default action |
|---|---|---|---|
| `OQ-01` | v-data-table stub в mountWithVuetify — достаточно passthrough или нужен render rows? | `STEP-07` | Default: minimal stub с slot propagation (аналог FE1 stubs). Если test ассерты требуют row content → inline stub per suite. |

## Environment Contract

| Area | Contract | Used by |
|---|---|---|
| setup | `cd frontend && yarn install` зелёный; backend с demo seed на localhost:3000 для manual smoke | all STEPs |
| test | `yarn test` и `yarn test:coverage` | CHK-01, CHK-03 |

## Preconditions

| PRE | Canonical ref | Required state | Used by | Blocks start |
|---|---|---|---|---|
| `PRE-01` | `feature.md` (`status: active`) | Design Ready | all | yes |
| `PRE-02` | FE1 done | Shell, auth store, mount helper, router guards stable | all | yes |
| `PRE-03` | `ASM-01` | Backend properties + branches API работают | `STEP-02`..`STEP-06` | yes |
| `PRE-04` | `CON-01` | Frozen stack, no new packages | all | yes |

## Approval Gates

| AG | Trigger | Why | Approver |
|---|---|---|---|
| `AG-01` | Coverage < 33 после всех specs (regression) | Ratchet rule: never lower | user |

## Порядок работ

| STEP | Implements | Goal | Touchpoints | Verifies | Blocked by |
|---|---|---|---|---|---|
| `STEP-01` | `REQ-06` | API client `api/properties.js`: list, get, create, update, destroy | `src/api/properties.js` (new) | `CHK-01` | `PRE-01`..`PRE-04` |
| `STEP-02` | `REQ-07` | API client `api/branches.js`: list | `src/api/branches.js` (new) | `CHK-01` | `PRE-01` |
| `STEP-03` | `REQ-05` | Pinia properties store: items, loading, error, fetchAll, create, update, destroy | `src/stores/properties.js` (new) | `CHK-01` | `STEP-01` |
| `STEP-04` | `REQ-01`, `REQ-04` | PropertyListView: v-data-table, empty state, delete dialog, snackbar | `src/views/PropertyListView.vue` (new) | `CHK-01` | `STEP-03` |
| `STEP-05` | `REQ-02`, `REQ-03`, `REQ-07`, `REQ-10` | PropertyFormView: create/edit route-based form, branch selector, validation | `src/views/PropertyFormView.vue` (new) | `CHK-01` | `STEP-01`, `STEP-02` |
| `STEP-06` | `REQ-08` | Router: replace placeholder `/properties`, add `/properties/new`, `/properties/:id/edit` | `src/router/index.js` | `CHK-01` | `STEP-04`, `STEP-05` |
| `STEP-07a` | `REQ-09` | Spec: api/properties.js + api/branches.js | `src/__tests__/api/` (new) | `CHK-01` | `STEP-01`, `STEP-02` |
| `STEP-07b` | `REQ-09` | Spec: properties store | `src/__tests__/stores/properties.test.js` (new) | `CHK-01` | `STEP-03` |
| `STEP-07c` | `REQ-09` | Spec: PropertyListView | `src/__tests__/views/PropertyListView.test.js` (new) | `CHK-01` | `STEP-04` |
| `STEP-07d` | `REQ-09` | Spec: PropertyFormView | `src/__tests__/views/PropertyFormView.test.js` (new) | `CHK-01` | `STEP-05` |
| `STEP-08` | `REQ-09` | Coverage ratchet bump + testing-policy.md update | `vitest.config.js`, `testing-policy.md` | `CHK-03` | `STEP-07a`..`07d` |
| `STEP-09` | `EC-08` | Simplify review + docs sync (features/README.md) | all changed files | `CHK-02` | `STEP-08` |

## Parallelizable Work

- `PAR-01` `STEP-01` и `STEP-02` (api clients) не конфликтуют — параллельны.
- `PAR-02` `STEP-04` и `STEP-05` (views) можно параллелить после `STEP-03`.
- `PAR-03` `STEP-07a`..`07d` можно параллелить после соответствующих impl STEPs.

## Checkpoints

| CP | Refs | Condition | Evidence |
|---|---|---|---|
| `CP-01` | `STEP-01`..`STEP-06` | Все компоненты и routes на месте; `yarn build` зелёный | — |
| `CP-02` | `STEP-07a`..`07d` | `yarn test` зелёный, все новые specs проходят | `EVID-01` |
| `CP-03` | `STEP-08` | Ratchet поднят; `yarn test:coverage` зелёный | `EVID-03` |

## Execution Risks

| ER | Risk | Mitigation | Trigger |
|---|---|---|---|
| `ER-01` | v-data-table stub в jsdom может не пропускать row content | Использовать inline stub per PropertyListView spec с явным render из `items` prop | spec падает на empty table content |
| `ER-02` | Backend error format `{ error: [...] }` vs `{ errors: {...} }` может расходиться между endpoints | Проверено в discovery: все properties endpoints используют `{ error: full_messages }` (массив строк) | 422 response не парсится |

## Stop Conditions

| STOP | Trigger | Action |
|---|---|---|
| `STOP-01` | Нужен новый npm пакет | Эскалация user |
| `STOP-02` | Backend API ведёт себя не по CTR (response shape mismatch) | Зафиксировать gap, эскалация |

## Готово для приемки

- CP-01..CP-03 пройдены.
- CHK-01, CHK-02, CHK-03 имеют pass + evidence.
- `yarn test`, `yarn test:coverage`, `yarn build` зелёные.
- `feature.md` → `delivery_status: done`, plan → `status: archived`.
- `testing-policy.md` обновлён.
