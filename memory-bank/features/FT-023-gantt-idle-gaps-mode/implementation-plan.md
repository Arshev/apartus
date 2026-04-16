---
title: "FT-023: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план FT-023 Idle Gaps Mode. Паттерн FT-021/022 с расширением на Row-level rendering."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_023_scope
  - ft_023_architecture
  - ft_023_acceptance_criteria
  - ft_023_blocker_state
---

# План имплементации

## Цель

Добавить третий special mode (idle gaps) на существующую Gantt infrastructure. Новизна: rendering — на Row-level (gap layer под items), не Item-level как FT-021/022. Единый PR без backend/npm изменений.

## Current State / Reference Points

| Path | Current | Reuse |
|---|---|---|
| `utils/gantt.js` | `getHandoverType`, `getOverdueDays`, `assignLanes`, `dateToPixel` | Добавить `findIdleGaps`. Reuse `dateToPixel` в Row для positioning. |
| `utils/date.js` | `parseIsoDate`, `diffDays`, `startOfDay` | Reuse `diffDays` для gap duration |
| `views/calendar/GanttTimelineRow.vue` | `specialMode` prop, `enrichedBookings`, `dateToPixel`, `rowStyle` | Добавить computed `idleGaps`, render gap layer under items, CSS striped pattern |
| `views/calendar/GanttCalendarView.vue` | `toggleHandover`/`toggleOverdue` shims над `setSpecialMode`, `SUPPORTED_SPECIAL_MODES = ['', 'handover', 'overdue']`, toolbar с 2 buttons | Добавить `toggleIdle`, третий v-btn, extend массив |
| `locales/ru.json`, `en.json` | `modes.handover`, `modes.overdue`, `handoverMarkers.*`, `overdueLabel` | Добавить `modes.idle`, `idleLabel` |
| `__tests__/utils/gantt.test.js` | FT-021+FT-022 tests | Добавить `findIdleGaps` describe |
| `__tests__/views/calendar/GanttTimelineRow.test.js` | FT-020 Row tests | Добавить gap rendering tests |
| `__tests__/views/calendar/GanttCalendarView.test.js` | FT-021+FT-022 toggle tests | Добавить `toggleIdle` + mutual exclusion |
| `e2e/calendar-overlap.spec.js` | 5 tests (render, today, jump, handover, overdue) | Добавить 6-й для idle |

## Test Strategy

| Test surface | Canonical refs | Existing | Planned | Local/CI | Manual | Approval |
|---|---|---|---|---|---|---|
| `findIdleGaps` | `CTR-01`, `REQ-02`, `CHK-02` | N/A | Matrix: 0 bookings / 1 / multiple non-overlap / back-to-back / overlap / outside-viewport / cancelled-only. Edges: clamp viewStart, trim viewEnd, micro-gap <1d skip. | `yarn test gantt.test.js` | — | — |
| Row gap rendering | `REQ-03`, `CHK-02` | FT-020 Row rendering, NEG-02/03 filtering | Extend: specialMode=idle → gap divs present with correct left/width; specialMode≠idle → no gap divs; click-through preserved | `yarn test GanttTimelineRow.test.js` | — | — |
| CalendarView toggleIdle + mutual exclusion | `REQ-01,06`, `CHK-02` | FT-021+FT-022 toggle tests | toggleIdle flip, setSpecialMode('idle'), mutual exclusion с handover/overdue, invalid 'idle'→'' fallback, persistence | `yarn test GanttCalendarView.test.js` | — | — |
| i18n parity | `REQ-07`, `CHK-04` | 437 keys ru==en | Parity сохраняется +2 keys | node parity script | — | — |
| E2e idle toggle | `SC-01,04`, `CHK-07` | 5 tests | 6-й: click idle → `.gantt-row__idle-gap` appears; mutual exclusion с handover; back to '' — cleared | `yarn test:e2e` | — | — |
| Dark + light | `REQ-08`, `NEG-05`, `CHK-05` | FT-021+FT-022 QA pattern | Screenshots light + dark c активным idle | Manual dev QA | Pattern visible оба theme | `AG-01` |

## Open Questions

| OQ | Q | Why | Blocks | Default |
|---|---|---|---|---|
| `OQ-01` | Gap layer `z-index: 0` vs negative? Items default stacking. | Row содержит items absolute-позиционированные с `top:3px`, без z-index. | `STEP-04` | Default: gaps `z-index: 0`, items implicit (auto). Items рендерятся после gaps в template → поверх по paint order. |

## Environment Contract

| Area | Contract | Used by | Failure |
|---|---|---|---|
| setup | `cd frontend && yarn install`; node 22 | all | module resolution |
| backend для e2e | rails s -p 3000 + seed | `STEP-07` | 401/timeout |
| test vitest | `yarn test [path]` | `STEP-02,04,05,06` | failure |
| test e2e | `yarn test:e2e [spec]` | `STEP-07` | Playwright failure |
| dev preview | `yarn dev` | `STEP-08` | — |

## Preconditions

| PRE | Ref | State | Used by | Blocks |
|---|---|---|---|---|
| `PRE-01` | `feature.md status: active` | FT-023 feature.md в active | all | yes |
| `PRE-02` | FT-020+021+022 merged | Gantt infrastructure с `specialMode`, `setSpecialMode`, 2 existing modes | all | yes |
| `PRE-03` | `ASM-02` | Reservation model stable | `STEP-02` | yes |
| `PRE-04` | `utils/date.js#startOfDay,diffDays,parseIsoDate` | Доступны | `STEP-02` | yes |

## Workstreams

| WS | Implements | Result | Owner | Deps |
|---|---|---|---|---|
| `WS-1` | `REQ-02`, `CTR-01` | `findIdleGaps` + tests | agent | `PRE-*` |
| `WS-2` | `REQ-03,05` | Row gap rendering + CSS + tests | agent | `WS-1` |
| `WS-3` | `REQ-01,06`, `CTR-02` | CalendarView toggleIdle + mutual exclusion + tests | agent | `WS-2` |
| `WS-4` | `REQ-07` | Locales | agent | параллельно WS-3 |
| `WS-5` | `REQ-09` e2e | Playwright test | agent | `WS-3` |
| `WS-6` | Docs + closure | frontend.md subsection, FT-020 footnote, feature.md done | agent | `WS-5` |

## Approval Gates

> AG-* — процедурные gates плана, не canonical AC.

| AG | Trigger | Applies | Why | Approver |
|---|---|---|---|---|
| `AG-01` | Перед PR merge | full PR | Визуальная корректность gap pattern в обоих themes | User + screenshots |
| `AG-02` | Если нужен npm | any STEP | CON-01 запрещает | User |
| `AG-03` | Если нужен backend change | any STEP | CON-04 запрещает | User |

## Порядок работ

| Step | Actor | Implements | Goal | Touchpoints | Verifies | EVID | Check | Blocked by |
|---|---|---|---|---|---|---|---|---|
| `STEP-01` | agent | `PRE-04` | Grounding — убедиться что FT-021+022 shim pattern работает; read `GanttTimelineRow.vue` для понимания absolute positioning | — | n/a | n/a | `yarn test` existing 556/556 | `PRE-01..04` |
| `STEP-02` | agent | `REQ-02`, `CTR-01` | Добавить `findIdleGaps(bookings, viewStart, viewEnd)` в `utils/gantt.js`. Signature: bookings имеют `_start, _end` Date objects (enriched pattern как в Row) + `status` for cancelled/checked_out filter. | `utils/gantt.js` | `CHK-02` | `EVID-02` | `yarn test gantt.test.js` | `STEP-01` |
| `STEP-03` | agent | `REQ-02` tests | Unit tests matrix: empty, 1 booking, 2 bookings gap between, back-to-back (no gap), overlap cluster, outside viewport, cancelled filter, checked_out filter, micro-gap <1d skip. | `__tests__/utils/gantt.test.js` | `CHK-02` | `EVID-02` | `yarn test gantt.test.js` | `STEP-02` |
| `STEP-04` | agent | `REQ-03,05`, `OQ-01` | Extend `GanttTimelineRow.vue`: computed `idleGaps` (only если `specialMode === 'idle'`); render `<div class="gantt-row__idle-gap">` layer с absolute-positioned left/width; span label `Nд`. CSS: `repeating-linear-gradient` hatched pattern error-tint, dashed borders, `pointer-events: none`. z-index: 0. Items рендерятся после в template (paint order поверх). | `GanttTimelineRow.vue` | `CHK-02` | `EVID-02` | `yarn test GanttTimelineRow.test.js` | `STEP-03` |
| `STEP-05` | agent | `REQ-03,05` tests | Extend Row tests: specialMode=idle → `.gantt-row__idle-gap` count matches findIdleGaps; left/width computed correctly; bars rendering unchanged (items stubs still pass); clicks still go to item. | `__tests__/views/calendar/GanttTimelineRow.test.js` | `CHK-02` | `EVID-02` | `yarn test GanttTimelineRow.test.js` | `STEP-04` |
| `STEP-06` | agent | `REQ-07` | Locale keys: `calendar.gantt.modes.idle` ("Окна простоя" / "Idle gaps") + `calendar.gantt.idleLabel` (`{n}д` / `{n}d`). | `ru.json`, `en.json` | `CHK-04` | `EVID-04` | node parity | параллельно |
| `STEP-07` | agent | `REQ-01,06`, `CTR-02` | `GanttCalendarView.vue`: добавить `toggleIdle() { setSpecialMode('idle') }` shim; третий v-btn `data-testid="idle-btn"` с `:variant` switch; extend `SUPPORTED_SPECIAL_MODES` с `'idle'`; defineExpose добавить `toggleIdle`. FT-021+FT-022 toggles unchanged — regression safety. | `GanttCalendarView.vue` | `CHK-02` | `EVID-02` | `yarn test GanttCalendarView.test.js` | `STEP-04,06` |
| `STEP-08` | agent | `REQ-01,06` tests | Extend `GanttCalendarView.test.js`: toggleIdle flip, setSpecialMode('idle'), mutual exclusion с handover и overdue (оба направления), invalid 'idle' → '' fallback, legacy payload без specialMode. FT-021+FT-022 existing tests unchanged. | `__tests__/views/calendar/GanttCalendarView.test.js` | `CHK-02` | `EVID-02` | `yarn test GanttCalendarView.test.js` | `STEP-07` |
| `STEP-09` | agent | `REQ-09` e2e, `CHK-07` | Extend `e2e/calendar-overlap.spec.js`: click idle-btn → assert `.gantt-row__idle-gap` appears in DOM. Click handover затем idle → mutual exclusion (gap still there, no handover classes). Re-click idle → gap cleared. | `e2e/calendar-overlap.spec.js` | `CHK-07` | `EVID-07` | `yarn test:e2e` | `STEP-07` |
| `STEP-10` | agent (AG-01) | `CHK-05` manual QA | Dev server + screenshots light + dark c active idle. Проверить читаемость hatched pattern, dashed borders, Nд label. | `artifacts/ft-023/verify/chk-05/` | `CHK-05` | `EVID-05` | dev + manual | `STEP-09` |
| `STEP-11` | agent | full gate | Full test + build + lint + evidence | n/a | `CHK-01,02,04,06` | `EVID-01,02,04,06` | `yarn test && yarn build && markdownlint` | `STEP-10` |
| `STEP-12` | agent | Docs + closure | `domain/frontend.md` Idle Gaps subsection; FT-020 footnote add FT-023; `delivery_status: done`; `features/README.md`. | docs + frontmatter | `CHK-06` | `EVID-06` | markdownlint | `STEP-07` |
| `STEP-13` | agent (AG-01) | PR close | Commit + push + PR + CI green + AG-01 → squash merge | git + gh | All CHK | All EVID | `gh pr merge` | `STEP-10..12` |

## Parallelizable Work

- `PAR-01` STEP-06 (locales) параллельно с STEP-07 после STEP-04.
- `PAR-02` STEP-12 (docs drafting) параллельно с STEP-09..11 после STEP-07.

## Checkpoints

| CP | Refs | Condition | EVID |
|---|---|---|---|
| `CP-01` | STEP-01..03 | findIdleGaps + tests зелёные | EVID-02 |
| `CP-02` | STEP-04..06 | Row gap rendering + locales + tests | EVID-02,04 |
| `CP-03` | STEP-07..08 | CalendarView toggle + mutual exclusion + tests | EVID-02 |
| `CP-04` | STEP-09 | E2e green | EVID-07 |
| `CP-05` | STEP-10..12 + AG-01 | Manual QA + docs + full gate | EVID-01,04,05,06 |
| `CP-06` | STEP-13 | PR merged | all |

## Execution Risks

| ER | Risk | Impact | Mitigation | Trigger |
|---|---|---|---|---|
| `ER-01` | `findIdleGaps` edge: `viewStart` < first booking `_start` AND last booking `_end` > `viewEnd` → cursor never reaches viewEnd → no trailing gap emitted. | Missing gap at end | Trailing check: после loop, if `cursor < viewEnd` → emit final gap | `STEP-03` test failure |
| `ER-02` | Hatched pattern плохо читается в dark mode (low contrast on dark background) | Visual clarity deficit | Use `rgba(var(--v-theme-error), 0.3)` для pattern (полупрозрачный), dashed border `rgba(var(--v-theme-error), 0.6)` для visibility | `STEP-10` manual QA |
| `ER-03` | Gap click перехватывает booking click | SC-06 ломается | `pointer-events: none` на gap layer | `STEP-05` test failure |
| `ER-04` | Seed не содержит gaps (все units полностью booked) | E2e idle test не видит `.gantt-row__idle-gap` | Seed уже имеет короткие bookings — проверить. Если нужно — OR-fallback assertion. | `STEP-09` |

## Stop Conditions

| STOP | Ref | Trigger | Action | Fallback |
|---|---|---|---|---|
| `STOP-01` | `CHK-07`, `ER-04` | E2e flaky / seed не даёт gap | Reduce to toolbar-only assertion (button toggleable без DOM state check) | Reduced spec |
| `STOP-02` | `AG-01` | User не одобряет | Доработка | Pre-merge state |

## Готово для приемки

- STEP-01..13 done
- CP-01..06 achieved
- CHK-01..07 evidence
- PR merged, AG-01 given, CI green
- `delivery_status: done`
