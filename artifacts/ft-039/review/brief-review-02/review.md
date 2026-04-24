# FT-039 Brief Review #2 — 2026-04-24

**Result:** **0 замечаний. feature.md готов к переводу в `status: active` (Design Ready).**

## Verified

Все 9 findings review #1 закрыты:

- P0 (3/3): Change Surface → api/*.js вместо несуществующих stores; pdfExport.js explicit + REQ-09 JSON+PDF; REQ-03 TODO resolved (dashboard cents = только revenue_this_month).
- P1 (3/3): NS-04/NS-04a разделены; NS-07 added + REQ-09 traceability "manual smoke per NS-07"; NEG-05 PCON-01 multi-tenant added.
- P2 (3/3): REQ-08 RU-only boundary explicit; REQ-10 traceability linked; ADR-016 transitive formulation.

## Math SC-01/SC-02

Consistent с FT-038 SC-01: 1_000_000 RUB cents × inverse_rate(1e8) / 1e10 = 10_000 USD cents. fx_rate_x1e10 = 100_000_000.

## Grounding

Все api/*.js, controllers, PDF service существуют. Stores для reports/dashboard не существуют (прямой api-call pattern) — корректно отражено.
