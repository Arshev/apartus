---
title: Flows And Templates Index
doc_kind: governance
doc_function: index
purpose: Навигация по lifecycle flows и governed-шаблонам. Читать при создании feature package, переводе feature между стадиями или инстанцировании нового governed-документа.
derived_from:
  - ../dna/governance.md
  - feature-flow.md
  - workflows.md
  - templates/README.md
status: active
audience: humans_and_agents
---

# Flows And Templates Index

Каталог `memory-bank/flows/` содержит reusable process-layer для шаблона: lifecycle rules, taxonomy стабильных идентификаторов, governed templates и операционные промпты.

- [Task Workflows](workflows.md) — маршрутизация задач по типам, базовый цикл разработки и градиент автономии.
- [Feature Flow](feature-flow.md) — lifecycle от draft до closure, gates и стабильные ID (`REQ-*`, `CHK-*`, `STEP-*`).
- [Feature State Schema](state-schema.md) — машинно-читаемый `state.yml` в feature package: phase, current_step, blockers; правила резолва активной фичи для session/tab.
- [Review Criteria](review-criteria.md) — canonical review criteria для artifact review (TAUS + IEEE 830) и code review. Session strategy (5 уровней).
- [Templates Index](templates/README.md) — эталонные шаблоны governed-документов, включая PRD, use case, feature и ADR.
- [Priming Prompts](prompts/README.md) — операционные промпты для session-start, feature-draft/review, plan-draft/review, implement, code-review, adr-draft, docs-sync, bug-fix.
