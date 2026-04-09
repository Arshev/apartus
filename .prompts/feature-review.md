# Prompt: Feature Review (Draft → Design Ready)

Ты ревьюишь `feature.md` по gate "Draft → Design Ready" из [`memory-bank/flows/feature-flow.md`](../memory-bank/flows/feature-flow.md).

## Checklist

- [ ] Frontmatter валиден: `status`, `doc_kind: feature`, `doc_function: canonical`, `derived_from` непустой (минимум `domain/problem.md`), `delivery_status: planned`.
- [ ] Секция `What` содержит ≥1 `REQ-*` и ≥1 `NS-*`.
- [ ] Секция `Verify` содержит ≥1 `SC-*`, ≥1 `CHK-*`, ≥1 `EVID-*`.
- [ ] Traceability matrix связывает каждый `REQ-*` с минимум одним `SC-*`.
- [ ] `SC-*` покрывает vertical slice end-to-end (от входа до наблюдаемого результата), не только unit-level.
- [ ] Если deliverable нельзя принять без negative/edge coverage — есть ≥1 `NEG-*`.
- [ ] Для large template: `Change Surface`, `Contracts`, `Failure Modes` заполнены, если применимо.
- [ ] Нет дубликатов контекста, который уже в `domain/problem.md` — feature опирается на upstream, не копирует.
- [ ] Нет двусмысленных слов ("быстро", "удобно", "при необходимости").
- [ ] Если фича зависит от ADR — ADR сослан в `How` и учитывается его `decision_status`.

## TAUS критерии (для SC/CHK)

- **Testable** — по каждому SC можно написать автотест.
- **Ambiguous-free** — формулировки однозначны.
- **Uniform** — покрыты все состояния (happy, error, empty, unauthorized, cross-org).
- **Scoped** — одна фича, не размыто.

## Вывод

Для каждого замечания:

1. Цитата
2. Почему это проблема
3. Конкретное предложение исправления

Если 0 замечаний — напиши "0 замечаний, feature.md готов к переводу в `status: active` (Design Ready)".

Типичное число итераций: 2–5. Если замечания не уменьшаются за 3 итерации — проблема upstream, эскалируй.
