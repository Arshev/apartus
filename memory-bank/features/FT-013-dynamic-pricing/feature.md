---
title: "FT-013: Dynamic Pricing"
doc_kind: feature
doc_function: canonical
purpose: "Length-of-stay discounts, last-minute pricing, occupancy-based markup."
derived_from:
  - ../../domain/problem.md
  - ../FT-003-pricing/feature.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-013: Dynamic Pricing

## Scope

**Backend:**

- `REQ-01` Model `PricingRule`: `unit_id` (FK), `rule_type` (enum: length_discount/last_minute/occupancy_markup), `min_nights` (integer, for length_discount), `discount_percent` (integer, 0..100), `days_before` (integer, for last_minute), `occupancy_threshold` (integer, for occupancy_markup), `markup_percent` (integer), `active` (boolean).
- `REQ-02` CRUD API `/api/v1/pricing_rules`. Org-scoped via unit.
- `REQ-03` `PriceCalculator` enhanced: after base/seasonal calc, apply active rules. Length discount: if nights >= min_nights, apply discount. Last-minute: if check_in - today <= days_before, apply discount. Occupancy markup: if current occupancy >= threshold, apply markup.
- `REQ-04` Backend specs.

**Frontend:**

- `REQ-05` Pricing rules management on unit edit form (collapsible section).
- `REQ-06` API + specs.

### Non-Scope

- `NS-01` AI-based yield management.
- `NS-02` Competitor price tracking.

## Design

- `DEC-01` Rules applied sequentially after base/seasonal: length_discount first, then last_minute, then occupancy_markup.
- `DEC-02` Length discount: if nights >= min_nights, total *= (100 - discount_percent) / 100.
- `DEC-03` Last-minute: if (check_in - today) <= days_before, apply discount.
- `DEC-04` Occupancy markup: if current occupancy >= threshold, total *= (100 + markup_percent) / 100.
- `DEC-05` Only active rules applied. Multiple rules of same type: first match wins.

## Verify

- `SC-01` Length discount applied when stay >= min_nights.
- `SC-02` Last-minute discount for near check-in.
- `SC-03` Occupancy markup with real DB data.
- `SC-04` Combined rules stack sequentially.
- `SC-05` Inactive rules ignored.
- `SC-06` Result never negative.
- `EVID-01` `spec/services/price_calculator_spec.rb`
- `EVID-02` `spec/models/pricing_rule_spec.rb`
