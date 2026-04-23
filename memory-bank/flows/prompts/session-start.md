---
title: "Priming Prompt: Session Start"
doc_kind: governance
doc_function: prompt
purpose: Праймеринг агента в начале новой сессии. Читает routing table + ключевые memory-bank документы, фиксирует контекст.
derived_from:
  - ../../dna/governance.md
  - ../../dna/lifecycle.md
status: active
audience: humans_and_agents
---

# Session Start — Priming Prompt

Запускается в начале каждой новой сессии для полного праймеринга агента.

## Grounding

Прочитай в этом порядке:

1. `CLAUDE.md` — routing table и критичные правила
2. `AGENTS.md` — структура проекта, команды, naming
3. `memory-bank/dna/principles.md` — SSoT, atomicity, progressive disclosure
4. `memory-bank/domain/problem.md` — продукт, users, workflows, MVP scope
5. `memory-bank/domain/architecture.md` — стек, bounded contexts, API конвенции
6. `memory-bank/domain/schema.md` — текущие модели и связи
7. `memory-bank/engineering/testing-policy.md` — coverage ratchet, test conventions
8. `memory-bank/engineering/autonomy-boundaries.md` — что делать автономно, где эскалировать
9. `memory-bank/engineering/coding-style.md` — coding conventions, reference implementations
10. `memory-bank/features/README.md` — текущие feature packages и их статусы

## Task

После прочтения:

1. **Зафиксируй контекст** — кратко подтверди: какой проект, какая фаза, какая ветка, какие ключевые constraints.
2. **Проверь текущее состояние** — `git status`, `git log --oneline -5`, посмотри есть ли uncommitted work.
3. **Определи scope** — спроси пользователя о задаче текущей сессии, если она не очевидна из контекста.

Staleness check high-churn docs выполняется при feature closure (docs-sync проход), не при session-start. См. [`memory-bank/dna/lifecycle.md`](../../dna/lifecycle.md) секция "Staleness Detection".

## Output

Краткое подтверждение готовности: что прочитано, какой контекст, готов к работе. Не пересказывай всё содержимое — подтверди ключевые факты.
