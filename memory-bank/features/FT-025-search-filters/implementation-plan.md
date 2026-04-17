---
title: "FT-025: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план FT-025 Gantt Search Bar. Новые utils (debounce + filter) + toolbar UI в CalendarView."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_025_scope
  - ft_025_architecture
  - ft_025_acceptance_criteria
  - ft_025_blocker_state
---

# План имплементации

## Цель

Добавить collapsible search bar в Gantt toolbar. Pure utils (`debounce` + `filterUnitsAndReservations`) + state management в `GanttCalendarView` + persistence. Stacks поверх всех 4 special modes. Ноль backend changes.

## Current State / Reference Points

| Path | Current | Reuse |
|---|---|---|
| `utils/` | `gantt.js`, `date.js`, `currency.js` | Добавить `debounce.js`, `search.js` |
| `views/calendar/GanttCalendarView.vue` | `rangeDays`, `anchorDate`, `specialMode`, `setSpecialMode`, `loadStoredView/persistView`, 4 toolbar mode buttons | Добавить `searchQuery`, `debouncedQuery`, `searchOpen`, search toolbar element, computed `filtered`, extend persistence |
| `views/calendar/GanttTimeline.vue` | Принимает `units`, `reservations`, `specialMode` props | Без изменений (принимает filtered через existing props) |
| `views/calendar/GanttTimelineRow/Item.vue` | Per-unit/per-booking | Без изменений |
| `locales/ru.json`, `en.json` | `calendar.gantt.*` с modes/markers/labels | Добавить `search.placeholder/empty/open` |
| `__tests__/utils/` | `gantt.test.js`, `date.test.js`, `currency.test.js` | `debounce.test.js`, `search.test.js` |
| `__tests__/views/calendar/GanttCalendarView.test.js` | FT-021..024 toggle + persistence tests | Extend: search input + filter + persistence + stacks |
| `e2e/calendar-overlap.spec.js` | 7 tests (render, today, jump, 4 mode toggles) | 8-й для search |

## Test Strategy

| Surface | Canonical | Existing | Planned | Local/CI | Manual | Approval |
|---|---|---|---|---|---|---|
| `debounce` | `CTR-01`, `CHK-02` | N/A | Fake timer: single call fires after delay, rapid calls coalesce to last, cancel prevents fire | `yarn test debounce.test.js` | — | — |
| `filterUnitsAndReservations` | `CTR-02`, `REQ-03`, `CHK-02` | N/A | Matrix: empty/query × unit-name/property/guest match × case-insensitive × null guest_name × ordering preserved × independent field match (NEG-04) × internal spaces (FM-09) | `yarn test search.test.js` | — | — |
| CalendarView search integration | `REQ-01..07,10`, `CHK-02` | FT-021..024 tests | Input mount on click, autofocus, Escape clears+collapses, debounce coalescing, filter passed to Timeline, persistence round-trip (including restore bypass), empty state renders, stacks with mode | `yarn test GanttCalendarView.test.js` | — | — |
| i18n parity | `REQ-08`, `CHK-04` | 440 keys | +3 keys each (`search.placeholder/empty/open`) | node parity check | — | — |
| E2e search | `SC-01,04,05,06`, `CHK-07` | 7 tests | 8-й: click magnify → input visible → type «гость» → filtered DOM; Escape → restored; reload → query persisted | `yarn test:e2e` | — | — |
| Dark + light QA | `REQ-09`, `NEG-06`, `CHK-05` | FT-024 QA pattern | Screenshots: collapsed / expanded / filled / empty-state, both themes | Manual dev | Читаемость, нет конкуренции с toolbar icons | `AG-01` |

## Open Questions

Нет. Scope и дизайн-решения зафиксированы в feature.md после review gate. Все blockers и should-fix addressed.

## Environment Contract

Standard (same as FT-021..024):

- Dev: `cd frontend && yarn dev` @ :5173
- Backend: `cd backend && rails s` @ :3000 with seeded demo data
- Playwright: `cd frontend && yarn test:e2e` (auto-starts both dev servers per `playwright.config.js`)

## Preconditions

| PRE | Ref | State | Blocks |
|---|---|---|---|
| `PRE-01` | `feature.md status: active` | ✓ | yes |
| `PRE-02` | FT-020..024 merged | ✓ (branch `main` @ `46dab44`) | yes |
| `PRE-03` | Baseline 610/610 frontend tests pass | ✓ verified STEP-01 на `ft-025-search-filters` branch | yes |

## Workstreams

| WS | Implements | Result | Deps |
|---|---|---|---|
| `WS-1` | `REQ-02`, `CTR-01` | `debounce` util + tests | `PRE-*` |
| `WS-2` | `REQ-03`, `CTR-02` | `filterUnitsAndReservations` + tests | `PRE-*` |
| `WS-3` | `REQ-01,04..07`, `CTR-03` | CalendarView integration (toolbar + state + persistence + empty state) | `WS-1`, `WS-2` |
| `WS-4` | `REQ-08` | Locales | parallel с WS-3 |
| `WS-5` | `REQ-10` e2e | Playwright test | `WS-3` |
| `WS-6` | Docs + closure | frontend.md Search subsection; features/README register; delivery_status done | `WS-5` |

## Approval Gates

> AG-* процедурные.

| AG | Trigger | Applies | Why |
|---|---|---|---|
| `AG-01a` | После STEP-10 | QA evidence | Скриншоты/записи собраны; автор self-check прошёл |
| `AG-01b` | Перед merge (STEP-13) | full PR | Human pre-merge sign-off: визуальная корректность search UI в dark + light, UX smoothness collapse/expand/Escape |
| `AG-02` | Нужен npm | any STEP | CON-01 (debounce пишется вручную) |
| `AG-03` | Backend change | any STEP | CON-04 (весь filter client-side) |

## Порядок работ

| Step | Actor | Implements | Goal | Touchpoints | Verifies | EVID | Check |
|---|---|---|---|---|---|---|---|
| `STEP-01` | agent | `PRE-*` | Grounding — прочитать existing toolbar pattern в GanttCalendarView; ✓ baseline 610/610 | — | n/a | n/a | `yarn test` |
| `STEP-02` | agent | `REQ-02`, `CTR-01` | `utils/debounce.js` — trailing-edge factory с `.cancel()` | `utils/debounce.js` | `CHK-02` | `EVID-02` | N/A (тесты в STEP-03) |
| `STEP-03` | agent | `REQ-02` tests | Fake-timer tests: single call / rapid coalesce / cancel | `__tests__/utils/debounce.test.js` | `CHK-02` | `EVID-02` | `yarn test debounce.test.js` |
| `STEP-04` | agent | `REQ-03`, `CTR-02`, `FM-01..03,05,09` | `utils/search.js#filterUnitsAndReservations(units, reservations, query)` — pure, preserves order, case-insensitive substring, null-safe, independent field match | `utils/search.js` | `CHK-02` | `EVID-02` | N/A (тесты в STEP-05) |
| `STEP-05` | agent | `REQ-03` tests | Matrix: empty/unit-name/property/guest/no-match/case/null guest_name/ordering/independent fields/internal spaces | `__tests__/utils/search.test.js` | `CHK-02` | `EVID-02` | `yarn test search.test.js` |
| `STEP-06` | agent | `REQ-08` | Locales: `calendar.gantt.search.{placeholder,empty,open}` ru+en | `ru.json`, `en.json` | `CHK-04` | `EVID-04` | node parity |
| `STEP-07a` | agent | `REQ-01,05,07` | `GanttCalendarView.vue`: state refs (`searchQuery`, `debouncedQuery`, `searchOpen`), debouncedSetter w/ 200ms + onBeforeUnmount cancel (FM-08), computed `filtered` from `filterUnitsAndReservations`, передать `filtered.units`/`filtered.reservations` в `<GanttTimeline>` | `GanttCalendarView.vue` | `CHK-02` | `EVID-02` | N/A (тесты в STEP-08) |
| `STEP-07b` | agent | `REQ-01,04,05` | Toolbar UI: conditional v-btn icon mdi-magnify ↔ v-text-field (collapsed/expanded по `searchOpen`), autofocus, Escape handler (clear + collapse + refocus icon btn via template ref), blur handler (collapse iff query empty), maxlength=100 (FM-04), clearable | `GanttCalendarView.vue` | `CHK-02` | `EVID-02` | N/A |
| `STEP-07c` | agent | `REQ-04` | Empty-state branch в template: `v-else-if="debouncedQuery && filtered.units.length === 0"` → `v-empty-state` с иконкой mdi-magnify-close, interpolated query в тексте | `GanttCalendarView.vue` | `CHK-02` | `EVID-02` | N/A |
| `STEP-07d` | agent | `REQ-06`, `CTR-03` | Extend `loadStoredView` (set both `searchQuery` и `debouncedQuery` sync если non-empty, auto-open bar через `searchOpen.value = true`) + `persistView` (extra field) + watch `searchQuery` → persist. **Move `loadStoredView()` call из `onMounted` в `<script setup>` top-level** (перед первым render) — иначе reload покажет нефильтрованный DOM 1 frame. Regression protection для existing `rangeDays/specialMode` через существующие тесты | `GanttCalendarView.vue` | `CHK-02` | `EVID-02` | N/A |
| `STEP-08` | agent | `REQ-01,04..07,10` tests | Extend CalendarView tests: search input toggle, debounce coalesce, filter prop-передача (spy через `<GanttTimeline>` stub), Escape clear, persistence round-trip (including restore bypass debounce), empty state renders, stacks with heatmap (expect filtered units и specialMode coexist). FT-021..024 tests unchanged. | `__tests__/views/calendar/GanttCalendarView.test.js` | `CHK-02` | `EVID-02` | `yarn test GanttCalendarView.test.js` |
| `STEP-09` | agent | `REQ-10` e2e, `CHK-07` | Extend e2e: click magnify → input appears → type «гость» → DOM shrinks; Escape → restored; type `Q` → reload → query restored | `e2e/calendar-overlap.spec.js` | `CHK-07` | `EVID-07` | `yarn test:e2e` |
| `STEP-10` | agent (AG-01a) | `CHK-05` manual QA | Dev + screenshots light + dark: collapsed / expanded empty / expanded filled / empty-state результат | `artifacts/ft-025/verify/chk-05/` | `CHK-05` | `EVID-05` | dev + manual |
| `STEP-11` | agent | full gate | `yarn test` + `yarn build` + markdownlint | — | `CHK-01,02,04,06` | `EVID-01,02,04,06` | all green |
| `STEP-12` | agent | Docs + closure | `domain/frontend.md` Calendar → Search subsection; `features/README.md` register FT-025 (Planned Features table); `feature.md` `delivery_status: done` | docs | `CHK-06` | `EVID-06` | markdownlint |
| `STEP-13` | agent (AG-01b) | PR close | Commit + push + PR + CI + AG-01b human approval → squash merge, delete branch | git + gh | All CHK | All EVID | `gh pr merge` |

## Parallelizable

- `PAR-01` STEP-06 locales параллельно STEP-07a..d. **Но STEP-08 требует STEP-06** (тесты ассертят placeholder/empty текст).
- `PAR-02` STEP-12 docs параллельно STEP-09..11.

## Checkpoints

| CP | Refs | Condition |
|---|---|---|
| `CP-01` | STEP-01..03 | Debounce util + tests green |
| `CP-02` | STEP-04..05 | Filter util + tests green |
| `CP-03` | STEP-06..08 | CalendarView integration + locales + tests green |
| `CP-04` | STEP-09 | E2e green |
| `CP-05` | STEP-10..12 + AG-01 | QA + docs + gate |
| `CP-06` | STEP-13 | PR merged |

## Execution Risks

| ER | Risk | Impact | Mitigation |
|---|---|---|---|
| `ER-01` | Debounce cancel не вызван → timer после unmount → Vue warning / stale state | Test flake или console noise | `onBeforeUnmount` в CalendarView + explicit тест trailing fire после unmount не происходит (см. FM-08) |
| `ER-02` | Collapsible UX state-машина (open/close with/without value) сложна → regression | UX bug | STEP-07b split из 07a; explicit unit tests для каждого transition в STEP-08 |
| `ER-03` | Persistence restore показывает нефильтрованный DOM (1 frame) перед применением debounce | Flicker on reload | REQ-06 restore path — `debouncedQuery` set sync в `loadStoredView`, минуя debounce wrapper. **`loadStoredView` должен вызываться в `setup()` (синхронно), НЕ в `onMounted`** — иначе между setup и mount render успеет. Тест в STEP-08 assertит фильтр **до** nextTick |
| `ER-04` | Filter semantics ambiguous между "match unit" vs "match booking in unit" | Неправильный результат поиска | CTR-02 четко определяет: unit kept iff (name match ИЛИ property match ИЛИ хоть один reservation guest match). Unit tests покрывают все ветви |
| `ER-05` | E2e flake на autofocus (Playwright может нажать до готовности input) | CI flake | Wait for input visible + focused; use `page.locator().waitFor({state: 'visible'})` перед `fill` |

## Stop Conditions

| STOP | Trigger | Action |
|---|---|---|
| `STOP-01` | E2e flaky после 2 попыток стабилизации | Reduce to DOM-level assert без autofocus race |
| `STOP-02` | AG-01 deny | Rework per feedback в отдельном commit |
| `STOP-03` | Performance bench shows > 50ms на keystroke | Add memoization к computed `filtered` (Map keyed by query); если не спасает — reconsider server-side (CON-04 открытие требует ADR) |

## Готово для приемки

- STEP-01..13 done, CP-01..06 achieved, CHK-01..07 evidence собраны
- PR merged, CI green, AG-01 given
- `feature.md delivery_status: done`
- `features/README.md` включает FT-025
