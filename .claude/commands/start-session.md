Полный priming новой сессии (fallback, если SessionStart hook не сработал или нужен дополнительный контекст).

Прочитай следующие файлы в указанном порядке и подтверди, что контекст загружен:

1. `memory-bank/README.md` — корневой индекс документации
2. `memory-bank/domain/problem.md` — продукт, пользователи, workflows, MVP scope, roadmap
3. `memory-bank/domain/architecture.md` — стек, bounded contexts, API конвенции
4. `memory-bank/domain/schema.md` — текущие модели и связи
5. `memory-bank/engineering/autonomy-boundaries.md` — границы автономии + lifecycle enforcement
6. `memory-bank/engineering/testing-policy.md` — testing policy, coverage ratchet
7. `memory-bank/engineering/coding-style.md` — coding conventions, reference implementations
8. `memory-bank/features/README.md` — текущие feature packages и их статусы
9. `memory-bank/flows/feature-flow.md` — lifecycle, gates, стабильные ID
10. `memory-bank/flows/state-schema.md` — schema state.yml + active-feature resolver

После прочтения выведи краткое подтверждение в формате:

**Session initialized.** Loaded: problem, architecture, schema, autonomy, testing, coding-style, features, feature-flow, state-schema.

Затем проверь:

- `git status && git branch --show-current`
- резолвер: `bash /Users/artshevko/dev/apartus/.claude/hooks/resolve-active-feature.sh`
- если есть активная фича — `/phase-status`

Если какой-то файл не найден — сообщи.
