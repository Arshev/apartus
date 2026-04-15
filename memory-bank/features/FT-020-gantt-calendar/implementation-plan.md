---
title: "FT-020: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации FT-020 Gantt Calendar Phase 1. Фиксирует discovery context, последовательность шагов, риски и test strategy. Не переопределяет canonical scope/architecture/AC из feature.md."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_020_scope
  - ft_020_architecture
  - ft_020_acceptance_criteria
  - ft_020_blocker_state
---

# План имплементации

## Цель текущего плана

Заменить текущий [`frontend/src/views/CalendarView.vue`](../../../frontend/src/views/CalendarView.vue) на pixel-based Gantt calendar (6 компонентов + 2 utility-модуля + e2e), сохранив зелёный CI и атомарную revert-возможность через single switchover-коммит (см. `feature.md` / `ASM-06`).

## Current State / Reference Points

Файлы и паттерны репозитория, на которые опирается план. Несоблюдение reuse → drift с проектными конвенциями.

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| [`frontend/src/views/CalendarView.vue`](../../../frontend/src/views/CalendarView.vue) | Текущая 14-day CSS-grid реализация (≈200 LOC) | Заменяется (`REQ-14`); читаем для понимания текущих data fetching/click handlers/route params | Сохранить контракт `/reservations/new?unit_id=X&check_in=Y` (`REQ-11`) и навигацию на edit при click |
| [`frontend/src/__tests__/views/CalendarView.test.js`](../../../frontend/src/__tests__/views/CalendarView.test.js) | Test для текущей реализации | Удаляется в одном коммите вместе с view (`ASM-06`) | Покрытие переходит на новые тесты per Test Strategy |
| [`frontend/src/api/reservations.js`](../../../frontend/src/api/reservations.js) | API client: `list({from,to,status})`, `create`, `update`, `destroy`, `checkIn`, `checkOut`, `cancel` | Все нужные endpoints уже есть; backend изменения не требуются (`ASM-01`) | Использовать как есть; не дублировать |
| [`frontend/src/api/allUnits.js`](../../../frontend/src/api/allUnits.js) | API client: `list()` returns flattened units across properties | Источник rows для Gantt | Использовать как есть |
| [`backend/app/controllers/api/v1/reservations_controller.rb`](../../../backend/app/controllers/api/v1/reservations_controller.rb) — `reservation_json` (lines 139–156) | Backend serializer | Defines exact JSON shape (CTR-01 в feature.md) | Field list — single source of truth; не угадывать |
| [`frontend/src/router/index.js`](../../../frontend/src/router/index.js) | `/calendar` route → `CalendarView` lazy import | Меняется на `GanttCalendarView` в switchover commit | Сохранить `meta.requiresAuth: true` |
| [`frontend/src/plugins/vuetify.js`](../../../frontend/src/plugins/vuetify.js) | Design tokens `--v-theme-status-{confirmed,checked-in,checked-out,cancelled,pending,blocked}` | Цвета баров (`REQ-10`) | Использовать токены, не hardcoded hex |
| [`frontend/src/locales/ru.json`](../../../frontend/src/locales/ru.json), [`en.json`](../../../frontend/src/locales/en.json) | i18n keys | Новый namespace `calendar.gantt.*` (`REQ-13`) | Симметрично в обоих файлах; зеркальная структура |
| [`frontend/src/stores/auth.js`](../../../frontend/src/stores/auth.js) | Pinia store с `organization.currency` | Источник currency для tooltip price (`REQ-04` / `FM-07`) | `useAuthStore().organization?.currency \|\| 'RUB'` |
| [`frontend/src/__tests__/helpers/mountWithVuetify.js`](../../../frontend/src/__tests__/helpers/mountWithVuetify.js) | Test helper с Vuetify stubs + Pinia + Router + i18n | Mounting новых компонентов в Vitest | Расширить stubs если новые v-* компоненты нужны (но Vuetify built-ins уже покрыты) |
| [`frontend/playwright.config.js`](../../../frontend/playwright.config.js) | `testDir: './e2e'`, baseURL config | Расположение нового spec (`CHK-07`) | `frontend/e2e/calendar-overlap.spec.js` |
| [`frontend/e2e/reservations.spec.js`](../../../frontend/e2e/reservations.spec.js) | Reference Playwright spec — login helper, page selectors, beforeEach pattern | Pattern для нового spec | Mirror beforeEach + login helper |
| [`frontend/e2e/helpers.js`](../../../frontend/e2e/helpers.js) | Login + auth helpers для e2e | E2E auth setup | Reuse |
| [`backend/db/seeds.rb`](../../../backend/db/seeds.rb) — Reservations section | Существующий seed создаёт reservations с разными статусами | Source данных для e2e | Дополнить seed 3 overlapping reservations для CHK-07 (или в самом spec через API) |
| [`memory-bank/engineering/coding-style.md`](../../engineering/coding-style.md) (Frontend conventions) | `<script setup>`, no TS, JSDoc optional, Pinia setup-style stores | Style контракт | Соблюдать |

## Test Strategy

Какие test surfaces покрываются. Не переопределяет canonical CHK-* из feature.md.

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `frontend/src/utils/date.js` | `CON-01` | Нет | Vitest unit: `parseIsoDate` (TZ off-by-one regression), `addDays` (cross-month), `startOfDay`, `startOfMonth/endOfMonth`, `diffDays`, `formatMonth` (ru/en locales) | `yarn test src/__tests__/utils/date.test.js` | Frontend job | none | n/a |
| `frontend/src/utils/gantt.js` | `REQ-01,02,03`, `CHK-02` | Нет | Vitest unit: `dateToPixel`, `bookingWidth` (min-width clamp), `generateTopLevelDates` (месяцы), `generateBottomLevelDates` (дни), `assignLanes` (1/2/3 overlapping; non-overlapping → lane 0; chain a→b→c → lane 0/1/0) | `yarn test src/__tests__/utils/gantt.test.js` | Frontend job | none | n/a |
| `GanttTooltip.vue` | `REQ-04`, `FM-07`, `NEG-08` | Нет | Component test: рендер по props (booking + currency); пустая currency → `RUB` fallback | `yarn test src/__tests__/views/calendar/GanttTooltip.test.js` | Frontend job | none | n/a |
| `GanttTimelineItem.vue` | `REQ-01,05,10`, `SC-03`, `NEG-07` | Нет | Component test: status color class match (`bar-confirmed`, `bar-checked_in`, ...), click → router push, contextmenu → emit, cancelled → не рендерится | `yarn test src/__tests__/views/calendar/GanttTimelineItem.test.js` | Frontend job | none | n/a |
| `GanttTimelineRow.vue` | `REQ-03`, `SC-05`, `NEG-02,03` | Нет | Component test: lanes для 1/2/3 overlap (через `assignLanes`); orphan reservation skipped; invalid date `check_in >= check_out` skipped + console.warn | `yarn test src/__tests__/views/calendar/GanttTimelineRow.test.js` | Frontend job | none | n/a |
| `GanttTimelineHeader.vue` | `REQ-02`, `SC-01` | Нет | Component test: для range 14d на дату X → DOM содержит N day-cells, 1-2 month-cells, today-cell имеет класс is-today | `yarn test src/__tests__/views/calendar/GanttTimelineHeader.test.js` | Frontend job | none | n/a |
| `GanttTimeline.vue` | `REQ-01,06`, `SC-01,06` | Нет | Component test: `pixelsPerMs = viewportWidth / rangeMs`; today-marker DOM присутствует с `left` соответствующим текущему дню | `yarn test src/__tests__/views/calendar/GanttTimeline.test.js` | Frontend job | none | n/a |
| `GanttCalendarView.vue` | `REQ-08,09,10,11`, `SC-04,07,08`, `NEG-01,04,06`, `CTR-03` | Нет | Component test: range preset change → refetch с new from/to, manual refresh → refetch, visibilitychange → refetch, localStorage round-trip (write on select, read on mount), localStorage throw → fallback default, empty units → empty-state, empty cell click navigation | `yarn test src/__tests__/views/calendar/GanttCalendarView.test.js` | Frontend job | none | n/a |
| Coverage ratchet | `CON-03`, `EC-04`, `CHK-01` | `yarn test:coverage` baseline сохранён | Прогон с новыми тестами должен дать ≥ старого threshold | `yarn test:coverage` | Frontend job (если включает coverage gate) | none | n/a |
| E2E overlap, today, jump-to-date | `EC-06`, `CHK-07`, `SC-05,06` | Нет | Playwright: seed/setup 3 overlapping → `.gantt-item` count=3 with distinct `top`; today-marker visible; date-picker pick → viewport scroll measurable | `yarn test:e2e e2e/calendar-overlap.spec.js` | Smoke job (если e2e в нём) или отдельный e2e job | none | n/a |
| Visual: dark mode, today line color | `REQ-12`, `CHK-05`, `NEG-09` | n/a | n/a (визуальная проверка) | manual в dev (`yarn dev`) + dark toggle | none | Pixel comparison не оправдан в Phase 1 (один экран, design tokens уже unit-tested через Vuetify); скриншоты в EVID-05 как evidence | `AG-02` (sign-off перед merge) |
| `frontend/src/__tests__/views/CalendarView.test.js` | `EC-02`, `REQ-14` | Текущий test для CalendarView | Удаляется в switchover commit | проверка `git show` атомарного коммита | n/a | none | n/a |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | E2E: как сидить 3 overlapping reservations — расширить `seeds.rb` или создать через API из теста? | Существующий `seeds.rb` не имеет overlap-фикстуры. Расширение seed может повлиять на другие e2e, создание из API требует auth + cleanup. | `STEP-15` (e2e unskip) | Default: создать в spec через `apiClient.post` после login + cleanup в `afterEach`. Если test становится flaky / медленным — расширить seed под `AG-05`. |
| `OQ-02` | Vuetify v-date-picker `range` prop: API в текущей версии (Vuetify ^4.0.4) — `multiple="range"` или `range` boolean? | В Vuetify 3 был `range` boolean; v4 мог изменить (см. также `SettingsView.vue` для существующего использования v-date-picker). | `STEP-13` (toolbar в `GanttCalendarView`) | Default: проверить через `node_modules/vuetify/lib/components/VDatePicker/*.d.ts` и dev-server preview перед finalize toolbar markup. Если несовместимость — fallback на два отдельных date inputs. Resolve в `STEP-01` параллельно с OQ-03 (грошовый grep). |
| `OQ-03` | Тип данных `check_in`/`check_out` в JSON ответе: ISO date string `"2026-04-15"` или ISO datetime `"2026-04-15T00:00:00.000Z"`? | Backend column тип `date`; Rails default JSON serializer для `date` — ISO date string. Но если кто-то добавил `as_json` override — может быть datetime. | `STEP-02` (`utils/gantt.js`) и `STEP-03` (utils tests) | Default: предположить ISO date `"YYYY-MM-DD"`, использовать `parseIsoDate` (CON-01). Verify в STEP-01 через curl/dev-tools. Если datetime — `parseIsoDate` skip-fallback на native `new Date(str)` с TZ offset normalization. |
| `OQ-04` | localStorage key `apartus-calendar-view` — конфликтует ли с другими keys? | `apartus-theme` (AppTopbar), `currentOrganizationId`, `locale` уже заняты. | none (low risk) | Default: префикс `apartus-` уже принят, продолжаем. Документировать в `domain/frontend.md` (`STEP-17`). |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup (frontend) | `cd frontend && yarn install`; node 22 (per CI) | All steps | `yarn test` падает с module resolution error |
| setup (backend, для e2e) | Rails server up на localhost:3000 c seed data; PostgreSQL local; `cd backend && bin/rails db:seed` если фикстуры | `STEP-15`, `STEP-18` (manual QA) | E2E spec timeout / 401 / empty data |
| setup (e2e infra) | Playwright browsers installed (`yarn playwright install`) | `STEP-12` (skeleton), `STEP-15` (unskip) | `Browser not found` |
| test (vitest) | `cd frontend && yarn test [path]` — vitest run mode | `STEP-03, 05, 07..11, 13` evidence | Failures collected, exit code != 0 |
| test (e2e) | `cd frontend && yarn test:e2e [spec]` — Playwright headless | `STEP-12` (skeleton green), `STEP-15` (unskipped green) evidence | Failures + Playwright HTML report |
| test (lint markdown) | `npx markdownlint-cli2 "**/*.md"` | `STEP-17` (docs) | Errors блокируют CI Lint job |
| dev preview | `cd frontend && yarn dev` (Vite) — для визуальной проверки CHK-05 / OQ-02 dev-preview / OQ-03 curl | `STEP-13` (toolbar dev-preview для OQ-02 confirm), `STEP-18` (manual QA) | n/a (manual) |
| network / secrets | Без новых secrets / ENV. Локальный seed-fixed login через `frontend/e2e/helpers.js`. | `STEP-15` | Login failure → e2e скипают |
| coverage gate | `yarn test:coverage` ratchet баз = текущий значение из `frontend/vite.config.js` или `vitest.config.js` (Coverage configs); план не понижает. | `STEP-16` (final), `CHK-01` | Coverage drop — ratchet failure |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `feature.md / status: active` | Feature.md прошла gate, в `status: active`, `delivery_status: not_started` | All STEP | yes |
| `PRE-02` | `ASM-01` | Backend `GET /reservations?from=&to=` и `GET /all_units` отдают данные согласно `CTR-01/02` без backend изменений | All STEP | yes |
| `PRE-03` | `ASM-03` | Vuetify theme tokens `--v-theme-status-*` определены в `plugins/vuetify.js` | `STEP-06` | yes |
| `PRE-04` | `CON-01` | OQ-03 разрешён: формат `check_in/check_out` в API подтверждён | `STEP-02, 03` | yes для финальной формы `gantt.js`; работа на STEP-01 (date utils) может стартовать параллельно |
| `PRE-05` | `CON-02`, coding-style.md frontend section | `<script setup>`, Pinia setup-style, no TS — соблюдается | All STEP | yes |
| `PRE-06` | `OQ-02` | Vuetify v-date-picker API подтверждён (resolved в `STEP-01`) | `STEP-13` (toolbar в GanttCalendarView) | no для предшествующих STEP |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-1` | `CON-01`, foundation | `frontend/src/utils/date.js` + tests; reusable базис | agent | `PRE-01` |
| `WS-2` | `REQ-01,02,03` (utils part), `CHK-02` (utils part) | `frontend/src/utils/gantt.js` + tests; pure pixel/lane/header math | agent | `WS-1`, `PRE-04` (для финальных edge-case тестов) |
| `WS-3` | `REQ-13` (i18n keys) | `calendar.gantt.*` namespace в `ru.json`/`en.json` | agent | `PRE-05` |
| `WS-4` | `REQ-04..07,10..12`, components | 6 Vue компонентов + tests, не подключены к route | agent | `WS-2`, `WS-3`, `PRE-03,06` |
| `WS-5` | `REQ-08,09,11`, `SC-04,07,08` | `GanttCalendarView.vue` создан + tests, не подключён к route (`STEP-13`) | agent | `WS-4` зелёный |
| `WS-6` | `REQ-14`, `EC-02`, `ASM-06` | Атомарный switchover commit (`STEP-14`): delete CalendarView + test, route update | agent (с `AG-01`) | `WS-5` зелёный |
| `WS-7` | `REQ-15` (e2e часть), `CHK-07`, `EC-06` | Playwright spec skeleton (`STEP-12`, до switchover) → unskip и assert (`STEP-15`, после switchover) | agent | `WS-6` для финального unskip; skeleton — после `WS-2` |
| `WS-8` | `REQ-13` (docs), backlog update | Updated `domain/frontend.md` (Calendar section), `domain/problem.md` (backlog item → done) | agent | `WS-6` (но drafting может стартовать после CP-02 параллельно) |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | Перед `STEP-14` (atomic switchover commit) | `WS-6` | Single commit удаляет existing UI и переключает route — нельзя сделать тихо. Необратимое касание прод-функционала. | Пользователь даёт approve в чате; ссылка на approval-сообщение зафиксирована в commit message |
| `AG-02` | Перед merge в main (PR review sign-off) | Manual visual QA (CHK-05) | Нет automated pixel comparison, поэтому визуальная корректность подтверждается человеком (light + dark, hover, today marker) | Пользователь approve через PR review / в чате; скриншоты в `artifacts/ft-020/verify/chk-05/` |
| `AG-03` | Если в процессе обнаружится, что native `Date` недостаточен (CON-01 list incomplete) | `STEP-01, 02` | Добавление npm пакета (dayjs или moment) — autonomy boundary | Пользователь approve явным "да" + добавление в `frontend/package.json` |
| `AG-04` | Если требуется backend change (вышло за `ASM-01`) | Любой STEP | План декларирует "no backend changes"; нарушение → upstream feature.md update | Пользователь approve, обновление feature.md (включая пересмотр `ASM-01`) |
| `AG-05` | Fallback по `OQ-01`: расширение `backend/db/seeds.rb` для overlap-фикстуры | `STEP-15` если e2e flaky на API-seeded approach | Изменение прод-seed может повлиять на другие e2e и dev-окружения | Пользователь approve явным "да"; diff seeds.rb приложен к approval |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `OQ-02`, `OQ-03` | Resolve OQ-03 (формат `check_in/check_out` в JSON) **+** OQ-02 (Vuetify v-date-picker range API). | `curl` живого backend; `grep` в `node_modules/vuetify/lib/components/VDatePicker/*.d.ts` или существующее использование в `SettingsView.vue` | Discovery note в плане (обновить OQ-02, OQ-03 → resolved) | n/a | n/a | `curl localhost:3000/api/v1/reservations?from=2026-04-01&to=2026-04-30 -H "Authorization: Bearer $TOKEN"` → проверить тип `check_in`; `grep -A3 "range" node_modules/vuetify/lib/components/VDatePicker/VDatePicker.d.ts` | `PRE-01,02` | none | OQ-03: если формат неожиданный (datetime + TZ) — обновить CON-01. OQ-02: если range API не доступен — fallback two inputs, документировать в STEP-13 |
| `STEP-02` | agent | `CON-01` | Создать `frontend/src/utils/date.js` с native Date helpers по списку CON-01 (включая `parseIsoDate`) | `frontend/src/utils/date.js` (new) | Module exports | `CHK-01,02` | `EVID-01,02` | `node -e "import('./src/utils/date.js').then(m => console.log(m.parseIsoDate('2026-04-15')))"` | `STEP-01` | none | Если operation не покрывается → `AG-03` |
| `STEP-03` | agent | `CON-01`, test strategy row "date.js" | Vitest для всех функций `date.js`. Особое внимание `parseIsoDate` TZ test (новый Date в UTC vs local). | `frontend/src/__tests__/utils/date.test.js` (new) | Test file | `CHK-01,02` | `EVID-01,02` | `cd frontend && yarn test src/__tests__/utils/date.test.js` | `STEP-02` | none | Если parseIsoDate falls в jsdom — escalate |
| `STEP-04` | agent | `REQ-01,02,03`, `WS-2` | Создать `frontend/src/utils/gantt.js`: `dateToPixel`, `bookingWidth`, `generateTopLevelDates`, `generateBottomLevelDates`, `assignLanes`. JSDoc для каждой функции. | `frontend/src/utils/gantt.js` (new) | Module exports | `CHK-02` | `EVID-02` | Smoke import в node | `STEP-03` | none | Если pure-functions требуют DOM (не должны) |
| `STEP-05` | agent | Test strategy row "gantt.js" | Vitest unit tests для всех 5 функций. assignLanes: матрица overlap (1, 2, 3 brons), greedy chain a→b→c. | `frontend/src/__tests__/utils/gantt.test.js` (new) | Test file | `CHK-02` | `EVID-02` | `cd frontend && yarn test src/__tests__/utils/gantt.test.js` | `STEP-04` | none | n/a |
| `STEP-06` | agent | `REQ-13`, `WS-3` | Добавить `calendar.gantt.*` keys в `frontend/src/locales/ru.json` + `en.json` (toolbar buttons, tooltip labels, context menu, empty state, errors). Зеркальная структура. | `frontend/src/locales/ru.json`, `en.json` | Updated locale files | `CHK-04` | `EVID-04` | `node` script сравнивающий keysets ru vs en (как в e7cc211 для FT-019 при i18n ревью) | `STEP-01` | none | Если keys конфликтуют с existing |
| `STEP-07` | agent | `REQ-04,10`, `FM-07` | Создать `GanttTooltip.vue` (props: booking, currency-from-store) + test | `frontend/src/views/calendar/GanttTooltip.vue` + `__tests__/views/calendar/GanttTooltip.test.js` | Component + test | `CHK-02` | `EVID-02` | `yarn test src/__tests__/views/calendar/GanttTooltip.test.js` | `STEP-06` | none | n/a |
| `STEP-08` | agent | `REQ-01,05,10,11`, `SC-03`, `NEG-07` | Создать `GanttTimelineItem.vue` (status color class, click → `router.push`, contextmenu → emit) + test | `frontend/src/views/calendar/GanttTimelineItem.vue` + test | Component + test | `CHK-02` | `EVID-02` | `yarn test src/__tests__/views/calendar/GanttTimelineItem.test.js` | `STEP-04, 06` | none | n/a |
| `STEP-09` | agent | `REQ-03`, `SC-05`, `NEG-02,03` | Создать `GanttTimelineRow.vue` (consume `assignLanes`, render Items, skip invalid/orphan reservations) + test | `frontend/src/views/calendar/GanttTimelineRow.vue` + test | Component + test | `CHK-02` | `EVID-02` | `yarn test src/__tests__/views/calendar/GanttTimelineRow.test.js` | `STEP-04, 08` | none | n/a |
| `STEP-10` | agent | `REQ-02`, `SC-01` | Создать `GanttTimelineHeader.vue` (consume `generateTopLevelDates/BottomLevelDates`, sticky-top) + test | `frontend/src/views/calendar/GanttTimelineHeader.vue` + test | Component + test | `CHK-02` | `EVID-02` | `yarn test src/__tests__/views/calendar/GanttTimelineHeader.test.js` | `STEP-04` | none | n/a |
| `STEP-11` | agent | `REQ-01,06`, `SC-01,06` | Создать `GanttTimeline.vue` (viewport, pixelsPerMs computation, today-marker, scroll-to-today method, headers + rows orchestration) + test | `frontend/src/views/calendar/GanttTimeline.vue` + test | Component + test | `CHK-02` | `EVID-02` | `yarn test src/__tests__/views/calendar/GanttTimeline.test.js` | `STEP-09, 10` | none | n/a |
| `STEP-12` | agent | `REQ-15` (e2e skeleton), `ER-07` mitigation | Создать **skipped** Playwright spec `frontend/e2e/calendar-overlap.spec.js` (login + navigate + 3 `test.skip(...)` placeholders). Прогон убеждается, что Playwright config + login helper + browser binary работают. Раскрытие assertions в `STEP-15` после switchover. Это early validation, чтобы фундаментальная flakiness Playwright поднялась до switchover, а не после. | `frontend/e2e/calendar-overlap.spec.js` (new, skipped) | Playwright spec skeleton | n/a (skipped тесты passing — green) | n/a | `cd frontend && yarn test:e2e e2e/calendar-overlap.spec.js` → 0 failures, 3 skipped | `PRE-01..06` | none | Если playwright config / login helper сломан — fix до STEP-13 |
| `STEP-13` | agent | `REQ-08,09,11`, `SC-04,07,08`, `NEG-01,04,06`, `CTR-03` | Создать `GanttCalendarView.vue` (toolbar: range preset, custom range via v-date-picker per OQ-02, today-button, jump-to-date, refresh-button; orchestrates `GanttTimeline`; `localStorage('apartus-calendar-view')` round-trip; `visibilitychange` listener) + component test для orchestration. **Не подключать к router** — компонент существует, но `/calendar` всё ещё указывает на старый `CalendarView`. | `frontend/src/views/calendar/GanttCalendarView.vue` (new) + `__tests__/views/calendar/GanttCalendarView.test.js` (new) | Component + test | `CHK-01,02` | `EVID-01,02` | `yarn test src/__tests__/views/calendar/GanttCalendarView.test.js` (full suite зелёный) | `STEP-11, 12` | none | Test fail → fix перед `STEP-14` |
| `STEP-14` | agent (with `AG-01`) | `REQ-14`, `EC-02`, `ASM-06`, `STOP-01` mitigation | **Атомарный switchover commit:** `git rm` `frontend/src/views/CalendarView.vue` + `frontend/src/__tests__/views/CalendarView.test.js`; update `frontend/src/router/index.js` route `/calendar` → `GanttCalendarView`. Финальный `yarn test && yarn build` зелёный → один commit с этими тремя изменениями. | `frontend/src/router/index.js` (modify); `views/CalendarView.vue` (delete); `__tests__/views/CalendarView.test.js` (delete) | Atomic commit | `CHK-01,03`, `EC-02` | `EVID-01,03` | `yarn test && yarn build && git show <commit> --stat` показывает delete + delete + modify в одном коммите | `STEP-13` | `AG-01` | CI красный — `STOP-01` (revert одним `git revert HEAD`) |
| `STEP-15` | agent | `REQ-15` (e2e часть), `CHK-07`, `EC-06`, `OQ-01` | Раскрыть assertions в `frontend/e2e/calendar-overlap.spec.js`: убрать `.skip`, добавить seed 3 overlapping reservations через `apiClient.post` после login + cleanup в `afterEach`; assert 3× `.gantt-item` distinct `top` + today-marker visible + jump-to-date moves viewport. | `frontend/e2e/calendar-overlap.spec.js` (modify) | Playwright assertions live | `CHK-07` | `EVID-07` | `cd frontend && yarn test:e2e e2e/calendar-overlap.spec.js` | `STEP-14` | none | Flaky → `STOP-04`; seed-extension fallback требует `AG-05` |
| `STEP-16` | agent | full CI green | Прогнать полный test suite + lint + build локально, поправить regressions если есть | n/a | Green status | `CHK-01,06` | `EVID-01,06` | `cd frontend && yarn test && yarn build && cd .. && npx markdownlint-cli2 "**/*.md"` | `STEP-15` | none | Coverage drop → расширить tests |
| `STEP-17` | agent | `REQ-13` (docs), `WS-7` | Update `memory-bank/domain/frontend.md` секция Calendar; backlog item "Visual calendar (month view)" в `problem.md` → отметить как доставленный (timeline replaces month-view use-case per NS-12 в feature.md) | `memory-bank/domain/frontend.md`, `memory-bank/domain/problem.md` | Updated docs | `CHK-04, 06` | `EVID-04, 06` | `npx markdownlint-cli2 "memory-bank/domain/*.md"` | `STEP-14` | none | n/a |
| `STEP-18` | agent (with `AG-02`) | `CHK-05`, `NEG-09` | Manual QA в dev: light + dark mode, today marker visible, hover tooltip, contextmenu, range change. Скриншоты в `artifacts/ft-020/verify/chk-05/`. Evidence-collection в `artifacts/ft-020/verify/chk-{01..07}/` (test logs, lint output, screenshots, CI run links) выполняется попутно — каждый STEP уже знает свой evidence path. | `artifacts/ft-020/verify/chk-05/*.png` + остальные `chk-*` директории заполняются | Screenshots + checklist + complete evidence tree | `CHK-05`, all CHK populated | `EVID-05`, all EVID | dev server + manual checklist + `ls artifacts/ft-020/verify/` shows 7 non-empty dirs | `STEP-14..17` | `AG-02` | Visual artifact mismatch → fix или escalate |
| `STEP-19` | agent (with `AG-02`) | feature closure | Обновить `feature.md`: `delivery_status: not_started → done`; обновить `features/README.md`. Зафиксировать AG-01/AG-02 в commit message. | `memory-bank/features/FT-020-gantt-calendar/feature.md` (frontmatter), `features/README.md` | Closure | `EC-01..06` | All EVID | Manual review feature.md | `STEP-18` | `AG-02` | Если хоть один CHK не закрыт — не закрывать |

## Parallelizable Work

- `PAR-01` Шаги STEP-02..05 (utils + tests) — sequential, но `STEP-06` (locales) и `STEP-17` (docs draft) можно делать параллельно с чем угодно после `STEP-01`. Распараллелить помогает context switch при ожидании approval.
- `PAR-02` Component-тесты (STEP-07..11 каждый со своим test) — последовательны по dependency chain (Item → Row → Timeline), но внутри одного STEP test пишется параллельно с компонентом.
- `PAR-03` `STEP-12` (e2e skeleton) можно делать параллельно с `STEP-13` (GanttCalendarView) — разные файлы, разные write surfaces.
- `PAR-04` `STEP-17` (docs) — drafting можно параллельно с `STEP-15..16` после CP-04 (когда switchover landed и архитектура зафиксирована).
- `PAR-05` `STEP-14` (atomic switchover) **не распараллеливать** — single write surface (router + delete + delete).

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01..05`, `CHK-02` | All utils + tests merged green; foundation готов | `EVID-02` |
| `CP-02` | `STEP-06..11`, `CHK-02` | All leaf компоненты (Tooltip, Item, Row, Header, Timeline) + tests готовы; `yarn test` green | `EVID-02` |
| `CP-03` | `STEP-12, 13`, `CHK-01,02` | E2E skeleton green (skipped); GanttCalendarView + test готов; e2e infra и компонент orchestration независимо проверены | `EVID-01,02` |
| `CP-04` | `STEP-14`, `AG-01`, `CHK-01,03`, `EC-02` | Atomic switchover commit landed; CI green; CalendarView удалён | `EVID-01,03` |
| `CP-05` | `STEP-15`, `CHK-07`, `EC-06` | E2E unskipped + asserts pass | `EVID-07` |
| `CP-06` | `STEP-16..18`, `AG-02`, `CHK-04,05,06` | Full CI green + manual QA + docs + lint + evidence собран | `EVID-04,05,06` |
| `CP-07` | `STEP-19`, all CHK | feature.md → `delivery_status: done`; зарегистрировано в `features/README.md` | All EVID |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | OQ-03 reveal'ит datetime+TZ вместо date string | parseIsoDate (CON-01) не работает; off-by-one render | Mitigation готов: fallback на `new Date(str)` + TZ normalization. STEP-01 разрешает upfront. | `STEP-01` curl показывает datetime |
| `ER-02` | Vuetify v-date-picker `range` API оказался incompatible (OQ-02) | Toolbar не функционален как описан в `REQ-08` | Fallback: два отдельных date inputs (from / to). UX чуть хуже, но не блокирует gate. Mitigation upfront: STEP-01 проверяет API через grep до начала разработки toolbar. | `STEP-13` dev preview подтверждает несовместимость, не выявленную в STEP-01 |
| `ER-03` | Coverage ratchet падает после удаления CalendarView.test.js в `STEP-14` | CHK-01 fails, ratchet failure блокирует CI | Покрытие уже переехало на новые тесты к моменту STEP-14 (STEP-13 + STEP-7..11). STEP-14 — только delete + router. Если ratchet падает — добавить недостающие assertions в новых тестах. | `STEP-14` ratchet error |
| `ER-04` | jsdom + `<teleport>` для tooltip плохо работает | GanttTooltip компонент-тест fails | Mitigation: использовать stub в test для `<teleport>`, проверять props/emits отдельно от DOM portal. | `STEP-07` test write |
| `ER-05` | Performance issue с 30d × 50 units (≥100 reservations) — медленный render | UX degradation | Acknowledged как `NS-16` в feature.md; не enforce gate. Если subjectively медленно — добавить `key` memoization, defer virtualization в FT-022. | Manual QA `STEP-18` |
| `ER-06` | Conflict с branch `main` пока работаем (другие feature ветки коммитят) | Merge conflict при PR | Mitigation: перед `STEP-14` rebase на main; маленькие preparation коммиты не пересекаются с обычным change surface (новые файлы). | `git pull --rebase` перед switchover |
| `ER-07` | E2E spec flaky из-за async render времени Gantt | CHK-07 intermittent fail | Mitigation 1: skeleton spec в `STEP-12` (до switchover) ловит infrastructure flakiness заранее. Mitigation 2: Playwright auto-wait + `.gantt-item` selector с min count assertion; `waitForFunction` для today-marker. | Skeleton run в STEP-12 нестабилен ИЛИ unskipped run в STEP-15 фейлится >1 раза |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `STEP-14`, `ER-03` | CI падает после atomic switchover commit | `git revert HEAD` (один атомарный коммит → safe single revert per `ASM-06`) | main pre-switchover; реанализ `feature.md` или повторный plan-review |
| `STOP-02` | `OQ-03`, `ER-01` | Backend отдаёт неожиданный формат + native Date insufficient | Не катить switchover. Эскалация с предложением добавить `dayjs` (`AG-03`). | Plan на паузе, feature остаётся active, delivery_status=not_started |
| `STOP-03` | `AG-01` | Пользователь не одобрил switchover (например, нашёл UX-проблему в preview) | Доработать STEP-13 по фидбеку, повторно запросить approval | Pre-switchover branch state |
| `STOP-04` | `CHK-07`, `ER-07` | E2E постоянно flaky after 3 retries в `STEP-15` | Изолировать root cause (seed timing? render race?). Если не решается за 1 час — упростить spec до core (overlap only) и открыть follow-up issue для today/jump. Если seed-extension fallback нужен — `AG-05`. | Reduced spec covers EC-06 minimum; jump-to-date ручная проверка |
| `STOP-05` | `AG-04` | Обнаружено required backend change | Halt plan, открыть upstream-update в feature.md (`ASM-01` → false), запросить approval, потенциально вынести в отдельную фичу | Feature plan на паузе |

## Готово для приемки

План считается исчерпанным когда:

- Все `STEP-01..19` помечены done в trace (commit history содержит соответствующие atomic commits).
- Все `CP-01..07` пройдены.
- Все `CHK-01..07` (canonical из `feature.md`) имеют evidence в `artifacts/ft-020/verify/chk-{01..07}/` (заполнено по ходу через STEP-18).
- `feature.md` переведена в `delivery_status: done`.
- `features/README.md` отражает новый статус.
- PR в main смержен (`AG-02` дано), CI зелёный.

После этого секция `Verify` в `feature.md` — single source of truth для финальной приёмки.
