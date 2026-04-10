---
title: "FT-HW2-FE1: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации organization shell frontend reference implementation. Фиксирует discovery context, шаги, риски и test strategy без переопределения canonical фактов из feature.md."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_hw2_fe1_scope
  - ft_hw2_fe1_architecture
  - ft_hw2_fe1_acceptance_criteria
  - ft_hw2_fe1_blocker_state
---

# План имплементации

## Цель текущего плана

Довести уже частично существующий frontend shell (`App.vue`, `DefaultLayout`, `AppTopbar`, `AppSidebar`) до состояния reference implementation: закрыть loading/error gap, зафиксировать nav-слоты FE2–FE5 через placeholder routes, покрыть всё Vitest'ом и поднять frontend coverage ratchet первый раз.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
|---|---|---|---|
| [frontend/src/App.vue](../../../frontend/src/App.vue) | Рендерит `DefaultLayout` или голый `router-view` в зависимости от `route.meta.guest` / `route.name === 'selectOrganization'` | Canonical точка gating shell'а (REQ-01, CTR-01) | Сохранить as-is; добавить тест на gating |
| [frontend/src/layouts/DefaultLayout.vue](../../../frontend/src/layouts/DefaultLayout.vue) | `v-app` + `AppTopbar` + `AppSidebar` + `v-main` + `router-view` | Canonical layout shell, нужен loading hookup (REQ-06) | Мелко доработать, не переписывать |
| [frontend/src/components/AppTopbar.vue](../../../frontend/src/components/AppTopbar.vue) | v-app-bar, brand, drawer toggle, user menu, logout | Покрывает REQ-02 частично; нет `v-progress-linear` для loading state | Добавить indeterminate progress, тесты |
| [frontend/src/components/AppSidebar.vue](../../../frontend/src/components/AppSidebar.vue) | v-navigation-drawer, org switcher v-menu, nav list с одним Dashboard пунктом | REQ-03, REQ-04; нужно расширить nav и завести редирект на `/` + refetch после switch | Расширить navItems, доработать `switchOrg`, тесты |
| [frontend/src/stores/auth.js](../../../frontend/src/stores/auth.js) | Pinia store: user, organization, organizations, membership, loading, error + signIn/signOut/fetchCurrentUser/switchOrganization | Canonical auth store (CTR-02). `switchOrganization` — синхронный, сбрасывает `membership` в null и не вызывает `fetchCurrentUser`. | Сделать `switchOrganization` async, добавить `await fetchCurrentUser()` |
| [frontend/src/router/index.js](../../../frontend/src/router/index.js) | Vue Router 4, routes Dashboard + auth/*, beforeEach guard с requiresAuth/guest | REQ-05; нужны placeholder routes | Добавить 4 route-а с `meta.requiresAuth`, одной lazy-loaded `PlaceholderView` |
| [frontend/src/views/DashboardView.vue](../../../frontend/src/views/DashboardView.vue) | v-container + h1 "Dashboard" + body "Apartus PMS" | Ниже baseline по REQ feature.md Change Surface | Переписать на приветствие + org name |
| [frontend/src/__tests__/smoke.test.js](../../../frontend/src/__tests__/smoke.test.js) | Единственный существующий frontend-тест (smoke) | Эталон размещения тестов в `__tests__` | Следовать той же директории или `*.test.js` рядом с кодом |
| [frontend/vitest.config.js](../../../frontend/vitest.config.js) | Vitest config с `coverage.thresholds.lines: 0` | Место для ratchet bump (REQ-09, SC-08) | Поднять в финальном шаге |
| [frontend/src/pages/auth/LoginPage.vue](../../../frontend/src/pages/auth/LoginPage.vue) | HW-0 form, использует `authStore.signIn` | Конечная точка logout redirect, остаётся guest | Не трогаем |
| [memory-bank/domain/frontend.md](../../domain/frontend.md) | Canonical frontend стек + тестирование | Обновить ссылкой на FE1 как reference | Добавить строку под § UI Surfaces или § Testing |
| [memory-bank/engineering/testing-policy.md](../../engineering/testing-policy.md) | Canonical coverage ratchet policy | Обновить Frontend текущее значение после ratchet bump | Только § Coverage Ratchet |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
|---|---|---|---|---|---|---|---|
| `stores/auth.js` | `REQ-02`, `REQ-04`, `REQ-06`, `CTR-02`, `FM-01`, `FM-03`, `SC-02`, `SC-03`, `SC-06`, `NEG-02` | none | Vitest spec на signIn (1/N orgs), signOut (happy + network error), switchOrganization (async + refetch), fetchCurrentUser (happy + 401 cleanup), loading state | `cd frontend && yarn test` | `frontend-test` | none | none |
| `components/AppTopbar.vue` | `REQ-02`, `REQ-06`, `SC-01`, `SC-02`, `SC-06` | none | Vitest mount spec: рендер `full_name`, click «Выйти» → `signOut` + `router.push('login')`, `v-progress-linear` рендерится пока `loading === true` | `cd frontend && yarn test` | `frontend-test` | none | none |
| `components/AppSidebar.vue` | `REQ-03`, `REQ-04`, `SC-01`, `SC-03`, `SC-04` | none | Vitest mount spec: рендер navItems (5), рендер org switcher списка, click другой org → `switchOrganization` + router на `/` | `cd frontend && yarn test` | `frontend-test` | none | none |
| `router/index.js` guards | `REQ-05`, `SC-05`, `NEG-01` | none | Vitest spec на `beforeEach`: requiresAuth без user → `login` с `redirect`; guest при активной сессии → `/` | `cd frontend && yarn test` | `frontend-test` | none | none |
| `App.vue` gating | `REQ-01`, `CTR-01`, `SC-01` | none | Vitest mount spec: authenticated non-guest → `DefaultLayout` рендерится; guest route → нет layout | `cd frontend && yarn test` | `frontend-test` | none | none |
| `views/PlaceholderView.vue` | `REQ-03`, `SC-04` | none | Lightweight snapshot / текст «Скоро» | `cd frontend && yarn test` | `frontend-test` | none | none |
| Coverage ratchet | `REQ-09`, `SC-08` | threshold=0 | `yarn test:coverage` после написания всех specs; обновление threshold в `vitest.config.js` и `testing-policy.md` | `cd frontend && yarn test:coverage` | `frontend-test` (с новым threshold) | none | none |

## Open Questions / Ambiguities

| OQ | Question | Why unresolved | Blocks | Default action / escalation owner |
|---|---|---|---|---|
| `OQ-01` | Фактический % frontend line coverage после всех specs — ляжет ли в ≥60 или ниже? | Пока специй не написано, нельзя посчитать | `STEP-08` (ratchet bump) | Default: если actual < 60, не поднимать threshold до 60 принудительно — зафиксировать gap как `ER-*` и эскалировать user'у для DEC-01. |
| `OQ-02` | Нужен ли `LoadingLayout` или достаточно `v-progress-linear` в `AppTopbar`? | `feature.md` REQ-06 говорит про topbar; минимальный вариант достаточен | none | Default: topbar-only progress; если в smoke обнаружится UX gap — эскалировать на отдельный follow-up, не расширять scope FE1. |
| `OQ-03` | Выносим ли router `beforeEach` guard в отдельный testable helper (`router/guards.js`) или тестируем через `createRouter` per-suite без рефактора? | Vue Router 4 guards сложно изолировать в Vitest без глобальных моков, которые запрещены `testing-policy.md` | `STEP-07d` | Default: тестировать через `createRouter` per-suite без рефактора `router/index.js`; если два теста подряд не дают детерминированного результата — рефактор в helper с эскалацией user'у. |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
|---|---|---|---|
| setup | `cd frontend && yarn install` успешно завершается; node ≥ 20 (см. `ops/development.md`). Backend запущен на `localhost:3000` с demo seed для manual smoke. | `STEP-01`..`STEP-09` | `yarn install` падает; dev server не стартует |
| test | `cd frontend && yarn test` зелёный; `yarn test:coverage` выдаёт `coverage-summary.json` | `CHK-01`, `CHK-03` | Vitest suite красный или coverage threshold не применяется |
| access / network | Локальный backend API доступен на `http://localhost:3000/api/v1`; demo user `demo@apartus.local` / `Password1!` существует | manual smoke (опционально) | 401 на login |
| secrets | Не требуются | — | — |

## Preconditions

| PRE | Canonical ref | Required state | Used by steps | Blocks start |
|---|---|---|---|---|
| `PRE-01` | `feature.md` (`status: active`) | Canonical feature.md в Design Ready; `cd frontend && yarn install && yarn test` зелёный на baseline (smoke.test.js) — доказывает, что среда готова | all | yes |
| `PRE-02` | `ASM-01` (HW-0 auth store) | `stores/auth.js` в актуальном состоянии, signIn/signOut/fetchCurrentUser работают | `STEP-02`, `STEP-04` | yes |
| `PRE-03` | `CON-01` (frozen stack) | Никаких новых npm пакетов; ветка `hw-2` от `main` | all | yes |
| `PRE-04` | [ADR-002](../../adr/ADR-002-no-typescript-frontend.md) accepted | Frontend пишется на чистом JS | all | yes |

## Workstreams

| WS | Implements | Result | Owner | Dependencies |
|---|---|---|---|---|
| `WS-1` | `REQ-04`, `CTR-02` | `switchOrganization` стал async и рефетчит user | agent | `PRE-02` |
| `WS-2` | `REQ-01`, `REQ-02`, `REQ-03`, `REQ-06` | Shell компоненты доработаны (loading, nav, dashboard copy) + PlaceholderView | agent | `WS-1` (для sidebar click flow) |
| `WS-3` | `REQ-03`, `REQ-05` | Placeholder routes в router, guards канонизированы | agent | `WS-2` |
| `WS-4` | `REQ-08` | Vitest specs для store, компонентов, router guards, App.vue | agent | `WS-1`, `WS-2`, `WS-3` |
| `WS-5` | `REQ-07`, `REQ-09` | Ratchet bump + docs sync (`testing-policy.md`, `domain/frontend.md`) | agent | `WS-4`, `OQ-01` resolved |

## Approval Gates

| AG | Trigger | Applies to | Why approval | Approver / evidence |
|---|---|---|---|---|
| `AG-01` | Actual frontend coverage после всех specs < 60% | `STEP-08` | `feature.md` DEC-01 требует финализации значения ratchet; ниже target 60 — это продуктовое решение, не автономное | user; evidence — комментарий в PR + обновлённый `DEC-01` в feature.md |
| `AG-02` | Необходимость добавить новый npm пакет, обнаруженная в discovery шага | любой STEP | `CON-01` + `autonomy-boundaries.md` запрещают self-serve | user; evidence — явное согласие в чате + ADR если нужно |

## Порядок работ

| STEP | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command | Blocked by | Needs approval | Escalate if |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `STEP-02` | agent | `REQ-04`, `WS-1` | Сделать `switchOrganization` async, вызвать `await fetchCurrentUser()` после записи `currentOrganizationId`; адаптировать single-org ветку `signIn` (`await switchOrganization`) | `frontend/src/stores/auth.js` | modified store | `CHK-01` (store spec, закрывается в `STEP-07a`) | `EVID-01` | `yarn test` после `STEP-07a` | `PRE-01` | none | fetchCurrentUser падает на switch — остановиться, эскалировать |
| `STEP-03` | agent | `REQ-01`, `REQ-06` | `DefaultLayout` hookup loading индикатора: `AppTopbar` читает `authStore.loading` и рендерит `v-progress-linear` indeterminate когда `true` | `frontend/src/layouts/DefaultLayout.vue`, `frontend/src/components/AppTopbar.vue` | modified components | `CHK-01` (topbar spec, `STEP-07b`) | `EVID-01` | `yarn test` после `STEP-07b` | `PRE-01` | none | — |
| `STEP-04` | agent | `REQ-03`, `REQ-04` | Расширить `AppSidebar` navItems (Dashboard + Properties/Units/Amenities/Branches placeholders); `switchOrg` → `async`, `await authStore.switchOrganization(org)` + `router.push('/')` | `frontend/src/components/AppSidebar.vue` | modified component | `CHK-01` (sidebar spec, `STEP-07c`) | `EVID-01` | `yarn test` после `STEP-07c` | `STEP-02` | none | — |
| `STEP-05` | agent | `REQ-03` | Создать `views/PlaceholderView.vue` (`v-container` + `v-empty-state` «Скоро»); переписать `DashboardView.vue` на `h1` «Здравствуйте, {full_name}» + `{organization.name}` | `frontend/src/views/PlaceholderView.vue`, `frontend/src/views/DashboardView.vue` | new/modified views | `CHK-01` (views spec, `STEP-07f`) | `EVID-01` | `yarn test` после `STEP-07f` | `PRE-01` | none | — |
| `STEP-06` | agent | `REQ-03`, `REQ-05` | Добавить 4 placeholder routes в `router/index.js` (`/properties`, `/units`, `/amenities`, `/branches`), все с `meta.requiresAuth: true` и lazy `PlaceholderView` | `frontend/src/router/index.js` | modified router | `CHK-01` (router guards spec, `STEP-07d`) | `EVID-01` | `yarn test` после `STEP-07d` | `STEP-05` | none | — |
| `STEP-07a` | agent | `REQ-08`, `SC-02`, `SC-03`, `SC-06`, `NEG-02`, `FM-01`, `FM-03` | Vitest spec для `stores/auth.js`: signIn (single/multi org), signOut (happy + network error), `switchOrganization` (async + refetch), `fetchCurrentUser` (happy + 401 cleanup), loading state transitions | `frontend/src/__tests__/stores/auth.test.js` (new) | store spec | `CHK-01` | `EVID-01` | `cd frontend && yarn test src/__tests__/stores/auth` | `STEP-02` | none | — |
| `STEP-07b` | agent | `REQ-08`, `SC-01`, `SC-02`, `SC-06` | Vitest spec для `components/AppTopbar.vue`: рендер `full_name`, click «Выйти» → `signOut` + `router.push('login')`, `v-progress-linear` при `loading === true` | `frontend/src/__tests__/components/AppTopbar.test.js` (new), `src/__tests__/helpers/mountWithVuetify.js` (new, per-suite helper) | topbar spec + mount helper | `CHK-01` | `EVID-01` | `yarn test src/__tests__/components/AppTopbar` | `STEP-03` | none | Vuetify mount fail → завести helper (см. `ER-03`) |
| `STEP-07c` | agent | `REQ-08`, `SC-01`, `SC-03`, `SC-04` | Vitest spec для `components/AppSidebar.vue`: рендер 5 navItems, org switcher list, click другой org → `switchOrganization` вызван + `router.push('/')` | `frontend/src/__tests__/components/AppSidebar.test.js` (new) | sidebar spec | `CHK-01` | `EVID-01` | `yarn test src/__tests__/components/AppSidebar` | `STEP-04`, `STEP-07b` (helper) | none | — |
| `STEP-07d` | agent | `REQ-08`, `REQ-05`, `SC-05`, `NEG-01` | Vitest spec для router guards: `createRouter` per-suite, проверка requiresAuth → login с redirect, guest при активной сессии → Dashboard. Default по `OQ-03` — без рефактора guard | `frontend/src/__tests__/router/guards.test.js` (new) | router guards spec | `CHK-01` | `EVID-01` | `yarn test src/__tests__/router/guards` | `STEP-06` | none | `ER-02` / `STOP-01` — 2 итерации без детерминированного результата |
| `STEP-07e` | agent | `REQ-08`, `REQ-01`, `SC-01`, `CTR-01` | Vitest spec для `App.vue` gating: authenticated non-guest → `DefaultLayout` рендерится; guest route → layout не монтируется | `frontend/src/__tests__/App.test.js` (new) | App gating spec | `CHK-01` | `EVID-01` | `yarn test src/__tests__/App` | `STEP-07b` (helper) | none | — |
| `STEP-07f` | agent | `REQ-08`, `SC-04` | Vitest spec для `views/PlaceholderView.vue` (рендер «Скоро») и `DashboardView.vue` (приветствие + org name) | `frontend/src/__tests__/views/PlaceholderView.test.js`, `frontend/src/__tests__/views/DashboardView.test.js` (new) | view specs | `CHK-01` | `EVID-01` | `yarn test src/__tests__/views` | `STEP-05`, `STEP-07b` (helper) | none | — |
| `STEP-08` | agent | `REQ-09`, `SC-08`, `OQ-01` | Прогнать `yarn test:coverage`, считать `coverage-summary.json.total.lines.pct`, установить `thresholds.lines = max(60, floor(actual) - 1)`, обновить `testing-policy.md § Coverage Ratchet` Frontend строку тем же числом | `frontend/vitest.config.js`, `memory-bank/engineering/testing-policy.md` | coverage log + config/doc diff | `CHK-03` | `EVID-03` | `yarn test:coverage && cat coverage/coverage-summary.json` | `STEP-07a`..`STEP-07f` | `AG-01` if actual < 60 | actual < 60 |
| `STEP-09` | agent | `REQ-07`, `EC-07` | Simplify review изменённых файлов (store/topbar/sidebar/layout/router/views); заметки в `artifacts/ft-hw2-fe1/verify/chk-02/notes.md` с перечнем reference patterns и выводом по complexity | все изменённые frontend файлы | simplify notes | `CHK-02` | `EVID-02` | manual review + `yarn test` + `yarn build` | `STEP-08` | none | обнаружен premature abstraction без ref на `CON-*`/`FM-*` → упростить перед STEP-10 |
| `STEP-10` | agent | `REQ-07`, upstream-first docs sync | Обновить `memory-bank/domain/frontend.md`: ссылка на FE1 как canonical reference implementation shell'а (секция `Layout` или `Testing`) | `memory-bank/domain/frontend.md` | doc patch | `CHK-02` | `EVID-02` | `grep -n 'FT-HW2-FE1' memory-bank/domain/frontend.md` | `STEP-09` | none | — |

## Parallelizable Work

- `PAR-01` `STEP-03` (topbar loading) и `STEP-05` (views) не конфликтуют по write-surface и могут идти параллельно после `PRE-01`.
- `PAR-02` `STEP-02` и `STEP-04` затрагивают разные файлы, но `STEP-04` логически зависит от `STEP-02` (sidebar click должен ждать новый async контракт) — НЕ параллелить.
- `PAR-03` `STEP-07a`..`STEP-07f` после появления mount-helper в `STEP-07b` могут выполняться параллельно, кроме `STEP-07d` (имеет отдельный risk/stop trigger `ER-02`/`STOP-01`).
- `PAR-04` `STEP-09` и `STEP-10` последовательны: docs sync допустим только после чистого simplify review.

## Checkpoints

| CP | Refs | Condition | Evidence IDs |
|---|---|---|---|
| `CP-01` | `STEP-02`..`STEP-06` | Все shell компоненты и router изменены; baseline `yarn dev` стартует без console errors | `EVID-01` |
| `CP-02` | `STEP-07a`..`STEP-07f` | Vitest suite зелёный, все SC-01..SC-06, NEG-01, NEG-02 покрыты specs | `EVID-01` |
| `CP-03` | `STEP-08` | `vitest.config.js` threshold > 0; `testing-policy.md § Coverage Ratchet` обновлён; `yarn test:coverage` зелёный | `EVID-03` |
| `CP-04` | `STEP-09` | Simplify review notes зафиксированы; complexity оправдана или убрана | `EVID-02` |
| `CP-05` | `STEP-10` | `memory-bank/domain/frontend.md` содержит ссылку на FT-HW2-FE1 как reference implementation | `EVID-02` |

## Execution Risks

| ER | Risk | Impact | Mitigation | Trigger |
|---|---|---|---|---|
| `ER-01` | Actual coverage < 60% после всех specs | `SC-08` не выполним без эскалации; DEC-01 требует пересмотра | Заранее включить в `STEP-07` покрытие всех веток store и guards; если всё равно <60 — `AG-01` | `coverage-summary.json.total.lines.pct < 60` |
| `ER-02` | Vue Router 4 `beforeEach` трудно изолировать в Vitest без глобальных моков (`testing-policy.md` запрещает глобальные моки) | `STEP-07d` router-guards spec может застрять | См. `OQ-03` default action: `createRouter` per-suite; fallback — рефактор guard в helper | spec не может получить детерминированный результат за 2 итерации |
| `ER-03` | Vuetify 3 mount в jsdom требует stub или vuetify plugin в test helper | Spec-и компонентов падают на undefined components | Завести `src/__tests__/helpers/mountWithVuetify.js` как per-suite helper | первый тест на `AppTopbar` падает на unknown element |
| `ER-04` | `switchOrganization` рефетч ломает текущий `signIn` flow (он уже вызывает `switchOrganization` синхронно для single-org case) | signIn тесты падают | Адаптировать `signIn`: при single-org тоже `await switchOrganization` | signIn spec красный после `STEP-02` |

## Stop Conditions / Fallback

| STOP | Related refs | Trigger | Immediate action | Safe fallback state |
|---|---|---|---|---|
| `STOP-01` | `ER-02` | Router guards невозможно детерминированно покрыть Vitest'ом за 2 попытки | Остановить `STEP-07` для guards, открыть `OQ-03`, эскалировать user'у | Остальные specs зелёные; guards покрыты на следующей итерации |
| `STOP-02` | `AG-02` | Discovery выявляет потребность в новом npm пакете | Немедленно остановить STEP, эскалировать user'у | Последний зелёный коммит; нет изменений package.json |
| `STOP-03` | `ER-01`, `AG-01` | actual coverage < 60 и user не утверждает ниже target | Не коммитить ratchet bump ниже 60; эскалировать | `vitest.config.js` остаётся на 0 до решения |

## Готово для приемки

- Все `CP-*` пройдены с evidence.
- `CHK-01`, `CHK-02`, `CHK-03` из `feature.md` имеют pass-результаты и конкретные evidence carriers.
- `yarn test`, `yarn test:coverage`, `yarn build` зелёные локально; CI `frontend-test` + `frontend-build` зелёные.
- `feature.md` → `delivery_status: done`; `implementation-plan.md` → `status: archived`.
- `memory-bank/domain/frontend.md` и `memory-bank/engineering/testing-policy.md` обновлены (upstream-first docs sync).
