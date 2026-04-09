# Prompt: Implement (Execution → Done)

Выполняй `implementation-plan.md` STEP за STEP.

## Перед стартом

1. Прочитай sibling `feature.md` — canonical owner scope/verify.
2. Прочитай `implementation-plan.md` целиком.
3. Убедись что `feature.md` → `status: active`, `delivery_status: in_progress`, `implementation-plan.md` → `status: active`.
4. Прочитай [`memory-bank/engineering/coding-style.md`](../memory-bank/engineering/coding-style.md), [`memory-bank/engineering/testing-policy.md`](../memory-bank/engineering/testing-policy.md), [`memory-bank/engineering/autonomy-boundaries.md`](../memory-bank/engineering/autonomy-boundaries.md).

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
2. **Simplify review** — отдельный проход: premature abstractions, dead code, duplication, over-engineering. Три похожие строки ≠ проблема. Complexity должна быть оправдана `CON-*` / `FM-*` / `DEC-*`.
3. **Acceptance** — прогонись по `SC-*` end-to-end.
4. Обнови upstream по lifecycle rules ([`memory-bank/dna/lifecycle.md`](../memory-bank/dna/lifecycle.md)):
   - Если код изменил schema → обнови `memory-bank/domain/schema.md`.
   - Если решение нетривиальное → новый ADR.
   - Обнови `feature.md` → `delivery_status: done`, `implementation-plan.md` → `status: archived`.
5. Fine-grained коммиты по ходу (не batch в конце).

## Выход

- Сводка: сколько STEP выполнено, все ли CHK прошли, simplify review результаты
- Список upstream-документов, которые были затронуты
- Готово ли к `delivery_status: done`
