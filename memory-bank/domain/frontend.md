---
title: Apartus Frontend
doc_kind: domain
doc_function: canonical
purpose: UI surfaces, стек, design system, i18n и interaction patterns Apartus frontend.
derived_from:
  - architecture.md
status: active
audience: humans_and_agents
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
- `utils/` — currency formatting (formatMoney, centsToUnits, unitsToCents)
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

- Основной язык — русский (UI копии русские by default).
- Английский — вторичный (планируется vue-i18n).
- На HW-2 фичах строки оставляем inline на русском. Вынос в i18n — отдельная фаза (Phase 12 roadmap).
- Не коммитим bilingual UI строки в feature UI без отдельного i18n решения.

## Views (22 routes)

| Route | View | Feature |
|---|---|---|
| `/` | DashboardView | FT-005 |
| `/calendar` | CalendarView | FT-006 |
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
