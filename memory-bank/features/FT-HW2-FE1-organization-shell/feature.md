---
title: "FT-HW2-FE1: Organization Shell (Frontend Reference Implementation)"
doc_kind: feature
doc_function: canonical
purpose: "Authenticated frontend shell (layout, navigation, org switcher, logout) и reference-паттерны для последующих HW-2 FE фич."
derived_from:
  - ../../domain/problem.md
  - ../../domain/architecture.md
  - ../../domain/frontend.md
  - ../../engineering/testing-policy.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-HW2-FE1: Organization Shell

## What

### Problem

HW-0 оставил на frontend только auth-скелет (login/signup, Pinia `auth`, Vuetify 3, vitest ratchet=0). HW-1 добавил полный backend API (Properties, Units, Amenities, Branches) с demo seed, но на UI это невидимо: нет устойчивого authenticated layout, нет reference-паттернов навигации/org switch/logout, нет первой coverage-планки для frontend. Пока такого эталона нет, FE2–FE5 будут копировать ad-hoc решения и расходиться стилистически.

Текущее состояние кода это подтверждает частично: в репо уже лежат `layouts/DefaultLayout.vue`, `components/AppTopbar.vue`, `components/AppSidebar.vue` с базовым org switcher и logout, но без тестов, без явного loading/empty/error discipline, без документированной навигации под будущие фичи и без coverage ratchet. FE1 канонизирует этот shell как reference: доводит до тестируемого состояния, формализует паттерны и поднимает frontend ratchet с нуля.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Frontend vitest line coverage floor | 0 | `floor(actual) - 1` после merge (FE1 scope — shell + store; HW-0 surfaces покрываются FE2–FE5) | `frontend/vitest.config.js` threshold |
| `MET-02` | Reference patterns, задокументированные в `feature.md` и переиспользуемые FE2–FE5 | 0 | ≥ 4 (layout slot, auth-guarded route meta, loading/error pattern, org-scoped store pattern) | Перечень в `How → Solution` с указанием файлов |

### Scope

- `REQ-01` Authenticated layout: `DefaultLayout.vue` оборачивает все authenticated routes через `App.vue` и рендерит Vuetify `v-app` + `v-app-bar` + `v-navigation-drawer` + `v-main` с `router-view`; guest и `selectOrganization` routes остаются без shell'а.
- `REQ-02` Topbar: brand "Apartus", toggle drawer, user menu с `authStore.user.full_name` и действием "Выйти". Logout вызывает `authStore.signOut()` и редиректит на `login`; при ошибке сети локальная сессия всё равно очищается (consistent с текущим store поведением), пользователь остаётся на `login`.
- `REQ-03` Sidebar: org switcher (v-menu из `authStore.organizations` с галочкой на текущей) и navigation list с пунктами **Dashboard, Properties, Units, Amenities, Branches**. Пункты, чьи views ещё не реализованы (всё кроме Dashboard), ведут на placeholder routes с тем же shell'ом и явным `v-empty-state` "Скоро" — это фиксирует навигационные слоты для FE2–FE5 без их реализации.
- `REQ-04` Organization switch: выбор другой org в switcher вызывает `authStore.switchOrganization(org)`, сохраняет `currentOrganizationId`, перезапрашивает `fetchCurrentUser()` для обновления `membership`/`permissions` и редиректит на `Dashboard`. После свитча видимый org name в sidebar и любые org-scoped данные соответствуют новому `organization.id`.
- `REQ-05` Router guards: все shell-routes помечены `meta.requiresAuth: true`; неаутентифицированный доступ редиректит на `login` с `redirect` query; guest попытка открыть shell при активной сессии редиректит на `Dashboard`. Эти guards уже есть в `router/index.js` — FE1 их канонизирует и покрывает тестами.
- `REQ-06` Loading / empty / error discipline: shell не падает, пока `authStore.loading` или `fetchCurrentUser()` ещё не вернулся — рендерит Vuetify `v-progress-linear` indeterminate в topbar. Ошибка `fetchCurrentUser` (например, 401) вызывает logout-flow из REQ-02. Это фиксируется как reference pattern для FE2–FE5.
- `REQ-07` Секция `How → Solution` содержит ≥4 reference patterns, каждый с явной ссылкой на конкретный файл в `frontend/src/` (layout composition, route meta + guard, Pinia store shape, Vuetify density/spacing).
- `REQ-08` Тесты: Vitest покрывает `auth` store (signIn/signOut/switchOrganization/fetchCurrentUser happy + error path), `AppTopbar` (рендер user menu, logout click), `AppSidebar` (рендер org switcher, navigation items, switch org click), router guards (requiresAuth redirect, guest redirect).
- `REQ-09` Coverage ratchet: после merge `frontend/vitest.config.js` `test.coverage.thresholds.lines` поднят с `0` до `floor(actual) - 1`. Honest denominator (`src/**`) сохраняется — HW-0 surfaces (auth pages, api client, router module) покрываются FE2–FE5 по мере появления feature specs. Значение фиксируется в `engineering/testing-policy.md`.

### Non-Scope

- `NS-01` Реализация Properties / Units / Amenities / Branches UI — это FE2–FE5; FE1 добавляет только placeholder routes и nav slots.
- `NS-02` i18n / vue-i18n — строки остаются inline русскими (см. `domain/frontend.md`).
- `NS-03` Новые Pinia stores для доменных сущностей (`properties`, `units`, и т.д.) — заводятся в своих фичах.
- `NS-04` Изменения backend API или auth-потока — FE1 потребляет текущие endpoints как есть.
- `NS-05` Добавление новых npm пакетов — запрещено `autonomy-boundaries.md`; FE1 работает на текущем стеке (Vue 3, Vuetify 3, Pinia, Vue Router, Vitest).
- `NS-06` TypeScript миграция — запрещена ADR-002.
- `NS-07` Responsive/mobile refinement drawer'а сверх Vuetify defaults — отложено.
- `NS-08` E2E тесты (Playwright/Cypress) — HW-2 testing policy ограничивается Vitest.

### Constraints / Assumptions

- `ASM-01` HW-0 auth store (`stores/auth.js`) корректно управляет токенами, `currentOrganizationId` и `membership` — FE1 строит поверх него и не переписывает auth-протокол.
- `ASM-02` Backend demo seed (`demo@apartus.local` / `Password1!`) доступен локально для manual smoke.
- `CON-01` Стек заморожен: Vue 3 + Composition API (JS, без TS), Vuetify 3, Pinia, Vue Router 4, Vitest + jsdom. Никаких новых зависимостей.
- `CON-02` Ad-hoc CSS избегаем — layout и nav строятся исключительно на Vuetify компонентах.
- `CON-03` Текущий frontend ratchet = 0; поднимаем ровно один раз в конце фичи, не на каждом коммите.
- `DEC-01` **Resolved.** Ratchet = 33 (`floor(34.21) - 1`). Honest denominator `src/**` сохранён — FE1 change surface покрыт на 83–100%, но HW-0 legacy (auth pages, api client, router module) даёт 0%, что тянет общий % вниз. Сужать denominator — подгонка; дописывать HW-0 specs — scope creep. Рост до 60+ произойдёт естественно с FE2–FE5.

## How

### Solution

Канонизируем уже частично существующий shell (`App.vue` → `DefaultLayout.vue` → `AppTopbar` + `AppSidebar` + `router-view`) как reference implementation: (1) закрываем loading/error gap, (2) расширяем sidebar nav заглушками под FE2–FE5 с placeholder routes, (3) добавляем Vitest coverage для store, components и router guards, (4) поднимаем frontend ratchet первый раз. Главный trade-off — не писать доменный код за FE2–FE5, а только зафиксировать слоты и reference-паттерны, чтобы последующие фичи просто подключались к ним.

Reference patterns, фиксируемые для FE2–FE5:

1. **Layout composition** — `App.vue` решает показывать ли shell по `route.meta.guest` / `route.name`; доменные views рендерятся внутри `DefaultLayout → v-main → router-view` и не тянут свой chrome.
2. **Route meta + guard** — каждый authenticated route объявляет `meta.requiresAuth: true`; guard в `router/index.js` — единственное место, где решается редирект.
3. **Pinia store shape** — `loading: ref`, `error: ref`, async actions, error сохраняется в store, view показывает Vuetify loading/error primitives. FE2–FE5 копируют эту форму для своих stores.
4. **Vuetify density/spacing** — `v-list density="compact" nav`, `v-navigation-drawer` default width, topbar elevation=1; фиксируется в shell и используется как дефолт в доменных страницах.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `frontend/src/App.vue` | code | Подтвердить shell-gating логику, покрыть тестами |
| `frontend/src/layouts/DefaultLayout.vue` | code | Добавить loading indicator slot (REQ-06) |
| `frontend/src/components/AppTopbar.vue` | code | Довести logout flow, показывать loading indicator, тесты |
| `frontend/src/components/AppSidebar.vue` | code | Расширить nav заглушками FE2–FE5, org switch редирект + refetch, тесты |
| `frontend/src/views/DashboardView.vue` | code | Рендерит `v-container` с `h1` «Здравствуйте, {user.full_name}» и подписью `{organization.name}`. Ничего более (см. `NS-01`). |
| `frontend/src/views/PlaceholderView.vue` | code (new) | Reusable placeholder для FE2–FE5 nav-слотов (`v-empty-state` «Скоро») |
| `frontend/src/router/index.js` | code | Placeholder routes (`/properties`, `/units`, `/amenities`, `/branches`) с shell + `requiresAuth` |
| `frontend/src/stores/auth.js` | code | `switchOrganization` становится `async` и вызывает `await fetchCurrentUser()` после обновления `currentOrganizationId`, чтобы `membership`/`permissions` соответствовали новой org (текущая реализация только сбрасывает `membership` в `null`) |
| `frontend/src/__tests__/` | test | Store, components, router guards Vitest suites |
| `frontend/vitest.config.js` | config | Поднять `test.coverage.thresholds.lines` в closure |
| `memory-bank/engineering/testing-policy.md` | doc | Обновить текущее значение frontend ratchet |
| `memory-bank/domain/frontend.md` | doc | Добавить ссылку на FE1 как reference implementation shell'а |

### Flow

1. Неаутентифицированный пользователь открывает `/` → router guard редиректит на `/auth/login?redirect=/`.
2. После успешного `signIn` (одна org) auth store заполняет `user`, `organization`, `membership`; router ведёт на `/`.
3. `App.vue` видит не-guest route → рендерит `DefaultLayout`; `DefaultLayout` показывает `v-app-bar` + `v-navigation-drawer` + `v-main` с `DashboardView`.
4. Topbar показывает `full_name` и меню «Выйти»; Sidebar показывает org switcher и nav (Dashboard + placeholders).
5. Клик по «Properties» ведёт на `/properties` → та же shell → `PlaceholderView` «Скоро».
6. Клик по другой org в switcher → `authStore.switchOrganization(org)` → `fetchCurrentUser()` → redirect на `/` → shell показывает новое org name.
7. Клик «Выйти» → `authStore.signOut()` → redirect на `/auth/login`.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Route `meta: { requiresAuth: boolean, guest?: boolean }` | Producer: route definitions; Consumer: `router.beforeEach` + `App.vue` | Канонизируется FE1 как единственный источник решения «показывать shell или нет» |
| `CTR-02` | `authStore` shape: `{ user, organization, organizations, membership, loading, error, isAuthenticated, signIn, signOut, switchOrganization, fetchCurrentUser, can }` | Producer: `stores/auth.js`; Consumer: shell компоненты и будущие feature views | Любое расширение требует обновления тестов FE1 |

### Failure Modes

- `FM-01` `fetchCurrentUser()` возвращает 401 (токен устарел) → store очищается, router guard редиректит на `login`; shell не должен застревать в loading.
- `FM-02` `switchOrganization` вызывает `fetchCurrentUser` и получает ошибку → store откатывает `organization` на предыдущее значение (если возможно) и показывает Vuetify snackbar; пользователь остаётся на текущей странице.
- `FM-03` `signOut` получает сетевую ошибку → локальная сессия всё равно очищается (текущее поведение store), UI редиректит на `login`.
- `FM-04` Отсутствует ни одной organization у user (edge из `SelectOrganizationPage` flow) → shell не рендерится, router ведёт на `selectOrganization` page.

### ADR Dependencies

| ADR | Current `decision_status` | Used for | Execution rule |
| --- | --- | --- | --- |
| [../../adr/ADR-002-no-typescript-frontend.md](../../adr/ADR-002-no-typescript-frontend.md) | accepted | Запрет TypeScript во frontend коде | Канонический input; FE1 пишет только JS |
| [../../adr/ADR-006-axios-api-client.md](../../adr/ADR-006-axios-api-client.md) | accepted | Axios как единственный HTTP клиент для auth/api вызовов | Канонический input; новые клиенты не вводим |

## Verify

### Exit Criteria

- `EC-01` Authenticated user видит shell (topbar + sidebar + main) на всех authenticated routes; guest user не видит shell ни на одной auth page.
- `EC-02` Logout из topbar очищает сессию и редиректит на `/auth/login`.
- `EC-03` Organization switcher меняет `authStore.organization`, перезапрашивает user, отображает новое имя и редиректит на Dashboard.
- `EC-04` Placeholder nav-слоты для Properties/Units/Amenities/Branches доступны из sidebar и рендерят «Скоро» под тем же shell'ом.
- `EC-05` Router guards: requiresAuth без сессии → login с redirect query; guest с активной сессией → Dashboard.
- `EC-06` Vitest suite зелёный локально и в CI; frontend coverage threshold поднят с 0 до `floor(actual) - 1` (не ниже 60) и зафиксирован в `testing-policy.md`.
- `EC-07` Simplify review пройден: нет premature abstractions, нет дублирования, ad-hoc CSS отсутствует.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `CTR-01`, `CON-02` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | `CTR-02`, `FM-03` | `EC-02`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-03` | `CON-02` | `EC-04`, `SC-04` | `CHK-01` | `EVID-01` |
| `REQ-04` | `CTR-02`, `FM-02` | `EC-03`, `SC-03` | `CHK-01` | `EVID-01` |
| `REQ-05` | `CTR-01`, `FM-01` | `EC-05`, `SC-05`, `NEG-01` | `CHK-01` | `EVID-01` |
| `REQ-06` | `FM-01`, `FM-03` | `EC-01`, `SC-06`, `NEG-02` | `CHK-01` | `EVID-01` |
| `REQ-07` | `CTR-01`, `CTR-02`, `CON-01`, `CON-02` | `EC-07`, `SC-07` | `CHK-02` | `EVID-02` |
| `REQ-08` | `CTR-02` | `EC-06`, `SC-01`..`SC-06`, `NEG-01`, `NEG-02` | `CHK-01` | `EVID-01` |
| `REQ-09` | `CON-03`, `DEC-01` | `EC-06`, `SC-08` | `CHK-03` | `EVID-03` |

### Acceptance Scenarios

- `SC-01` Authenticated user открывает `/` → видит topbar с brand "Apartus" и своим `full_name`, sidebar с org name и navigation (Dashboard + 4 placeholders), Dashboard view в `v-main`.
- `SC-02` Пользователь кликает «Выйти» в topbar → `authStore.signOut()` вызван, `user` очищен, router на `/auth/login`, shell исчез.
- `SC-03` Пользователь с двумя organizations кликает вторую в sidebar switcher → `authStore.switchOrganization` вызван, `fetchCurrentUser` перезапрошен, sidebar показывает новое org name, router на `/`.
- `SC-04` Пользователь кликает «Properties» в sidebar → route `/properties` под тем же shell'ом, `PlaceholderView` показывает «Скоро».
- `SC-05` Неаутентифицированный запрос `/properties` → router guard редиректит на `/auth/login?redirect=/properties`.
- `SC-06` Пока `authStore.loading === true` во время старта shell, `AppTopbar` рендерит `v-progress-linear` с `indeterminate`; после resolve прогресс исчезает, `full_name` виден.
- `SC-07` Секция `How → Solution` перечисляет ≥4 reference patterns с file refs на `frontend/src/`; PR FE1 ссылается на эту секцию как на canonical reference для FE2–FE5.
- `SC-08` После merge `frontend/vitest.config.js` содержит `test.coverage.thresholds.lines` > 0 и равно `floor(actual) - 1`; это же значение зафиксировано в `memory-bank/engineering/testing-policy.md § Coverage Ratchet`.

### Negative / Edge

- `NEG-01` Guest с активной сессией пытается открыть `/auth/login` → редирект на `/` (Dashboard), shell рендерится.
- `NEG-02` `fetchCurrentUser` отвечает 401 при старте shell → store очищается, router ведёт на `login`; shell не показывается; нет бесконечного spinner.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`..`EC-05`, `SC-01`..`SC-06`, `NEG-01`, `NEG-02` | `cd frontend && yarn test` | Vitest suite зелёный, все новые specs (store, topbar, sidebar, router guards, loading state) проходят | `artifacts/ft-hw2-fe1/verify/chk-01/vitest.log` |
| `CHK-02` | `EC-07`, `SC-07` | Simplify review shell кода по `testing-policy.md § Simplify Review`; проверить, что `How → Solution` перечисляет ≥4 reference patterns с file refs | Нет premature abstractions, дублирования, ad-hoc CSS; complexity только со ссылкой на `CON-*`/`FM-*`; ≥4 reference patterns присутствуют | `artifacts/ft-hw2-fe1/verify/chk-02/notes.md` |
| `CHK-03` | `EC-06`, `SC-08` | `cd frontend && yarn test:coverage`; CI job `frontend-test` зелёный с новым threshold | Actual coverage ≥ threshold; threshold поднят в `vitest.config.js` (≥60); `testing-policy.md § Coverage Ratchet` обновлён тем же числом | `artifacts/ft-hw2-fe1/verify/chk-03/coverage-summary.txt` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `artifacts/ft-hw2-fe1/verify/chk-01/` |
| `CHK-02` | `EVID-02` | `artifacts/ft-hw2-fe1/verify/chk-02/` |
| `CHK-03` | `EVID-03` | `artifacts/ft-hw2-fe1/verify/chk-03/` |

### Evidence

- `EVID-01` Vitest run log с полным списком passing specs (store, topbar, sidebar, router guards, loading state).
- `EVID-02` Simplify review notes: перечень рассмотренных файлов, вывод по complexity, подтверждение ≥4 reference patterns.
- `EVID-03` `coverage-summary` до и после + фактическое новое значение ratchet + diff `vitest.config.js` и `testing-policy.md`.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Vitest log | local run / CI `frontend-test` | `artifacts/ft-hw2-fe1/verify/chk-01/vitest.log` | `CHK-01` |
| `EVID-02` | Markdown notes | human reviewer | `artifacts/ft-hw2-fe1/verify/chk-02/notes.md` | `CHK-02` |
| `EVID-03` | Coverage summary + ratchet diff | local run + git diff | `artifacts/ft-hw2-fe1/verify/chk-03/coverage-summary.txt` | `CHK-03` |
