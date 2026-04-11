---
title: Money & Currency Conventions
doc_kind: domain
doc_function: canonical
purpose: How money values are stored, converted, displayed, and calculated across backend and frontend.
derived_from:
  - ../adr/ADR-004-money-as-cents.md
  - architecture.md
status: active
audience: humans_and_agents
canonical_for:
  - money_storage_convention
  - currency_display_rules
  - commission_rate_format
---

# Money & Currency

## Storage (Backend)

All money values stored as **integer cents** (ADR-004). Column suffix: `_cents`.

| Field | Model | Meaning |
|-------|-------|---------|
| base_price_cents | Unit | Price per night in cents |
| price_cents | SeasonalPrice | Seasonal override per night |
| total_price_cents | Reservation | Total booking price |
| amount_cents | Expense | Expense amount |

**No floats, no BigDecimal, no money gem.** Integer arithmetic only.

## Commission Rates

`Owner.commission_rate` stored as **basis points** (integer):
- 1500 = 15.0%
- 2000 = 20.0%
- 500 = 5.0%

**Formula:** `commission = revenue * commission_rate / 10_000`

**Display:** Frontend shows `(commission_rate / 100).toFixed(1)` + "%" (e.g., "15.0%").

**Form input:** User enters percentage (e.g., "15"), frontend multiplies by 100 for storage.

## Currency Configuration

Each organization has `currency` field (string, default "RUB").

`CurrencyConfig` concern defines 11 currencies:

| Code | Symbol | Decimal | Position | Name |
|------|--------|---------|----------|------|
| RUB | ₽ | 2 | after | Российский рубль |
| USD | $ | 2 | before | US Dollar |
| EUR | € | 2 | before | Euro |
| THB | ฿ | 2 | before | Thai Baht |
| AED | د.إ | 2 | after | UAE Dirham |
| TRY | ₺ | 2 | before | Turkish Lira |
| KZT | ₸ | 2 | after | Казахстанский тенге |
| GEL | ₾ | 2 | after | Georgian Lari |
| UZS | сўм | 0 | after | Узбекский сум |
| GBP | £ | 2 | before | British Pound |
| IDR | Rp | 0 | before | Indonesian Rupiah |

## Display (Frontend)

`formatMoney(cents, currencyCode)` in `src/utils/currency.js`:
- `formatMoney(15000, 'RUB')` → `"150.00 ₽"`
- `formatMoney(15000, 'USD')` → `"$150.00"`
- `formatMoney(150000, 'UZS')` → `"1500 сўм"` (zero decimals)
- `formatMoney(null)` → `"—"`
- `formatMoney(0, 'USD')` → `"$0.00"`
- Unknown currency → falls back to USD format

## Conversion Helpers

| Function | Input | Output |
|----------|-------|--------|
| `centsToUnits(cents)` | 5000 | 50 |
| `unitsToCents(units)` | 49.99 | 4999 (rounded) |

## No FX / No Multi-Currency

All money within one organization is in one currency. No exchange rates, no cross-currency transactions. Currency is display-only — backend stores cents regardless of currency.
