---
title: "FT-007: Finances"
doc_kind: feature
doc_function: canonical
purpose: "Expense tracking + financial reports (P&L, occupancy, RevPAR, ADR)."
derived_from:
  - ../../domain/problem.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-007: Finances

## Scope

**Backend:**
- `REQ-01` Model `Expense`: `organization_id` (FK), `property_id` (FK, optional), `category` (enum: maintenance/utilities/cleaning/supplies/other), `amount_cents` (integer, >0), `description` (text), `expense_date` (date). Org-scoped.
- `REQ-02` REST CRUD `/api/v1/expenses`. Filter by property_id, category, date range.
- `REQ-03` `GET /api/v1/reports/financial?from=&to=` — aggregated report:
  - `total_revenue` — sum reservation total_price_cents
  - `total_expenses` — sum expense amount_cents
  - `net_income` — revenue - expenses
  - `revenue_by_property` — [{property_name, revenue}]
  - `expenses_by_category` — [{category, total}]
  - `occupancy_rate` — avg daily occupancy over period
  - `adr` (average daily rate) — revenue / occupied room-nights
  - `revpar` — revenue / available room-nights
- `REQ-04` Backend specs.

**Frontend:**
- `REQ-05` `/expenses` — expense list + CRUD (dialog-based, simple).
- `REQ-06` `/reports` — financial report page with KPI cards + breakdowns.
- `REQ-07` API clients + specs.
- `REQ-08` Sidebar: Expenses + Reports nav items.

### Non-Scope

- `NS-01` Invoice generation.
- `NS-02` Owner payouts/commissions.
- `NS-03` Charts library.
