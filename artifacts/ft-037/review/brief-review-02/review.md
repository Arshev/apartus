# FT-037 Brief Review #2 — 2026-04-24

**Reviewer:** general-purpose subagent (автор ≠ ревьюер)
**Gate:** Draft → Design Ready
**Iteration:** 2
**Result:** **5 замечаний (3 P0, 1 P1, 1 P2).** Все 15 замечаний review #1 закрыты. Новые — grounding/consistency.

## P0

1. **Broken ADR filenames** — `ADR-004-money-as-cents.md` / `ADR-012-authorization.md` не существуют. Реальные: `ADR-004-integer-cents-for-money.md`, `ADR-012-class-level-authorize-nested-controllers.md`. 4 точки (frontmatter ×2 + ADR Dependencies ×2).
2. **REQ-05 permission model неверна** — нет preset `owner`; `role_enum: :owner` bypass'ит через `Membership#can?`. Preset roles: `admin` (ALL), `manager` (subset), `viewer` (*.view).
3. **403 vs 404 противоречие** — нужно разнести read scope (`global ∪ own-org`) и mutate scope (`own-org manual only`): чужая org → 404, NULL API row → 403.

## P1

4. **CON-06 `Current.api_context` thread-local fragile** — Solid Queue workers в pool, raise может оставить set-ный флаг для следующей job. Альтернатива: DB CHECK constraint + policy guard (DEC-04), без thread-local.

## P2

5. **MET-01 formulation двусмысленна** — "100% direct USD↔X" не ясно про runtime inverse.

## Также отмечено (не блокер)

- FM-02 (401) и FM-03 (partial) без NEG-*/SC-* — добавить в след. итерации.

## Верификация math

- SC-01 (USD→RUB same-decimals): `10_000 × 1e12 / 1e10 = 1_000_000` ✓
- SC-02 (USD→UZS cross-decimals): `num=1.27e18, den=1e12, result=1_270_000` ✓
- Round-trip UZS→USD: `10_000` ровно ✓
- SC-03 (triangulation RUB→EUR): ≈ 97 minor EUR, укладывается в "96 ± 1" ✓

Все ревью-замечания применимые и обоснованные.

## Iteration 2 response (автор)

Исправлены все 5 замечаний в одном проходе:
- ADR filenames renamed (4 точки).
- REQ-05 переписан: permission включается в `admin` preset, `owner` bypass через `Membership#can?`.
- CON-03 разделён на read/mutate scope с явными 403/404 кейсами.
- CON-06 переработан через DEC-04 — DB CHECK constraint, без thread-local.
- MET-01 переформулирован: 10 хранимых rows + runtime inverse/triangulation.
- Дополнительно: NEG-09 (FM-02 401), NEG-10 (FM-03 partial), NEG-11 (DEC-04 DB guard), Change Surface +ADR-NNN, +preset_roles seed.
