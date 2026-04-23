Проверь gate-предикаты для перехода фичи на следующую стадию и, если все выполнены, обнови state.yml.

Аргумент (опционально): `FT-XXX` — для override активной фичи.

1. Определи фичу: аргумент → резолвер (`bash /Users/artshevko/dev/apartus/.claude/hooks/resolve-active-feature.sh`). Если резолвер вернул пусто и аргумент не задан — остановись с сообщением «Активная фича не определена. Переключись на feature-ветку или передай FT-XXX».
2. Найди каталог `memory-bank/features/<FT-XXX>-*/` и прочитай `state.yml` → текущая `phase`.
3. Определи целевую стадию:
   - `bootstrap` → `draft`
   - `draft` → `design_ready`
   - `design_ready` → `plan_ready`
   - `plan_ready` → `execution`
   - `execution` → `done`
4. Прочитай `memory-bank/flows/feature-flow.md` раздел «Transition Gates» и возьми чеклист предикатов для перехода `<current> → <target>`.
5. Проверь каждый предикат против `feature.md`, `implementation-plan.md` и файловой системы. Для каждого пункта укажи pass/fail с обоснованием.
6. **Lifecycle enforcement (apartus):** для переходов `draft → design_ready`, `design_ready → plan_ready`, `execution → done` — убедись, что review был запущен отдельным агентом с чистым контекстом (автор ≠ ревьюер, см. `memory-bank/engineering/autonomy-boundaries.md`). Нет — stop: «Review gate не пройден. Запусти prompt из `memory-bank/flows/prompts/` отдельным агентом».
7. Если все предикаты pass:
   - обнови `state.yml`: `phase`, `current_step` (для execution — первый нерешённый STEP; иначе null), `next_action` (конкретное следующее действие), `last_updated` на текущую дату.
   - если переход в `done` — также выставь `feature.md` → `delivery_status: done` и `implementation-plan.md` → `status: archived`.
   - если переход в `execution` — выставь `feature.md` → `delivery_status: in_progress`.
   - покажи diff всех изменений.
8. Если хотя бы один предикат fail:
   - НЕ обновляй state.yml.
   - выведи список непройденных предикатов и действия для повторной попытки.

Не пропускай проверки и не додумывай — только факты из документов.
