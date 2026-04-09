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
| Organization SPA (`/frontend`) | Vue 3 SPA, основной UI для УК и арендодателей | active (HW-0 auth skeleton, HW-2 добавляет layouts + HW-1 feature UIs) |
| Booking Widget | встраиваемый модуль для сайтов собственников | post-MVP, не начат |
| Owner Cabinet | отдельный view для собственников | post-MVP |

Текущий scope — только Organization SPA.

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
- `stores/` — Pinia stores (`auth`, будущие `organization`, `properties`, `units`, `amenities`, `branches`)
- `services/api/` — axios-инстансы и API клиенты
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

## Testing

- Vitest с jsdom environment.
- Coverage ratchet в `frontend/vitest.config.js` (см. [`../engineering/testing-policy.md`](../engineering/testing-policy.md)).
- Test files: `src/**/*.{test,spec}.js` или `src/__tests__/`.
- Не мокаем роутер/Pinia глобально — test helpers per suite.
