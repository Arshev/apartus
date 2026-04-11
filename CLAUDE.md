# CLAUDE.md — Routing Table

**Это routing-таблица, не носитель фактов.** Факты живут в `memory-bank/`. Этот файл — только указатель, куда смотреть.

Точка входа: [`memory-bank/README.md`](memory-bank/README.md).

## Session Start Protocol

При каждой новой сессии — прочитай в этом порядке перед началом работы:

1. **Этот файл** — routing table и критичные правила
2. [`memory-bank/domain/problem.md`](memory-bank/domain/problem.md) — что за продукт, users, workflows
3. [`memory-bank/domain/architecture.md`](memory-bank/domain/architecture.md) — стек, bounded contexts, API конвенции
4. [`memory-bank/engineering/testing-policy.md`](memory-bank/engineering/testing-policy.md) — coverage ratchet, test conventions
5. [`memory-bank/engineering/autonomy-boundaries.md`](memory-bank/engineering/autonomy-boundaries.md) — что делать автономно, где эскалировать

Если задача касается конкретной области — читай relevant doc из таблицы ниже.

## Куда смотреть

| Нужно | Читай |
|---|---|
| Принципы документации, SSoT, frontmatter, lifecycle | [`memory-bank/dna/`](memory-bank/dna/) |
| Продукт, users, MVP scope, capability roadmap | [`memory-bank/domain/problem.md`](memory-bank/domain/problem.md) |
| Стек, module boundaries, API/error/data конвенции | [`memory-bank/domain/architecture.md`](memory-bank/domain/architecture.md) |
| Текущие модели и связи | [`memory-bank/domain/schema.md`](memory-bank/domain/schema.md) |
| Frontend стек, компоненты, i18n | [`memory-bank/domain/frontend.md`](memory-bank/domain/frontend.md) |
| Testing policy, coverage ratchet, simplify review | [`memory-bank/engineering/testing-policy.md`](memory-bank/engineering/testing-policy.md) |
| Coding style, reference implementations, constraints | [`memory-bank/engineering/coding-style.md`](memory-bank/engineering/coding-style.md) |
| Git workflow, коммиты, PR | [`memory-bank/engineering/git-workflow.md`](memory-bank/engineering/git-workflow.md) |
| Границы автономии, эскалация, запрещённые действия | [`memory-bank/engineering/autonomy-boundaries.md`](memory-bank/engineering/autonomy-boundaries.md) |
| Локальная разработка, команды, seed | [`memory-bank/ops/development.md`](memory-bank/ops/development.md) |
| Архитектурные решения (ADR) | [`memory-bank/adr/README.md`](memory-bank/adr/README.md) |
| Архивные HW-1 фичи и HW-2 планы | [`memory-bank/features/README.md`](memory-bank/features/README.md) |
| Lifecycle feature-артефактов и шаблоны | [`memory-bank/flows/README.md`](memory-bank/flows/README.md) |
| Операционные промпты (draft/review/implement/adr/bugfix) | [`.prompts/README.md`](.prompts/README.md) |

## Критичные правила (shortlist, canonical — в memory-bank)

- **Язык общения** — русский. Код и commit messages — английский. Детали: `memory-bank/engineering/coding-style.md`.
- **Не добавлять gems/npm пакеты** без явного согласования. Детали: `memory-bank/engineering/autonomy-boundaries.md`.
- **Не трогать существующие миграции.** Пишем новые.
- **Не реализовывать auth** — уже в hw-0.
- **Не добавлять TypeScript** на frontend.
- **Fine-grained коммиты.** Не молча коммитить — показать diff перед коммитом.
- **Upstream-first docs sync** — меняешь код → сначала обнови canonical owner в `memory-bank/`. Детали: `memory-bank/dna/lifecycle.md`.
- **Feature flow** — каждая новая фича проходит через `memory-bank/features/FT-*/` по lifecycle из `flows/feature-flow.md`. Brief/Spec/Plan трёхчастная SDD-форма HW-1 больше не используется — её заменяет `feature.md` + `implementation-plan.md`.

## Current Date & Project Phase

- HW-1 completed (PR #6). HW-2 completed — memory-bank + frontend + 18 full-stack features (FT-001..FT-018).
- All 11 core workflows (WF-01..WF-11) implemented.
- Backend: 1105 specs, 99.23% coverage. Frontend: 409 specs, 100% JS coverage. E2E: 220 Playwright specs.
- Активная ветка: `hw-2` (от `main`).
