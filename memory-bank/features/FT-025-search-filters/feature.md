---
title: "FT-025: Gantt Search Bar"
doc_kind: feature
doc_function: canonical
purpose: "Collapsible search bar в Gantt toolbar для быстрого фильтра по guest/property/unit. Client-side substring filter поверх loaded viewport."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../../domain/schema.md
  - ../../engineering/coding-style.md
  - ../../engineering/testing-policy.md
  - ../../engineering/design-style-guide.md
  - ../FT-020-gantt-calendar/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-025: Gantt Search Bar

## What

### Problem

После закрытия FT-020 NS-02 (все 4 special modes) Gantt покрывает визуальные режимы просмотра, но не помогает быстро **найти** конкретного гостя или юнит в большом org с 50+ юнитами.

Кейсы:

- Звонит гость Иван Петров — менеджер должен найти его бронирование в текущем viewport.
- Клининг спрашивает статус юнита «Studio 204» — нужно выделить именно его строку.
- Владелец хочет посмотреть только свой property «Пальмы» среди 12 других property-объектов.

Сейчас менеджер скроллит 50 строк + глазами ищет имя гостя в тултипах. На виджете это занимает 10-30 секунд и ломает flow.

Референс-реализация в rentprog (`dashboard/calendars` — search input в header с client-side filter на unit+guest) закрывает кейс одним UI-элементом. Применяем тот же паттерн к Gantt.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | Search бар доступен в toolbar | нет | collapsible icon → expand input по click | Component test + manual QA |
| `MET-02` | Type → filter применяется | N/A | debounce 200ms → substring match на `guest_name`, `unit.name`, `unit.property_name` (case-insensitive) | E2e `CHK-07` |
| `MET-03` | Filter persists через reload | N/A | localStorage `apartus-calendar-view.searchQuery` | E2e `CHK-07` |
| `MET-04` | Coverage ratchet | текущий | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Search toolbar element** в `GanttCalendarView`. Collapsible pattern: `v-btn icon="mdi-magnify"` когда inactive; click → inline `v-text-field` (density compact, width ~240px, autofocus) с clearable. **Collapse только по Escape** — атомарно очищает query + свёртывает + возвращает focus на mdi-magnify button. Случайный blur (например клик по календарю) НЕ закрывает bar — иначе активный фильтр терялся бы при первом взаимодействии с Gantt. Bar также остаётся expanded когда restored из localStorage с non-empty query.
- `REQ-02` **Debounced apply** — input события debounced 200ms (`utils/debounce.js` — новый, pure). Это уменьшает рендеры при быстром typing.
- `REQ-03` **Filter semantics** (client-side) через `utils/search.js#filterUnitsAndReservations(units, reservations, query)` → `{units, reservations}`:
  - Нормализация: trim + toLowerCase для query и для compared полей. Russian/English — оба работают (JS toLowerCase Unicode-aware).
  - Empty query → passthrough (identity).
  - Unit считается matching если (a) `unit.name.toLowerCase().includes(q)` ИЛИ (b) `unit.property_name.toLowerCase().includes(q)` ИЛИ (c) любое reservation на этом unit matches (см. ниже).
  - Reservation considered matching на своём юните если `reservation.guest_name.toLowerCase().includes(q)` (null-safe).
  - Возвращает ТОЛЬКО matching units. Reservations возвращаются ALL для kept units (не только matching) — user видит полный контекст занятости.
- `REQ-04` **Empty result state** — если после фильтра `units.length === 0`, показывается `v-empty-state` с текстом «Ничего не найдено по «query»», иконка mdi-magnify-close. Toolbar остаётся.
- `REQ-05` **Clear button** — `v-text-field clearable` (встроенный `mdi-close-circle`) + Escape key → clear query → collapse обратно к иконке.
- `REQ-06` **Persistence** — `apartus-calendar-view.searchQuery` (string). Legacy payloads без поля → `''`. Storage quota errors → silent fallback (pattern как существующие `rangeDays/specialMode`). **Restore path**: при boot `loadStoredView` устанавливает И `searchQuery`, И `debouncedQuery` напрямую из storage (обе ref-переменные), минуя debounce wrapper — иначе первый рендер показал бы нефильтрованный DOM. При non-empty restored query bar auto-expands (REQ-01 collapse rules применяются только к user actions после boot).
- `REQ-07` **Stacks with special modes** — search применяется первым (сужает units/reservations), потом special mode получает отфильтрованные данные. Concrete example: `<GanttTimeline>` получает `filtered.reservations` и `filtered.units`, не raw props → heatmap tint, idle gaps, overdue pulse, handover brackets computed от filtered set. Юниты/бронирования не passing filter отсутствуют в DOM, mode-visual полностью их не касается. Mutual exclusion — только между modes, не с search (они ортогональны).
- `REQ-08` **i18n** — `calendar.gantt.search.placeholder`, `calendar.gantt.search.empty`, `calendar.gantt.search.open` (для aria-label иконки).
- `REQ-09` **Dark/light parity** — стандартные Vuetify поля наследуют тему. Отдельных токенов не вводим.
- `REQ-10` **Tests**:
  - Unit: `filterUnitsAndReservations` матрица (empty query / unit-name match / property match / guest match / no match / case-insensitive / special chars / null guest_name).
  - Unit: `debounce` (trailing-edge semantic, cancel on rapid calls).
  - Component: `GanttCalendarView` — search input mounts, type → filtered props передаются Timeline; clear → restore; persistence.
  - E2e: type → DOM shrinks; clear → restored; reload сохраняет query.

### Non-Scope

- `NS-01` **Structured filters** (dropdown by property, status chips, date range picker) — отдельный FT-026. Phase 1 только free-text substring.
- `NS-02` **AND/OR query syntax** (`"Иван property:Пальмы"`) — не для MVP; если потребуется, будет FT-027+.
- `NS-03` **Saved / named filters** ("мои гости", "VIP") — вне MVP.
- `NS-04` **Fuzzy match** (Левенштейн, typo tolerance) — substring достаточно на текущих объёмах. Может быть добавлен позже через `fuse.js`, но это привнесёт dependency (ADR нужен).
- `NS-05` **Highlight matching characters** в bar text — UX nice-to-have. Phase 1 — только показать/скрыть.
- `NS-06` **Search по полям кроме guest/unit/property** (notes, payment_status, owner_email) — scope rollout по спросу.
- `NS-07` **Server-side search API** (`/reservations/search?q=...` для orgs > 1000 reservations) — Phase 1 client-side достаточно: viewport загружает максимум ~500 reservations (30 days × 50 units × avg busy).
- `NS-08` **Keyboard shortcut** (`/` или `⌘K` для открытия) — см. FT-020 NS-17, nice-to-have позже.
- `NS-09` **Search history dropdown** — вне Phase 1.
- `NS-10` **Мигалка "мы нашли"/counter** — `units.length` видна визуально, счётчик избыточен. Добавится если обратная связь потребует.

### Constraints / Assumptions

- `ASM-01` FT-020..024 merged. `units` и `reservations` props flow через `GanttCalendarView → GanttTimeline` стабилен.
- `ASM-02` Backend enriches reservation с `guest_name`, `property_name`, `unit_name` (existing in GanttTimelineItem / Tooltip).
- `ASM-03` 610/610 baseline tests pass (main @ `46dab44`, FT-024 merged).
- `ASM-04` Russian + English strings in `guest_name` — `String.prototype.toLowerCase()` достаточно (Unicode-aware по default).
- `ASM-05` Производительность: typical org ≤ 50 units × ~10 reservations в 30d viewport = 500 items × 3 string comparisons на keystroke = 1500 ops. Debounce 200ms делает это незаметным. Без мемоизации Vue computed повторно вычислит при смене query — acceptable.
- `CON-01` No new npm packages (debounce пишется вручную).
- `CON-02` No TypeScript.
- `CON-03` Coverage ratchet.
- `CON-04` No backend changes.
- `CON-05` Clearable работает через Vuetify built-in; не вводим отдельный кнопку-кастом.

## How

### Solution

1. **`utils/debounce.js`** — pure factory `debounce(fn, ms)` → wrapped function with `cancel()` method. Trailing-edge. Минимальная реализация без leading/maxWait. Unit tests — синхронные с `vi.useFakeTimers()`.
2. **`utils/search.js#filterUnitsAndReservations(units, reservations, query)`** — pure. Early return `{units, reservations}` если query empty. Иначе: normalized query, collect `matchingUnitIds` (unit.name/property_name match ИЛИ exists reservation с guest match на этом юните). Filter units по set. Reservations — filter по `unit_id ∈ matchingUnitIds` (сохраняем все бронирования kept юнитов, не только matching).
3. **`GanttCalendarView.vue`** — new `searchQuery` ref + `debouncedQuery` ref (updated через debounce). Computed `filtered = filterUnitsAndReservations(units, reservations, debouncedQuery)`. Передаётся в `<GanttTimeline>`. Toolbar получает collapsible search (icon button + conditional `v-text-field`). Persistence — extend load/persistView.
4. **Empty state UX** — `v-else-if="filtered.units.length === 0 && debouncedQuery"` → `v-empty-state` с localized текстом. Обычный empty (no data) остаётся на `units.length === 0 && !debouncedQuery`.

**Trade-off 1** (collapsible vs always-visible): collapsible экономит горизонт toolbar (уже 9 элементов: title, 3 range btns, 4 mode btns, today, jump, refresh + search). Always-visible занял бы ~280px и вытеснил mode buttons на wrap в узких viewport. Collapse-to-icon pattern знаком из Material and общепринят.

**Trade-off 2** (client vs server filter): client быстрее для MVP (zero backend work, no API contract to design, нет latency между keystrokes). Shortcoming — если org загружает > 1000 reservations в viewport, каждый keystroke проходит по всем. Для Apartus pm scale это не проблема (см. `ASM-05`). Если наступит — server-side перенос локализован в `filterUnitsAndReservations` замену (абстракция скрывает).

**Trade-off 3** (filter semantics — hide non-matching units vs dim them): hide (chosen) — compact layout, mentally cleaner. Dim — preserves org context но смешивает с FT-021/022 dimming semantic. Hide — unambiguous.

**Trade-off 4** (show ALL reservations on kept units vs only matching): ALL (chosen) — если guest «Иван» забронировал unit 204, рядом visible bars других гостей этого же unit дают контекст (когда занят, когда свободен). Это симметрично с rentprog UX.

**Trade-off 5** (debounce vs immediate): debounce 200ms — типичная latency, достаточно для subsecond feedback без на-каждый-keystroke re-render. Immediate даст jank на быстрой печати с 500 items. 200ms — стандарт Material guidelines.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `frontend/src/utils/debounce.js` | code | New pure factory |
| `frontend/src/__tests__/utils/debounce.test.js` | code | Fake-timer unit tests |
| `frontend/src/utils/search.js` | code | `filterUnitsAndReservations` pure function |
| `frontend/src/__tests__/utils/search.test.js` | code | Filter matrix |
| `frontend/src/views/calendar/GanttCalendarView.vue` | code | Search bar UI + state + debounce + computed filter |
| `frontend/src/__tests__/views/calendar/GanttCalendarView.test.js` | code | search input + debounce integration + persistence |
| `frontend/src/locales/ru.json`, `en.json` | data | `search.placeholder/empty/open` |
| `frontend/e2e/calendar-overlap.spec.js` | code | E2e: type → DOM filter; clear → restore; reload → persist |
| `memory-bank/domain/frontend.md` | doc | Calendar → Search subsection |
| `memory-bank/features/README.md` | doc | Register FT-025 |

### Flow

1. **Boot.** `loadStoredView` → если `parsed.searchQuery` — restore. `searchQuery` и `debouncedQuery` устанавливаются синхронно (без debounce delay) при восстановлении.
2. **User clicks magnify icon.** `searchOpen.value = true` → `v-text-field` mounts с autofocus. `searchQuery` остаётся `''`.
3. **User types «Иван».** `searchQuery` обновляется, debounced handler через 200ms ставит `debouncedQuery = 'Иван'`. Computed `filtered` пересчитывается. `<GanttTimeline>` receives narrowed units/reservations.
4. **User clears (X or Escape).** `searchQuery = ''` → debounce flush → `debouncedQuery = ''`. Collapse to icon по blur.
5. **User enables heatmap while search active.** `specialMode = 'heatmap'`. Heatmap работает по filtered данным — only visible units получают tint.

### Contracts

| Contract | I/O | Producer / Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `debounce(fn, ms)` → `wrappedFn` with `wrappedFn.cancel()` | utils / CalendarView | Trailing-edge |
| `CTR-02` | `filterUnitsAndReservations(units: Array<{id,name,property_name}>, reservations: Array<{unit_id,guest_name}>, query: string)` → `{units, reservations}` | utils / CalendarView | Pure; empty query → identity (same references). Non-empty: case-insensitive substring. **Preserves input array order** (critical for Vue keyed rendering — Gantt rows сохраняют позиции). Substring matched **against each field independently**: query "Иван Петров" проверяется целиком против `guest_name`, `unit.name`, `unit.property_name` по-отдельности (не concatenated). |
| `CTR-03` | `localStorage('apartus-calendar-view').searchQuery: string` | CalendarView | Default `''`; trimmed на save |

### Failure Modes

- `FM-01` `guest_name = null` (blocking reservation без гостя) → skip в guest match; unit all ещё может match через unit/property.
- `FM-02` `unit.property_name = null` (если данные неполные) → property match returns false; unit.name всё ещё проверяется.
- `FM-03` Query only whitespace (`"   "`) → trim → empty → passthrough.
- `FM-04` Very long query — `v-text-field :maxlength="100"` аттрибут ограничивает ввод на уровне DOM. Filter O(n × m) с n ≤ 500 reservations и m ≤ 100 chars acceptable; maxlength — защита от pathological paste.
- `FM-05` Unicode edge case (Armenian, Arabic) — `toLowerCase()` handles. Не specifically tested, но стандартно.
- `FM-06` localStorage throws → silent (existing pattern).
- `FM-07` Race: typing fast + mode toggle — `setSpecialMode` независима от search, оба ref-а независимы, Vue реактивность композирует корректно.
- `FM-08` Pending debounce timer после unmount — `onBeforeUnmount` хук в `GanttCalendarView` вызывает `debouncedSetQuery.cancel()` чтобы trailing-edge не выстрелил после teardown (иначе warning "set on unmounted component").
- `FM-09` Внутренние spaces в query — `trim()` применяется **только к leading/trailing**, внутренние spaces сохраняются и попадают в substring match (e.g. `"Иван Петров"` с пробелом внутри).

### ADR Dependencies

Нет.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..10` реализованы.
- `EC-02` Search input работает end-to-end: type → filter → clear → reset.
- `EC-03` Persistence через reload.
- `EC-04` Stacks с всеми 4 special modes корректно.
- `EC-05` Все existing тесты (592+) pass. FT-021..024 tests unchanged.
- `EC-06` Coverage ratchet met.
- `EC-07` CI green.
- `EC-08` Dark + light mode корректны.

### Acceptance Scenarios

- `SC-01` **Happy path — guest match.** Org с 12 units. Type «Иван» → видно 2 units где гость Иван забронировал. Остальные 10 units скрыты. Bars всех гостей (не только Иван) на kept units остаются.
- `SC-02` **Unit name match.** Type «204» → видны только units c `name` содержащим «204» (e.g. "Studio 204", "Apt 204A").
- `SC-03` **Property match.** Type «Пальмы» → видны все units property «Пальмы».
- `SC-04` **Clear.** Type query → click X (или Escape) → все units восстановлены.
- `SC-05` **Persistence.** Type query → reload → query restored, фильтр применён сразу.
- `SC-06` **Empty result.** Type «xyznotexist» → `<GanttTimeline>` НЕ рендерится, вместо него — `v-empty-state` в `GanttCalendarView` с текстом «Ничего не найдено по "xyznotexist"» (toolbar остаётся сверху). Реализуется через `v-else-if="debouncedQuery && filtered.units.length === 0"` между `<GanttTimeline>` и существующим `<v-empty-state>` для no-data.
- `SC-07` **Stacks with heatmap.** Type «Иван» → activate heatmap → только 2 visible units получают tint; остальные не рендерятся.
- `SC-08` **Case-insensitive.** «ИВАН» и «иван» дают одинаковый результат.
- `SC-09` **Debounce.** Быстрый typing «И→в→а→н» (50ms между keystrokes) — re-render происходит один раз после 200ms idle, не 4 раза.
- `SC-10` **Blocking reservation (no guest)** на юните → unit всё ещё может match по name/property.

### Negative / Edge Cases

- `NEG-01` При отсутствии org data (`units.length === 0`) — search bar остаётся доступен в toolbar, UI не деградирует. Стандартный no-data `v-empty-state` показывается (existing FT-020 behavior), search empty state не активируется (требует non-empty query).
- `NEG-02` Query with regex special chars (`.*+?`) → treated as literal substring (includes не интерпретирует regex).
- `NEG-03` Very long guest name (100+ chars) → substring works as normal.
- `NEG-04` Space в query (`"Иван Петров"`) → substring match на full strings. E.g. `guest_name = "Иван Петров"` matches, `"Иван Сидоров"` — нет.
- `NEG-05` Persistence: corrupted `searchQuery` (non-string) → fallback `''`.
- `NEG-06` Dark mode toggle с active search — Vuetify built-in поля подхватывают theme.

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | | `SC-04` | `CHK-02` | `EVID-02` |
| `REQ-02` | `CTR-01` | `SC-09` | `CHK-02` | `EVID-02` |
| `REQ-03` | `CTR-02`, `FM-01..05` | `SC-01..03,08,10`, `NEG-02,03,04` | `CHK-02` | `EVID-02` |
| `REQ-04` | | `SC-06` | `CHK-02` | `EVID-02` |
| `REQ-05` | | `SC-04` | `CHK-02` | `EVID-02` |
| `REQ-06` | `CTR-03` | `SC-05`, `NEG-05` | `CHK-02` | `EVID-02` |
| `REQ-07` | | `SC-07` | `CHK-02` | `EVID-02` |
| `REQ-08` | | — | `CHK-04` | `EVID-04` |
| `REQ-09` | | `NEG-06` | `CHK-05` | `EVID-05` |
| `REQ-10` | | `EC-05,06` | `CHK-01,02,07` | `EVID-01,02,07` |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-05,06` | `yarn test:coverage` | ratchet met, 0 failures | `artifacts/ft-025/verify/chk-01/` |
| `CHK-02` | `REQ-01..07,10` + SCs/NEGs | `yarn test utils/{search,debounce}.test.js + views/calendar/GanttCalendarView.test.js` | filter matrix, debounce trailing-edge, CalendarView integration, persistence. FT-021..024 unchanged. | `artifacts/ft-025/verify/chk-02/` |
| `CHK-03` | `EC-01` | `git diff main..HEAD --stat` | минимальный change surface | `artifacts/ft-025/verify/chk-03/` |
| `CHK-04` | `REQ-08` | grep cyrillic в `GanttCalendarView.vue` | 0 hardcoded (кроме существующих) | `artifacts/ft-025/verify/chk-04/` |
| `CHK-05` | `REQ-01,09` + SCs/NEGs | Manual QA screenshots light + dark: collapsed icon, expanded input, filled query, empty state | Все читаются в обоих themes | `artifacts/ft-025/verify/chk-05/` |
| `CHK-06` | `EC-07` | markdownlint + CI | 0 errors, 5/5 green | `artifacts/ft-025/verify/chk-06/` |
| `CHK-07` | `EC-02,03,04` + SCs | `yarn test:e2e` new test | Click icon → input → type → DOM shrinks; clear → restore; reload → persist | `artifacts/ft-025/verify/chk-07/` |

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
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-025/verify/chk-01/` |
| `EVID-02` | `yarn test` | `artifacts/ft-025/verify/chk-02/` |
| `EVID-03` | shell | `artifacts/ft-025/verify/chk-03/` |
| `EVID-04` | shell | `artifacts/ft-025/verify/chk-04/` |
| `EVID-05` | manual | `artifacts/ft-025/verify/chk-05/` |
| `EVID-06` | `markdownlint` + `gh` | `artifacts/ft-025/verify/chk-06/` |
| `EVID-07` | `yarn test:e2e` | `artifacts/ft-025/verify/chk-07/` |
