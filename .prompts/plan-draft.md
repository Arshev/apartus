# Prompt: Implementation Plan Draft

Создай `implementation-plan.md` для существующей `feature.md` со `status: active`.

## Grounding (обязательно)

1. Прочитай sibling `feature.md` — это canonical owner scope/architecture/acceptance. План не переопределяет эти факты.
2. Прочитай [`memory-bank/flows/feature-flow.md`](../memory-bank/flows/feature-flow.md) секцию Plan.
3. Прочитай [`memory-bank/flows/templates/feature/implementation-plan.md`](../memory-bank/flows/templates/feature/implementation-plan.md) как шаблон.
4. **Discovery** — пройдись по текущему репо:
   - какие релевантные файлы/модули уже существуют
   - какие локальные паттерны использовать (reference implementations из `engineering/coding-style.md`)
   - какие тестовые surfaces нужно затронуть
   - какие env/setup assumptions
5. Зафиксируй unresolved questions как `OQ-*`.

## Структура плана

- `Current State / Reference Points` — таблица существующих файлов с reuse-правилами
- `Test Strategy` — planned automated coverage, required suites
- `Open Questions / Ambiguities` — `OQ-*`
- `Environment Contract` — setup/test commands/access
- `Preconditions` — `PRE-*` с canonical refs
- `Workstreams` — `WS-*` если фича большая
- `Approval Gates` — `AG-*` для рискованных действий
- `Порядок работ` — атомарные `STEP-*` с touchpoints, artifacts, Verifies, Evidence IDs
- `Parallelizable Work`
- `Checkpoints` — `CP-*`
- `Execution Risks` — `ER-*`
- `Stop Conditions` — `STOP-*`
- `Готово для приемки`

## Минимум

≥1 `PRE-*`, ≥1 `STEP-*`, ≥1 `CHK-*` (ссылка на feature.md CHK), ≥1 `EVID-*`, discovery context обязательно заполнен.

## Frontmatter

```yaml
title: "FT-XXX: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "..."
derived_from:
  - feature.md
status: draft
```

План создаётся в `status: draft`; переводится в `active` после review pass.

## Выход

Путь к созданному `implementation-plan.md` + сводка: сколько STEP-*, какие OQ остались, какие AG есть.
