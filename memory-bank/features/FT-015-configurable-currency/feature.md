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

## Design

- `DEC-01` `CurrencyConfig` concern: hash constant with symbol, decimal_places, symbol_position per currency.
- `DEC-02` Organization.currency validated against `CurrencyConfig.codes`. Default "RUB".
- `DEC-03` Frontend `formatMoney(cents, currencyCode)` mirrors backend formatting logic.
- `DEC-04` All views use `formatMoney` instead of hardcoded "₽". Auth store provides `organization.currency`.
- `DEC-05` Settings → General: v-select from `CURRENCY_LIST` (code + symbol label).

## Verify

- `SC-01` formatMoney: RUB → "150.00 ₽" (symbol after), USD → "$150.00" (symbol before).
- `SC-02` formatMoney: UZS → "1500 сўм" (zero decimal places).
- `SC-03` formatMoney: null/undefined → "—".
- `SC-04` Unknown currency falls back to USD format.
- `SC-05` Settings save persists currency change.
- `EVID-01` `spec/models/concerns/currency_config_spec.rb`
- `EVID-02` `frontend/src/__tests__/utils/currency.test.js`
