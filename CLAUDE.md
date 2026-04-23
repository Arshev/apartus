# CLAUDE.md — Project Instructions

## Старт сессии

SessionStart hook (`.claude/hooks/session-start.sh`) автоматически выводит в контекст session brief (`.claude/hooks/session-brief.md`) и state активной фичи вкладки (резолв по git-ветке через `.claude/hooks/resolve-active-feature.sh`). Этого достаточно для большинства задач — читай дополнительные файлы только если того требует задача, через Routing Table ниже.

Для полного manual priming'а (если hook не сработал или нужен углублённый context) — `/start-session` или promо-промпт [`memory-bank/flows/prompts/session-start.md`](memory-bank/flows/prompts/session-start.md).

**Before working:** кратко подтверди контекст (проект, активная фича / phase / что делаем) и приступай. Schema состояния и правила резолвера: [`memory-bank/flows/state-schema.md`](memory-bank/flows/state-schema.md). HW-архивные фичи (`FT-HW1-*`, `FT-HW2-FE*`) не покрываются branch regex — задавай `CLAUDE_ACTIVE_FEATURE=FT-HW2-FE5` явно.

## Предпочтение dedicated tools над Bash

Когда существует специализированный инструмент — использовать его, **не** Bash wrapper:

| Операция | Правильный tool | Неправильно |
|---|---|---|
| Чтение файла | `Read` | `bash cat/head/tail` |
| Поиск по паттерну | `Grep` | `bash grep` |
| Поиск по glob | `Glob` | `bash find` |
| Правка файла | `Edit` / `Write` | `bash sed/awk` |
| Git, gh, shell-only | `Bash` | — |

**Почему:** dedicated tools дают структурированный output, меньше токенов, быстрее, не требуют permission prompt на чтения.

## Routing Table

Факты живут в `memory-bank/`. Этот файл — указатель, куда смотреть.

| Нужно | Читай |
|---|---|
| Продукт, users, MVP scope, roadmap | [`memory-bank/domain/problem.md`](memory-bank/domain/problem.md) |
| Стек, module boundaries, API конвенции | [`memory-bank/domain/architecture.md`](memory-bank/domain/architecture.md) |
| Текущие модели и связи | [`memory-bank/domain/schema.md`](memory-bank/domain/schema.md) |
| Frontend стек, routes, компоненты | [`memory-bank/domain/frontend.md`](memory-bank/domain/frontend.md) |
| API endpoints, params, responses | [`memory-bank/domain/api-reference.md`](memory-bank/domain/api-reference.md) |
| Статус-машины | [`memory-bank/domain/state-machines.md`](memory-bank/domain/state-machines.md) |
| Permissions, roles | [`memory-bank/domain/permissions.md`](memory-bank/domain/permissions.md) |
| Money, currencies | [`memory-bank/domain/money-and-currency.md`](memory-bank/domain/money-and-currency.md) |
| Use cases | [`memory-bank/use-cases/README.md`](memory-bank/use-cases/README.md) |
| Testing policy, coverage ratchet | [`memory-bank/engineering/testing-policy.md`](memory-bank/engineering/testing-policy.md) |
| Design system, palette, components, dark mode | [`memory-bank/engineering/design-style-guide.md`](memory-bank/engineering/design-style-guide.md) |
| Coding style, reference implementations | [`memory-bank/engineering/coding-style.md`](memory-bank/engineering/coding-style.md) |
| Git workflow, коммиты, PR | [`memory-bank/engineering/git-workflow.md`](memory-bank/engineering/git-workflow.md) |
| Автономия, эскалация, lifecycle enforcement | [`memory-bank/engineering/autonomy-boundaries.md`](memory-bank/engineering/autonomy-boundaries.md) |
| Локальная разработка, команды, seed | [`memory-bank/ops/development.md`](memory-bank/ops/development.md) |
| Окружения, CI | [`memory-bank/ops/stages.md`](memory-bank/ops/stages.md) |
| Конфигурация, env vars | [`memory-bank/ops/config.md`](memory-bank/ops/config.md) |
| Релиз и deploy | [`memory-bank/ops/release.md`](memory-bank/ops/release.md) |
| ADR | [`memory-bank/adr/README.md`](memory-bank/adr/README.md) |
| Feature packages | [`memory-bank/features/README.md`](memory-bank/features/README.md) |
| Feature lifecycle, gates, templates, state schema | [`memory-bank/flows/README.md`](memory-bank/flows/README.md) |
| Review criteria (TAUS, IEEE 830, code review) | [`memory-bank/flows/review-criteria.md`](memory-bank/flows/review-criteria.md) |
| Governance, SSoT, frontmatter, staleness detection | [`memory-bank/dna/README.md`](memory-bank/dna/README.md) |
| Операционные промпты (session-start, feature/plan/code-review, bug-fix, adr-draft, docs-sync) | [`memory-bank/flows/prompts/README.md`](memory-bank/flows/prompts/README.md) |
| Терминология | [`memory-bank/glossary.md`](memory-bank/glossary.md) |
| Карта зависимостей документов | [`memory-bank/dependency-tree.md`](memory-bank/dependency-tree.md) |

## Slash-команды

- `/phase-status [FT-NNN]`, `/phase-advance [FT-NNN]`, `/phase-block "desc" [FT-NNN]`, `/phase-list` — state фичи.
- `/feature-start FT-NNN "title"`, `/worktree-list`, `/feature-archive FT-NNN` — worktree lifecycle (из main-checkout).
- `/start-session` — fallback priming (если SessionStart hook не сработал).

Полные описания: [`.claude/commands/`](.claude/commands/). Promo-промпты (copy-paste для фичевых lifecycle-шагов — draft, review, implement, docs-sync): [`memory-bank/flows/prompts/`](memory-bank/flows/prompts/).
