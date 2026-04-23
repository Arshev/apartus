Inventory всех worktree проекта с feature-статусами.

**Без аргументов.**

**Шаги:**

1. `git worktree list --porcelain` → массив worktree с путями и ветками.
2. Для каждого worktree:
   - Извлеки `FT-NNN` из имени ветки через regex `[Ff][Tt][-_/]?[0-9]+` (нормализуй в `FT-NNN`).
   - Если FT-NNN есть — найди каталог `memory-bank/features/FT-NNN-*/` и прочитай его `state.yml` (из main-checkout!) для `phase`, `last_updated`, `next_action`.
   - Если FT-NNN нет — помечай ветку как «non-feature».
   - `gh pr view <branch> --json state,mergedAt,updatedAt 2>/dev/null` — статус PR.
   - `git -C <worktree> log -1 --format="%ar"` — когда последний коммит.
3. Определи флаги:
   - `stale-merged` — PR merged, но worktree существует → кандидат на `/feature-archive`.
   - `stale-idle` — нет коммитов > 7 дней.
   - `no-pr` — есть worktree и коммиты, но PR не создан.

4. Выведи таблицу:

```
FT-ID    Phase          Worktree path                                Branch                          PR       Last commit    Flags
FT-004   execution      /Users/artshevko/dev/apartus-worktrees/FT-004 feature/ft-004-...             merged   3 days ago     stale-merged
FT-007   plan_ready     /Users/artshevko/dev/apartus-worktrees/FT-007 feature/ft-007-entity-tagging-ui open   2 hours ago    —
—        —              /Users/artshevko/dev/apartus                  main                            —        1 hour ago     main
```

5. Отдельной секцией — предложения:
   - Для каждой `stale-merged` → «запусти `/feature-archive FT-NNN`»
   - Для каждой `stale-idle` без PR → «ветка забыта, либо создай PR либо `git worktree remove`»

6. Итог: «N worktree, M активны (phase != done/cancelled), K кандидатов на cleanup».

Ничего не удаляй, только инвентаризация.
