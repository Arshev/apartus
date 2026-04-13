# CLAUDE.md — Routing Table

**Это routing-таблица, не носитель фактов.** Факты живут в `memory-bank/`. Этот файл — только указатель, куда смотреть.

Точка входа: [`memory-bank/README.md`](memory-bank/README.md). Quick start: [`memory-bank/QUICKSTART.md`](memory-bank/QUICKSTART.md).

## Session Start Protocol

Canonical priming prompt: [`.prompts/session-start.md`](.prompts/session-start.md) — содержит полный список файлов для чтения и порядок действий.

## Куда смотреть

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
| Coding style, reference implementations | [`memory-bank/engineering/coding-style.md`](memory-bank/engineering/coding-style.md) |
| Git workflow, коммиты, PR | [`memory-bank/engineering/git-workflow.md`](memory-bank/engineering/git-workflow.md) |
| Автономия, эскалация, lifecycle enforcement | [`memory-bank/engineering/autonomy-boundaries.md`](memory-bank/engineering/autonomy-boundaries.md) |
| Локальная разработка, команды, seed | [`memory-bank/ops/development.md`](memory-bank/ops/development.md) |
| Окружения, CI | [`memory-bank/ops/stages.md`](memory-bank/ops/stages.md) |
| Конфигурация, env vars | [`memory-bank/ops/config.md`](memory-bank/ops/config.md) |
| Релиз и deploy | [`memory-bank/ops/release.md`](memory-bank/ops/release.md) |
| ADR | [`memory-bank/adr/README.md`](memory-bank/adr/README.md) |
| Feature packages | [`memory-bank/features/README.md`](memory-bank/features/README.md) |
| Feature lifecycle, gates, templates | [`memory-bank/flows/README.md`](memory-bank/flows/README.md) |
| Review criteria (TAUS, IEEE 830, code review) | [`memory-bank/flows/review-criteria.md`](memory-bank/flows/review-criteria.md) |
| Governance, SSoT, frontmatter, staleness detection | [`memory-bank/dna/README.md`](memory-bank/dna/README.md) |
| Операционные промпты | [`.prompts/README.md`](.prompts/README.md) |
| Терминология | [`memory-bank/glossary.md`](memory-bank/glossary.md) |
| Карта зависимостей документов | [`memory-bank/dependency-tree.md`](memory-bank/dependency-tree.md) |
