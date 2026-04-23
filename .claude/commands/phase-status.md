Покажи текущий статус активной фичи в этой вкладке.

Аргумент (опционально): `FT-XXX` — если нужно посмотреть статус не активной, а конкретной фичи. Для HW-архивных: `FT-HW1-01`, `FT-HW2-FE5`.

1. Если аргумент задан — используй его как `<FT-XXX>`.
2. Иначе запусти резолвер: `bash /Users/artshevko/dev/apartus/.claude/hooks/resolve-active-feature.sh`. Результат — id активной фичи для этой вкладки (определяется по git-ветке или `CLAUDE_ACTIVE_FEATURE`).
3. Если резолвер вернул пусто — ответь: «Активная фича не определена для этой вкладки. Переключись на ветку `feature/ft-NNN-...` или передай `FT-XXX` аргументом. Для HW-архивных задай `CLAUDE_ACTIVE_FEATURE=FT-HW2-FE5`. Для списка всех в работе — `/phase-list`.»
4. Найди каталог фичи: `memory-bank/features/<FT-XXX>-*/` (apartus использует `FT-NNN-slug`, так что glob нужен).
5. Прочитай `<dir>/state.yml`.
6. Выведи в формате:

```
Фича:        <FT-XXX> — <title из feature.md>
Phase:       <phase>
Current step: <current_step или —>
Next action: <next_action>
Blockers:    <список или «нет»>
Branch:      <branch или —>
Updated:     <last_updated>
Note:        <last_session_note или —>
```

7. Если `phase == execution` и `current_step` задан — прочитай соответствующий STEP в `implementation-plan.md` и приведи одной строкой его Goal.
8. Ничего не меняй в файлах.
