---
title: "FT-012: Owner Module"
doc_kind: feature
doc_function: canonical
purpose: "Property owner management: commission rates, payout calculations, owner statements."
derived_from:
  - ../../domain/problem.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-012: Owner Module

## Scope

**Backend:**

- `REQ-01` Model `Owner`: `organization_id` (FK), `name`, `email`, `phone`, `commission_rate` (integer, basis points, e.g. 1500 = 15%), `notes`.
- `REQ-02` `Property` gets optional `owner_id` FK — links property to its owner.
- `REQ-03` CRUD API `/api/v1/owners`.
- `REQ-04` `GET /api/v1/owners/:id/statement?from=&to=` — calculates:
  - total revenue from owner's properties
  - commission amount (revenue * rate / 10000)
  - net payout (revenue - commission - property expenses)
  - per-property breakdown
- `REQ-05` Backend specs.

**Frontend:**

- `REQ-06` `/owners` — owner list + CRUD.
- `REQ-07` Property form: owner selector.
- `REQ-08` Owner statement page with KPI cards.
- `REQ-09` API + store + specs + sidebar.

### Non-Scope

- `NS-01` Payment processing / bank transfers.
- `NS-02` PDF statement export.
- `NS-03` Owner self-service portal.

## Design

- `DEC-01` commission_rate stored as basis points (integer): 1500 = 15.0%. Display converts /100.
- `DEC-02` Statement calculates: commission = revenue × rate / 10000, net_payout = revenue - commission - expenses.
- `DEC-03` Per-property breakdown in statement: each property's revenue/commission/expenses/payout.
- `DEC-04` Statement supports date range params (from/to), defaults to current month.
- `DEC-05` PDF export via Pdf::OwnerStatementPdf (FT-017 dependency).

## Verify

- `SC-01` Commission formula: revenue × rate / 10000.
- `SC-02` net_payout = revenue - commission - expenses.
- `SC-03` Per-property breakdown accurate.
- `SC-04` Cancelled reservations excluded from revenue.
- `SC-05` Owner with no properties returns zeros.
- `SC-06` PDF format=pdf returns application/pdf attachment.
- `EVID-01` `spec/requests/api/v1/owners_spec.rb`
