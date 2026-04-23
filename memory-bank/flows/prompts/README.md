---
title: Priming Prompts Index
doc_kind: governance
doc_function: index
purpose: Операционные промпты для типовых flow. Самодостаточные тексты, копируются в новую сессию как отправной input.
derived_from:
  - ../../dna/governance.md
  - ../feature-flow.md
status: active
audience: humans_and_agents
---

# Priming Prompts

Промпты для типовых flow. Каждый промпт самодостаточен — копируешь в новую сессию как отправной input. До появления slash-команд (`/feature-start`, `/phase-advance` — запланированы, см. [`../state-schema.md`](../state-schema.md)) это основной способ запуска lifecycle-шагов.

| Промпт | Когда использовать |
|---|---|
| [session-start.md](session-start.md) | Праймеринг агента в начале новой сессии |
| [feature-draft.md](feature-draft.md) | Создать новый feature package (feature.md draft) |
| [feature-review.md](feature-review.md) | Ревью feature.md по Draft→Design Ready gate |
| [plan-draft.md](plan-draft.md) | Создать implementation-plan.md с discovery context |
| [plan-review.md](plan-review.md) | Ревью implementation-plan.md по Design Ready→Plan Ready gate |
| [implement.md](implement.md) | Выполнение плана STEP за STEP с evidence |
| [adr-draft.md](adr-draft.md) | Завести новый ADR |
| [docs-sync.md](docs-sync.md) | Upstream-first sync после изменения кода |
| [code-review.md](code-review.md) | Agent-first code review после реализации, перед PR |
| [bug-fix.md](bug-fix.md) | Bug-fix цикл с regression test |

Все промпты опираются на taxonomy из [`../feature-flow.md`](../feature-flow.md) (REQ-*, NS-*, SC-*, CHK-*, EVID-*, PRE-*, STEP-*, OQ-*, AG-*).

## Lifecycle enforcement

Review-промпты (`feature-review.md`, `plan-review.md`, `code-review.md`) обязаны запускаться отдельным агентом с чистым контекстом — автор артефакта ≠ ревьюер. См. [`../../engineering/autonomy-boundaries.md`](../../engineering/autonomy-boundaries.md) секция "Lifecycle Enforcement".
