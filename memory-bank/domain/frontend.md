---
title: Apartus Frontend
doc_kind: domain
doc_function: canonical
purpose: UI surfaces, стек, design system, i18n и interaction patterns Apartus frontend.
derived_from:
  - architecture.md
status: active
audience: humans_and_agents
last_verified: 2026-04-13
canonical_for:
  - apartus_ui_surfaces
  - frontend_stack
  - design_system_rules
  - frontend_i18n_rules
---

# Frontend

## UI Surfaces

Apartus frontend — это одно приложение, SPA.

| Surface | Location | Status |
|---|---|---|
| Organization SPA (`/frontend`) | Vue 3 SPA, основной UI для УК и арендодателей | active, 22 views, 13 stores |
| Booking Widget (`/widget/:slug`) | встраиваемый виджет бронирования для сайтов собственников | active (FT-010) |
| Owner Cabinet | отдельный view для собственников | post-MVP |

## Stack

- Vue 3 (Composition API, **чистый JavaScript без TypeScript** — см. [`../adr/ADR-002-no-typescript-frontend.md`](../adr/ADR-002-no-typescript-frontend.md))
- Vuetify 4 — canonical UI kit
- Vite — build/dev server
- Pinia — state management
- Vue Router 4 — routing
- Axios — HTTP client (см. [`../adr/ADR-006-axios-api-client.md`](../adr/ADR-006-axios-api-client.md))
- Vitest + jsdom — тесты
- **Typography (FT-026):** Geologica (display) + Geist (body) — оба OFL 1.1, self-hosted в `public/fonts/`, Cyrillic-ready. OKLCH-derived palette. См. [`../engineering/design-style-guide.md`](../engineering/design-style-guide.md) и [`/.impeccable.md`](../../.impeccable.md).

## Layout

- `App.vue` — корень
- `layouts/` — base/auth layouts
- `views/` — страницы, соответствуют роутам
- `components/` — переиспользуемые компоненты
- `stores/` — Pinia stores: auth, branches, channels, expenses, guests, members, owners, properties, reservations, roles, tasks, units (13 stores)
- `api/` — axios API clients (28 modules: auth, client, allUnits, amenities, branches, channels, dashboard, expenses, guestTimeline, guests, members, notifications, organizations, owners, pdfExport, photos, pricingRules, properties, publicBooking, reports, reservations, roles, seasonalPrices, tasks, unitAmenities, units)
- `utils/` — currency (formatMoney, centsToUnits, unitsToCents), date (parseIsoDate, addDays, startOfDay/Month, endOfMonth, diffDays, formatMonth, formatShortDate, formatIsoDate — FT-020), gantt (dateToPixel, bookingWidth, generateTopLevelDates, generateBottomLevelDates, assignLanes — FT-020)
- `router/` — Vue Router config с auth guards
- `plugins/` — Vuetify и др.

## Component Rules

- Новые UI-элементы берут из Vuetify 3 компонент-базы (`v-card`, `v-data-table`, `v-form`, и т.д.). Ad-hoc CSS избегаем.
- Переиспользуемые — в `components/`. Локальные для одной страницы — inline во view.
- Composition API (`<script setup>`) — canonical стиль. Options API допустим только для унаследованного hw-0 кода.
- Sharing state между view — через Pinia store, не через props drilling.

## Interaction Patterns

- SPA client-side routing через Vue Router.
- Auth — JWT, access token в памяти (Pinia), refresh — в httpOnly cookie (см. `auth` store).
- API errors → axios interceptor → unified toast/notification + при 401 попытка refresh + при 403/404 redirect.
- Формы — Vuetify `v-form` с client-side validation + backend validation errors маппятся на поля.

## Localization

- **vue-i18n** (Composition API mode, `legacy: false`) — canonical i18n решение (FT-019).
- Два locale: `ru` (default, fallback), `en`.
- Locale files: `src/locales/ru.json`, `src/locales/en.json` — hierarchical JSON по views/components.
- Plugin: `src/plugins/i18n.js` — подключается в `main.js` после pinia, до router.
- В `<template>`: `$t('key')` или `{{ $t('key', { param }) }}` для интерполяции.
- В `<script setup>`: `import { useI18n } from 'vue-i18n'` + `const { t } = useI18n()` + `t('key')`.
- Массивы с переводимыми строками (headers, options) оборачиваем в `computed()` для реактивности.

## Calendar (FT-020 Phase 1)

`/calendar` — pixel-based Gantt timeline (заменяет старую 14-day CSS-grid реализацию FT-006).

- Компоненты в `views/calendar/`: `GanttCalendarView.vue` (orchestrator + toolbar) → `GanttTimeline.vue` (viewport + pixelsPerMs + today marker + scroll) → `GanttTimelineHeader.vue` (2-level: months/days) + `GanttTimelineRow.vue` (per-unit, lanes) → `GanttTimelineItem.vue` (bar) + `GanttTooltip.vue` (hover details).
- Pixel math и lane assignment — в `utils/gantt.js` (pure functions, testable).
- Native `Date` helpers в `utils/date.js` — `parseIsoDate` избегает TZ off-by-one трапа от `new Date("YYYY-MM-DD")`.
- Locale namespace: `calendar.gantt.*` в ru.json/en.json.
- Persistence: `localStorage('apartus-calendar-view')` — только `rangeDays` (7/14/30). Wrapped в try/catch для privacy mode.
- Refresh: manual `mdi-refresh` + `visibilitychange` listener (refetch при возврате в таб).
- Lane stacking — defensive code для edge cases (backend `Reservation#no_overlapping_reservations` блокирует создание overlap через public API).
- Out of scope Phase 1: hourly view (требует backend schema-расширения для `check_in_time`/`check_out_time`), special modes, finance mode, PDF export, live updates, drag-and-drop — см. FT-020 NS-01..17 и планируемые FT-021/022.

### Handover Mode (FT-021)

Первый из special modes FT-020 NS-02 — подсветка предстоящих заездов/выездов.

- Toolbar `v-btn` «Заезды/выезды» (mdi-swap-horizontal). Одиночная кнопка-toggle, не `v-btn-toggle` — проще null-state.
- State: reactive `specialMode: '' | 'handover'` в `GanttCalendarView`. Проброшен пропом в `GanttTimeline → GanttTimelineRow → GanttTimelineItem`.
- Classification: `utils/gantt.js#getHandoverType(booking, today: Date)` возвращает один из 5 states: `checkin_today`, `checkin_tomorrow`, `checkout_today`, `checkout_tomorrow`, `null`. Caller передаёт `today = startOfDay(new Date())`.
- Visual: `checkin_today` → 3px зелёный border + ↗ marker, `checkin_tomorrow` → 3px светло-зелёный (без marker), `checkout_today` → 3px красный + ↙, `checkout_tomorrow` → 3px оранжевый. При `specialMode='handover'` + `null` → opacity 0.35 (`.gantt-item--dimmed`).
- Icon marker имеет `pointer-events: none`, чтобы не перехватывать click/contextmenu от родительского bar (SC-07).
- Persistence: `localStorage('apartus-calendar-view')` payload расширен полем `specialMode`. Legacy payloads без поля resolve в `''` (backwards-compat).
- Накрыто unit (`getHandoverType` matrix) + component (классы per type) + e2e (toggle triggers DOM state) + manual QA (light + dark скриншоты).

### Overdue Mode (FT-022)

Второй из FT-020 NS-02 special modes — подсветка просроченных выездов.

- Toolbar `v-btn` «Просрочки» (mdi-alert-circle-outline). Mutually exclusive с handover через единый `setSpecialMode(mode)` helper.
- Classification: `utils/gantt.js#getOverdueDays(booking, today)` возвращает число whole overdue days (≥1 для `status=checked_in` AND `check_out < today`, иначе `0`).
- Visual: `gantt-item--overdue` (3px красный border) + `gantt-item--overdue-pulse` (CSS `@keyframes` 1.5s infinite) + `gantt-item__overdue-label` span `+Nд` (pointer-events: none). При `specialMode='overdue'` + `0` → `.gantt-item--dimmed`.
- A11y: `@media (prefers-reduced-motion: reduce)` отключает pulse анимацию.
- FT-021 `toggleHandover` сохраняется как shim над `setSpecialMode('handover')` — backward-compat защита от регрессии FT-021 тестов.
- `SUPPORTED_SPECIAL_MODES` extended: `['', 'handover', 'overdue']`. Invalid values → `''`.
- NEG-06 edge: `check_out === today` AND `checked_in` → НЕ overdue (принадлежит handover territory FT-021 `checkout_today`). В overdue mode такой reservation dimmed.

### Idle Gaps Mode (FT-023)

Третий из FT-020 NS-02 special modes — подсветка окон простоя между бронированиями.

- Toolbar `v-btn` «Окна простоя» (mdi-clock-alert-outline). Mutually exclusive с handover/overdue.
- Gap calculation: `utils/gantt.js#findIdleGaps(bookings, viewStart, viewEnd)` — pure function. Cancelled и checked_out reservations НЕ считаются busy (юнит продаваем). Gaps < 1 day не emittятся.
- Visual (Row-level — впервые не Item-level): absolute-positioned `.gantt-row__idle-gap` div layer с `repeating-linear-gradient` error-tint hatched pattern, dashed borders, `{n}д` label span (визуализация через `pointer-events: none` не перехватывает клики на bars сверху).
- Z-index: gap layer `z-index: 0`, items стандартно поверх. Bars остаются на full opacity (REQ-05 — в отличие от handover/overdue где non-matching dimmed).
- `SUPPORTED_SPECIAL_MODES` extended: `['', 'handover', 'overdue', 'idle']`.

### Heatmap Mode (FT-024)

Четвёртый и финальный FT-020 NS-02 special mode — per-day heatmap tint по занятости юнита.

- Toolbar `v-btn` «Тепловая карта» (mdi-grid). Mutually exclusive с handover/overdue/idle.
- Classification: `utils/gantt.js#getDayCellStatus(day, bookings)` — binary (`busy` / `free`). Day busy если non-cancelled non-checked_out booking covers `[_start, _end)`. **Partial state** не применимо для Apartus date-level bookings — откладывается до появления hourly model.
- Visual (Row-level): absolute-positioned day-cell layer (`<div class="gantt-row__heat-cell gantt-row__heat-cell--{status}">`) под items. CSS tint через `--v-theme-error` (0.20 busy) / `--v-theme-success` (0.15 free). `pointer-events: none`, z-index 0 — click-through to bars preserved.
- `SUPPORTED_SPECIAL_MODES` extended: `['', 'handover', 'overdue', 'idle', 'heatmap']`.
- **FT-020 NS-02 closed** — все 4 special modes delivered (handover FT-021, overdue FT-022, idle FT-023, heatmap FT-024).

### Sidebar Collapse (FT-030)

Gantt unit sidebar можно свернуть до 48px icon-only колонки — unit cells показывают 2-letter abbreviation («DE», «ST», «DO» etc) вместо property + unit name.

- Toggle button в corner header (`mdi-chevron-left/right`).
- Keyboard shortcut `S` (wired через FT-029 `useGanttShortcuts`).
- Persisted в `localStorage('apartus-calendar-view').sidebarCollapsed: boolean`. Restored synchronously в setup (FT-025 ER-03 pattern).
- Abbreviation via `utils/strings.js#abbreviateUnit(name)` — 2 uppercase chars from first significant word (skip «the», «a», «an»).
- CSS transition 0.2s ease-out, disabled когда `prefers-reduced-motion: reduce`.
- `aria-expanded` / `aria-controls` on toggle button.
- Full name остаётся в `:title` tooltip при hover.

### Keyboard Shortcuts (FT-029)

Gantt поддерживает 6 keyboard shortcuts (via `composables/useGanttShortcuts.js`):

| Key | Action |
|---|---|
| `/` | Открыть поиск и сфокусировать input |
| `T` | Перейти к сегодня (centers today marker) |
| `[` | Предыдущий период (`anchorDate −= rangeDays`) |
| `]` | Следующий период (`anchorDate += rangeDays`) |
| `Esc` | Закрыть dialog / очистить поиск |
| `?` | Показать help dialog со списком shortcuts |

Handler dispatches по `event.code` (layout-independent) + fallback на `event.key === '?'` для Russian layout (Shift+7). Guards — no-op когда target = input/textarea/contenteditable OR active Vuetify overlay (`.v-overlay--active`). Help dialog — `v-dialog` с autofocus on close button.

### Reservation Bar Density (FT-027)

- `GanttTimelineItem` теперь несёт прогрессивно раскрываемую информацию: `guest_name` + **revenue chip** (right-aligned, tabular) + **nights indicator** (`{n} н` / `{n} n`).
- Width thresholds: 140px → revenue, 180px → nights (REQ-03).
- Mode overrides: overdue mode (overdue booking) → hide revenue (красный `+Nд` claims right slot); dimmed non-matching bars в handover/overdue → hide revenue + nights (unreadable at 0.35 opacity).
- Hover affordance — `outline: 2px solid rgba(var(--v-theme-on-surface), 0.3)` instead of black `box-shadow`. Theme-aware (FT-026 OKLCH palette).
- Currency resolved once per row в `GanttTimelineRow` через `authStore.organization.currency`, прокидывается в Item как prop (no per-Item store lookup).

### Search Bar (FT-025)

Collapsible search в Gantt toolbar для быстрого фильтра по guest / unit / property.

- Toolbar `v-btn icon="mdi-magnify"` → click → inline `v-text-field` (density compact, 240px). Только Escape закрывает bar и очищает query (blur не закрывает — иначе клик по календарю сбрасывал бы активный фильтр).
- Client-side filter: `utils/search.js#filterUnitsAndReservations(units, reservations, query)` — pure. Case-insensitive substring match на `unit.name`, `unit.property_name`, `reservation.guest_name`. Unit kept если matches на любом из 3 полей (fields matched independently, не concatenated). Matched unit показывает ВСЕ свои bookings (полный occupancy context).
- Debounce 200ms trailing-edge через `utils/debounce.js` (vanilla, no lodash). `onBeforeUnmount` → `cancel()`.
- Stacks с special modes — search применяется первым, mode оперирует на filtered subset.
- Persistence: `localStorage('apartus-calendar-view').searchQuery`. Restore path — `loadStoredView()` вызывается синхронно в `<script setup>` (НЕ в `onMounted`) чтобы избежать flicker; обе refs `searchQuery` + `debouncedQuery` set atomically bypass debounce. Auto-expand bar если restored query non-empty.
- Empty state: `v-empty-state` с mdi-magnify-close заменяет `<GanttTimeline>` когда query non-empty и no matches; distinct от no-data empty state.
- Language switcher: Settings → General → v-select ru/en. Сохраняется в `organization.settings.locale` через PATCH `/organization`.
- При boot: `fetchCurrentUser()` читает `organization.settings.locale` и устанавливает `i18n.global.locale.value`.
- Fallback: отсутствующий ключ в en.json → показывается русский текст. Невалидный locale → ru.
- Vuetify built-in strings (pagination, no-data) пока на дефолтном Vuetify locale — Vuetify locale adapter не интегрирован (known gap).
- Новые фичи обязаны добавлять строки в оба locale-файла и использовать `$t()` / `t()` вместо hardcoded текста.

## Views (22 routes)

| Route | View | Feature |
|---|---|---|
| `/` | DashboardView | FT-005 |
| `/calendar` | GanttCalendarView (views/calendar/*) | FT-020 (replaces FT-006 CSS-grid implementation) |
| `/properties` | PropertyListView | FT-HW1-01 |
| `/properties/new`, `/:id/edit` | PropertyFormView | FT-HW1-01 |
| `/properties/:pId/units` | UnitListView | FT-HW1-02 |
| `/properties/:pId/units/new`, `/:id/edit` | UnitFormView | FT-HW1-02 |
| `/amenities` | AmenityListView | FT-HW1-03 |
| `/branches` | BranchTreeView + BranchNode | FT-HW1-04 |
| `/reservations` | ReservationListView | FT-002 |
| `/reservations/new`, `/:id/edit` | ReservationFormView | FT-002 |
| `/guests` | GuestListView | FT-001 |
| `/guests/new`, `/:id/edit` | GuestFormView | FT-001 |
| `/owners` | OwnerListView | FT-012 |
| `/owners/:id/statement` | OwnerStatementView | FT-012 |
| `/channels` | ChannelListView | FT-011 |
| `/tasks` | TaskBoardView | FT-008 |
| `/expenses` | ExpenseListView | FT-007 |
| `/reports` | ReportsView | FT-007 |
| `/settings` | SettingsView (4 tabs) | multi |
| `/widget/:slug` | BookingWidgetView | FT-010 |
| `/auth/login` | LoginPage | auth |
| `/auth/register` | RegisterPage | auth |
| `/auth/select-organization` | SelectOrganizationPage | auth |

## Testing

- **Unit/Integration:** Vitest с jsdom, 409 specs, 100% JS line coverage.
- **E2E:** Playwright, 220 specs, 22 files, 100% interactive element coverage.
- Coverage ratchet в `frontend/vitest.config.js` (см. [`../engineering/testing-policy.md`](../engineering/testing-policy.md)).
- Test files: `src/**/*.{test,spec}.js` или `src/__tests__/`.
- E2E: `e2e/*.spec.js`, Playwright config `playwright.config.js`.
- Setup: `src/__tests__/setup.js` (localStorage polyfill), `helpers/mountWithVuetify.js` (Vuetify stubs).
- Не мокаем роутер/Pinia глобально — test helpers per suite.
