# FT-037 Simplify Review #1 — 2026-04-24

**Reviewer:** refactoring-expert subagent (clean context)
**Gate:** Execution → Done (simplify pass)
**Result:** 2 medium + 3 low-priority наблюдений. M1 и M2 применены автором. После применения — approved.

## Применено

- **M1:** убран локальный `find_rate` helper + `rescue` в ExchangeRatesController — теперь `policy_scope(ExchangeRate).find` + BaseController `rescue_from RecordNotFound` (единый source для 404).
- **M2:** `currencyCodes` в `CurrencyRatesView.vue` через импорт `CURRENCY_LIST` из `utils/currency` (устранён duplicate hardcoded list).
- Dropped `vi.mock('../../../api/auth')` + `vi.mock('../../../api/client')` в view test (не нужны).

## Оставлены (observations, не требуют изменений)

- `ExchangeRatePolicy` повторяет `Current.membership&.can?(...)` 5 раз — consistency с `ExpensePolicy`.
- `CurrencyConverter.lookup_direct` — два запроса (manual→API) вместо CASE-based — cold path, читаемо.
- L2 savepoint vs `transaction(requires_new:)` — не трогаем, оба работают.
- L3 mixed concerns в `effective_date_not_too_future` — разделение overkill.

## Verification after M1+M2

- Backend: 1171/1171 (регрессий нет)
- Frontend: 811/811
