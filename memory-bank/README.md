---
title: Apartus Memory Bank Index
doc_kind: project
doc_function: index
purpose: Корневой индекс durable knowledge layer проекта Apartus. Точка входа для людей и агентов.
derived_from:
  - dna/principles.md
status: active
audience: humans_and_agents
---

# Apartus Memory Bank

Durable knowledge layer проекта Apartus (PMS). Источник истины для intent, rationale и contracts. Код владеет реализацией.

**Быстрый вход:** [`QUICKSTART.md`](QUICKSTART.md) — one-pager с полным flow и ключевыми правилами.

## Аннотированный индекс

- [`dna/README.md`](dna/README.md) — governance-ядро: SSoT, frontmatter, lifecycle. Читать, чтобы понять правила документации.
- [`domain/README.md`](domain/README.md) — продуктовый контекст, архитектура, schema, frontend. Читать для понимания "что и как устроено".
- [`flows/README.md`](flows/README.md) — lifecycle feature-документов и templates. Читать при создании feature package или ADR.
- [`engineering/README.md`](engineering/README.md) — testing policy, coding style, git workflow, autonomy boundaries. Читать при работе с кодом.
- [`ops/README.md`](ops/README.md) — локальная разработка, команды, config, stages. Читать для setup.
- [`prd/README.md`](prd/README.md) — instantiated Product Requirements Documents. Сейчас пусто (apartus-level context живёт в `domain/problem.md`).
- [`use-cases/README.md`](use-cases/README.md) — канонические пользовательские сценарии. Заводятся по факту появления переиспользуемого flow.
- [`features/README.md`](features/README.md) — instantiated feature packages (HW-1 archived + HW-2 planned).
- [`adr/README.md`](adr/README.md) — Architecture Decision Records (ADR-001..015).
- [`glossary.md`](glossary.md) — терминология memory-bank (SSoT, canonical owner, delivery status и т.д.).
- [`dependency-tree.md`](dependency-tree.md) — DAG зависимостей между governed-документами.

## Reading order для новой сессии

1. [`dna/principles.md`](dna/principles.md) — принципы документации
2. [`domain/problem.md`](domain/problem.md) — что за продукт
3. [`domain/architecture.md`](domain/architecture.md) — bounded contexts, стек
4. [`domain/schema.md`](domain/schema.md) — текущие модели
5. [`engineering/testing-policy.md`](engineering/testing-policy.md) — как тестируем
6. [`flows/feature-flow.md`](flows/feature-flow.md) — как ведём фичи
