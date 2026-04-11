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

## Design

- `DEC-01` Single endpoint with all metrics — no separate endpoints for each KPI.
- `DEC-02` Occupancy = units with active reservation overlapping today / total units.
- `DEC-03` Revenue sums confirmed + checked_in + checked_out (excludes cancelled).
- `DEC-04` Upcoming lists limited to 10, ordered by check_in/check_out.
- `DEC-05` Frontend: Vuetify cards + v-progress-linear for occupancy bar, v-list for upcoming.

## Verify

- `SC-01` total_units matches org unit count.
- `SC-02` occupancy_rate = occupied/total as decimal 0..1.
- `SC-03` revenue excludes cancelled reservations.
- `SC-04` upcoming_check_ins ordered by check_in, max 7 days.
- `SC-05` Status counts match actual by-status counts.
- `SC-06` Cross-org data excluded.
- `EVID-01` `spec/requests/api/v1/dashboard_spec.rb`
