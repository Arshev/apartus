---
title: "FT-024: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план FT-024 Heatmap Mode. Паттерн FT-023 (Row-level rendering) применяется к per-day cells."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_024_scope
  - ft_024_architecture
  - ft_024_acceptance_criteria
  - ft_024_blocker_state
---

# План имплементации

## Цель

Добавить четвёртый (финальный) special mode — per-day heatmap tinting. Закрывает FT-020 NS-02. Инфраструктура FT-023-style (Row-level rendering, specialMode prop, setSpecialMode helper) готова. Одна новая util + extension Row + toolbar button + tests.

## Current State / Reference Points

| Path | Current | Reuse |
|---|---|---|
| `utils/gantt.js` | `findIdleGaps`, `getOverdueDays`, `getHandoverType`, `assignLanes`, `dateToPixel`, `parseIsoDate` import | Добавить `getDayCellStatus(day, bookings)`. Reuse `MS_PER_DAY` constant |
| `utils/date.js` | `startOfDay`, `addDays`, `parseIsoDate` | Reuse для day iteration |
| `views/calendar/GanttTimelineRow.vue` | `specialMode`, `enrichedBookings`, idle gaps rendering (reference pattern) | Добавить computed `heatCells`, render day-cell layer аналогично idle gaps |
| `views/calendar/GanttCalendarView.vue` | 3 toolbar buttons (handover/overdue/idle), `toggle*` shims, `SUPPORTED_SPECIAL_MODES = ['', 'handover', 'overdue', 'idle']` | Добавить `toggleHeatmap`, 4-я v-btn, extend array с `'heatmap'` |
| `locales/ru.json`, `en.json` | `modes.handover/overdue/idle`, markers/labels | Добавить `modes.heatmap` (`Тепловая карта` / `Heatmap`) |
| `__tests__/utils/gantt.test.js` | FT-021..023 tests | describe для `getDayCellStatus` |
| `__tests__/views/calendar/GanttTimelineRow.test.js` | FT-023 idle gap tests | Heatmap cell rendering tests |
| `__tests__/views/calendar/GanttCalendarView.test.js` | FT-021..023 toggle tests | toggleHeatmap + mutual exclusion |
| `e2e/calendar-overlap.spec.js` | 6 tests | 7-й для heatmap |

## Test Strategy

| Surface | Canonical | Existing | Planned | Local/CI | Manual | Approval |
|---|---|---|---|---|---|---|
| `getDayCellStatus` | `CTR-01`, `REQ-02`, `CHK-02` | N/A | Matrix: 0/1/many bookings × day inside/before/after booking × cancelled/checked_out filter × invalid date skip | `yarn test gantt.test.js` | — | — |
| Row heatmap rendering | `REQ-03,05`, `CHK-02` | FT-023 idle gaps | Extend: specialMode=heatmap → day-cells rendered with busy/free classes; pixelsPerMs positioning; bars unchanged | `yarn test GanttTimelineRow.test.js` | — | — |
| CalendarView toggleHeatmap | `REQ-01,06`, `CHK-02` | FT-021..023 toggle | toggleHeatmap, setSpecialMode, mutual exclusion с 3 другими modes, persistence, fallback | `yarn test GanttCalendarView.test.js` | — | — |
| i18n parity | `REQ-07`, `CHK-04` | 439 keys ru==en | +1 key each | node parity | — | — |
| E2e heatmap toggle | `SC-01,04`, `CHK-07` | 6 tests | 7-й: click heatmap → `.gantt-row__heat-cell` appears; mutual exclusion | `yarn test:e2e` | — | — |
| Dark + light | `REQ-08`, `NEG-02`, `CHK-05` | FT-023 QA pattern | Screenshots light + dark с active heatmap | Manual dev | Tints не конкурируют с bars | `AG-01` |

## Open Questions

Нет — паттерн полностью отзеркален от FT-023, scope понятен, signatures и Row rendering обоснованы.

## Environment Contract

Standard (same as FT-021..023). Dev + backend на :3000, playwright config ready.

## Preconditions

| PRE | Ref | State | Blocks |
|---|---|---|---|
| `PRE-01` | `feature.md status: active` | — | yes |
| `PRE-02` | FT-020..023 merged | infrastructure ready | yes |
| `PRE-03` | `utils/date.js#addDays, startOfDay, parseIsoDate` | доступны | yes |

## Workstreams

| WS | Implements | Result | Deps |
|---|---|---|---|
| `WS-1` | `REQ-02`, `CTR-01` | `getDayCellStatus` + tests | `PRE-*` |
| `WS-2` | `REQ-03,05` | Row heatmap layer + tests | `WS-1` |
| `WS-3` | `REQ-01,06`, `CTR-02` | CalendarView toggleHeatmap + mutual exclusion + tests | `WS-2` |
| `WS-4` | `REQ-07` | Locales | параллельно с WS-3 |
| `WS-5` | `REQ-09` e2e | Playwright | `WS-3` |
| `WS-6` | Docs + closure | frontend.md, FT-020 footnote (NS-02 closed), feature.md done | `WS-5` |

## Approval Gates

> AG-* процедурные.

| AG | Trigger | Applies | Why |
|---|---|---|---|
| `AG-01` | Перед merge | full PR | Визуальная корректность tints в dark + light |
| `AG-02` | Нужен npm | any STEP | CON-01 |
| `AG-03` | Backend change | any STEP | CON-04 |

## Порядок работ

| Step | Actor | Implements | Goal | Touchpoints | Verifies | EVID | Check |
|---|---|---|---|---|---|---|---|
| `STEP-01` | agent | `PRE-*` | Grounding — прочитать idle gaps pattern в Row | — | n/a | n/a | `yarn test` 585/585 baseline |
| `STEP-02` | agent | `REQ-02`, `CTR-01` | `getDayCellStatus(day, bookings)` в `utils/gantt.js` | `utils/gantt.js` | `CHK-02` | `EVID-02` | `yarn test gantt.test.js` |
| `STEP-03` | agent | `REQ-02` tests | Unit matrix (day vs booking × 4 statuses × edge cases) | `__tests__/utils/gantt.test.js` | `CHK-02` | `EVID-02` | `yarn test gantt.test.js` |
| `STEP-04` | agent | `REQ-03,05` | Extend `GanttTimelineRow.vue`: computed `heatCells` (day array × pixel positioning); render `<div class="gantt-row__heat-cell gantt-row__heat-cell--{status}">` layer. CSS tints via `--v-theme-success/error` с opacity 0.15-0.25. z-index 0, pointer-events: none. | `GanttTimelineRow.vue` | `CHK-02` | `EVID-02` | `yarn test GanttTimelineRow.test.js` |
| `STEP-05` | agent | `REQ-03` tests | Extend Row tests: specialMode=heatmap → cell count == viewport days; classes match status; bars unchanged | `__tests__/views/calendar/GanttTimelineRow.test.js` | `CHK-02` | `EVID-02` | `yarn test GanttTimelineRow.test.js` |
| `STEP-06` | agent | `REQ-07` | Locale keys `calendar.gantt.modes.heatmap` ru/en | `ru.json`, `en.json` | `CHK-04` | `EVID-04` | node parity |
| `STEP-07` | agent | `REQ-01,06`, `CTR-02` | `GanttCalendarView.vue`: `toggleHeatmap()` shim, 4-я v-btn "Тепловая карта" (mdi-grid) с variant switch, extend `SUPPORTED_SPECIAL_MODES`. FT-021..023 toggles unchanged. | `GanttCalendarView.vue` | `CHK-02` | `EVID-02` | `yarn test GanttCalendarView.test.js` |
| `STEP-08` | agent | `REQ-01,06` tests | Extend CalendarView tests: toggleHeatmap flip, mutual exclusion с 3 modes (handover/overdue/idle), persistence, fallback | `__tests__/views/calendar/GanttCalendarView.test.js` | `CHK-02` | `EVID-02` | `yarn test GanttCalendarView.test.js` |
| `STEP-09` | agent | `REQ-09` e2e, `CHK-07` | Extend e2e: click heatmap-btn → `.gantt-row__heat-cell` appears; mutual exclusion с handover; back — cleared | `e2e/calendar-overlap.spec.js` | `CHK-07` | `EVID-07` | `yarn test:e2e` |
| `STEP-10` | agent (AG-01) | `CHK-05` manual QA | Dev + screenshots light + dark с active heatmap | `artifacts/ft-024/verify/chk-05/` | `CHK-05` | `EVID-05` | dev + manual |
| `STEP-11` | agent | full gate | `yarn test` + `yarn build` + markdownlint | — | `CHK-01,02,04,06` | `EVID-01,02,04,06` | all green |
| `STEP-12` | agent | Docs + closure | domain/frontend.md Heatmap subsection; FT-020 footnote → NS-02 **closed** (все 4 modes delivered); delivery_status done; features/README | docs | `CHK-06` | `EVID-06` | markdownlint |
| `STEP-13` | agent (AG-01) | PR close | Commit + push + PR + CI + AG-01 → squash merge | git + gh | All CHK | All EVID | `gh pr merge` |

## Parallelizable

- `PAR-01` STEP-06 locales параллельно STEP-07.
- `PAR-02` STEP-12 docs параллельно STEP-09..11.

## Checkpoints

| CP | Refs | Condition |
|---|---|---|
| `CP-01` | STEP-01..03 | getDayCellStatus + tests green |
| `CP-02` | STEP-04..06 | Row heatmap + locales + tests |
| `CP-03` | STEP-07..08 | CalendarView toggle + mutual exclusion |
| `CP-04` | STEP-09 | E2e green |
| `CP-05` | STEP-10..12 + AG-01 | QA + docs + gate |
| `CP-06` | STEP-13 | PR merged, NS-02 closed |

## Execution Risks

| ER | Risk | Impact | Mitigation |
|---|---|---|---|
| `ER-01` | Tint opacity слишком сильная → конкурирует с bars | UX degraded | Start with 0.15, iterate up to 0.25 на манual QA |
| `ER-02` | Viewport 30d × 50 units = 1500 cells — performance degraded | Render lag | Vue reactivity + static div без listeners. Bench если STEP-10 показывает lag, снизить cells per row или virtualize |
| `ER-03` | FT-021..023 regression при extend SUPPORTED array | Mode persistence breaks | Test coverage уже есть для всех 3 modes в CalendarView.test.js — regression ловится |

## Stop Conditions

| STOP | Trigger | Action |
|---|---|---|
| `STOP-01` | E2e flaky | Reduce to toolbar-only assert |
| `STOP-02` | AG-01 deny | Rework per feedback |

## Готово для приемки

- STEP-01..13 done, CP-01..06 achieved, CHK-01..07 evidence
- PR merged, CI green, AG-01 given
- `delivery_status: done`
- **FT-020 NS-02 closed** — footnote references all 4 special modes (FT-021..024)
