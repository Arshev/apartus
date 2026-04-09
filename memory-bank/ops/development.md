---
title: Development Environment
doc_kind: engineering
doc_function: canonical
purpose: Локальная разработка Apartus — setup, команды, seed, browser testing.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Development Environment

## Setup

Требуется: Ruby (см. `.ruby-version`), PostgreSQL (нативный, без Docker — см. [`../adr/ADR-008-no-docker-compose-local.md`](../adr/ADR-008-no-docker-compose-local.md)), Node.js, Yarn.

```bash
# Backend
cd backend
bin/setup                 # bundle install + db:prepare

# Frontend
cd frontend
yarn install
```

## Daily Commands

### Backend

```bash
cd backend
bin/rails s               # API сервер на http://localhost:3000
bundle exec rspec         # тесты
bundle exec rubocop       # lint
bin/rails db:migrate      # миграции
bin/rails db:seed         # idempotent demo seed (demo@apartus.local / Password1!)
bin/rails c               # console
```

### Frontend

```bash
cd frontend
yarn dev                  # Vite dev server (default http://localhost:5173)
yarn test                 # Vitest
yarn test:coverage        # Vitest с coverage
yarn build                # production build
```

## Seed Data

Идемпотентный demo seed (HW-1):

- User: `demo@apartus.local` / `Password1!`
- Полное дерево HW-1: organization, branches, amenities, properties, units, attachments.
- Запуск: `cd backend && bin/rails db:seed` (безопасно запускать повторно).

Используется frontend разработкой HW-2 — не нужно настраивать вручную.

## Browser Testing

- Frontend dev URL по умолчанию: `http://localhost:5173`.
- Backend API: `http://localhost:3000`.
- Axios base URL задаётся через frontend env (`VITE_API_BASE_URL`).
- Не сканируй порты автоматически — используй defaults или явную переменную.

## Database

- PostgreSQL нативный. БД создаются через `bin/rails db:create`.
- Тестовая БД: `bin/rails db:test:prepare`.
- Никогда не трогать существующие миграции (см. [`../engineering/coding-style.md`](../engineering/coding-style.md)).

## Makefile

В корне репо есть `Makefile` с shortcuts для типовых операций (см. `make help`).
