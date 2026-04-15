---
title: "FT-022: Gantt Overdue Mode"
doc_kind: feature
doc_function: canonical
purpose: "Режим подсветки просроченных выездов на Gantt-календаре. Второй из special modes, оставленных в NS-02 FT-020 (первый — FT-021 Handover)."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../../domain/schema.md
  - ../../domain/state-machines.md
  - ../../engineering/coding-style.md
  - ../../engineering/testing-policy.md
  - ../../engineering/design-style-guide.md
  - ../FT-020-gantt-calendar/feature.md
  - ../FT-021-gantt-handover-mode/feature.md
status: active
delivery_status: in_progress
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-022: Gantt Overdue Mode

## What

### Problem

FT-020 отрисовывает все бронирования, FT-021 подсвечивает предстоящие заезды/выезды. Но есть третий операционно-критичный сценарий — **просроченные выезды**: гость должен был съехать, но `status` всё ещё `checked_in`, а `check_out < today`. Front-desk и housekeeping должны видеть эти reservations сразу для процесса collection / room release / billing extras.

На 50+ юнитах без подсветки менеджер должен визуально сверять check_out dates с today — то же боль, что решал FT-021 для check-in/out сегодня, но для просроченного выезда.

Референс-реализация в rentprog (`gantt-utils.js#getOverdueDays`, `GanttTimelineItem.vue` overdue-pulse animation) решает это отдельным режимом + анимацией.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
|---|---|---|---|---|
| `MET-01` | Overdue-режим доступен через toolbar toggle | нет | да | Component test + manual QA |
| `MET-02` | Просроченные reservations выделяются от остальных | все бары одинаковые | overdue → `.gantt-item--overdue` + overdue-days label; остальные → `.gantt-item--dimmed` | E2e `CHK-07` |
| `MET-03` | Coverage ratchet | текущий | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Toolbar toggle** в `GanttCalendarView` — `v-btn` «Просрочки» (icon `mdi-alert-circle-outline`), mutually exclusive с остальными special modes (когда активен handover → клик по overdue переключает на overdue; клик повторно по overdue → ''). Реализация: `toggleOverdue()` с теми же принципами, что и `toggleHandover` (FT-021 REQ-06).
- `REQ-02` **Классификация бара** через `utils/gantt.js#getOverdueDays(booking, today)` возвращает `number` (≥0) — количество просроченных дней. `>0` означает `status === 'checked_in'` AND `parseIsoDate(check_out).valueOf() < today.valueOf()`. Формула: `Math.ceil((today - check_out) / MS_PER_DAY)` где обе даты в local midnight. Для остальных reservations возвращает `0`.
- `REQ-03` **Styling в `GanttTimelineItem`** при `specialMode === 'overdue'`:
  - `overdueDays > 0` → 3px красный border (`--v-theme-error`) + inline label `+Nд` (в правом углу бара) + class `gantt-item--overdue-pulse` с CSS `@keyframes` pulse-анимацией.
  - `overdueDays === 0` → `.gantt-item--dimmed` (opacity 0.35) — поведение идентично FT-021 handover dimmed.
  - Icon/label имеет `pointer-events: none` чтобы не перехватывать click.
- `REQ-04` **Prop-propagation** — existing `specialMode` prop (FT-021 уже пробрасывается) работает без изменений. Только добавляем ветку `'overdue'` в classification.
- `REQ-05` **Persistence** — `localStorage('apartus-calendar-view')` field `specialMode` расширяется списком supported values: `['', 'handover', 'overdue']`. Backwards-compat: legacy payloads без поля ИЛИ со старым valid value остаются рабочими.
- `REQ-06` **Toolbar UX** — overdue button рядом с handover. Active state подсвечен primary color (elevated variant). Mutual exclusion: любой клик обновляет `specialMode` через единую функцию `setSpecialMode(mode)`:
  - `setSpecialMode(newMode)`: `specialMode.value = specialMode.value === newMode ? '' : newMode`
  - `toggleHandover()` и `toggleOverdue()` рефакторятся через эту функцию (минимальный refactor existing FT-021).
- `REQ-07` **i18n** — новые keys в `calendar.gantt.modes.overdue` и `calendar.gantt.overdueLabel` (formatted как `+{n}д` / `+{n}d` с плюрализацией если нужно — Phase 1 fallback на простую форму).
- `REQ-08` **Dark mode compatibility** — все цвета через CSS-vars (`--v-theme-error`).
- `REQ-09` **Tests**:
  - Unit: `utils/gantt.js#getOverdueDays` — матрица статусов × даты.
  - Component: `GanttTimelineItem` — overdue classes / border / label per overdueDays; mutual exclusion с handover (clicking overdue → handover deactive); setSpecialMode функция.
  - E2e: обновить `calendar-overlap.spec.js` — добавить тест clicking overdue → `.gantt-item--overdue` появляется либо `.gantt-item--dimmed` (зависит от seed).
- `REQ-10` **Pulse-анимация** — `@keyframes overdue-pulse` 1.5s ease-in-out infinite (paused on `prefers-reduced-motion`). Тонкая, не раздражающая.

### Non-Scope

- `NS-01` **Другие special modes** (idle gaps / heatmap / loading) — отдельные FT-023+.
- `NS-02` **Automatic notification** / email / push о просрочке — отдельная фича (`notifications`).
- `NS-03` **Automatic status transitions** (e.g. force-checkout через N часов) — backend-фича, не UI.
- `NS-04` **Plural forms for overdue days** (`1 день / 2 дня / 5 дней`) — Phase 1 использует сокращённый `+Nд` без плюрализации.
- `NS-05` **Configurable threshold** (когда считать просрочкой — от 1ч, 12ч, 1д?) — Phase 1 использует простое `check_out < today` (local midnight comparison).
- `NS-06` **`isBookingOverdue` (просроченное начало — start_date просрочен)** — rentprog концепт, не применим к Apartus (нет `active` flag как в cars).
- `NS-07` **Overdue filters на reservation list view** — отдельная фича.
- `NS-08` **Multi-mode combo** (handover + overdue одновременно) — Phase 1 mutually exclusive.
- `NS-09` **Keyboard alternative** для toggle (следует `NS-17` FT-020).

### Constraints / Assumptions

- `ASM-01` FT-020 + FT-021 merged. `specialMode` prop уже прокидывается Timeline → Row → Item. `setSpecialMode`-паттерн добавляется в FT-022.
- `ASM-02` `Reservation.check_out: date`, `status` enum включает `checked_in` — без изменений.
- `ASM-03` CSS animation `@keyframes` поддерживаются всеми target browsers (Vuetify 4 = evergreen).
- `ASM-04` Все frontend тесты продолжают проходить. 532/532 baseline.
- `CON-01` **No new npm packages.**
- `CON-02` **No TypeScript.**
- `CON-03` Coverage ratchet не понижается.
- `CON-04` **No backend changes.**
- `CON-05` **Reduced motion respect** — `@media (prefers-reduced-motion: reduce)` останавливает pulse анимацию (a11y best practice).

## How

### Solution

Расширение FT-021 паттерна:

1. `utils/gantt.js` — добавить `getOverdueDays(booking, today: Date)`.
2. `GanttTimelineItem.vue` — добавить ветку `specialMode === 'overdue'` в computed `itemClasses`. Rendering overdue label через span с `pointer-events: none`. CSS pulse-animation + dimmed-class reuse.
3. `GanttCalendarView.vue` — рефакторинг `toggleHandover` → единая `setSpecialMode(mode)` helper; toolbar расширяется вторым `v-btn` для overdue; `SUPPORTED_SPECIAL_MODES` расширяется `'overdue'`.
4. `locales/ru.json` + `en.json` — новые keys.

Trade-off: `setSpecialMode(mode)` vs два независимых toggle function. Выбираем единую helper — DRY, mutual exclusion garantируется одной функцией.

Trade-off: pulse animation vs static border. Выбираем анимацию — усиливает сигнал, общая практика для alerting UIs. `prefers-reduced-motion` защищает от мотивированной сложности.

### Change Surface

| Surface | Type | Why it changes |
|---|---|---|
| `frontend/src/utils/gantt.js` | code | Добавить `getOverdueDays(booking, today)` |
| `frontend/src/__tests__/utils/gantt.test.js` | code | Unit-тесты матрицы |
| `frontend/src/views/calendar/GanttCalendarView.vue` | code | Добавить `toggleOverdue()`, `setSpecialMode()` helper, второй `v-btn` в toolbar, extend `SUPPORTED_SPECIAL_MODES` |
| `frontend/src/views/calendar/GanttTimelineItem.vue` | code | Computed `overdueDays`, class `--overdue` + label span + pulse animation CSS |
| `frontend/src/__tests__/views/calendar/GanttTimelineItem.test.js` | code | Overdue тесты |
| `frontend/src/__tests__/views/calendar/GanttCalendarView.test.js` | code | toggleOverdue + mutual exclusion с handover |
| `frontend/src/locales/ru.json`, `en.json` | data | `modes.overdue`, `overdueLabel` |
| `frontend/e2e/calendar-overlap.spec.js` | code | Ещё один e2e тест для overdue |
| `memory-bank/domain/frontend.md` | doc | Calendar section — Overdue subsection |
| `memory-bank/features/FT-020-gantt-calendar/feature.md` | doc | Обновить footnote NS-02 |
| `memory-bank/features/FT-021-gantt-handover-mode/feature.md` | doc | Ссылка на FT-022 (optional) |
| `memory-bank/features/README.md` | doc | Register FT-022 |

### Flow

1. **Boot.** `GanttCalendarView` читает `localStorage`. Если `specialMode === 'overdue'` и valid, restore. Иначе default `''`.
2. **Render.** `specialMode` прокинут в Item через existing chain. Item с `specialMode === 'overdue'`: classify через `getOverdueDays`, применить classes + label.
3. **User clicks overdue.** Если active handover → `setSpecialMode('overdue')` переключает на overdue. Если overdue active → deactivate (`''`).
4. **Re-render** через reactive watcher.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `getOverdueDays(booking, today: Date)` → `number` ≥ 0. `>0` когда checked_in AND check_out < today. | utils/gantt.js / Item | Pure function |
| `CTR-02` | `localStorage('apartus-calendar-view')` field `specialMode` extended valid set: `'' \| 'handover' \| 'overdue'` | GanttCalendarView | Unknown values → `''` |
| `CTR-03` | `setSpecialMode(mode: string)` — helper toggle/switch function | GanttCalendarView (script) | `mode === current ? '' : mode` |

### Failure Modes

- `FM-01` `booking.check_out` невалидная дата → `getOverdueDays` возвращает `0` (не crash). Wrapped in try/catch для parseIsoDate.
- `FM-02` `specialMode === 'overdue'` но в org нет ни одной просроченной — все бары dimmed, toolbar button active. UX acceptable.
- `FM-03` CSS animation не поддерживается (IE / старый Safari) — static border всё равно виден, label читаем. Graceful degradation.
- `FM-04` `prefers-reduced-motion: reduce` — pulse animation paused, остаётся только border + label. Не теряем информативность.

### ADR Dependencies

Нет новых ADR.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..10` реализованы.
- `EC-02` Overdue toggle работает end-to-end, persist между reload.
- `EC-03` Mutual exclusion с handover: clicking overdue → handover deactivates.
- `EC-04` Все существующие тесты (532+) продолжают проходить. Новые добавлены. **FT-021 regression explicit: existing `toggleHandover` component test passes без модификации после refactor через `setSpecialMode`.**
- `EC-05` Coverage ratchet не понижен.
- `EC-06` CI green: Lint / Frontend / Backend / Smoke.
- `EC-07` Dark + light mode визуально корректны.

### Acceptance Scenarios

- `SC-01` **Happy path — overdue activation.** User на `/calendar`, есть reservation с `status='checked_in'` и `check_out=2 days ago`. Click «Просрочки» → бар получает красный border + `+2д` label + pulse. Остальные бары dimmed. Re-click → state normal.
- `SC-02` **Mutual exclusion.** Active handover. User нажимает overdue → handover deactivates (button loses primary color), overdue activates (primary color on overdue button). Бары перераспределяются по overdue logic.
- `SC-03` **No overdue in org.** Активировать overdue → все бары dimmed, toolbar button primary. Нет crash.
- `SC-04` **Persistence.** Активировать overdue → reload → mode restore.
- `SC-05` **Interaction preserved.** Click / contextmenu / hover работают в overdue mode (label не перехватывает).
- `SC-06` **Reduced motion.** В системе `prefers-reduced-motion: reduce` — pulse не играет, border+label остаются.

### Negative / Edge Cases

- `NEG-01` Пустой units → empty state (из FT-020).
- `NEG-02` Reservation с невалидной датой → `getOverdueDays` возвращает 0.
- `NEG-03` Cancelled / confirmed / checked_out reservation → `getOverdueDays === 0`, dimmed в overdue mode.
- `NEG-04` localStorage throws → fallback.
- `NEG-05` Dark mode toggle при active overdue — все цвета сохраняются через CSS vars.
- `NEG-06` Reservation с `check_out === today` и `status=checked_in` → `getOverdueDays === 0` (НЕ просрочка; выезд сегодня — это "on time"; это handover territory, FT-021 `checkout_today`). Edge clarification. **UX consequence:** в overdue mode такой reservation render как `.gantt-item--dimmed`; user должен переключиться на handover mode чтобы увидеть highlight для сегодняшнего выезда.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
|---|---|---|---|---|
| `REQ-01` | `CTR-03` | `SC-01`, `SC-02` | `CHK-02` | `EVID-02` |
| `REQ-02` | `CTR-01`, `FM-01` | `SC-01`, `NEG-02,03,06` | `CHK-02` | `EVID-02` |
| `REQ-03` | | `SC-01`, `SC-05` | `CHK-02`, `CHK-05` | `EVID-02`, `EVID-05` |
| `REQ-04` | | — (existing FT-021 infrastructure) | `CHK-02` | `EVID-02` |
| `REQ-05` | `CTR-02`, `FM-02` | `SC-04` | `CHK-02` | `EVID-02` |
| `REQ-06` | `CTR-03` | `SC-02` | `CHK-02` | `EVID-02` |
| `REQ-07` | | — | `CHK-04` | `EVID-04` |
| `REQ-08` | | `NEG-05` | `CHK-05` | `EVID-05` |
| `REQ-09` | | `EC-04`, `EC-05` | `CHK-01`, `CHK-02`, `CHK-07` | `EVID-01`, `EVID-02`, `EVID-07` |
| `REQ-10` | `CON-05`, `FM-03,04` | `SC-06` | `CHK-05` | `EVID-05` |

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
|---|---|---|---|---|
| `CHK-01` | `EC-04`, `EC-05` | `yarn test:coverage` | 0 failures, ratchet met | `artifacts/ft-022/verify/chk-01/` |
| `CHK-02` | `REQ-01..06,09` + SCs/NEGs | `yarn test src/__tests__/utils/gantt.test.js src/__tests__/views/calendar/` | getOverdueDays matrix, Item overdue classes/label/animation, CalendarView toggleOverdue + mutual exclusion + setSpecialMode. **jsdom NOT используется для animation / reduced-motion — это эксклюзивно `CHK-05` manual QA.** | `artifacts/ft-022/verify/chk-02/` |
| `CHK-03` | `EC-01` | `git diff main..HEAD --stat` final | Минимальный change surface согласно Change Surface table | `artifacts/ft-022/verify/chk-03/` |
| `CHK-04` | `REQ-07` | `grep -rn '[А-Яа-яЁё]' frontend/src/views/calendar/ frontend/src/utils/gantt.js \| grep -v 'locales\|__tests__' \| grep -vE '^\s*(//\|/\*\|\*)'` | 0 hardcoded Cyrillic | `artifacts/ft-022/verify/chk-04/` |
| `CHK-05` | `REQ-03,08,10` + `SC-01`, `NEG-05`, `SC-06` | Manual QA light + dark + reduced-motion screenshots | Pulse animation visible in normal mode, paused in reduced-motion | `artifacts/ft-022/verify/chk-05/` |
| `CHK-06` | `EC-06` | `markdownlint-cli2 "**/*.md"` + CI | 0 errors + 5/5 CI jobs | `artifacts/ft-022/verify/chk-06/` |
| `CHK-07` | `EC-02,03` + `SC-01..04` | `yarn test:e2e e2e/calendar-overlap.spec.js` — новый test case | Click overdue → appears `.gantt-item--overdue` OR `.gantt-item--dimmed`. Click handover затем overdue → specialMode переходит на overdue. | `artifacts/ft-022/verify/chk-07/` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
|---|---|---|
| `CHK-01` | `EVID-01` | `artifacts/ft-022/verify/chk-01/` |
| `CHK-02` | `EVID-02` | `artifacts/ft-022/verify/chk-02/` |
| `CHK-03` | `EVID-03` | `artifacts/ft-022/verify/chk-03/` |
| `CHK-04` | `EVID-04` | `artifacts/ft-022/verify/chk-04/` |
| `CHK-05` | `EVID-05` | `artifacts/ft-022/verify/chk-05/` |
| `CHK-06` | `EVID-06` | `artifacts/ft-022/verify/chk-06/` |
| `CHK-07` | `EVID-07` | `artifacts/ft-022/verify/chk-07/` |

### Evidence

- `EVID-01` Vitest coverage output.
- `EVID-02` Vitest run log.
- `EVID-03` Git diff stat.
- `EVID-04` grep output.
- `EVID-05` Screenshots: light + dark + reduced-motion.
- `EVID-06` Markdownlint + CI links.
- `EVID-07` Playwright run log.

### Evidence contract

| Evidence ID | Artifact | Producer | Path | Reused by |
|---|---|---|---|---|
| `EVID-01` | Coverage report | `yarn test:coverage` | `artifacts/ft-022/verify/chk-01/` | `CHK-01` |
| `EVID-02` | Vitest run log | `yarn test` | `artifacts/ft-022/verify/chk-02/` | `CHK-02` |
| `EVID-03` | Git diff | shell | `artifacts/ft-022/verify/chk-03/` | `CHK-03` |
| `EVID-04` | grep output | shell | `artifacts/ft-022/verify/chk-04/` | `CHK-04` |
| `EVID-05` | Screenshots | manual | `artifacts/ft-022/verify/chk-05/` | `CHK-05` |
| `EVID-06` | Lint + CI links | `markdownlint` + `gh run view` | `artifacts/ft-022/verify/chk-06/` | `CHK-06` |
| `EVID-07` | Playwright report | `yarn test:e2e` | `artifacts/ft-022/verify/chk-07/` | `CHK-07` |
