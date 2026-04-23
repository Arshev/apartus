---
title: Feature State Schema
doc_kind: governance
doc_function: canonical
purpose: "Схема машинно-читаемого файла state.yml в feature package и правила определения активной фичи для текущей вкладки/сессии. Даёт агенту быстрый ответ на вопросы: на какой стадии фича, какой STEP текущий, что блокирует. Multi-tab safe: активная фича определяется per-tab по git-ветке."
derived_from:
  - ../dna/governance.md
  - feature-flow.md
  - ../engineering/git-workflow.md
canonical_for:
  - feature_state_schema
  - feature_state_update_rules
  - active_feature_resolution
status: active
audience: humans_and_agents
---

# Feature State Schema

Каждый feature package (`memory-bank/features/FT-XXX/`) содержит `state.yml` — машинный снимок текущего состояния работы. Он дополняет canonical `feature.md` и derived `implementation-plan.md`, но не переопределяет их. Source of truth для scope/design/verify остаётся `feature.md`; `state.yml` отвечает только на вопрос «где мы сейчас».

## Multi-Tab Model

Разработка идёт параллельно в нескольких вкладках Claude Code (часто — в разных git worktrees). Каждая вкладка работает со своей фичей, поэтому **нет одного глобального указателя на активную фичу**. Активная фича определяется резолвером для каждой вкладки независимо.

### Resolver Priority

Активная фича для session/tab определяется по убыванию приоритета:

1. **`CLAUDE_ACTIVE_FEATURE` env var** — явный override. Задаётся до запуска Claude, если нужно работать над фичей без переключения ветки.
2. **Git branch regex** — текущая ветка (`git branch --show-current`) матчится по `[Ff][Tt][-_/]?[0-9]+`. Первое совпадение нормализуется в `FT-NNN` (zero-padded до 3 цифр). Для апартусовских ID вида `FT-HW1-01-*`/`FT-HW2-FE2-*` регэкс также захватывает префикс `FT-HW\d-...` — матч идёт по существованию каталога `memory-bank/features/<id>-*/`.
3. **Empty** — нет активной фичи. Вкладка работает в bugfix/refactor/docs-режиме без привязки к feature package.

Существование соответствующего `state.yml` проверяется перед возвратом — если файла нет, резолвер вернёт пусто, даже если ветка формально матчит.

### Usage Chain

- Priming prompt [`prompts/session-start.md`](prompts/README.md) инструктирует агента прочитать `state.yml` активной фичи в начале сессии.
- При закрытии сессии / перед PR агент обновляет `state.yml` вручную (hook автоматизации — запланирован, пока ручной шаг).
- Slash-команды (`/phase-status`, `/phase-advance`, `/phase-block`, `/phase-list`) — запланированы, см. `memory-bank/flows/README.md`. До появления команд — правка файла вручную по схеме ниже.

## Schema

```yaml
# memory-bank/features/FT-XXX/state.yml

feature: FT-XXX              # required. Стабильный ID фичи.
phase: execution             # required. См. enum ниже.
current_step: STEP-07        # required при phase: execution, иначе null.
next_action: "..."           # required. Одна строка, что делать дальше.
blockers: []                 # required. Список blocker'ов (см. ниже).
branch: feat/ft-xxx-...      # required. Имя feature-ветки. null если bootstrap/draft без ветки.
last_updated: 2026-04-23     # required. Дата последнего изменения файла (YYYY-MM-DD).
last_session_note: "..."     # optional. Заметка с последней сессии.
```

### Enum: phase

| Значение | Когда применимо | Соответствие feature.md |
|---|---|---|
| `bootstrap` | Каталог фичи создан, feature.md ещё нет | — |
| `draft` | feature.md существует как черновик | `status: draft`, `delivery_status: planned` |
| `design_ready` | feature.md прошёл Spec ревью | `status: active`, `delivery_status: planned` |
| `plan_ready` | implementation-plan.md создан и проревьюен | `status: active`, `delivery_status: planned` |
| `execution` | Работа по STEP-* идёт | `status: active`, `delivery_status: in_progress` |
| `done` | Все gates закрыты, фича завершена | `status: active`, `delivery_status: done` |
| `cancelled` | Работа прекращена | `delivery_status: cancelled` |

### Формат blocker

```yaml
blockers:
  - id: OQ-02              # optional. Canonical ref если блокер — из плана/фичи.
    kind: open_question    # open_question | approval_gate | external | adhoc
    description: "Подтвердить лимит сессий у владельца"
    since: 2026-04-20
```

Пустой массив `blockers: []` означает «нет блокеров».

## Правила обновления

1. **Создаётся вместе с feature package.** При bootstrap — `phase: bootstrap`, остальные поля-стабы.
2. **Phase меняется только при прохождении gate.** Gate-предикаты — в [feature-flow.md](feature-flow.md) секция "Gates". Выполняется вручную (до появления `/phase-advance`).
3. **`current_step` обновляется после завершения STEP.** Не до — чтобы не обнулить при прерывании.
4. **`next_action` — одна строка, конкретное следующее действие.** Не «продолжить», а «запустить `CHK-R04` e2e security spec».
5. **`last_updated` — дата (не datetime).** Переводи относительные даты в абсолютные.
6. **`branch` актуализируется при создании/переключении feature-ветки.** `null` только пока ветка не создана.
7. **Blocker добавляется сразу при обнаружении** вручную (до появления `/phase-block`).

## Branch Naming Convention

Для корректной работы резолвера feature-ветка обязана содержать `FT-NNN` (или `FT-HW<N>-<FE><N>` для архивных апартусовских пакетов):

- `feat/ft-025-search-filters` ✓
- `feat/FT-028-empty-state` ✓
- `fix/ft020-race-condition` ✓
- `feat/ft-hw2-fe5-branches-tree-ui` ✓
- `feat/dismissal` ✗ — резолвер вернёт пусто, придётся задавать `CLAUDE_ACTIVE_FEATURE`

Конвенция зафиксирована в [`../engineering/git-workflow.md`](../engineering/git-workflow.md).

## Что state.yml НЕ содержит

- Scope, requirements, design — живут в `feature.md`.
- Конкретику шагов (Touchpoints, Check command) — в `implementation-plan.md`.
- Acceptance criteria, evidence paths — в `feature.md`.
- Длинную историю сессий — для этого есть git history.

`state.yml` — минимальный pointer на текущее состояние, не журнал.

## Планируемые slash-команды

До появления в `.claude/commands/` (запланировано):

- `/phase-status [FT-XXX]` — читает `state.yml`, выводит в консоль. Без аргумента — активная фича.
- `/phase-advance [FT-XXX]` — проверяет gate-предикаты, обновляет `phase` / `current_step` / `next_action`.
- `/phase-block <description> [FT-XXX]` — добавляет blocker.
- `/phase-list` — показывает все фичи не в `done`/`cancelled`.
