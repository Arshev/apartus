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

## HW-2 (planned)

Frontend фичи, закрывающие UI долг HW-1. Будут созданы в Фазе 2 миграции, через полный feature-flow (Draft → Design Ready → Plan Ready → Execution → Done).

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

## Naming

- Архивные HW-1: `FT-HW1-NN-slug/`
- HW-2: `FT-HW2-FE-N-slug/`
- Новые фичи вне курсовых модулей: `FT-NNN-slug/`
