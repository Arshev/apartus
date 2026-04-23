---
title: "Priming Prompt: Implement"
doc_kind: governance
purpose: Выполнение implementation-plan.md STEP за STEP с evidence, agent-first code review, simplify review, upstream sync.
derived_from:
  - ../../dna/governance.md
  - ../feature-flow.md
  - ../../engineering/autonomy-boundaries.md
  - ../../engineering/git-workflow.md
status: active
audience: humans_and_agents
---

# Prompt: Implement (Execution → Done)

Выполняй `implementation-plan.md` STEP за STEP.

## Перед стартом

1. Прочитай sibling `feature.md` — canonical owner scope/verify.
2. Прочитай `implementation-plan.md` целиком.
3. Убедись что `feature.md` → `status: active`, `delivery_status: in_progress`, `implementation-plan.md` → `status: active`.
4. Прочитай [`memory-bank/engineering/coding-style.md`](../../engineering/coding-style.md), [`memory-bank/engineering/testing-policy.md`](../../engineering/testing-policy.md), [`memory-bank/engineering/autonomy-boundaries.md`](../../engineering/autonomy-boundaries.md), [`memory-bank/engineering/git-workflow.md`](../../engineering/git-workflow.md) (branching, commit conventions).

## Цикл исполнения

Для каждого `STEP-*` по порядку:

1. Проверь `Blocked by` — если PRE или OQ не resolved, остановись и эскалируй.
2. Проверь `Needs approval` — если `AG-*` указан, покажи diff/план пользователю **до** выполнения.
3. Выполни touchpoints (изменения в файлах).
4. Запусти Check command → результат пишем в evidence path.
5. Если check fail — диагностируй, не игнорируй. Если не получается за 2-3 попытки — остановись, это может быть upstream problem.
6. Mark STEP completed, двигайся к следующему.

## После всех STEP

1. Запусти все `CHK-*` из feature.md — все pass/fail результаты в evidence.
2. **Agent-first code review** — запусти `memory-bank/flows/prompts/code-review.md` как отдельный проход. Проверь соответствие спеке, безопасность, тесты, архитектуру. Итерируй до 0 замечаний.
3. **Simplify review** — отдельный проход. Правила: [`memory-bank/engineering/testing-policy.md`](../../engineering/testing-policy.md) секция "Simplify Review".
4. **Acceptance** — прогонись по `SC-*` end-to-end.
5. Обнови upstream по lifecycle rules ([`memory-bank/dna/lifecycle.md`](../../dna/lifecycle.md)):
   - Если код изменил schema → обнови `memory-bank/domain/schema.md`.
   - Если решение нетривиальное → новый ADR.
   - Обнови `feature.md` → `delivery_status: done`, `implementation-plan.md` → `status: archived`.
6. Fine-grained коммиты по ходу (не batch в конце).

## Выход

- Сводка: сколько STEP выполнено, все ли CHK прошли, simplify review результаты
- Список upstream-документов, которые были затронуты
- Готово ли к `delivery_status: done`
