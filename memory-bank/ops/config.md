---
title: Configuration Guide
doc_kind: engineering
doc_function: canonical
purpose: Ownership-модель конфигурации Apartus — env vars, secrets, Rails config.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Configuration Guide

## Configuration Architecture

- **Backend:** стандартная Rails `config/` + env vars через `ENV.fetch(...)`. Database URL, JWT secrets, CORS origins — через env.
- **Frontend:** Vite env vars с префиксом `VITE_*` в `frontend/.env` и `.env.local`.

### Backend file layout

```
backend/config/
├── application.rb
├── database.yml
├── credentials.yml.enc   # Rails encrypted credentials
├── environments/
│   ├── development.rb
│   ├── test.rb
│   └── production.rb
├── routes.rb
└── initializers/
```

### Frontend env

```
frontend/
├── .env                  # committed defaults
└── .env.local            # gitignored overrides
```

## Key Variables

| Variable | Layer | Description | Default |
|---|---|---|---|
| `DATABASE_URL` | backend | PostgreSQL connection | `postgresql://localhost/apartus_dev` |
| `JWT_SECRET` | backend | JWT signing secret | Rails credentials |
| `RAILS_MASTER_KEY` | backend | Rails credentials encryption | `config/master.key` |
| `VITE_API_BASE_URL` | frontend | Backend API origin | `http://localhost:3000/api/v1` |

Это не полный список — консультируйся с `backend/config/` и `frontend/.env` для актуального состояния.

## Secrets

- Rails credentials через `bin/rails credentials:edit`. Never commit `master.key` unencrypted значения — они уже в `.gitignore`.
- Frontend secrets не хранятся в коде — если появится что-то чувствительное, перенести в backend.
- Не вставлять реальные production values в документацию.

## Change Procedure

При добавлении нового env var:

1. Добавить `ENV.fetch("NAME")` в коде.
2. Обновить `backend/config/` или `frontend/.env` с default где применимо.
3. Обновить этот файл в таблице Key Variables, если переменная значимая.
4. Добавить в `.env.example` (если такой файл ведётся).
