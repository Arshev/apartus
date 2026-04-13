---
title: "FT-003: Pricing"
doc_kind: feature
doc_function: canonical
purpose: "Base rate per unit + seasonal price overrides + auto-calculation for reservations."
derived_from:
  - ../../domain/problem.md
  - ../../domain/schema.md
  - ../FT-002-reservations/feature.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-003: Pricing

## What

### Problem

MVP WF-03: базовое ценообразование. Сейчас total_price_cents вводится вручную. Нужны: базовая цена за ночь на unit, сезонные переопределения, авторасчёт стоимости при создании бронирования.

### Scope

**Backend:**

- `REQ-01` Поле `base_price_cents` (integer, ≥0, default 0) на модели Unit. Migration.
- `REQ-02` Model `SeasonalPrice`: `unit_id` (FK), `start_date`, `end_date`, `price_cents` (integer, ≥0). No overlap validation per unit. Org-scoped через unit.
- `REQ-03` API `CRUD /api/v1/units/:unit_id/seasonal_prices`. Nested under unit.
- `REQ-04` Pricing calculator: `PriceCalculator.call(unit, check_in, check_out)` — для каждой ночи берёт seasonal price если есть, иначе base_price_cents. Возвращает total_cents.
- `REQ-05` Reservation create/update: если `total_price_cents` не передан или 0, авторасчёт через PriceCalculator.
- `REQ-06` Backend specs.

**Frontend:**

- `REQ-07` Unit form: поле `base_price_cents` (цена за ночь).
- `REQ-08` Unit detail: seasonal prices table + dialog CRUD.
- `REQ-09` Reservation form: при выборе unit + dates → авторасчёт total_price_cents (вызов API или frontend калькулятор).
- `REQ-10` Frontend specs + ratchet.

### Non-Scope

- `NS-01` Dynamic pricing / yield management.
- `NS-02` Discounts, promo codes.
- `NS-03` Multi-currency.
- `NS-04` Per-guest pricing (extra guest fee).

### Constraints

- `CON-01` Money = integer cents (ADR-004).
- `CON-02` Frozen stack.
- `DEC-01` **Frontend price calculation** — calculate on client from loaded seasonal prices + base_price, no dedicated API endpoint. Simpler, faster UX.

## Design

- `DEC-02` `PriceCalculator` is a service object, not a model method — keeps Unit lean.
- `DEC-03` Each night gets first matching seasonal price; fallback to base_price_cents.
- `DEC-04` SeasonalPrice validates `end_date > start_date`. No overlap validation between periods.
- `DEC-05` Frontend watcher on `[unit_id, check_in, check_out]` auto-calculates by fetching seasonal prices.

## Verify

- `SC-01` Base price × N nights = correct total.
- `SC-02` Seasonal price overrides base for matching range.
- `SC-03` Mixed base + seasonal correct.
- `SC-04` Returns 0 for blank/invalid dates.
- `SC-05` Auto-calc when total_price_cents=0; manual price preserved when non-zero.
- `EVID-01` `spec/services/price_calculator_spec.rb`
- `EVID-02` `spec/models/seasonal_price_spec.rb`
- `EVID-03` `spec/requests/api/v1/seasonal_prices_spec.rb`
