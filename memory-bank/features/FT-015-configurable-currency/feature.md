---
title: "FT-015: Configurable Currency"
doc_kind: feature
doc_function: canonical
purpose: "Настраиваемая валюта per organization. Blocking для международного рынка."
derived_from:
  - ../../domain/problem.md
  - ../../domain/pricing-strategy.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-015: Configurable Currency

## Scope

**Backend:**
- `REQ-01` Migration: add `currency` (string, default "RUB") to `organizations` table.
- `REQ-02` Currency config: `CURRENCIES` constant with code, symbol, decimal_places, symbol_position. Support: RUB (₽), USD ($), EUR (€), THB (฿), AED (د.إ), TRY (₺), KZT (₸), GEL (₾), UZS (сўм).
- `REQ-03` Organization update API accepts `currency` field.
- `REQ-04` All money-field JSON responses include `currency` from org.

**Frontend:**
- `REQ-05` Currency formatter utility: `formatMoney(cents, currency)` → "150.00 ₽" / "$150.00" / "€150.00".
- `REQ-06` Replace ALL hardcoded "₽" with formatter across views (Dashboard, Reports, Reservations, Expenses, Owners, Booking Widget).
- `REQ-07` Settings → General: currency selector (v-select from supported list).
- `REQ-08` Booking widget uses org currency.
- `REQ-09` Specs.
