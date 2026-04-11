---
title: "FT-014: Guest CRM Extended"
doc_kind: feature
doc_function: canonical
purpose: "Guest tags, source tracking, booking timeline."
derived_from:
  - ../../domain/problem.md
  - ../FT-001-guests/feature.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-014: Guest CRM Extended

## Scope
- `REQ-01` Guest gets `tags` (text array) and `source` (string) fields.
- `REQ-02` `GET /api/v1/guests/:id/timeline` — reservation history.
- `REQ-03` Frontend: tags chips on guest form, timeline on guest detail.
- `REQ-04` Specs.

## Design

- `DEC-01` `tags` stored as text[] (PostgreSQL array). `source` as string (free-form: direct/booking.com/airbnb/widget).
- `DEC-02` Timeline endpoint returns reservations ordered by check_in desc, scoped to current org.
- `DEC-03` Guest create/update API accepts `tags: []` and `source` params.

## Verify

- `SC-01` Tags stored and returned as array.
- `SC-02` Timeline returns reservations ordered by check_in desc.
- `SC-03` Timeline empty array for guest with no reservations.
- `SC-04` Cross-org guest timeline returns 404.
- `EVID-01` `spec/requests/api/v1/reservations_spec.rb` (timeline tests)
- `EVID-02` `spec/requests/api/v1/guests_spec.rb`
