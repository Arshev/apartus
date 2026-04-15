---
title: "FT-021: Gantt Handover Mode"
doc_kind: feature
doc_function: canonical
purpose: "Режим подсветки предстоящих заездов и выездов на Gantt-календаре. Первый из special modes, оставленных в NS-02 FT-020."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../../domain/schema.md
  - ../../domain/state-machines.md
  - ../../engineering/coding-style.md
  - ../../engineering/testing-policy.md
  - ../../engineering/design-style-guide.md
  - ../FT-020-gantt-calendar/feature.md
status: active
delivery_status: in_progress
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-021: Gantt Handover Mode

## What

### Problem

После FT-020 Gantt отрисовывает все бронирования одинаково — различаются только цвета по статусу. Для front-desk работы это недостаточно: чтобы понять «кто заезжает сегодня / завтра, кто выезжает сегодня / завтра» менеджеру нужно визуально сканировать бары и сверять даты с календарём. На 50+ юнитах это поиск иголки в стоге сена.

Референс-реализация в `rentprog/rentalman-vue` (`gantt-utils.js:getHandoverType`, `getHandoverBorder`, `getHandoverMarker`; `GanttTimelineItem.vue` handover classes) решает это специальным режимом подсветки, который:

- выделяет цветной рамкой бары с check-in/check-out в горизонте ±1 день,
- добавляет иконку-маркер (↙ выезд / ↗ заезд),
- приглушает все остальные бары (`opacity: 0.35`), чтобы целевые операции были в фокусе.

FT-021 — порт этого режима в Apartus, первый из четырёх special modes, отложенных в FT-020 (`NS-02`).

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
|---|---|---|---|---|
| `MET-01` | Handover-режим доступен через toolbar toggle | нет | да | Ручной scenario + component test на chip рендер |
| `MET-02` | Предстоящие заезды/выезды визуально выделяются от остальных | все бары одинаковые | бары matching handover → unique class `.gantt-item--handover-*`; остальные → `.gantt-item--dimmed` | E2e (`CHK-07`): активация handover → assert при известном seed-распределении минимум один `.gantt-item--handover-*` класс + один `.gantt-item--dimmed` |
| `MET-03` | Coverage ratchet | текущий | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Toolbar toggle** в `GanttCalendarView` — chip/button «Заезды/выезды» (icon `mdi-swap-horizontal`), mutually exclusive с другими special modes (когда появятся FT-021+ modes, но пока только Handover).
- `REQ-02` **Классификация бара** через `utils/gantt.js#getHandoverType(booking, today)` возвращает `'checkin_today' | 'checkin_tomorrow' | 'checkout_today' | 'checkout_tomorrow' | null`. Signature: caller передаёт `today = startOfDay(new Date())` (из `utils/date.js`). Сравнение через `parseIsoDate(booking.check_in).valueOf() === today.valueOf()` (и `+ 86_400_000` для tomorrow). Правила (адаптировано под Apartus status enum):
  - `checkin_today` — `status === 'confirmed'` AND `parseIsoDate(check_in).valueOf() === today.valueOf()`
  - `checkin_tomorrow` — `status === 'confirmed'` AND `parseIsoDate(check_in).valueOf() === today.valueOf() + 86_400_000`
  - `checkout_today` — `status === 'checked_in'` AND `parseIsoDate(check_out).valueOf() === today.valueOf()`
  - `checkout_tomorrow` — `status === 'checked_in'` AND `parseIsoDate(check_out).valueOf() === today.valueOf() + 86_400_000`
  - остальные (включая `checked_out` / `cancelled`) → `null`
- `REQ-03` **Styling в `GanttTimelineItem`** при `specialMode === 'handover'`:
  - `checkin_today` → 3px зелёный border + иконка ↗
  - `checkin_tomorrow` → 3px светло-зелёный border (без иконки)
  - `checkout_today` → 3px красный border + иконка ↙
  - `checkout_tomorrow` → 3px оранжевый border (без иконки)
  - `handoverType === null` → opacity 0.35 (dimmed)
  - Icon marker — child-span с CSS `pointer-events: none`, чтобы не перехватывать `click` / `contextmenu` от родительского `.gantt-item` (см. `SC-07`).
- `REQ-04` **Prop-propagation** от `GanttCalendarView` → `GanttTimeline` → `GanttTimelineRow` → `GanttTimelineItem` через новый prop `specialMode: string` (default: `''`).
- `REQ-05` **Persistence** — активный mode сохраняется в `localStorage('apartus-calendar-view')` как поле `specialMode`. Fallback: пусто (нет mode).
- `REQ-06` **Toolbar UX**: chip выделяется цветом primary когда активна. Повторный клик — выключает mode. Реализация: одиночная `v-btn` с `:color="specialMode === 'handover' ? 'primary' : undefined"` + `@click="toggleHandover"`, НЕ `v-btn-toggle` (который в `rangeDays` через `mandatory` не даёт null-state). Toggle функция: `specialMode = specialMode === 'handover' ? '' : 'handover'`.
- `REQ-07` **i18n** — новые keys в `calendar.gantt.modes.*` и `calendar.gantt.handoverMarkers.*` (ru + en).
- `REQ-08` **Dark mode compatibility** — все цвета через CSS-variables или design tokens (уже доступны).
- `REQ-09` **Tests**:
  - Unit: `utils/gantt.js#getHandoverType` (матрица всех 5 исходов).
  - Component: `GanttTimelineItem` — handover classes/border/icon рендерятся per handoverType; `GanttTimelineRow` — `specialMode` прокидывается в items; `GanttCalendarView` — toggle состояния, persistence, prop passthrough.
  - E2e: обновить `calendar-overlap.spec.js` или отдельный spec — активировать handover, assert что хотя бы один бар получил класс `gantt-item--handover-checkin_today` или `--checkout_today` (семантически зависит от seed).

### Non-Scope

- `NS-01` Остальные special modes (idle gaps / overdue / heatmap / loading) — отдельные FT.
- `NS-02` Finance mode с paid% gradient — отдельная FT (требует payments model).
- `NS-03` Compact mode + overlap zones (косые полосы) — отдельная FT.
- `NS-04` Multi-select modes (включить одновременно несколько) — Phase 1 предполагает взаимоисключающий выбор.
- `NS-05` Mobile-adapted handover toolbar — тот же chip через Vuetify breakpoints, отдельного mobile layout не делаем.
- `NS-06` Handover timeline view (отдельный list с списком сегодняшних заездов) — out of scope, это другой UX.
- `NS-07` Backend push-уведомления о предстоящих заездах — не изменяется этой фичей.
- `NS-08` Изменение модели Reservation — не требуется.
- `NS-09` Конфигурируемый «завтрашний» горизонт (1 / 3 / 7 дней) — Phase 1 фиксирует ±1 день.
- `NS-10` Keyboard shortcut для toggle mode — полагаемся на mouse click. A11y-backlog из FT-020 `NS-17`.

### Constraints / Assumptions

- `ASM-01` FT-020 Phase 1 merged (`GanttCalendarView`, `GanttTimelineRow`, `GanttTimelineItem`, `utils/gantt.js`, `localStorage('apartus-calendar-view')`). Инфраструктура готова.
- `ASM-02` `Reservation#status` enum `{confirmed, checked_in, checked_out, cancelled}` и `check_in`/`check_out: date` — без изменений.
- `ASM-03` Design tokens `--v-theme-primary` / `-status-*` / `-success` / `-error` / `-warning` доступны (см. [`plugins/vuetify.js`](../../../frontend/src/plugins/vuetify.js)).
- `ASM-04` Все frontend тесты продолжают проходить.
- `CON-01` **No new npm packages.** Адаптация — чистые JS-функции + CSS.
- `CON-02` **No TypeScript.**
- `CON-03` Coverage ratchet не понижается.
- `CON-04` **No schema changes.** Если в будущем handover потребует bracket ≠ ±1 день, это вынесется в follow-up.

## How

### Solution

Добавить в `utils/gantt.js` pure-функцию `getHandoverType(booking, today)`. В `GanttCalendarView.vue` завести reactive `specialMode` (read from localStorage, write on toggle), прокинуть пропом через `GanttTimeline → GanttTimelineRow → GanttTimelineItem`. В `GanttTimelineItem.vue`:

- если `specialMode === 'handover'`, вычислить `handoverType` через utility,
- если `handoverType !== null` — применить класс `gantt-item--handover-${type}` (styled border + icon via slot),
- иначе — `gantt-item--dimmed` (opacity 0.35).

Toolbar в `GanttCalendarView` добавляет одиночную `v-btn` (НЕ `v-btn-toggle`) с одной кнопкой «Заезды/выезды». State хранится в reactive string `specialMode: '' | 'handover'`. Toggle функция: `specialMode = specialMode === 'handover' ? '' : 'handover'`. Цвет кнопки — `:color="specialMode === 'handover' ? 'primary' : undefined"`.

Trade-off: reactive string vs Set для multi-select. Выбираем string — проще state, `'' | 'handover'` mutually exclusive by design + в `NS-04` явно выведено. Когда будут FT-022+ modes (idle/overdue), расширим string enum (`'handover' | 'idle' | ...`) либо мигрируем на Set если multi-select понадобится.

Почему НЕ `v-btn-toggle`: `v-btn-toggle` с `mandatory` (как `rangeDays` в FT-020) не даёт null-state, а без `mandatory` требует специального handling. Проще — одиночная `v-btn` c локальной toggle-функцией.

Trade-off: styling через class vs inline style. Class — Vuetify-way, dark-mode через CSS vars, легче тестируется через `.classes()`.

Trade-off: икона ↗ / ↙ через Unicode или через `v-icon`? Unicode — быстрее, без нового mdi-подключения; шрифт рендерит символы стабильно в обоих themes.

### Change Surface

| Surface | Type | Why it changes |
|---|---|---|
| `frontend/src/utils/gantt.js` | code | Добавить `getHandoverType(booking, today)` |
| `frontend/src/__tests__/utils/gantt.test.js` | code | Unit-тест матрицы |
| `frontend/src/views/calendar/GanttCalendarView.vue` | code | Toolbar toggle, state, localStorage, prop passthrough |
| `frontend/src/views/calendar/GanttTimeline.vue` | code | Пробросить `specialMode` в rows |
| `frontend/src/views/calendar/GanttTimelineRow.vue` | code | Пробросить в items |
| `frontend/src/views/calendar/GanttTimelineItem.vue` | code | Compute handoverType; класс-styling; icon marker |
| `frontend/src/__tests__/views/calendar/GanttTimelineItem.test.js` | code | Класс/icon рендер-тест per type |
| `frontend/src/__tests__/views/calendar/GanttTimelineRow.test.js` | code | Prop-propagation тест |
| `frontend/src/__tests__/views/calendar/GanttCalendarView.test.js` | code | Toggle + localStorage тест |
| `frontend/src/locales/ru.json`, `en.json` | data | `calendar.gantt.modes.handover`, `handoverMarkers.*` |
| `frontend/e2e/calendar-overlap.spec.js` OR new `calendar-handover.spec.js` | code | Активация mode + assert стилей |
| `memory-bank/domain/frontend.md` | doc | Calendar section — Handover subsection |
| `memory-bank/features/FT-020-gantt-calendar/feature.md` | doc (append only) | Добавить footnote/note у `NS-02` «см. FT-021 для handover». Не переписывать scope закрытой фичи — только cross-reference |
| `memory-bank/features/README.md` | doc | Register FT-021 |

### Flow

1. **Boot.** `GanttCalendarView` читает `localStorage('apartus-calendar-view')`. Если в payload есть `specialMode`, restore. Иначе default `''`.
2. **Render.** `specialMode` прокинута в Timeline → Row → Item. Item с `specialMode === ''` ведёт себя как в FT-020. С `'handover'` — classify и style.
3. **User activates handover.** Click chip → `specialMode = 'handover'` → watch триггерит persist → re-render.
4. **User deactivates.** Повторный click → `specialMode = ''` → re-render.
5. **User меняет range / refresh** — handover mode сохраняется (независимо от range).

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `getHandoverType(booking, today: Date)` → `'checkin_today' \| 'checkin_tomorrow' \| 'checkout_today' \| 'checkout_tomorrow' \| null`. Input `today` — Date at local midnight (caller вызывает `startOfDay(new Date())`). | utils/gantt.js / Item component | Pure function, testable |
| `CTR-02` | `localStorage('apartus-calendar-view')` расширяется полем `specialMode: string` (backwards-compatible — старые записи без него resolve в `''`) | GanttCalendarView | Fallback: `''`. Валидные значения: `'' \| 'handover'`. Unknown values → `''` |
| `CTR-03` | Prop `specialMode: string` — `required: false, default: ''` — проброшен в Timeline → Row → Item | Vue component tree | Optional prop |

### Failure Modes

- `FM-01` `localStorage` payload corrupted (не-JSON или неожиданное поле) → fallback `specialMode = ''`. Уже обернуто в try/catch в FT-020 setup.
- `FM-02` `specialMode` — неподдерживаемое значение (e.g. `'idle'` до FT-022) → treated as `''`. Guard в getter (`supportedModes.includes(value) ? value : ''`).
- `FM-03` `booking.check_in` / `check_out` — невалидная дата → handoverType = null (skip), лог warn. Уже обработано upstream в Row (parseIsoDate).
- `FM-04` Активен handover, но в seeding нет подходящих bookings → все бары dimmed, toolbar chip активна. UX acceptable — пользователь видит «ничего не ожидается» по отсутствию подсветок.

### ADR Dependencies

Нет новых ADR.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..09` реализованы.
- `EC-02` Handover toggle работает end-to-end: click → стили меняются → состояние persist между reload.
- `EC-03` Все существующие frontend тесты продолжают проходить. Новые тесты добавлены.
- `EC-04` Coverage ratchet не понижен.
- `EC-05` CI green: Lint / Frontend / Backend / Smoke.
- `EC-06` Dark + light mode визуально корректны (borders + icons видимы).

### Acceptance Scenarios

- `SC-01` **Happy path — handover activation.** User на `/calendar`, есть reservation с check_in=today и status=confirmed. Click chip «Заезды/выезды» → бар этого reservation получает зелёный border + ↗ marker. Остальные бары dimmed. Re-click chip → state normal.
- `SC-02` **Check-out today.** Reservation с status=checked_in и check_out=today → при активном handover — красный border + ↙ marker.
- `SC-03` **Tomorrow bracket.** Reservation с check_in=today+1 → светло-зелёный border (без icon).
- `SC-04` **Dimmed non-target.** Reservation с check_in=today+5 (вне bracket) → dimmed opacity.
- `SC-05` **Persistence.** Активировать handover → reload page → handover остаётся активен.
- `SC-06` **Deactivation persists.** Активен → click deactivate → reload → mode `''`, все bars normal.
- `SC-07` **Interaction preserved.** В handover mode клик/ContextMenu работают как в FT-020 (открыть edit / меню).

### Negative / Edge Cases

- `NEG-01` No reservations matching handover — все бары dimmed, chip highlighted. Нет crash.
- `NEG-02` `localStorage` throws при записи — chip визуально меняется, persist не срабатывает silently (warn в console). В следующий reload вернётся к default.
- `NEG-03` Невалидное `specialMode` в storage (`'invalid'`) — fallback `''`, chip неактивна.
- `NEG-04` Cancelled reservation в handover mode — не отображается (REQ-10 FT-020 фильтр цепляет ранее).
- `NEG-05` Checked_out reservation в handover mode — `handoverType = null` → dimmed (не highlighted даже если check_out=today). Корректно: гость уже уехал.
- `NEG-06` Dark mode toggle при активном handover — цвета рамок сохраняются (через CSS vars или semantic tokens).

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
|---|---|---|---|---|
| `REQ-01` | | `SC-01`, `EC-02` | `CHK-02`, `CHK-05` | `EVID-02`, `EVID-05` |
| `REQ-02` | `CTR-01` | `SC-01..04`, `NEG-04,05` | `CHK-02` | `EVID-02` |
| `REQ-03` | | `SC-01..04`, `NEG-04,05,06` | `CHK-02`, `CHK-05` | `EVID-02`, `EVID-05` |
| `REQ-04` | `CTR-03` | `SC-01`, `SC-07` | `CHK-02` | `EVID-02` |
| `REQ-05` | `CTR-02`, `FM-01,02` | `SC-05`, `SC-06`, `NEG-02,03` | `CHK-02` | `EVID-02` |
| `REQ-06` | | `SC-01`, `SC-06` | `CHK-02` | `EVID-02` |
| `REQ-07` | | — | `CHK-04` | `EVID-04` |
| `REQ-08` | `FM-03` | `NEG-06` | `CHK-05` | `EVID-05` |
| `REQ-09` | | `EC-03`, `EC-04` | `CHK-01`, `CHK-02`, `CHK-07` | `EVID-01`, `EVID-02`, `EVID-07` |

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
|---|---|---|---|---|
| `CHK-01` | `EC-03`, `EC-04` | `cd frontend && yarn test:coverage` | 0 failures, ratchet met | `artifacts/ft-021/verify/chk-01/` |
| `CHK-02` | `REQ-01..06,09` + SCs/NEGs | `cd frontend && yarn test src/__tests__/utils/gantt.test.js src/__tests__/views/calendar/` | Все unit + component тесты проходят; `getHandoverType` матрица, класс-styling на item, prop passthrough, localStorage round-trip | `artifacts/ft-021/verify/chk-02/` |
| `CHK-03` | `EC-01`, `REQ-03` | `git diff` финальный — минимальный change surface, не трогаем FT-020 scope за пределами handover-интеграции | Diff содержит только добавления/изменения согласно Change Surface | `artifacts/ft-021/verify/chk-03/` |
| `CHK-04` | `REQ-07` | `grep -rn '[А-Яа-яЁё]' frontend/src/views/calendar/ frontend/src/utils/gantt.js \| grep -v 'locales\|__tests__' \| grep -vE '^\s*(//\|/\*\|\*)'` | 0 hardcoded Cyrillic (regex filter охватывает и `//` и CSS `/* */` комментарии) | `artifacts/ft-021/verify/chk-04/` |
| `CHK-05` | `REQ-03,08` + `SC-01..04`, `NEG-06` | Manual QA: активировать handover → скриншоты light + dark с подсвеченными барами | Борders + icons видимы корректно в обоих themes | `artifacts/ft-021/verify/chk-05/` |
| `CHK-06` | `EC-05` | `npx markdownlint-cli2 "**/*.md"` + CI green | 0 errors + 5/5 jobs SUCCESS | `artifacts/ft-021/verify/chk-06/` |
| `CHK-07` | `SC-01..04` + `EC-02` | `cd frontend && yarn test:e2e e2e/calendar-handover.spec.js` (новый) или добавить блок в calendar-overlap | Активация handover → хотя бы один `.gantt-item--handover-*` класс появляется в DOM | `artifacts/ft-021/verify/chk-07/` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
|---|---|---|
| `CHK-01` | `EVID-01` | `artifacts/ft-021/verify/chk-01/` |
| `CHK-02` | `EVID-02` | `artifacts/ft-021/verify/chk-02/` |
| `CHK-03` | `EVID-03` | `artifacts/ft-021/verify/chk-03/` |
| `CHK-04` | `EVID-04` | `artifacts/ft-021/verify/chk-04/` |
| `CHK-05` | `EVID-05` | `artifacts/ft-021/verify/chk-05/` |
| `CHK-06` | `EVID-06` | `artifacts/ft-021/verify/chk-06/` |
| `CHK-07` | `EVID-07` | `artifacts/ft-021/verify/chk-07/` |

### Evidence

- `EVID-01` Vitest coverage output: threshold met.
- `EVID-02` Vitest output (utils + component tests).
- `EVID-03` `git diff main..HEAD --stat` на финальной ветке.
- `EVID-04` grep output: 0 hardcoded Cyrillic.
- `EVID-05` Manual QA: light + dark скриншоты + checklist.
- `EVID-06` markdownlint + CI run links.
- `EVID-07` Playwright run output — handover activation + class assertion.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by |
|---|---|---|---|---|
| `EVID-01` | Coverage report | `yarn test:coverage` | `artifacts/ft-021/verify/chk-01/` | `CHK-01` |
| `EVID-02` | Vitest run log | `yarn test <path>` | `artifacts/ft-021/verify/chk-02/` | `CHK-02` |
| `EVID-03` | Git diff stat | shell | `artifacts/ft-021/verify/chk-03/` | `CHK-03` |
| `EVID-04` | grep output | shell | `artifacts/ft-021/verify/chk-04/` | `CHK-04` |
| `EVID-05` | Screenshots + QA checklist | manual | `artifacts/ft-021/verify/chk-05/` | `CHK-05` |
| `EVID-06` | Lint + CI links | `markdownlint-cli2` + `gh run view` | `artifacts/ft-021/verify/chk-06/` | `CHK-06` |
| `EVID-07` | Playwright report | `yarn test:e2e` | `artifacts/ft-021/verify/chk-07/` | `CHK-07` |
