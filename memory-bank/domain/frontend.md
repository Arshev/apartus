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
- Vuetify 3 — canonical UI kit
- Vite — build/dev server
- Pinia — state management
- Vue Router 4 — routing
- Axios — HTTP client (см. [`../adr/ADR-006-axios-api-client.md`](../adr/ADR-006-axios-api-client.md))
- Vitest + jsdom — тесты

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
