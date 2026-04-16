---
title: "FT-024: Gantt Heatmap Mode"
doc_kind: feature
doc_function: canonical
purpose: "Режим тепловой карты занятости юнита по дням. Четвёртый и финальный FT-020 NS-02 special mode — закрывает NS-02 полностью."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../../domain/schema.md
  - ../../engineering/coding-style.md
  - ../../engineering/testing-policy.md
  - ../../engineering/design-style-guide.md
  - ../FT-020-gantt-calendar/feature.md
  - ../FT-021-gantt-handover-mode/feature.md
  - ../FT-022-gantt-overdue-mode/feature.md
  - ../FT-023-gantt-idle-gaps-mode/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-024: Gantt Heatmap Mode

## What

### Problem

Ранее поставленные режимы: bars (FT-020), handover (FT-021), overdue (FT-022), idle gaps (FT-023). Но для быстрого глаза на **занятость каждого юнита по дням в viewport** — нет подсветки. Bars показывают бронирования, idle gaps — промежутки, а heatmap **заливает фоном каждую ячейку дня** по состоянию "занято / свободно". Это даёт быстрый "at a glance" — какие юниты densely booked, какие пустые, где окна.

Референс-реализация в rentprog (`gantt-utils.js#getDayCellStatus`, `GanttTimelineRow.vue` heatmap-cells layer) — per-unit-per-day ratio-based coloring (free/partial/busy). Для Apartus с **date-level** бронированиями partial-случай не возникает (день либо в интервале бронирования, либо вне — binary), поэтому упрощаем до `free` / `busy`.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | Heatmap-режим доступен через toolbar toggle | нет | да | Component test + manual QA |
| `MET-02` | Занятость каждой day-cell юнита визуально отличается | нет | busy → `.gantt-row__heat-cell--busy` tint; free → `--free` tint | E2e `CHK-07` |
| `MET-03` | Coverage ratchet | текущий | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Toolbar toggle** в `GanttCalendarView` — `v-btn` «Тепловая карта» (icon `mdi-grid`). Mutually exclusive с handover/overdue/idle через `setSpecialMode('heatmap')`.
- `REQ-02` **Per-day classification** через `utils/gantt.js#getDayCellStatus(day: Date, bookings)` возвращает `'busy' | 'free'`. Правило: `busy` если какой-либо non-cancelled non-checked_out booking покрывает `day` (т.е. `b._start.valueOf() <= day.valueOf() < b._end.valueOf()`). Иначе `free`. Bookings — уже enriched с `{_start, _end}` via parseIsoDate (existing pattern FT-023 Row). **Partial** — не применимо к date-level, исключён из Phase 1 (см. `NS-03`).
- `REQ-03` **Day-cell rendering** — новый absolute-positioned layer в `GanttTimelineRow.vue` под items (z-index 0, pointer-events none). Для каждого дня в viewport: `<div class="gantt-row__heat-cell gantt-row__heat-cell--{status}">`, left/width = pixelsPerMs * MS_PER_DAY.
- `REQ-04` **Prop-propagation** — existing `specialMode` prop ready (FT-021+022+023).
- `REQ-05` **Bars unchanged** в heatmap mode — bars остаются full opacity поверх heatmap tint (паттерн как в idle mode FT-023 REQ-05).
- `REQ-06` **Persistence** — `SUPPORTED_SPECIAL_MODES` extended с `'heatmap'`.
- `REQ-07` **i18n** — `calendar.gantt.modes.heatmap`.
- `REQ-08` **Dark mode compatibility** — `--v-theme-success` (free tint) и `--v-theme-error` (busy tint) с низкой opacity (0.15-0.25) для subtle fill без конкуренции с bars.
- `REQ-09` **Tests** — unit (getDayCellStatus matrix) + component (Row heatmap rendering, pixelsPerMs positioning) + CalendarView (toggleHeatmap + mutual exclusion) + e2e.

### Non-Scope

- `NS-01` **Aggregate daily heatmap** (header row coloring по occupancy всех юнитов — orgwide) — отдельная UX, out of scope. Phase 1 — per-unit-per-day.
- `NS-02` **Continuous gradient** (0% → 100% smooth color) — требует hourly bookings. Apartus — binary free/busy.
- `NS-03` **Partial state** (день занят частично) — не применимо к date-level `check_in`/`check_out`. Добавится в будущем FT если появится hourly model (уже queued в FT-020 NS-01).
- `NS-04` **Click on heat cell to create reservation** — Phase 1 только подсветка.
- `NS-05` **Tooltip с деталями** (например "Занято: Ivan Petrov") — bar уже показывает это при hover.
- `NS-06` **Performance optimization** (virtualization для 50+ units × 30 days = 1500 cells) — acceptable per ASM-05 (статичные div без listeners).
- `NS-07` **Multi-select modes** — mutually exclusive сохраняется.
- `NS-08` **Keyboard toggle** — см. FT-020 NS-17.

### Constraints / Assumptions

- `ASM-01` FT-020 + FT-021 + FT-022 + FT-023 merged. Infrastructure (`specialMode`, `setSpecialMode`, `SUPPORTED_SPECIAL_MODES = ['', 'handover', 'overdue', 'idle']`) ready.
- `ASM-02` Reservation model stable (check_in/out date, status enum).
- `ASM-03` 585/585 baseline tests pass.
- `ASM-04` `utils/date.js#addDays, startOfDay` доступны.
- `ASM-05` Performance: 30d × 50 units × 1 day-cell per day = 1500 static div nodes. Acceptable (similar to idle gaps nodes).
- `CON-01` No new npm.
- `CON-02` No TypeScript.
- `CON-03` Coverage ratchet.
- `CON-04` No backend changes.
- `CON-05` Heatmap tint не конкурирует с bar colors — низкая opacity (0.15-0.25), CSS vars, subtle.

## How

### Solution

1. `utils/gantt.js#getDayCellStatus(day, bookings)` — pure. Expects pre-enriched bookings (with `_start`, `_end` Date objects — existing Row pattern). Iterate filter cancelled/checked_out, skip invalid `_start/_end`, check `b._start.valueOf() <= day.valueOf() < b._end.valueOf()`. Возвращает `'busy'` или `'free'`.
2. `GanttTimelineRow.vue` — computed `heatCells` (array of `{date, status}` per day в viewport). При `specialMode === 'heatmap'` render div layer с background tint. Day generation — reuse `utils/date.js#addDays` через computed (iterate viewStart → viewEnd).
3. `GanttCalendarView.vue` — `toggleHeatmap()` shim через `setSpecialMode('heatmap')`, 4-я toolbar button, extend `SUPPORTED_SPECIAL_MODES`.

Trade-off 1: binary vs 3-state (free/partial/busy). Binary — match Apartus date model. Trade-off 2: per-unit vs orgwide aggregate — per-unit (REQ-03) — matches rentprog pattern + symmetric с FT-023 idle gaps. Trade-off 3: tint opacity — 0.15-0.25 чтобы не конкурировать с bars.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `utils/gantt.js` | code | `getDayCellStatus(day, bookings)` |
| `__tests__/utils/gantt.test.js` | code | Unit tests |
| `views/calendar/GanttTimelineRow.vue` | code | Computed `heatCells`, render layer, CSS tint classes |
| `__tests__/views/calendar/GanttTimelineRow.test.js` | code | Heatmap rendering tests |
| `views/calendar/GanttCalendarView.vue` | code | `toggleHeatmap`, 4-я v-btn, extend SUPPORTED |
| `__tests__/views/calendar/GanttCalendarView.test.js` | code | toggleHeatmap + mutual exclusion |
| `locales/ru.json`, `en.json` | data | `modes.heatmap` |
| `e2e/calendar-overlap.spec.js` | code | E2e heatmap test |
| `domain/frontend.md` | doc | Calendar section add Heatmap subsection |
| `features/FT-020-gantt-calendar/feature.md` | doc | Footnote: все 4 modes delivered — NS-02 closed |
| `features/README.md` | doc | Register FT-024 |

### Flow

1. Boot → localStorage.specialMode === 'heatmap' → restore.
2. Render → Row computes `heatCells` only if specialMode='heatmap' → render layer.
3. Click heatmap-btn → setSpecialMode('heatmap') → mutual exclusion.

### Contracts

| Contract | I/O | Producer/Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `getDayCellStatus(day: Date, bookings: Array<{_start, _end, status}>)` → `'busy' \| 'free'` | utils / Row | Pure; non-cancelled non-checked_out bookings count as busy |
| `CTR-02` | `localStorage('apartus-calendar-view').specialMode` extended `'' \| 'handover' \| 'overdue' \| 'idle' \| 'heatmap'` | CalendarView | Unknown → `''` |

### Failure Modes

- `FM-01` Пустой bookings → все cells free (standard).
- `FM-02` Все cancelled/checked_out → все cells free.
- `FM-03` Invalid booking date (missing `_start`/`_end`) → booking skip (не участвует в busy-check); cell → `free` если нет других valid bookings. Same pattern as `findIdleGaps`.
- `FM-04` Огромный viewport (>100 days) → 100+ cells per row × units = potentially много DOM; Vue reactivity handle it, per ASM-05.

### ADR Dependencies

Нет.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..09` реализованы.
- `EC-02` Heatmap toggle работает + persist.
- `EC-03` Mutual exclusion с handover/overdue/idle.
- `EC-04` Все existing тесты (585+) pass. FT-021..023 tests unchanged.
- `EC-05` Coverage ratchet.
- `EC-06` CI green.
- `EC-07` Dark + light mode корректны.
- `EC-08` **NS-02 closed** — все 4 special modes delivered (handover FT-021, overdue FT-022, idle FT-023, heatmap FT-024).

### Acceptance Scenarios

- `SC-01` **Happy path.** Click "Тепловая карта" → button primary. Каждая day-cell в row получает background tint: busy (занято) — красноватый, free — зеленоватый. Bars поверх не меняются.
- `SC-02` **Empty unit.** Юнит без bookings → все cells free (зелёный tint).
- `SC-03` **Fully booked unit.** Unit bars покрывают всё → все cells busy (красный tint).
- `SC-04` **Mutual exclusion.** Active idle → click heatmap → idle gaps исчезают, heat cells появляются.
- `SC-05` **Persistence.** Activate heatmap → reload → restored.
- `SC-06` **Interaction preserved.** Click booking bar в heatmap mode → navigate to edit (heatmap layer под, pointer-events: none).
- `SC-07` **Cancelled/checked_out bookings not busy.** Unit где все reservations cancelled → все cells free.

### Negative / Edge Cases

- `NEG-01` Invalid date → cell остаётся free (default).
- `NEG-02` Dark mode toggle с active heatmap — CSS vars сохраняют tints.
- `NEG-03` Invalid specialMode `'heatmap'` modified в storage на `'bad'` → fallback ''.
- `NEG-04` localStorage throws → fallback.

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | `CTR-02` | `SC-04` | `CHK-02` | `EVID-02` |
| `REQ-02` | `CTR-01`, `FM-01..03` | `SC-01..03`, `SC-07`, `NEG-01` | `CHK-02` | `EVID-02` |
| `REQ-03` | | `SC-01`, `SC-06` | `CHK-02`, `CHK-05` | `EVID-02`, `EVID-05` |
| `REQ-04` | | — | `CHK-02` | `EVID-02` |
| `REQ-05` | | `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-06` | `CTR-02` | `SC-05`, `NEG-03` | `CHK-02` | `EVID-02` |
| `REQ-07` | | — | `CHK-04` | `EVID-04` |
| `REQ-08` | | `NEG-02` | `CHK-05` | `EVID-05` |
| `REQ-09` | | `EC-04,05` | `CHK-01,02,07` | `EVID-01,02,07` |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-04,05` | `yarn test:coverage` | ratchet met | `artifacts/ft-024/verify/chk-01/` |
| `CHK-02` | `REQ-01..06,09` + SCs/NEGs | `yarn test utils/gantt.test.js + views/calendar/` | getDayCellStatus matrix, Row heatmap rendering, CalendarView toggleHeatmap + mutual exclusion. FT-021..023 unchanged. | `artifacts/ft-024/verify/chk-02/` |
| `CHK-03` | `EC-01` | `git diff main..HEAD --stat` | change surface minimal | `artifacts/ft-024/verify/chk-03/` |
| `CHK-04` | `REQ-07` | grep cyrillic | 0 hardcoded | `artifacts/ft-024/verify/chk-04/` |
| `CHK-05` | `REQ-03,08` + SCs/NEGs | Manual QA screenshots light + dark | Tints visible не конкурируют | `artifacts/ft-024/verify/chk-05/` |
| `CHK-06` | `EC-06` | markdownlint + CI | 0 errors + 5/5 green | `artifacts/ft-024/verify/chk-06/` |
| `CHK-07` | `EC-02,03` + SCs | `yarn test:e2e` new test | Click heatmap → `.gantt-row__heat-cell` appears; mutual exclusion | `artifacts/ft-024/verify/chk-07/` |

### Evidence

- `EVID-01` Coverage.
- `EVID-02` Vitest log.
- `EVID-03` Git diff.
- `EVID-04` grep.
- `EVID-05` Screenshots.
- `EVID-06` Lint + CI.
- `EVID-07` Playwright.

### Evidence contract

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-024/verify/chk-01/` |
| `EVID-02` | `yarn test` | `artifacts/ft-024/verify/chk-02/` |
| `EVID-03` | shell | `artifacts/ft-024/verify/chk-03/` |
| `EVID-04` | shell | `artifacts/ft-024/verify/chk-04/` |
| `EVID-05` | manual | `artifacts/ft-024/verify/chk-05/` |
| `EVID-06` | `markdownlint` + `gh` | `artifacts/ft-024/verify/chk-06/` |
| `EVID-07` | `yarn test:e2e` | `artifacts/ft-024/verify/chk-07/` |
