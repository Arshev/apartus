---
title: "Priming Prompt: Feature Draft"
doc_kind: governance
purpose: Создание нового feature package (feature.md draft) с корректным frontmatter, секциями What/How/Verify и минимальным набором stable IDs.
derived_from:
  - ../../dna/governance.md
  - ../feature-flow.md
status: active
audience: humans_and_agents
---

# Prompt: Feature Draft

Ты создаёшь новый feature package в `memory-bank/features/FT-<id>-<slug>/`.

## Grounding (обязательно до записи файлов)

1. Прочитай [`memory-bank/dna/principles.md`](../../dna/principles.md) и [`memory-bank/flows/feature-flow.md`](../feature-flow.md) — lifecycle, gates, stable identifiers.
2. Прочитай [`memory-bank/domain/problem.md`](../../domain/problem.md) и [`memory-bank/domain/architecture.md`](../../domain/architecture.md) — продуктовый и технический контекст.
3. Прочитай [`memory-bank/engineering/coding-style.md`](../../engineering/coding-style.md) и [`memory-bank/engineering/testing-policy.md`](../../engineering/testing-policy.md).
4. Посмотри похожие существующие фичи в `memory-bank/features/` как эталон структуры.

## Задача

1. Выбери template: `short` или `large` (см. [`memory-bank/flows/templates/feature/`](../templates/feature/)). `short` допустим только если все правила выполняются — при сомнении бери `large`.
2. Создай директорию `memory-bank/features/FT-<id>-<slug>/` и файлы:
   - `README.md` — routing index
   - `feature.md` — canonical intent + design + verify
3. `feature.md` frontmatter: `doc_kind: feature`, `doc_function: canonical`, `status: draft`, `delivery_status: planned`, `derived_from` на upstream (минимум `domain/problem.md`).
4. Body: секции `What` (Problem, Scope, Non-Scope, Constraints), `How` (Solution, Change Surface, Flow, Contracts, ADR deps если есть), `Verify` (Exit Criteria, Acceptance Scenarios, Checks, Evidence).
5. Обязательно минимум: ≥1 `REQ-*`, ≥1 `NS-*`, ≥1 `SC-*`, ≥1 `CHK-*`, ≥1 `EVID-*`. Traceability matrix связывает REQ → SC → CHK → EVID.

## Вход

<от пользователя: описание желаемой фичи, issue, контекст>

## Выход

- Путь к созданному каталогу
- Краткая сводка: какой template выбран и почему, ключевые REQ/SC/CHK
- Явно скажи: `status: draft` — для перехода в `active` нужен review pass (запусти prompt `feature-review.md`)
