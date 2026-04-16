---
title: "FT-023: Gantt Idle Gaps Mode"
doc_kind: feature
doc_function: canonical
purpose: "Режим подсветки окон простоя юнитов между бронированиями. Третий из FT-020 NS-02 special modes (после FT-021 handover и FT-022 overdue)."
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
status: active
delivery_status: in_progress
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-023: Gantt Idle Gaps Mode

## What

### Problem

FT-020 отрисовывает бронирования, FT-021 подсвечивает предстоящие заезды/выезды, FT-022 — просрочки. Но менеджер/владелец также хочет видеть **окна простоя** — промежутки между бронированиями юнита, когда юнит доступен для новой продажи. Это revenue-критичная информация: длинные простои → возможность снизить цену, укоротить checkout policy, или активно продавать через channels.

На 50+ юнитах без подсветки менеджер должен визуально сканировать каждую строку, высчитывая разрывы между барами. Операционно непродуктивно.

Референс-реализация в `rentprog` (`gantt-utils.js#findIdleGaps`, `GanttTimelineRow.vue`) решает это отдельным слоем в row — diagonal-hatched зоны на background с dashed borders и числовой меткой дней.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
|---|---|---|---|---|
| `MET-01` | Idle-режим доступен через toolbar toggle | нет | да | Component test + manual QA |
| `MET-02` | Промежутки между бронированиями визуально подсвечены | нет | gap ≥ 1d → hatched overlay + Nд label; <1d → нет | E2e `CHK-07` |
| `MET-03` | Coverage ratchet | текущий | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Toolbar toggle** в `GanttCalendarView` — `v-btn` «Окна простоя» (icon `mdi-clock-alert-outline`). Mutually exclusive с handover/overdue через existing `setSpecialMode(mode)` helper (FT-022 CTR-03).
- `REQ-02` **Gap calculation** через `utils/gantt.js#findIdleGaps(bookings, viewStart, viewEnd)` возвращает `Array<{start: Date, end: Date, days: number}>` — промежутки в viewport длиной ≥ 1 день, между последовательными non-cancelled non-checked-out reservations этого юнита. Pure function.
- `REQ-03` **Gap rendering** — новый absolute-positioned layer в `GanttTimelineRow.vue` (под Items, z-index: 0). Каждый gap: diagonal-hatched background (repeating-linear-gradient -45deg error-tint) + dashed left/right borders + span label `Nд` (pointer-events: none).
- `REQ-04` **Prop-propagation** — existing `specialMode` prop (FT-021+FT-022 ready). Row получает `specialMode`, computes gaps if `specialMode === 'idle'`, иначе пустой array.
- `REQ-05` **Bars rendering unchanged** в idle mode — booking bars остаются с full opacity (в отличие от FT-021/022, где не-matching bars dimmed). Иначе gaps визуально конкурируют с dimmed bars. Trade-off объясняется в Solution.
- `REQ-06` **Persistence** — `SUPPORTED_SPECIAL_MODES` extended с `'idle'`. localStorage backward-compat сохраняется.
- `REQ-07` **i18n** — новые keys: `calendar.gantt.modes.idle` + `calendar.gantt.idleLabel` (`{n}д` / `{n}d`).
- `REQ-08` **Dark mode compatibility** через `--v-theme-error` CSS var.
- `REQ-09` **Tests**:
  - Unit: `findIdleGaps` матрица (0/1/many bookings × различные gap-конфигурации × edge cases).
  - Component: `GanttTimelineRow` — `specialMode='idle'` → gap-элементы рендерятся с правильными left/width; Item classes unchanged.
  - E2e: активировать idle mode → `.gantt-row__idle-gap` присутствует в DOM.

### Non-Scope

- `NS-01` Остальные FT-020 NS-02 modes (heatmap / loading / finance / compact) — отдельные FT.
- `NS-02` **Minimum gap threshold config** (показывать только gaps ≥ 2d или 3d) — Phase 1 threshold фиксирован в 1 день.
- `NS-03` **Booking cancelled/checked_out coexistence в gap calc** — они не считаются "занятостью" (gap рассчитывается по non-cancelled non-checked_out bookings). Semantic clarification, не scope.
- `NS-04` **Auto-suggest**-функции (rekomend ценовой stratyatagii на gap) — отдельный ML-feature.
- `NS-05` **Gap click interaction** (click на gap → создать reservation на эти даты) — Phase 1 только подсветка. Follow-up UX.
- `NS-06` **Cross-unit aggregation** (показать общую загрузку по property, filter units с > X days idle) — отдельная аналитика-фича.
- `NS-07` **Multi-select modes** — остаётся mutually exclusive.
- `NS-08` **Плюрализация `Nд`** — short form as in FT-022.
- `NS-09` **Prefers-reduced-motion** — нет анимации в idle mode (статичный hatched pattern), `NS-09` не применимо.
- `NS-10` **Keyboard toggle alternative** — см. FT-020 NS-17.

### Constraints / Assumptions

- `ASM-01` FT-020 + FT-021 + FT-022 merged. `specialMode` prop, `setSpecialMode` helper, `SUPPORTED_SPECIAL_MODES` все наработаны.
- `ASM-02` Reservation model stable (check_in/out date, status enum).
- `ASM-03` CSS `repeating-linear-gradient` поддерживается всеми target browsers.
- `ASM-04` Все frontend тесты продолжают проходить (556/556 baseline).
- `CON-01` **No new npm packages.**
- `CON-02` **No TypeScript.**
- `CON-03` Coverage ratchet не понижается.
- `CON-04` **No backend changes.**
- `CON-05` Gap rendering не конфликтует с lane-stacking FT-020 (gaps под items via z-index).
- `ASM-05` Производительность: 50 units × avg 3 gaps в 30d viewport (~4500 gap DOM nodes) приемлемо — статичные `div` без listeners/animations; per-row memoized computed Vue reactivity. Бенчмарк откладываем в implementation, не gate-критерий.

## How

### Solution

Расширение FT-021/FT-022 паттерна на row-level:

1. `utils/gantt.js#findIdleGaps(bookings, viewStart, viewEnd)` — pure function. Filter non-cancelled non-checked-out bookings, sort by `_start`, walk cursor через viewport, emit gaps ≥ 1 day.
2. `GanttTimelineRow.vue` — computed `idleGaps`; если `specialMode === 'idle'` → render `<div class="gantt-row__idle-gap">` layer с абсолютным позиционированием по `dateToPixel`. Bar items (`GanttTimelineItem`) рендерятся как обычно поверх (z-index).
3. `GanttCalendarView.vue` — third toolbar button «Окна простоя» + `toggleIdle()` shim через `setSpecialMode('idle')` + `SUPPORTED_SPECIAL_MODES` extended.

Trade-off 1: **dim non-matching в idle mode vs full opacity.** В handover/overdue dimmed подчёркивает matching bars. В idle mode matching — сами gaps, а bars — это контекст ("занято тут"). Dimming bars уменьшит читаемость dates/guests. Выбираем full opacity bars + hatched gaps поверх background.

Trade-off 2: **gap layer под items (z-index 0) vs поверх.** Под — hatched pattern не перекрывает guest names. Items остаются кликабельными. Выбираем под.

Trade-off 3: **cancelled/checked_out bookings в gap calc.** Cancelled — обычно скрыты FT-020 REQ-10. Checked_out — гость уехал, юнит доступен. Оба исключаются из "занятости" и считаются частью gap. Это согласуется с бизнес-логикой idle (юнит продаваем).

### Change Surface

| Surface | Type | Why it changes |
|---|---|---|
| `frontend/src/utils/gantt.js` | code | Добавить `findIdleGaps(bookings, viewStart, viewEnd)` |
| `frontend/src/__tests__/utils/gantt.test.js` | code | Unit-тесты |
| `frontend/src/views/calendar/GanttTimelineRow.vue` | code | Computed `idleGaps`, render gap layer div с absolute positioning, CSS striped-pattern + label |
| `frontend/src/__tests__/views/calendar/GanttTimelineRow.test.js` | code | Gap rendering tests |
| `frontend/src/views/calendar/GanttCalendarView.vue` | code | Третий v-btn `toggleIdle`, extend `SUPPORTED_SPECIAL_MODES` |
| `frontend/src/__tests__/views/calendar/GanttCalendarView.test.js` | code | toggleIdle + mutual exclusion с handover/overdue |
| `frontend/src/locales/ru.json`, `en.json` | data | `modes.idle`, `idleLabel` |
| `frontend/e2e/calendar-overlap.spec.js` | code | E2e тест для idle |
| `memory-bank/domain/frontend.md` | doc | Calendar section — Idle Gaps subsection |
| `memory-bank/features/FT-020-gantt-calendar/feature.md` | doc | Обновить footnote NS-02 (add FT-023) |
| `memory-bank/features/README.md` | doc | Register FT-023 |

### Flow

1. **Boot.** Если `localStorage.specialMode === 'idle'` → restore (после extend SUPPORTED).
2. **Render.** `Row` — если `specialMode === 'idle'`, compute `idleGaps(enrichedBookings, viewStart, viewEnd)` → render gap layer under items.
3. **User clicks idle.** `setSpecialMode('idle')` мутирует mode; watch → persist. Re-render: gaps appear.
4. **Mutual exclusion.** Click handover/overdue → idle deactivates.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `findIdleGaps(bookings: Array<{_start,_end,status}>, viewStart: Date, viewEnd: Date)` → `Array<{start, end, days}>` | utils / Row | Pure; only non-cancelled non-checked_out bookings count as "busy"; gaps ≥ 1 day |
| `CTR-02` | `localStorage('apartus-calendar-view').specialMode`: valid set `'' \| 'handover' \| 'overdue' \| 'idle'` | GanttCalendarView | Unknown → `''` |

### Failure Modes

- `FM-01` Empty bookings → один gap на весь viewport (standard behavior).
- `FM-02` All bookings cancelled/checked_out → один gap на весь viewport (trade-off 3).
- `FM-03` Overlapping bookings (edge, normally blocked by backend) → `findIdleGaps` takes min start / max end per cluster; sorted walk handles it correctly.
- `FM-04` Booking _start before viewStart → clamp cursor к `max(viewStart, _end)`; gap перед ним не считается (outside viewport).
- `FM-05` Booking _end after viewEnd → last gap не emittится (cursor past viewEnd).

### ADR Dependencies

Нет.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..09` реализованы.
- `EC-02` Idle toggle работает end-to-end; persist между reload.
- `EC-03` Mutual exclusion с handover/overdue: clicking idle → ranее active mode deactivates.
- `EC-04` Все existing тесты (556+) pass. Новые добавлены. FT-021 + FT-022 tests unchanged (regression safety).
- `EC-05` Coverage ratchet не понижен.
- `EC-06` CI green.
- `EC-07` Dark + light mode визуально корректны.

### Acceptance Scenarios

- `SC-01` **Happy path.** Юнит с двумя reservations (04-10..04-13 и 04-20..04-25) + viewport 04-01..04-30. Click "Окна простоя" → видны 3 gap-области: 04-01..04-10 (9д), 04-13..04-20 (7д), 04-25..04-30 (5д). Bars без изменений. Re-click → gaps исчезают.
- `SC-02` **Empty unit.** Юнит без бронирований → один gap на весь viewport (28д для 28-day range).
- `SC-03` **Fully booked unit.** Юнит с back-to-back bookings → gaps нет (или <1d → не emitted).
- `SC-04` **Mutual exclusion.** Handover active → click idle → handover button loses primary color, idle button primary. В Item: no `--handover-*` classes, no `--dimmed`; в Row — gap layer появляется.
- `SC-05` **Persistence.** Activate idle → reload → idle restored.
- `SC-06` **Interaction preserved.** Click на booking bar в idle mode → navigate to edit (gap layer под items, не перехватывает).
- `SC-07` **Cancelled / checked_out bookings.** Cancelled всегда скрыты (FT-020 REQ-10). Checked_out видны как бары, но в gap calculation считаются частью gap — SC-01 adjusted: если один из bookings checked_out, gap перед его check_in "схлопывается".

### Negative / Edge Cases

- `NEG-01` Empty units → empty-state (FT-020 existing).
- `NEG-02` Invalid booking dates → skipped в Row (FT-020 NEG-02 existing); `findIdleGaps` consumes только valid _start/_end.
- `NEG-03` localStorage throws → fallback defaults.
- `NEG-04` Invalid specialMode value `'invalid'` → `''` fallback (existing SUPPORTED_SPECIAL_MODES guard).
- `NEG-05` Dark mode toggle с active idle → CSS vars сохраняют цвета pattern.
- `NEG-06` 1-day micro-gap между last_checkout и next_checkin → `≥ 1 day` threshold emittит. Если micro-gap < 1 day (booking check_in = previous check_out same day) → NOT emitted.
- `NEG-07` Single-day booking (check_in = check_out - 1d) → обрабатывается корректно, gap рассчитывается от его check_out.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
|---|---|---|---|---|
| `REQ-01` | `CTR-02` | `SC-04` | `CHK-02` | `EVID-02` |
| `REQ-02` | `CTR-01`, `FM-01..05` | `SC-01..03`, `NEG-02,06,07` | `CHK-02` | `EVID-02` |
| `REQ-03` | | `SC-01`, `SC-06` | `CHK-02`, `CHK-05` | `EVID-02`, `EVID-05` |
| `REQ-04` | | `SC-04` | `CHK-02` | `EVID-02` |
| `REQ-05` | | `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-06` | `CTR-02` | `SC-05`, `NEG-04` | `CHK-02` | `EVID-02` |
| `REQ-07` | | — | `CHK-04` | `EVID-04` |
| `REQ-08` | | `NEG-05` | `CHK-05` | `EVID-05` |
| `REQ-09` | | `EC-04,05` | `CHK-01,02,07` | `EVID-01,02,07` |

### Checks

| Check ID | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-04,05` | `yarn test:coverage` | 0 failures, ratchet met | `artifacts/ft-023/verify/chk-01/` |
| `CHK-02` | `REQ-01..06,09` + SCs/NEGs | `yarn test src/__tests__/utils/gantt.test.js src/__tests__/views/calendar/` | findIdleGaps matrix, Row gap layer rendering, CalendarView toggleIdle + mutual exclusion. FT-021 + FT-022 tests unchanged. | `artifacts/ft-023/verify/chk-02/` |
| `CHK-03` | `EC-01` | `git diff main..HEAD --stat` | Минимальный change surface | `artifacts/ft-023/verify/chk-03/` |
| `CHK-04` | `REQ-07` | grep cyrillic в `views/calendar/` + `utils/gantt.js` | 0 hardcoded | `artifacts/ft-023/verify/chk-04/` |
| `CHK-05` | `REQ-03,08` + `SC-01`, `NEG-05` | Manual QA light + dark screenshots | Gaps видны, pattern читаем в обоих themes | `artifacts/ft-023/verify/chk-05/` |
| `CHK-06` | `EC-06` | `markdownlint-cli2` + CI | 0 errors + 5/5 jobs | `artifacts/ft-023/verify/chk-06/` |
| `CHK-07` | `EC-02,03` + `SC-01,04` | `yarn test:e2e` новый test | Click idle → `.gantt-row__idle-gap` appears; mutual exclusion; click back — cleared | `artifacts/ft-023/verify/chk-07/` |

### Test matrix

| Check | EVID | Path |
|---|---|---|
| `CHK-01` | `EVID-01` | `artifacts/ft-023/verify/chk-01/` |
| `CHK-02` | `EVID-02` | `artifacts/ft-023/verify/chk-02/` |
| `CHK-03` | `EVID-03` | `artifacts/ft-023/verify/chk-03/` |
| `CHK-04` | `EVID-04` | `artifacts/ft-023/verify/chk-04/` |
| `CHK-05` | `EVID-05` | `artifacts/ft-023/verify/chk-05/` |
| `CHK-06` | `EVID-06` | `artifacts/ft-023/verify/chk-06/` |
| `CHK-07` | `EVID-07` | `artifacts/ft-023/verify/chk-07/` |

### Evidence

- `EVID-01` Coverage report.
- `EVID-02` Vitest run log.
- `EVID-03` Git diff stat.
- `EVID-04` grep output.
- `EVID-05` Screenshots light + dark.
- `EVID-06` Lint + CI links.
- `EVID-07` Playwright report.

### Evidence contract

| EVID | Artifact | Producer | Path | Reused by |
|---|---|---|---|---|
| `EVID-01` | Coverage | `yarn test:coverage` | `artifacts/ft-023/verify/chk-01/` | `CHK-01` |
| `EVID-02` | Vitest log | `yarn test` | `artifacts/ft-023/verify/chk-02/` | `CHK-02` |
| `EVID-03` | Git diff | shell | `artifacts/ft-023/verify/chk-03/` | `CHK-03` |
| `EVID-04` | grep | shell | `artifacts/ft-023/verify/chk-04/` | `CHK-04` |
| `EVID-05` | Screenshots | manual | `artifacts/ft-023/verify/chk-05/` | `CHK-05` |
| `EVID-06` | Lint + CI | `markdownlint` + `gh` | `artifacts/ft-023/verify/chk-06/` | `CHK-06` |
| `EVID-07` | Playwright | `yarn test:e2e` | `artifacts/ft-023/verify/chk-07/` | `CHK-07` |
