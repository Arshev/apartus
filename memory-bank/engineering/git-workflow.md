---
title: Apartus Git Workflow
doc_kind: engineering
doc_function: convention
purpose: Git branching, коммиты, PR flow Apartus.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Git Workflow

## Default Branch

`main` — защищённая, merge только через PR.

## Branches

- Тематические ветки:
  - `feature/ft-NNN-<slug>` — работа, привязанная к feature package (`memory-bank/features/FT-NNN-*`). `FT-NNN` в имени ветки обязателен — от него зависит active-feature resolver из [`../flows/state-schema.md`](../flows/state-schema.md).
  - `fix/ft-NNN-<slug>` — bugfix, затрагивающий конкретную фичу.
  - `fix/<slug>` — bugfix без привязки к feature package.
  - `chore/<slug>` — governance/docs/tooling изменения.
  - `hw-N` — курсовые модули (исторические).
- Для архивных HW-фич (`FT-HW1-*`, `FT-HW2-FE*`) — резолвер не парсит `HW`-префикс, нужно задавать `CLAUDE_ACTIVE_FEATURE=FT-HW2-FE5` явно.
- Все коммиты идут в тематическую ветку, финал — один PR в `main`.

## Commits

- **Fine-grained** — каждый логический шаг отдельный коммит. Не "всё одним коммитом в конце".
- Commit message — present-tense, subject 50–72 символа, body поясняет **why**.
- Язык — английский.
- Финальный trailer:

  ```text
  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  ```

- **Никаких** `--force`, `reset --hard`, `rebase -i`, `amend` на published commits без явного разрешения пользователя.
- **Никаких** `--no-verify` / `--no-gpg-sign` если hook упал — диагностировать и чинить.

## Pull Requests

- Перед PR прогнать локально canonical checks: `bundle exec rspec`, `yarn test:coverage`, `yarn build`, `bundle exec rubocop`.
- PR title короткий и предметный (≤70 символов).
- PR body:
  - **Summary** — 1-3 bullets про изменения
  - **Test plan** — checklist для проверки
  - Ссылка на feature package (`memory-bank/features/FT-XXX/`) и GitHub issue.
- Каждая feature привязана к GitHub issue, PR закрывает через `Closes #N`.

## CI

- Badges обновляются только на push в `main` (job с `if: github.ref == 'refs/heads/main'`).
- На тематической ветке badges могут быть "invalid" — это нормально, станут валидными после merge.

## Worktrees

Не используются на текущем этапе. Если понадобятся — добавить правила сюда.
