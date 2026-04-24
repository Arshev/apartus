---
title: "ADR-016: DB CHECK constraint enforces ExchangeRate source/tenancy invariant"
doc_kind: adr
doc_function: canonical
purpose: "Зафиксировать решение использовать PostgreSQL CHECK constraint (не application-level thread-local) для enforcement инварианта `source=api ⇔ organization_id IS NULL` у ExchangeRate."
derived_from:
  - ../features/FT-037-multi-currency-conversion/feature.md
  - ADR-004-integer-cents-for-money.md
  - ADR-012-class-level-authorize-nested-controllers.md
status: active
decision_status: accepted
audience: humans_and_agents
---

# ADR-016: DB CHECK constraint enforces ExchangeRate source/tenancy invariant

## Context

FT-037 вводит таблицу `exchange_rates`, которая одновременно хранит:

- **Global API rates** (`source = 'api'`, `organization_id IS NULL`) — заполняются только `FetchExchangeRatesJob` ежедневно из currencyapi.com.
- **Per-org manual overrides** (`source = 'manual'`, `organization_id IS NOT NULL`) — создаются админами организаций через `/api/v1/exchange_rates`.

Инвариант domain-модели: `source='api' ⇔ organization_id IS NULL`. Смешение (manual row без org или api row с org) бьёт tenancy model и multi-tenant scope (`CON-03` в feature.md).

Нужен механизм, который гарантирует инвариант независимо от пути записи (ActiveRecord save, `insert_all`, raw SQL в миграциях, console).

## Decision

Использовать **PostgreSQL CHECK constraint**:

```sql
ALTER TABLE exchange_rates
ADD CONSTRAINT exchange_rates_source_tenancy_invariant
CHECK (
  (source = 'api' AND organization_id IS NULL)
  OR
  (source = 'manual' AND organization_id IS NOT NULL)
);
```

ActiveRecord-уровень дополняет (не заменяет) через `validates :source, inclusion: ...` и Pundit policy (мутация global rows denied для обычных пользователей). Job пишет через `upsert_all` напрямую — минует policy/validation, но constraint срабатывает на DB-уровне.

## Alternatives considered

### A. Application-level enforcement через `Current.api_context` thread-local

Шаблон: `Current.api_context = :job` в job перед `insert_all`, `after_save` validation в model проверяет флаг.

**Rejected** по двум причинам:

1. **Thread-pool leakage.** Solid Queue держит worker threads в pool. Если job raises между `Current.api_context = :job` и cleanup (даже в `around_perform` — raise в самом perform до begin/ensure блока возможен), thread-local остаётся set. Следующая job в том же thread получает false-positive bypass.
2. **`ActiveSupport::CurrentAttributes` auto-reset поведение.** Между Rack requests — да, auto-reset есть. Между Solid Queue jobs — нет (Solid Queue не имеет встроенного CurrentAttributes reset hook; нужен ручной `before_perform { Current.reset }`, легко забыть в следующих jobs в проекте).

Оба риска — "forgotten cleanup" класса багов. Audit невозможен code-review'ом.

### B. Audit-only (без constraint, без validation, только Pundit)

Pundit отсекает мутации global rows через публичный API. Миграции, console, raw SQL — обходят, но «out of scope» для threat model.

**Rejected.** Для infra-слоя (ExchangeRate — канонический источник для отчётов в валюте) fail-closed принцип предпочтительнее. Нарушенный инвариант тихо попадает в converter, искажает финансовые отчёты. Cost исправления высокий (audit, ручная правка rows).

### C. Model-level validation (без DB constraint)

`validates :organization_id, presence: true, if: :manual?`.

**Rejected в пользу defense-in-depth.** `insert_all` / `update_all` / raw SQL обходят AR validations. FT-037 явно использует `upsert_all` для идемпотентности daily job'а — model validation не сработает.

## Consequences

### Positive

- **Independence от application state.** CHECK срабатывает при любом INSERT/UPDATE, включая миграции и raw SQL.
- **Declarative.** Инвариант читается прямо в schema, не скрыт в model callbacks.
- **Defense-in-depth.** Combination: Pundit (policy) + AR validations (422 errors user-friendly) + DB constraint (last-resort fail-closed).
- **Не требует cleanup hooks** — в отличие от thread-local.

### Negative

- **PostgreSQL-specific.** Проект уже на Postgres (не SQLite dev/test per schema.md). Не блокер.
- **Violation = `PG::CheckViolation`** — нужен `rescue_from` в контроллере (возвращает 422 с message); feature.md `FM-11` покрывает.
- **Тестирование CHECK требует non-transactional fixtures** в конкретных specs — violation происходит на INSERT до commit; transactional rollback маскирует. FT-037 implementation-plan ER-02 и STEP-03 check command это учитывают.

### Neutral

- Constraint можно ослабить в будущем (например, для теста sandbox-сценариев) через `ALTER TABLE ... DROP CONSTRAINT`, но это явное намерение, а не случайное.

## Scope

Применимость: **только `ExchangeRate`** (пока). Pattern может расшириться на другие «global or per-org» resources (если появятся), но это не часть ADR-016 — добавим отдельный ADR, если понадобится precedent.

## References

- [FT-037 feature.md — CON-06, DEC-04, NEG-11](../features/FT-037-multi-currency-conversion/feature.md)
- [ADR-004-integer-cents-for-money.md](ADR-004-integer-cents-for-money.md) — integer-only invariant, принцип fail-closed для финансовых данных
- [ADR-012-class-level-authorize-nested-controllers.md](ADR-012-class-level-authorize-nested-controllers.md) — Pundit pattern, который ADR-016 дополняет
