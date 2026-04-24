# FT-038 Brief Review #1 — 2026-04-24

**Result:** 14 замечаний (5 P0 + 6 P1 + 3 P2). Feature.md возвращён.

## P0

- OwnerFormView.vue не существует; форма inline в OwnerListView.vue.
- SC-01 математика неверна (fx_rate_x1e10 = 100_000_000_000 не соответствует FT-037 DEC-02 формуле).
- Short template нарушен: 2 CON + 3 EC + API contract change — нужен large + CTR/FM/NEG.
- Нет NEG-*, хотя REQ-06 fallback, CON-02 future — явные failure paths.
- CHK-01 не покрывает PDF rendering + frontend regression.

## P1

- fx_rate_x1e10 семантика ambiguous (direct / inverse / triangulated).
- preferred_currency generic naming — scope boundary.
- owners.js store — неясно что меняется.
- BasePdf#fmt breaking change — нужен regression guard для FinancialReportPdf.
- PCON-01 не зафиксирован как CON + NEG.
- BasePdf#fmt generalization — per-call scope только для OwnerStatementPdf.

## P2

- REQ-02 нет frontend coverage в CHK.
- Migration rollout не упомянут.
- i18n ключи — wildcard, не указаны.

Возврат на iteration 2 с upgrade на large template.
