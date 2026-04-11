---
title: "FT-006: Calendar View"
doc_kind: feature
doc_function: canonical
purpose: "Visual reservation calendar — timeline grid by unit with date navigation."
derived_from:
  - ../../domain/problem.md
  - ../FT-002-reservations/feature.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-006: Calendar View

## Scope

- `REQ-01` `/calendar` route: timeline grid. Y-axis = units (grouped by property). X-axis = dates (14-day window, scrollable). Reservation bars span check_in..check_out, colored by status.
- `REQ-02` Date navigation: prev/next buttons shift window by 7 days. "Today" button resets.
- `REQ-03` Click reservation bar → navigate to `/reservations/:id/edit`.
- `REQ-04` Click empty cell → navigate to `/reservations/new?unit_id=X&check_in=Y`.
- `REQ-05` Data from existing `GET /reservations?from=&to=` endpoint.
- `REQ-06` Frontend-only feature (no backend changes). Vuetify + CSS grid.
- `REQ-07` Sidebar nav item "Calendar".
- `REQ-08` Specs.

### Non-Scope

- `NS-01` Drag-and-drop move/resize.
- `NS-02` Month view.
- `NS-03` Calendar library (custom CSS grid, Vuetify-only).

## Design

- `DEC-01` CSS Grid: sticky left column (unit names) + 14 date columns.
- `DEC-02` Reservations filtered client-side: excludes cancelled, only check_in <= date < check_out.
- `DEC-03` Bar color by status: confirmed=blue, checked_in=green, checked_out=grey.
- `DEC-04` Guest name shown on check_in date; "🔒" for blocks (no guest).
- `DEC-05` Navigation via startDate ref: shift ±7 days, today resets.

## Verify

- `SC-01` Grid renders 14 date columns + unit rows with "Property → Unit" format.
- `SC-02` Forward/back shifts dates by 7 days.
- `SC-03` Today button resets to current date.
- `SC-04` Cell click navigates to /reservations/new with query params.
- `SC-05` Reservation bar click navigates to /reservations/:id/edit.
- `EVID-01` `e2e/calendar.spec.js`
