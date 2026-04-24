# FT-038 Codex Review #1 — 2026-04-24

**Result:** 1 P1 + 1 P2 — оба исправлены.

## P1 (fixed)

- **Codex-10:** i18n key namespace deviation — feature.md REQ-07 спецификует `ownerStatement.currencyFallbackNotice`, frontend code использует `owners.statement.messages.currencyFallbackNotice`, backend PDF — `owner_statement.currency_fallback_notice`. **Fix:** feature.md REQ-07 переписан на canonical `owners.statement.messages.currencyFallbackNotice` (соответствует frontend convention); backend PDF → `FALLBACK_NOTICE` constant (no I18n.t).

## P2 (accepted/deferred)

- **Codex-8:** Fallback notice рендерится после header, до totals table. Codex предлагает после table. **Accepted:** текущее размещение (до данных) более заметно для user и matches REQ-06 spirit ("в начале документа"). Косметика.

## Verification verified by Codex independently

- Math SC-01 ✓
- Multi-tenant Current.organization scope ✓
- Rescue scope — только RateNotFound ✓
- fx_rate_x1e10 formula ✓
- EC-03 pre-FT-038 behaviour ✓
- Strong params safe ✓
- BasePdf backwards compat ✓
- Frontend CURRENCY_LIST + null Auto option ✓

**Verdict после фиксов:** APPROVE.
