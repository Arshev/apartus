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
