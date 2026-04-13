# AGENTS.md — Routing Table для агентов

**Это routing-таблица.** Факты живут в `memory-bank/`. Этот файл — только указатель.

## Структура репозитория

| Каталог | Что внутри | Canonical owner |
|---|---|---|
| `memory-bank/` | Durable knowledge layer | [`memory-bank/README.md`](memory-bank/README.md) |
| `backend/` | Rails 8 API | [`memory-bank/domain/architecture.md`](memory-bank/domain/architecture.md) |
| `frontend/` | Vue 3 SPA | [`memory-bank/domain/frontend.md`](memory-bank/domain/frontend.md) |
| `.prompts/` | Операционные промпты | [`.prompts/README.md`](.prompts/README.md) |

## Команды

Canonical source: [`memory-bank/ops/development.md`](memory-bank/ops/development.md)

## Coding conventions

Canonical source: [`memory-bank/engineering/coding-style.md`](memory-bank/engineering/coding-style.md)

## Git workflow

Canonical source: [`memory-bank/engineering/git-workflow.md`](memory-bank/engineering/git-workflow.md)

## Что можно / нельзя делать

Canonical source: [`memory-bank/engineering/autonomy-boundaries.md`](memory-bank/engineering/autonomy-boundaries.md)

Включает lifecycle enforcement rules (автор ≠ ревьюер, review gates, запрещённые shortcuts).

## Testing

Canonical source: [`memory-bank/engineering/testing-policy.md`](memory-bank/engineering/testing-policy.md)

## Feature lifecycle

Canonical source: [`memory-bank/flows/feature-flow.md`](memory-bank/flows/feature-flow.md)

## Frontmatter schema

Canonical source: [`memory-bank/dna/frontmatter.md`](memory-bank/dna/frontmatter.md)
