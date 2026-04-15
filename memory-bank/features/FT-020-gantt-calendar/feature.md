---
title: "FT-020: Gantt Calendar (Phase 1 — Core)"
doc_kind: feature
doc_function: canonical
purpose: "Замена текущего 14-дневного CSS-grid календаря на pixel-based Gantt с двухуровневым header, lanes, tooltip и ручным refresh. Phase 1 из планируемой 3-фазной поставки (FT-020 → FT-021 → FT-022)."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../../domain/api-reference.md
  - ../../domain/schema.md
  - ../../engineering/coding-style.md
  - ../../engineering/testing-policy.md
  - ../../engineering/design-style-guide.md
status: active
delivery_status: in_progress
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-020: Gantt Calendar (Phase 1 — Core)

## What

### Problem

Текущий [`frontend/src/views/CalendarView.vue`](../../../frontend/src/views/CalendarView.vue) — CSS-grid таблица на 14 дней фиксированного размера, с одной "дорожкой" (lane) на юнит. Ограничения, видимые в проде:

1. **Overlap рендерится неверно.** Если в unit есть два пересекающихся бронирования (редко, но возможно для hostel/shared unit или из-за гонки), оба бара рисуются поверх друг друга в одной ячейке.
2. **Нет tooltip.** Детали бронирования требуют перехода по клику на edit page — видимость страдает.
3. **Фиксированные 14 дней.** Нельзя посмотреть более длинный горизонт (месяц+) или зумом сжать.
4. **Нет today-marker.** Трудно ориентироваться в grid.
5. **Нет context menu.** Все операции требуют перехода в form.

Референс-реализация — Gantt в `rentprog/rentalman-vue` (Vue 2 Options API, ~3500 LOC core) — решает эти пункты через pixel-based positioning и компонентную декомпозицию. FT-020 портирует **только Core daily-режим** в Vue 3 Composition API; hourly view отложен (требует backend schema-расширения — `Reservation.check_in/check_out` сейчас тип `date`, не `datetime`); special modes (handover/idle/overdue/heatmap/finance), search, filters, PDF export, live-updates — отложены в FT-021 и FT-022.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
|---|---|---|---|---|
| `MET-01` | Overlapping reservations отрисовываются без наложения | нет (один lane, баги) | да (lane assignment) | Playwright e2e + unit test для `assignLanes()` utility |
| `MET-02` | Поддержка диапазона дат | 14 дней фикс. | произвольный (7 / 14 / 30 / custom) | UI toggle + date range picker |
| `MET-03` | Tooltip на hover показывает: гость, даты, цена, статус | нет | да | Component test |
| `MET-04` | Coverage ratchet | текущий | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Pixel-based positioning:** рендер баров через абсолютное `left`/`width` по `pixelsPerMs`, не через CSS grid-template.
- `REQ-02` **Двухуровневый header (daily only):** верхний уровень — месяцы, нижний — дни. Генератор — `utils/gantt.js` (порт `generateTopLevelDates` / `generateBottomLevelDates`, native `Date` — точный список операций в `Solution`).
- `REQ-03` **Lane assignment:** перекрывающиеся reservations в одном юните раскладываются по lanes через greedy-алгоритм (`assignLanes()` — порт из `gantt-utils.js`).
- `REQ-04` **Tooltip** на `mouseenter` бронирования: `guest_name`, `check_in`/`check_out`, `total_price` (форматирован через `currentOrganization.currency` из auth store, не из reservation payload — см. `CTR-01`), `status`, ссылка на property/unit. Закрытие на `mouseleave`. Отдельный компонент `GanttTooltip.vue`.
- `REQ-05` **Context menu** на `contextmenu` (right-click) бронирования: "Редактировать", "Check-in" (если status=confirmed), "Check-out" (если status=checked_in), "Отменить" (если не cancelled). Использует existing actions `check_in`/`check_out`/`cancel` (см. [`api-reference.md`](../../domain/api-reference.md)).
- `REQ-06` **Today marker:** вертикальная линия (2px, primary color) по текущей дате. Видна во всём viewport.
- `REQ-07` **Scroll-to-today + jump-to-date:** кнопка "Сегодня" в toolbar (scroll viewport) + `v-date-picker` popup для прыжка на произвольную дату.
- `REQ-08` **Date range selector:** preset-кнопки `7d / 14d / 30d` + custom range через `v-date-picker range`. Сохранение выбранного range в `localStorage('apartus-calendar-view')`.
- `REQ-09` **Manual refresh:** иконка `mdi-refresh` в toolbar перезапрашивает reservations+units. Плюс `visibilitychange` listener — refetch при возвращении таба в foreground.
- `REQ-10` **Status colors:** баry окрашиваются по `reservation.status` через design-tokens `--v-theme-status-*` (уже определены в [`plugins/vuetify.js`](../../../frontend/src/plugins/vuetify.js)). Cancelled — не отображается.
- `REQ-11` **Empty cell click** → navigate to `/reservations/new?unit_id=X&check_in=Y` (сохраняется текущее поведение `CalendarView`).
- `REQ-12` **Dark mode совместимость:** все цвета через CSS-variables, без hardcoded hex в `.vue` (кроме special-case markers).
- `REQ-13` **i18n:** все user-facing строки через `$t()`, новый namespace `calendar.gantt.*` в `ru.json`/`en.json`.
- `REQ-14` **Замена, не параллель:** удалить текущий `CalendarView.vue` и переключить `/calendar` route на новый компонент. Старая grid-реализация не сохраняется как fallback. Делается одним атомарным коммитом для безопасного git revert (см. `ASM-06`).
- `REQ-15` **Tests:**
  - Unit-tests для `utils/gantt.js` (`dateToPixel`, `bookingWidth`, `generateTopLevelDates`, `generateBottomLevelDates`, `assignLanes`).
  - Component tests для `GanttCalendarView` (range change refetch, manual refresh, visibilitychange listener, localStorage persistence), `GanttTimeline` (pixelsPerMs computation), `GanttTimelineRow` (lane assignment edge cases), `GanttTimelineItem` (status color mapping, click, contextmenu).
  - Playwright e2e (`CHK-07`) для overlap visualization (SC-05), today marker (SC-01), jump-to-date (SC-06).

### Non-Scope

- `NS-01` **Hourly view.** Требует backend schema-расширения: `Reservation.check_in`/`check_out` сейчас тип `date`, без часов. Вынесено в отдельную backend-фичу + последующее frontend-расширение.
- `NS-02` **Special modes** (handover / idle gaps / overdue / heatmap / loading). Будут в FT-021.
- `NS-03` **Finance mode / progress bar внутри бара** (paid% gradient). Будет в FT-021; потребует добавления поля `paid_cents` в Reservation (или join с payments).
- `NS-04` **Search (по гостю/property)** — FT-022.
- `NS-05` **Tag-filter / group-by** — в Apartus нет тегов на Unit/Reservation, отдельная фича.
- `NS-06` **Free-unit search по range** — FT-022.
- `NS-07` **PDF export** — FT-022 (Prawn уже есть от FT-017).
- `NS-08` **Live updates через ActionCable** — не настроен в проекте, отдельная платформенная фича. Вместо — `visibilitychange` refetch и manual refresh.
- `NS-09` **Compact mode + overlap zones (косые полосы)** — FT-021.
- `NS-10` **Mobile-specific toolbar.** Phase 1 — адаптивный через Vuetify breakpoints, но отдельного mobile layout не делаем.
- `NS-11` **Drag-and-drop бронирований** (был в backlog `problem.md` отдельным пунктом).
- `NS-12` **Month grid view** (как отдельный visual mode помимо timeline) — был в backlog отдельно. Timeline с 30-day range в FT-020 решает близкий use-case.
- `NS-13` **Virtualization** для длинных списков юнитов. Если в org >200 юнитов — load-more/pagination откладываем в FT-022.
- `NS-14` **Хранение view preferences (range) на backend.** Phase 1 — только `localStorage`.
- `NS-15` **Overdue-animation / pulsing** — FT-021.
- `NS-16` **Performance budget enforcement** (e.g. assert <300ms render). Будет measured вместе с virtualization в FT-022 — там это load-bearing.
- `NS-17` **Keyboard alternative для context menu** (Shift+F10 / Menu key для open context menu без правой кнопки мыши). Phase 1 — mouse-only (`REQ-05`). A11y улучшение в follow-up backlog.

### Constraints / Assumptions

- `ASM-01` Существующие API `GET /api/v1/reservations?from=&to=` и `GET /api/v1/all_units` (см. [`api-reference.md`](../../domain/api-reference.md)) достаточны для Phase 1. Никаких backend изменений не требуется.
- `ASM-02` Reservation model (см. [`schema.md`](../../domain/schema.md)) имеет поля `unit_id`, `guest_id` (+ `guest_name` через serializer), `check_in` (`date`), `check_out` (`date`), `status` enum (`confirmed`/`checked_in`/`checked_out`/`cancelled`), `total_price_cents`. Currency приходит из `Organization`, не из reservation payload (см. `CTR-01`).
- `ASM-03` Существующий design system (theme tokens `--v-theme-status-*` для confirmed / checked-in / checked-out / cancelled / pending / blocked) покрывает все нужные цвета.
- `ASM-04` Все существующие frontend тесты продолжат проходить после замены `CalendarView`.
- `ASM-05` Производительность: 30 дней × 50 юнитов × avg 2 reservations/unit ≈ 100 reservations in viewport. Не требует virtualization (`NS-13`). Перформанс-бюджет measureable, но не enforced в Phase 1 (см. `NS-16`).
- `ASM-06` `REQ-14` (replacement) реализуется одним атомарным коммитом: delete `CalendarView.vue` + delete его теста + new components + new tests + router update + locales. Это даёт безопасный single-commit revert при провале SC-06 / NEG-06 в проде. Промежуточные коммиты только для preparation (utils, locales) — финальный switchover атомарный.
- `CON-01` **No new npm packages.** Список операций для native `Date` (закрывают весь Phase 1):
  - `parseIsoDate(str)` для парсинга `"YYYY-MM-DD"` из API в **local-tz** Date через `const [y,m,d] = str.split('-').map(Number); new Date(y, m-1, d)`. **Не использовать `new Date(str)`** — он парсит как UTC midnight и даёт off-by-one в локалях с UTC offset.
  - `new Date(yyyy, mm, dd)` для конструктора
  - `.valueOf()` для arithmetic в ms
  - `getFullYear/getMonth/getDate/getDay` для component access
  - `addDays(d, n)` через `new Date(d.valueOf() + n * 86_400_000)`
  - `startOfDay(d)` через `new Date(y, m, d)` (drops time component)
  - `startOfMonth/endOfMonth` через `new Date(y, m, 1)` / `new Date(y, m+1, 0)`
  - `diffDays(a, b)` через `Math.round((b - a) / 86_400_000)`
  - `formatMonth(d)` через `d.toLocaleString(locale, { month: 'long', year: 'numeric' })`
  - `formatShortDate(d)` через `d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })`
  Всё работает в jsdom + браузере без полифилов. Если plan-фаза обнаружит operation вне списка — эскалация к пользователю на добавление `dayjs`.
- `CON-02` **No TypeScript.** Vue 3 `<script setup>` + JSDoc.
- `CON-03` Coverage ratchet не понижаем.

## How

### Solution

Декомпозиция на 6 Vue-компонентов + utility-модуль, все под `frontend/src/views/calendar/`:

| File | Role |
|---|---|
| `GanttCalendarView.vue` | Entry point, route-level компонент. Toolbar + wrapper, эмитит события timeline. |
| `GanttTimeline.vue` | Scroll container, viewport, viewstart/end, pixelsPerMs, header+rows orchestration. |
| `GanttTimelineHeader.vue` | Двухуровневый grid-header (top: months/days, bottom: days/hours). Sticky top. |
| `GanttTimelineRow.vue` | Один юнит = один row. Рендерит items через absolute positioning, считает lanes. |
| `GanttTimelineItem.vue` | Один reservation bar. Status color, label, click, hover, contextmenu. |
| `GanttTooltip.vue` | Teleport-based floating tooltip с деталями бронирования. |
| `frontend/src/utils/gantt.js` | Pure functions: `dateToPixel`, `bookingWidth`, `generateTopLevelDates`, `generateBottomLevelDates`, `assignLanes`. |
| `frontend/src/utils/date.js` | Minimal native-Date helpers — точный список операций см. в `CON-01`. |

Trade-off 1: **native Date vs dayjs.** Выбираем native — избегаем нового npm. Helpers в `utils/date.js` закрывают узкий набор нужных операций.

Trade-off 2: **абсолютное positioning vs CSS grid.** Абсолютное — потому что только так возможно произвольное pixel-positioning и lane-based overlap handling.

Trade-off 3: **route replacement vs параллель.** Заменяем `CalendarView.vue` полностью (REQ-14). Причина: один канонический экран календаря; хранить legacy — технический долг и путаница для пользователей.

### Change Surface

| Surface | Type | Why it changes |
|---|---|---|
| `frontend/src/views/calendar/GanttCalendarView.vue` | code (new) | Entry компонент |
| `frontend/src/views/calendar/GanttTimeline.vue` | code (new) | Viewport orchestration |
| `frontend/src/views/calendar/GanttTimelineHeader.vue` | code (new) | Two-level header |
| `frontend/src/views/calendar/GanttTimelineRow.vue` | code (new) | Per-unit row + lanes |
| `frontend/src/views/calendar/GanttTimelineItem.vue` | code (new) | Per-reservation bar |
| `frontend/src/views/calendar/GanttTooltip.vue` | code (new) | Floating tooltip |
| `frontend/src/utils/gantt.js` | code (new) | Pixel math + lane algorithm |
| `frontend/src/utils/date.js` | code (new) | Native-Date helpers (см. `CON-01`) |
| `frontend/src/views/CalendarView.vue` | **delete** | Заменяется на Gantt |
| `frontend/src/router/index.js` | code | Route `/calendar` → `GanttCalendarView` |
| `frontend/src/locales/ru.json`, `en.json` | data | Namespace `calendar.gantt.*` (toolbar, tooltip, context menu, empty state, errors) |
| `frontend/src/__tests__/views/CalendarView.test.js` | **delete** | Покрывается новыми Gantt тестами |
| `frontend/src/__tests__/utils/gantt.test.js` | code (new) | Pure utility tests |
| `frontend/src/__tests__/views/calendar/*.test.js` | code (new) | `GanttCalendarView.test.js` (orchestration), `GanttTimeline.test.js` (pixel math), `GanttTimelineRow.test.js` (lanes), `GanttTimelineItem.test.js` (rendering, events) |
| `frontend/e2e/calendar-overlap.spec.js` | code (new) | Playwright: overlap visualization, today marker, jump-to-date (CHK-07) |
| `memory-bank/domain/frontend.md` | doc | Calendar section обновить: pixel-based Gantt, компоненты, utils |
| `memory-bank/domain/problem.md` | doc | Update "Visual calendar (month view)" backlog entry → точка доставки |

### Flow

1. **Boot.** Пользователь на `/calendar` → `GanttCalendarView` читает `localStorage('apartus-calendar-view')` → устанавливает `range` (7/14/30 дней или custom).
2. **Initial load.** Параллельно: `reservationsApi.list({from, to})` + `allUnitsApi.list()`.
3. **Render.** `GanttTimeline` вычисляет `pixelsPerMs` из `viewport width / range.ms`. `GanttTimelineHeader` рендерит 2-уровневый header (месяцы/дни). Для каждого unit — `GanttTimelineRow` → `assignLanes()` → рисует items.
4. **Hover.** `mouseenter` на item → `GanttTooltip` показывает детали через `<teleport to="body">` с `position: fixed`. Currency для total_price берётся из `useAuthStore().organization.currency`.
5. **Context menu.** `contextmenu` на item → menu с actions. Execute через existing reservationsApi.
6. **Range change.** User выбирает preset или date range → refetch с новыми `from/to` → пересчёт `pixelsPerMs` → header перегенерируется.
7. **Refresh.** Manual click или `visibilitychange` → refetch.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `Reservation[]` (см. API `GET /reservations?from=&to=`) | Backend / Frontend | fields per `reservation_json` serializer: `id`, `unit_id`, `unit_name`, `property_name`, `guest_id`, `guest_name`, `check_in` (date), `check_out` (date), `status`, `guests_count`, `total_price_cents`, `notes`, `created_at`, `updated_at`. **Currency не приходит** — frontend берёт из `useAuthStore().organization.currency`. |
| `CTR-02` | `Unit[]` (см. API `GET /all_units`) | Backend / Frontend | fields: `id`, `name`, `property_id`, `property_name`, `unit_type`, `capacity`, `status`, `base_price_cents` (используется только `id`, `name`, `property_name`, `unit_type`) |
| `CTR-03` | `localStorage('apartus-calendar-view')` JSON `{ rangeDays: 7 \| 14 \| 30, customRange?: [from, to] }` | Frontend (write) / Frontend (read at boot) | Fallback: `{ rangeDays: 14 }` |
| `CTR-04` | Reservation actions endpoints — см. [`api-reference.md`](../../domain/api-reference.md) (`PATCH /reservations/:id/check_in`, `check_out`, `cancel`) | Frontend / Backend (existing) | Context-menu actions; не новые endpoints |

### Failure Modes

- `FM-01` **Reservations API fails** → показать `v-alert` с `calendar.gantt.errors.loadFailed`, сохранить последний known state visible. Не очищать данные при ошибке.
- `FM-02` **Unit list empty** → `v-empty-state` с CTA "Создать property/unit".
- `FM-03` **`localStorage` недоступен** (privacy mode) → fallback на дефолтные `mode/range`, не крашить. Обёрнуто в try/catch по паттерну `plugins/i18n.js`.
- `FM-04` **Reservation с невалидными датами** (`check_in >= check_out`) → skip рендер + `console.warn` (не крашить весь row). Индикация дефекта backend, не UI.
- `FM-05` **Огромный range (e.g. 1 год)** → клиент не падает; `pixelsPerMs` становится маленьким, bars схлопываются в неразличимые полоски. Не обрабатываем в Phase 1 — UX тюнится в FT-022 вместе с virtualization.
- `FM-06` **Context-menu action fails** (e.g. check_in 422 из-за domain rule) → `v-snackbar` с error message, reservation остаётся в прежнем state. Backend уже возвращает детали ошибки.
- `FM-07` **`organization.currency` отсутствует в auth store** (новая org без currency) → fallback на `RUB` для tooltip price formatting, не крашить.

### ADR Dependencies

Нет новых ADR. `CON-01` (отказ от moment, native Date) — inline-решение в implementation plan.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-*` реализованы и соответствуют acceptance-сценариям.
- `EC-02` `CalendarView.vue` и его тест удалены; `/calendar` route рендерит `GanttCalendarView`.
- `EC-03` Все существующие frontend тесты продолжают проходить. Новые тесты для Gantt добавлены.
- `EC-04` Coverage ratchet не понижен.
- `EC-05` 0 markdownlint errors, CI green на всех jobs (Lint/Backend/Frontend/Smoke).
- `EC-06` Playwright e2e: создать 3 overlapping reservations в одном юните через seed → все три DOM-элемента `.gantt-item` рендерятся с разными `top`-offset (assertion в `CHK-07`).

### Acceptance Scenarios

- `SC-01` **Happy path daily view.** Пользователь открывает `/calendar` → видит 14-дневный timeline с 2-уровневым header (месяцы/дни). Today marker (вертикальная линия) виден. Бронирования отрисованы барами в lanes. Click на bar → переход на `/reservations/:id/edit`.
- `SC-02` **Tooltip.** User наводит mouse на bar → через 200ms появляется tooltip с guest name, check-in/out, price (формат через org currency), status. Mouse leave → tooltip скрывается.
- `SC-03` **Context menu happy path.** Right-click на bar со статусом `confirmed` → меню с "Редактировать", "Check-in", "Отменить". Click "Check-in" → PATCH `/reservations/:id/check_in` → статус меняется на `checked_in`, bar перекрашивается.
- `SC-04` **Range change.** User выбирает preset "30d" → refetch с новым range → рендер обновляется. Выбор сохраняется в `localStorage`.
- `SC-05` **Overlap handling.** Юнит имеет 3 бронирования с пересекающимися датами → все три видимы в 3 lanes, row-height адаптируется.
- `SC-06` **Today + jump.** Click "Сегодня" → viewport scrollает к текущей дате. Open date-picker, выбрать произвольную дату → viewport центрируется на этой дате.
- `SC-07` **Refresh on focus.** User создаёт reservation в другом таб'е → переключает обратно в календарь → `visibilitychange` triggers refetch → новое бронирование появляется.
- `SC-08` **Manual refresh.** Click refresh icon → refetch, spinner, обновлённые данные.

### Negative / Edge Cases

- `NEG-01` Пустой список units → `v-empty-state`.
- `NEG-02` Reservation с `check_in >= check_out` → skip с `console.warn`.
- `NEG-03` Reservations без unit_id (orphan) → skip.
- `NEG-04` `localStorage` throws → fallback на defaults.
- `NEG-05` Context-menu action 422 → snackbar error.
- `NEG-06` Network error в `loadData` → alert + last known state.
- `NEG-07` Cancelled reservations → не отрисовываются (REQ-10).
- `NEG-08` `organization.currency` пуста → fallback на `RUB` (FM-07).
- `NEG-09` Dark mode toggle в процессе — все цвета пересчитываются автоматически через CSS vars.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
|---|---|---|---|---|
| `REQ-01` | `CTR-01`, `CTR-02` | `SC-01`, `SC-05` | `CHK-02`, `CHK-07` | `EVID-02`, `EVID-07` |
| `REQ-02` | | `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-03` | | `SC-05` | `CHK-02`, `CHK-07` | `EVID-02`, `EVID-07` |
| `REQ-04` | `CTR-01`, `FM-07`, `NEG-08` | `SC-02` | `CHK-02` | `EVID-02` |
| `REQ-05` | `CTR-04`, `FM-06` | `SC-03`, `NEG-05` | `CHK-02` | `EVID-02` |
| `REQ-06` | | `SC-01`, `SC-06` | `CHK-07` | `EVID-07` |
| `REQ-07` | | `SC-06` | `CHK-07` | `EVID-07` |
| `REQ-08` | `CTR-03`, `FM-03` | `SC-04` | `CHK-02` | `EVID-02` |
| `REQ-09` | `FM-01` | `SC-07`, `SC-08` | `CHK-02` | `EVID-02` |
| `REQ-10` | | `SC-01`, `SC-03`, `NEG-07` | `CHK-02` | `EVID-02` |
| `REQ-11` | `CTR-02` | `SC-01` | `CHK-05` | `EVID-05` |
| `REQ-12` | | `NEG-09` | `CHK-05` | `EVID-05` |
| `REQ-13` | | — | `CHK-04` | `EVID-04` |
| `REQ-14` | `ASM-06` | `EC-02` | `CHK-03` | `EVID-03` |
| `REQ-15` | | `EC-03`, `EC-04` | `CHK-01`, `CHK-02`, `CHK-07` | `EVID-01`, `EVID-02`, `EVID-07` |

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
|---|---|---|---|---|
| `CHK-01` | `EC-03`, `EC-04` | `cd frontend && yarn test:coverage` | 0 failures, coverage ≥ ratchet threshold, все старые + новые тесты проходят | `artifacts/ft-020/verify/chk-01/` |
| `CHK-02` | `REQ-01..05,08..10,15` + multiple SCs/NEGs | `cd frontend && yarn test src/__tests__/views/calendar/ src/__tests__/utils/gantt.test.js` | Все Gantt unit + component тесты проходят: `assignLanes` overlap, `dateToPixel`, header generators, GanttCalendarView (range change refetch, manual refresh, visibilitychange, localStorage), GanttTimeline (pixelsPerMs), GanttTimelineRow (lanes), GanttTimelineItem (status colors, click, contextmenu), tooltip show/hide | `artifacts/ft-020/verify/chk-02/` |
| `CHK-03` | `EC-02`, `REQ-14`, `ASM-06` | `ls frontend/src/views/CalendarView.vue frontend/src/__tests__/views/CalendarView.test.js 2>&1` + `git log --oneline -1` подтверждает атомарный switchover-коммит | оба файла отсутствуют (`No such file`); финальный коммит содержит и delete и new components | `artifacts/ft-020/verify/chk-03/` |
| `CHK-04` | `REQ-13` | `grep -rn '[А-Яа-яЁё]' frontend/src/views/calendar/ \| grep -v 'locales\|__tests__' \| grep -vE '^\s*//'` | 0 hardcoded Cyrillic matches | `artifacts/ft-020/verify/chk-04/` |
| `CHK-05` | `REQ-11,12` + `NEG-09` | Manual QA: SC-01 (today marker visible), NEG-09 (dark mode toggle — все цвета корректны) | Скриншоты light + dark подтверждают визуальную консистентность | `artifacts/ft-020/verify/chk-05/` |
| `CHK-06` | `EC-05` | `npx markdownlint-cli2 "**/*.md"` + CI green | 0 errors + 5/5 CI jobs SUCCESS | `artifacts/ft-020/verify/chk-06/` |
| `CHK-07` | `EC-06`, `REQ-01,03,06,07` + `SC-05,06` | `cd frontend && yarn test:e2e e2e/calendar-overlap.spec.js` | Playwright headless: seed 3 overlapping reservations, navigate `/calendar`, assert 3× `.gantt-item` с разными `top` offset; assert today-marker DOM element visible; assert jump-to-date работает (date input → viewport scroll) | `artifacts/ft-020/verify/chk-07/` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
|---|---|---|
| `CHK-01` | `EVID-01` | `artifacts/ft-020/verify/chk-01/` |
| `CHK-02` | `EVID-02` | `artifacts/ft-020/verify/chk-02/` |
| `CHK-03` | `EVID-03` | `artifacts/ft-020/verify/chk-03/` |
| `CHK-04` | `EVID-04` | `artifacts/ft-020/verify/chk-04/` |
| `CHK-05` | `EVID-05` | `artifacts/ft-020/verify/chk-05/` |
| `CHK-06` | `EVID-06` | `artifacts/ft-020/verify/chk-06/` |
| `CHK-07` | `EVID-07` | `artifacts/ft-020/verify/chk-07/` |

### Evidence

- `EVID-01` Vitest coverage output: threshold met, all pass.
- `EVID-02` Vitest output для `src/__tests__/views/calendar/` + `utils/gantt.test.js`.
- `EVID-03` `ls` output confirming CalendarView.vue и test deleted + git log одного атомарного коммита.
- `EVID-04` grep output: 0 hardcoded Cyrillic в `views/calendar/`.
- `EVID-05` Скриншоты light + dark mode для SC-01 и NEG-09.
- `EVID-06` markdownlint + CI run links.
- `EVID-07` Playwright report: assertions для overlap (3 lanes), today marker, jump-to-date.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
|---|---|---|---|---|
| `EVID-01` | Coverage report | `yarn test:coverage` | `artifacts/ft-020/verify/chk-01/` | `CHK-01` |
| `EVID-02` | Vitest run log | `yarn test <path>` | `artifacts/ft-020/verify/chk-02/` | `CHK-02` |
| `EVID-03` | `ls` + `git log` output | shell | `artifacts/ft-020/verify/chk-03/` | `CHK-03` |
| `EVID-04` | grep output | shell | `artifacts/ft-020/verify/chk-04/` | `CHK-04` |
| `EVID-05` | Screenshots (light + dark) | manual | `artifacts/ft-020/verify/chk-05/` | `CHK-05` |
| `EVID-06` | Lint output + CI link | `markdownlint-cli2` + `gh run view` | `artifacts/ft-020/verify/chk-06/` | `CHK-06` |
| `EVID-07` | Playwright report | `yarn test:e2e` | `artifacts/ft-020/verify/chk-07/` | `CHK-07` |
