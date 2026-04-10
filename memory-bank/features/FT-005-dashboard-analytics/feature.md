---
title: "FT-005: Dashboard Analytics"
doc_kind: feature
doc_function: canonical
purpose: "Dashboard с ключевыми метриками PMS: occupancy, revenue, upcoming check-ins/outs."
derived_from:
  - ../../domain/problem.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-005: Dashboard Analytics

## Scope

**Backend:**
- `REQ-01` `GET /api/v1/dashboard` — агрегированные метрики за период (default: текущий месяц):
  - `total_units` — кол-во юнитов в org
  - `occupied_units` — юниты с active (confirmed/checked_in) бронированием на сегодня
  - `occupancy_rate` — occupied / total (float 0..1)
  - `revenue_this_month` — сумма total_price_cents всех бронирований текущего месяца
  - `upcoming_check_ins` — бронирования с check_in в ближайшие 7 дней (list, max 10)
  - `upcoming_check_outs` — бронирования с check_out в ближайшие 7 дней (list, max 10)
  - `reservations_by_status` — count per status { confirmed, checked_in, checked_out, cancelled }

**Frontend:**
- `REQ-02` Заменить текущий DashboardView (приветствие) на информативный dashboard:
  - KPI cards: Total Units, Occupancy Rate (%), Revenue This Month (₽)
  - Upcoming check-ins/outs tables (compact)
  - Reservations by status — donut chart или stat cards
- `REQ-03` API client `api/dashboard.js`.
- `REQ-04` Specs.

### Non-Scope

- `NS-01` Date range picker (hardcoded current month + 7-day upcoming).
- `NS-02` Charts library — используем Vuetify cards/progress, не Chart.js.
- `NS-03` Export reports.
