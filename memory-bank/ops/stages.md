---
title: Stages And Environments
doc_kind: engineering
doc_function: canonical
purpose: Non-local environments Apartus. Сейчас production не задеплоен, существует только CI на main.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Stages And Environments

## Environment Inventory

| Environment | Purpose | Access | Notes |
|---|---|---|---|
| `local` | Разработка | `bin/rails s` + `yarn dev` | См. [`development.md`](development.md) |
| `ci` | GitHub Actions | `.github/workflows/ci.yml` | Backend tests, frontend build, badges на main |
| `production` | — | не существует | Не задеплоено, деплой-паттерн — Kamal (планируется) |

Apartus находится в фазе разработки, production environment не существует. Когда появится — документировать access, secrets, smoke checks, logs, observability в этом файле.

## CI Access

- GitHub Actions: <https://github.com/Arshev/apartus/actions>
- Coverage badges: auto-update на push в `main`.
