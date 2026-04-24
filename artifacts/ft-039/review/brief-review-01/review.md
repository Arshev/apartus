# FT-039 Brief Review #1 — 2026-04-24

**Result:** 9 замечаний (3 P0 + 3 P1 + 3 P2). Feature.md возвращён на iteration 2.

## P0

- Change Surface ссылается на несуществующие `frontend/src/stores/{reports,dashboard}.js` — реально прямой api/*.js pattern.
- pdfExport.js отсутствует в Change Surface, но используется для PDF download с currency.
- REQ-03 TODO "если нужны cents — проверить в grounding STEP-01" — gate требует resolved scope.

## P1

- NS-04 смешивает dashboard vs reports; ADR/RevPAR только в reports, не dashboard.
- REQ-09 "end-to-end via request spec" misleading для Vue-level verification — нет analog NS-06 FT-038.
- Нет multi-tenant NEG-*.

## P2

- REQ-08 FALLBACK_NOTICE pullup не уточняет RU-only boundary.
- REQ-10 traceability полностью пустая (N/A).
- ADR-016 citation слабое обоснование (косвенная связь).

Iteration 2: все 9 замечаний закрыты.
