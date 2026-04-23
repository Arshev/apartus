Закрыть фичу: убрать worktree + ветку после мерджа PR.

**Аргумент (обязательный):** `FT-NNN`
Пример: `/feature-archive FT-004`

**Безопасный workflow — много проверок перед удалением.**

**Шаги:**

1. **Определи worktree фичи.**
   - `git worktree list --porcelain` → найди worktree с веткой `feature/ft-NNN-*`.
   - Если worktree не найден, возможно фича уже закрыта или никогда не имела worktree — продолжай только с closure state/feature docs.

2. **Safety checks.**
   - **Uncommitted changes?** `git -C <worktree> status --porcelain` → если non-empty, остановись: «В worktree есть несохранённые изменения. Закоммить/stash и повтори. Diff ниже: ...»
   - **Branch pushed?** `git -C <worktree> rev-list --count origin/feature/ft-NNN-..feature/ft-NNN-...` → если local впереди remote — warn и спроси подтверждение.
   - **PR status?** `gh pr view feature/ft-NNN-<slug> --json state,mergedAt 2>/dev/null`:
     - merged → продолжай автоматически
     - open → stop: «PR ещё открыт, мерджить и повторить»
     - closed (не merged) → warn: «PR был закрыт без мерджа. Точно архивировать? Напомни подтвердить»
     - no PR found → warn: «PR не найден. Убедись вручную что работа сохранена или PR не нужен»

3. **Cleanup (только если все safety checks pass или подтверждено).**
   - `git worktree remove <worktree-path>` — удалит директорию worktree.
   - `git branch -d feature/ft-NNN-<slug>` — локальная ветка. Если git отказывается (ветка не замерджена в main) — warn и используй `-D` только с подтверждением.
   - `git push origin --delete feature/ft-NNN-<slug>` — удалить remote-ветку (опционально, спроси).

4. **Update docs.**
   - `memory-bank/features/<FT-NNN>-<slug>/state.yml` → `phase: done`, `current_step: null`, `next_action: "Архивировано <дата>"`, `last_updated: <сегодня>`, `branch: null`.
   - `memory-bank/features/<FT-NNN>-<slug>/feature.md` frontmatter → `delivery_status: done` (если ещё не так).
   - `memory-bank/features/<FT-NNN>-<slug>/implementation-plan.md` frontmatter (если есть) → `status: archived`.
   - `memory-bank/features/README.md` → обнови строку фичи на `(done)`.

5. **Отчёт.**

```text
✓ Фича FT-NNN архивирована.

Удалено:
  worktree: <path>
  ветка (local): feature/ft-NNN-<slug>
  ветка (remote): feature/ft-NNN-<slug>  # или "оставлена"

Обновлены:
  state.yml → phase:done
  feature.md → delivery_status:done
  implementation-plan.md → status:archived
  features/README.md
```

**Если любая проверка fail** — ничего не удаляй, выведи diagnostic и инструкции для ручного восстановления.
