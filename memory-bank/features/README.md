---
title: Feature Packages Index
doc_kind: feature
doc_function: index
purpose: Навигация по instantiated feature packages Apartus.
derived_from:
  - ../dna/governance.md
  - ../flows/feature-flow.md
status: active
audience: humans_and_agents
last_verified: 2026-04-13
---

# Feature Packages

## HW-1 (archived, done)

Backend CRUD features, реализованные во время HW-1. Все merged в main (PR #6). Историческая форма Brief/Spec/Plan сохранена в `homeworks/hw-1/features/`; canonical owner теперь здесь.

| Package | Title | Status | Delivery |
|---|---|---|---|
| [FT-HW1-01-property-crud](FT-HW1-01-property-crud/feature.md) | Property CRUD (reference implementation) | archived | done |
| [FT-HW1-02-unit-crud](FT-HW1-02-unit-crud/feature.md) | Unit CRUD (nested под Property) | archived | done |
| [FT-HW1-03-amenities](FT-HW1-03-amenities/feature.md) | Amenities M:N (catalog + attach/detach) | archived | done |
| [FT-HW1-04-branches](FT-HW1-04-branches/feature.md) | Branch CRUD (adjacency list tree) | archived | done |
| [FT-HW1-05-property-branch-link](FT-HW1-05-property-branch-link/feature.md) | Property ↔ Branch link | archived | done |

## HW-2 (done)

Frontend фичи, закрывающие UI долг HW-1. Прошли полный feature-flow (Draft → Design Ready → Plan Ready → Execution → Done).

| Package | Status | Delivery | Scope |
|---|---|---|---|
| [FT-HW2-FE1-organization-shell](FT-HW2-FE1-organization-shell/feature.md) | active | done | Layout, navigation, org switcher, logout — frontend reference implementation |
| [FT-HW2-FE2-properties-ui](FT-HW2-FE2-properties-ui/feature.md) | active | done | Property list/form/branch selector, delete |
| [FT-HW2-FE3-units-ui](FT-HW2-FE3-units-ui/feature.md) | active | done | Unit list/form nested under Property |
| [FT-HW2-FE4-amenities-catalog-ui](FT-HW2-FE4-amenities-catalog-ui/feature.md) | active | done | Amenities catalog CRUD + unit attach/detach |
| [FT-HW2-FE5-branches-tree-ui](FT-HW2-FE5-branches-tree-ui/feature.md) | active | done | Branch tree with client-side tree builder |

## MVP Features (full-stack)

| Package | Status | Delivery | Scope |
|---|---|---|---|
| [FT-001-guests](FT-001-guests/feature.md) | active | done | Guest CRUD full-stack |
| [FT-002-reservations](FT-002-reservations/feature.md) | active | done | Reservation CRUD + check-in/out/cancel + date overlap |
| [FT-003-pricing](FT-003-pricing/feature.md) | active | done | Base price + seasonal prices + auto-calc |
| [FT-004-photos](FT-004-photos/feature.md) | active | done | Property/Unit photos via Active Storage |
| [FT-005-dashboard-analytics](FT-005-dashboard-analytics/feature.md) | active | done | Dashboard: occupancy, revenue, upcoming check-ins/outs |
| [FT-006-calendar-view](FT-006-calendar-view/feature.md) | active | done | Visual reservation calendar timeline |
| [FT-007-finances](FT-007-finances/feature.md) | active | done | Expenses CRUD + P&L + occupancy/ADR/RevPAR reports |
| [FT-008-tasks](FT-008-tasks/feature.md) | active | done | Task kanban board (cleaning/maintenance/inspection) |
| [FT-009-communications](FT-009-communications/feature.md) | active | done | Guest emails: booking confirmation, check-in/out notifications |
| [FT-010-booking-widget](FT-010-booking-widget/feature.md) | active | done | Public booking widget: availability API + embeddable page |
| [FT-011-channel-manager](FT-011-channel-manager/feature.md) | active | done | Channel Manager: iCal export/import for Booking.com/Airbnb |
| [FT-012-owner-module](FT-012-owner-module/feature.md) | active | done | Owner management: commissions, payouts, statements |
| [FT-013-dynamic-pricing](FT-013-dynamic-pricing/feature.md) | active | done | Dynamic pricing: length discount, last-minute, occupancy markup |
| [FT-014-guest-crm-extended](FT-014-guest-crm-extended/feature.md) | active | done | Guest CRM: tags, source, booking timeline |

## Platform Features

| Package | Status | Delivery | Scope |
|---|---|---|---|
| [FT-015-configurable-currency](FT-015-configurable-currency/feature.md) | active | done | Per-org currency (RUB/USD/EUR/THB/etc.) + formatter |
| [FT-016-telegram-bot](FT-016-telegram-bot/feature.md) | active | done | Telegram notifications: bookings, check-in/out, cancellation |
| [FT-017-pdf-export](FT-017-pdf-export/feature.md) | active | done | PDF financial reports + owner statements (Prawn + Arial TTF) |
| [FT-018-subscriptions](FT-018-subscriptions/feature.md) | active | done | Plan config: starter/professional/business/enterprise limits |

## Planned Features

| Package | Status | Delivery | Scope |
|---|---|---|---|
| [FT-019-i18n](FT-019-i18n/feature.md) | active | done | Frontend i18n (vue-i18n): ru/en locales, language switcher |
| [FT-020-gantt-calendar](FT-020-gantt-calendar/feature.md) | active | done | Gantt Calendar Phase 1 — Core: pixel-based timeline, lanes, tooltip, context menu, today marker, replaces CalendarView |
| [FT-021-gantt-handover-mode](FT-021-gantt-handover-mode/feature.md) | active | done | Gantt Handover Mode — toolbar toggle подсвечивает предстоящие заезды/выезды (±1 day bracket), dimmed остальные. Первый из отложенных FT-020 NS-02 special modes |
| [FT-022-gantt-overdue-mode](FT-022-gantt-overdue-mode/feature.md) | active | done | Gantt Overdue Mode — toolbar toggle подсвечивает reservations с просроченным выездом (check_out < today && status=checked_in), pulse-анимация, + {n}д label. Второй FT-020 NS-02 special mode |
| [FT-023-gantt-idle-gaps-mode](FT-023-gantt-idle-gaps-mode/feature.md) | active | done | Gantt Idle Gaps Mode — toolbar toggle отрисовывает hatched pattern окон простоя между бронированиями per unit. Третий FT-020 NS-02 special mode |
| [FT-024-gantt-heatmap-mode](FT-024-gantt-heatmap-mode/feature.md) | active | done | Gantt Heatmap Mode — toolbar toggle заливает day-cells background tint по занятости (busy/free). Четвёртый и финальный FT-020 NS-02 special mode — closes NS-02 |
| [FT-025-search-filters](FT-025-search-filters/feature.md) | active | done | Gantt Search Bar — collapsible mdi-magnify → text input → debounced client-side фильтр по guest/unit/property. Stacks поверх всех 4 special modes. Persists в localStorage |
| [FT-026-design-refresh](FT-026-design-refresh/feature.md) | active | done | Design Refresh — Geologica+Geist self-hosted OFL fonts, OKLCH palette с tinted neutrals, Gantt toolbar hierarchy в 3 cluster, tonal active mode state. Closes P0/P1 от Impeccable critique (21→26/40 Nielsen) |
| [FT-027-reservation-bar-density](FT-027-reservation-bar-density/feature.md) | active | done | Reservation Bar Density — revenue chip right-aligned + nights indicator + theme-aware hover outline. Progressive disclosure thresholds (140px revenue / 180px nights). Respects overdue + handover mode overrides |
| [FT-028-empty-state-ux](FT-028-empty-state-ux/feature.md) | active | done | Empty State UX — Gantt search empty with subtext hint + inline Clear button; no-data empty with Add-property CTA. Closes P2 from Impeccable critique |
| [FT-029-keyboard-shortcuts](FT-029-keyboard-shortcuts/feature.md) | active | done | Gantt Keyboard Shortcuts — `/` focus search, `T` today, `[` `]` prev/next range, `Esc` close/clear, `?` help dialog. Closes Persona red flag «no keyboard» from Impeccable critique |
| [FT-030-sidebar-collapse](FT-030-sidebar-collapse/feature.md) | active | done | Gantt Sidebar Collapse — 240px → 48px with 2-letter unit abbreviations (abbreviateUnit util), `S` shortcut, persisted in localStorage. Closes Impeccable critique sidebar finding |
| [FT-031-dashboard-redesign](FT-031-dashboard-redesign/feature.md) | active | done | Dashboard editorial rewrite — hero revenue (Geologica 3.5rem) + supporting metrics inline + horizontal stacked status bar + clean upcoming lists. Removes AI-slop «hero metric layout» + identical-card-grid patterns |
| [FT-032-abbreviation-today-anchor](FT-032-abbreviation-today-anchor/feature.md) | active | done | Closes 2 P1 from re-critique: `abbreviateUnit` digit-aware rule (Dorm 6A/8B → D6/D8 distinct) + today-column background tint anchor |
| [FT-033-density-toggle](FT-033-density-toggle/feature.md) | active | done | Gantt row density toggle — comfortable (36/28) ↔ compact (30/22) px. Toolbar icon + `D` shortcut + localStorage persist. Closes re-critique P2 «empty grid expensive». Also fixes pre-existing corner/header alignment via `--gantt-header-height` CSS var |
| [FT-034-shortcut-badges](FT-034-shortcut-badges/feature.md) | active | done | Inline `<kbd>` badges on toolbar buttons that have shortcuts: search `/`, today `T`, density `D`, sidebar toggle `S`. Closes re-critique P2 peripheral shortcut discovery |
| [FT-035-reservation-form-redesign](FT-035-reservation-form-redesign/feature.md) | active | done | Reservation form redesign — hybrid layout + sticky price breakdown + date range popup + guest quick-create dialog + per-org currency hookup. Closes RUB-hardcoded debt and AI-slop flat form |
| [FT-037-multi-currency-conversion](FT-037-multi-currency-conversion/feature.md) | active | done | Multi-currency conversion — currencyapi.com daily rates + per-org manual overrides, runtime triangulation + inverse via USD. Инфраструктура (ExchangeRate model + CurrencyConverter + FetchExchangeRatesJob + settings UI); консюмеры (reports/owner/pdf) в отдельных фичах. ADR-016 accepted. UC-006 created. |
| [FT-038-owner-statement-currency](FT-038-owner-statement-currency/feature.md) | active | done | Owner statement в валюте собственника — первый консюмер FT-037. `Owner.preferred_currency` + конвертация агрегатов в `#statement` + PDF currency override + graceful RateNotFound fallback + web UI currency-aware formatter + fallback banner. |
| [FT-039-report-display-currency](FT-039-report-display-currency/feature.md) | active | done | Reports + Dashboard display currency — второй консюмер FT-037. `?currency=<ISO>` query param на `/reports/financial[.pdf]` + `/dashboard` + FinancialReportPdf currency awareness (mirrors OwnerStatementPdf). FALLBACK_NOTICE pullup в BasePdf. UI selector + fallback banner. |

## Known Gaps

FT-001..FT-018 были реализованы в ускоренном режиме. Известные отклонения от feature-flow.md:

**Структурные:**

- **Отсутствует `implementation-plan.md`** у всех 18 фич. Для новых фич plan обязателен.
- **Секции `Scope`/`Design` вместо `What`/`How`** у FT-003..FT-018 (15 фич). Boundary Rule 1 требует `What`/`How`/`Verify`.

**Stable identifiers (Required Minimum):**

- **Нет `CHK-*`** у FT-003..FT-016, FT-018 (14 фич).
- **Нет `EVID-*`** у FT-001, FT-002 (2 фичи).
- **Нет `NS-*`** у FT-014, FT-015 (2 фичи).

**Политика:** при следующем касании feature.md — привести к каноническим секциям и добавить недостающие IDs. Новые фичи (FT-019+) обязаны следовать full feature-flow.

## Naming

- Архивные HW-1: `FT-HW1-NN-slug/`
- HW-2: `FT-HW2-FE-N-slug/`
- Новые фичи: `FT-NNN-slug/`
