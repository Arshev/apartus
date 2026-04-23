Покажи все фичи, не завершённые и не отменённые — обзор всей in-flight работы через вкладки.

1. Перечисли каталоги `memory-bank/features/FT-*/` (через `ls` или glob).
2. Для каждой прочитай `state.yml`, отфильтруй те где `phase` = `done` или `cancelled`.
3. Для каждой оставшейся возьми `title` из первой строки тела `feature.md` (заголовок `# FT-XXX: ...`).
4. Выведи таблицу в формате:

```
FT-ID       Phase          Step       Branch                          Updated      Next action
FT-036      draft          —          feature/ft-036-stack-migration  2026-04-22   Заполнить What/Problem/Scope
FT-007      plan_ready     —          feature/ft-007-...              2026-04-20   Review плана
```

Если никаких активных фич нет — напиши «Нет фич в работе. Все FT-* в phase=done или cancelled.»

Ничего не меняй в файлах.
