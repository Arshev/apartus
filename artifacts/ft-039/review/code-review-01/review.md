# FT-039 Code Review — Claude — 2026-04-24

**Result:** **0 замечаний. FT-039 готов к `delivery_status: done`.**

Все pattern-ы FT-038 применены preventively:

- UI formatPrice → `data.currency || org.currency` в ReportsView + DashboardView (P0 FT-038).
- Fallback banner `v-alert type=warning` в обоих views (P0 FT-038).
- i18n namespace `reports.*` reused в dashboard — REQ-10 explicit (Codex P1 FT-038).
- Controller rescue только RateNotFound; no PATCH path → Codex RecordNotUnique P1 N/A.
- fx_rate_x1e10 с `positive?` guard (DEC-01).
- FALLBACK_NOTICE pullup — no orphan refs в OwnerStatementPdf.
- Multi-tenant `Current.organization` везде.
- ADR-004 integer-only (конвертация через CurrencyConverter.half_even_div).
