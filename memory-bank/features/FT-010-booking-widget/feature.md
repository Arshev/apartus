---
title: "FT-010: Booking Widget"
doc_kind: feature
doc_function: canonical
purpose: "Public booking API + embeddable widget for property websites."
derived_from:
  - ../../domain/problem.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-010: Booking Widget

## Scope

**Backend:**
- `REQ-01` Public API (no auth): `GET /api/v1/public/properties/:slug/availability?from=&to=` — returns available units with prices for date range.
- `REQ-02` Public API: `POST /api/v1/public/properties/:slug/bookings` — creates reservation + guest (if new) from external booking. Params: `unit_id`, `check_in`, `check_out`, `guest_name`, `guest_email`, `guest_phone`, `guests_count`.
- `REQ-03` Property slug-based lookup (Organization slug + property id). Public routes skip auth.

**Frontend:**
- `REQ-04` `/widget/:slug` — standalone booking page (no shell). Shows available units, date picker, booking form.
- `REQ-05` Embeddable: `<iframe src="https://app.apartus.local/widget/SLUG">`.
- `REQ-06` API client + specs.

### Non-Scope
- `NS-01` Payment integration.
- `NS-02` Custom widget styling/themes.
- `NS-03` Multi-property widget.
