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
