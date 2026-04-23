Начать работу над новой фичей — bootstrap feature package + git worktree.

**Аргументы:** `FT-NNN "короткий заголовок"` (оба обязательны).
Пример: `/feature-start FT-036 "stack migration"`

**Обязательное условие:** команда должна запускаться из main-worktree (`/Users/artshevko/dev/apartus/`), не из другого worktree.

**Шаги:**

1. **Проверка окружения.**
   - Убедись, что текущий `pwd` = `/Users/artshevko/dev/apartus`. Если нет — остановись с сообщением «Запусти из main-checkout».
   - Убедись, что текущая ветка = `main` (иначе есть риск создать worktree от лишнего commit). `git branch --show-current` должно вернуть `main`.
   - `git fetch origin main` — синхронизируй с remote.
   - `git status --porcelain` — рабочее дерево должно быть чистым (пустой output). Если non-empty:
     - untracked только в `.claude/skills/`, `frontend/test-results/`, `artifacts/` — продолжай, не блокировать.
     - любые `M`/`A`/`D` tracked файлы или чужие untracked — stop с diff и текстом «закоммить / stash перед созданием worktree».

2. **Валидация аргументов.**
   - Распарси FT-NNN. Нормализуй: `FT-7` → `FT-007` (zero-pad до 3 цифр). HW-префиксы (`FT-HW1-*`, `FT-HW2-FE*`) — только для архивных пакетов, новая фича должна быть `FT-NNN`.
   - Проверь, что `memory-bank/features/<FT-NNN>-*` ещё НЕ существует. Если существует — остановись: «Фича уже создана. Используй `git worktree add` вручную если нужен новый worktree».
   - Slugify title: lowercase, русские/спец-символы → транслит/дефис, пробелы → дефисы. Пример: `"Stack Migration"` → `stack-migration`.

3. **Bootstrap feature package.**
   - `mkdir -p memory-bank/features/<FT-NNN>-<slug>/`
   - Создай `README.md` из `memory-bank/flows/templates/feature/README.md` (embedded body).
   - Создай `feature.md` из `memory-bank/flows/templates/feature/short.md` (embedded body), заменив `FT-XXX` на `FT-NNN` и `Feature Name` на переданный title.
   - Создай `state.yml` со значениями:
     ```yaml
     feature: FT-NNN
     phase: draft
     current_step: null
     next_action: "Заполнить What/Problem/Scope в feature.md и пройти Brief ревью"
     blockers: []
     branch: feature/ft-NNN-<slug>
     last_updated: <сегодня YYYY-MM-DD>
     last_session_note: "Bootstrap через /feature-start"
     ```
   - Обнови `memory-bank/features/README.md`: добавь строку в Instantiated Features с `(draft)`.

4. **Создание ветки и worktree.**
   - Ветка: `feature/ft-NNN-<slug>` (lowercase, всё с дефисами). Конвенция — `memory-bank/engineering/git-workflow.md`.
   - Worktree path: `~/dev/apartus-worktrees/<FT-NNN>/`. Создай родительскую директорию если её нет: `mkdir -p ~/dev/apartus-worktrees`.
   - `git worktree add ~/dev/apartus-worktrees/<FT-NNN> -b feature/ft-NNN-<slug>` — создаст ветку от текущего HEAD (main) и checkout в worktree.

5. **Init worktree.**
   - Apartus использует `init.sh` в корне репо для активации mise/direnv. В новом worktree: `cd ~/dev/apartus-worktrees/<FT-NNN> && bash init.sh`.
   - **Skill-collaboration:** если в сессии активен superpowers-skill `github-workflow:worktree-init-script`, он автоматически обнаружит `init.sh` и запустит его после `git worktree add` — не дублируй вызов, просто убедись, что skill сработал.
   - При наличии symlinkable runtime-файлов (master.key, credentials, .env*, frontend/.env*) — настраивай симлинки вручную от main-checkout до появления `bin/worktree-init` (gap).
   - Выведи пользователю, что нужно сделать.

6. **Отчёт.**

```
✓ Фича FT-NNN создана.

Файлы:
  memory-bank/features/FT-NNN-<slug>/README.md
  memory-bank/features/FT-NNN-<slug>/feature.md (draft)
  memory-bank/features/FT-NNN-<slug>/state.yml

Worktree:
  ~/dev/apartus-worktrees/FT-NNN/
  ветка: feature/ft-NNN-<slug>

Следующие шаги:
  1. Открой новую вкладку Claude: cd ~/dev/apartus-worktrees/FT-NNN && claude
  2. В новой сессии SessionStart hook автоматически подтянет state FT-NNN.
  3. Начни с Brief — заполни What / Problem / Scope в feature.md.
  4. После Brief-ревью (отдельным агентом!) → /phase-advance
```

**Если что-то упало посередине** — покажи что успело, что нет, и как откатить (`git worktree remove`, `rm -rf memory-bank/features/FT-NNN-<slug>`).
