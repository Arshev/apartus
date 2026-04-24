# FT-037 Brief Review #1 — 2026-04-24

**Reviewer:** general-purpose subagent (автор ≠ ревьюер, см. `memory-bank/engineering/autonomy-boundaries.md`)
**Gate:** Draft → Design Ready
**Result:** **15 замечаний; НЕ готов к `status: active`.**

## Breakdown

- **P0 (5)** — блокеры Design Ready.
- **P1 (5)** — двусмысленности, требуют уточнения.
- **P2 (5)** — улучшения (precision, разбиения, cron).

## P0 findings

1. **CON-02 формула математически некорректна** для cross-decimal пар (USD↔UZS) и нарушает ADR-004 integer-only invariant (через `10 ** -2` уходит в Rational). Precision `rate_x1e6` даёт до 0.5% ошибки для UZS↔USD — неприемлемо.
2. **SC-01 не vertical-slice** — чистый unit-тест сервиса. Нужны end-to-end scenario через job-fetch и POST `/api/v1/exchange_rates`.
3. **Multi-tenant isolation (EC-04) не имеет acceptance scenario** — PCON-01 фактически не верифицируется; SC-01 не ловит leak "org A manual override попадает в лукап org B".
4. **Нет секции `Failure Modes`** — внешний API без failure modes (API down, invalid key, partial response, concurrent runs, rate=0, rate not found).
5. **Change Surface пропускает:** spec-файлы (хотя CHK-01 на них ссылается), factories, WebMock/VCR stub infra, frontend tests, `db/seeds/`, новый `UC-*` (feature-flow.md требует для устойчивого сценария).

## P1 findings

6. "admin-only" ≠ Apartus permissions model — в проекте role_enum `member/manager/owner` + permission-based через `role.has_permission?`. Нужно конкретное permission name (`currency_rates.manage` или подобное).
7. REQ-05 credentials — не указано per-environment (credentials/development.yml.enc и т.д.) и как работает в test (WebMock/VCR).
8. API rates visibility в UI vs tenancy — админ видит глобальные API rates или только свои overrides? Immutability API rows через API endpoint не зафиксирована.
9. NS-04 противоречив — "cross-rate derivation — non-scope" и "триангулирует внутри сервиса" одновременно.
10. Inverse rate не описан — только USD→X, но что с X→USD? Два варианта (отдельная row vs runtime inversion) не выбраны.

## P2 findings

11. `rate_x1e6` → `rate_x1e10` (precision для high-scale currencies).
12. EC-01 "short-circuit без DB hit" — деталь реализации, не exit criterion.
13. Нет `NEG-*` при наличии очевидных edge cases (7 штук).
14. "00:15 UTC" → точный cron expression + обоснование timing относительно currencyapi.com update window.
15. Один `CHK-01`/`EVID-01` на 5 specs — разбить по domains (service/job/model/request+policy/frontend).

## Рекомендация

Вернуть автору. Стартовая точка итерации 2: finding 1 (математика), 2 (end-to-end SC), 4 (Failure Modes). Исправление P0 естественно закроет часть P1 (triangulation, inverse, credentials failure, tenancy).
