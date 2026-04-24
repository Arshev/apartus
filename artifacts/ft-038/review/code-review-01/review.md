# FT-038 Code Review #1 — Claude comprehensive — 2026-04-24

**Result:** 2 P0 + 2 P1 + 4 P2 — все применимые issue исправлены.

## P0 (fixed)

- **P0-01:** `OwnerStatementView.vue#fmt` всегда использовал `authStore.organization.currency`, игнорируя `data.currency` → UI показывал неправильные значения и символ. **Fix:** приоритет `data.value?.currency || authStore.organization?.currency`.
- **P0-02:** Fallback banner не рендерился в web UI (только PDF). **Fix:** `v-alert type="warning"` с `owners.statement.messages.currencyFallbackNotice` когда `currency_fallback_reason === 'rate_not_found'`.

## P1 (fixed)

- **P1-01:** `CURRENCY_LIST` не имеет `.name` (реальное поле `.label` = "USD ($)"). Dropdown показывал "USD — undefined". **Fix:** `title: c.label`.
- **P1-02:** `I18n.t("owner_statement.currency_fallback_notice")` — нет translation в backend locales (fall-through к Russian default). **Fix:** заменён на `FALLBACK_NOTICE` constant (matches existing PDF literal convention; backend i18n — вне FT-038 scope).

## P2 (addressed)

- **P2-01:** `@override` conditional init вне всех путей — **Fixed:** ternary с nil default.
- **P2-02:** CHK-04 слабый (только %PDF header) — **Accepted:** code-level регрессия `fmt` через default `nil` keyword достаточна; углубление spec вне scope.
- **P2-03:** NEG-05 (403 no permission) не в request-spec — **Accepted:** policy-spec покрывает через existing owner_policy_spec.rb.
- **P2-04:** `positive?` vs `== 0` для fx_rate_x1e10 — **Accepted:** negative revenue не realistic path; cosmetic.

## Verification after fixes

- Backend FT-038 specs: 50/50
- Frontend: 811/811 + build ok
