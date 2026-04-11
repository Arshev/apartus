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

| Variable | Layer | Required | Description | Default |
|---|---|---|---|---|
| `DATABASE_URL` | backend | prod | PostgreSQL connection string | `postgresql://localhost/apartus_dev` |
| `DB_HOST` | backend | CI | Database host | `localhost` |
| `DB_USERNAME` | backend | CI | Database user | `apartus` |
| `DB_PASSWORD` | backend | CI | Database password | `apartus` |
| `APARTUS_DATABASE_PASSWORD` | backend | prod | Production DB password | — |
| `RAILS_MAX_THREADS` | backend | no | Puma thread count | `3` |
| `JWT_SECRET` | backend | prod | JWT signing secret | Rails credentials |
| `RAILS_MASTER_KEY` | backend | prod | Encrypted credentials key | `config/master.key` |
| `RAILS_ENV` | backend | always | Environment | `development` |
| `VITE_API_BASE_URL` | frontend | no | Backend API origin | `http://localhost:3000/api/v1` |

### CI-specific Variables (set in `.github/workflows/ci.yml`)

| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN` | GitHub API access for CI actions |
| `AQUA_GITHUB_TOKEN` | Tool bootstrapping (aqua package manager) |

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
