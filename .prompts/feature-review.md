# Prompt: Feature Review (Draft → Design Ready)

**ENFORCEMENT:** Автор feature.md НЕ МОЖЕТ быть ревьюером. Review ОБЯЗАН выполняться отдельным агентом с чистым контекстом (Agent tool с subagent_type), НЕ тем же агентом, который писал draft. См. [`memory-bank/engineering/autonomy-boundaries.md`](../memory-bank/engineering/autonomy-boundaries.md) секция "Lifecycle Enforcement".

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
- [ ] Файлы из `Change Surface` существуют в репозитории (grounding).
- [ ] Full-stack delivery rule: если фича создает backend endpoint, то frontend touchpoints указаны в Change Surface (или явно вынесены в NS-*).

## Review criteria

Canonical source: [`memory-bank/flows/review-criteria.md`](../memory-bank/flows/review-criteria.md).

Базовый набор — **TAUS** (Testable, Ambiguous-free, Uniform, Scoped). Для критичных фич (auth, payments, compliance) или когда TAUS не ловит проблемы — расширенный набор IEEE 830 (Correct, Consistent, Necessary, Feasible, Traceable, Grounded).

## Вывод

Для каждого замечания:

1. Цитата
2. Почему это проблема
3. Конкретное предложение исправления

Если 0 замечаний — напиши "0 замечаний, feature.md готов к переводу в `status: active` (Design Ready)".

Типичные итерации и правило эскалации — в [`memory-bank/flows/review-criteria.md`](../memory-bank/flows/review-criteria.md). Если замечания не уменьшаются за 3 итерации — проблема upstream, эскалируй.
