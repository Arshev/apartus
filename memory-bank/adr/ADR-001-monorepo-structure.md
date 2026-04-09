---
title: "ADR-001: Monorepo structure (backend + frontend)"
doc_kind: adr
doc_function: canonical
purpose: Apartus живёт в одном репозитории с разделением на `/backend` (Rails API) и `/frontend` (Vue SPA).
derived_from:
  - ../domain/architecture.md
status: active
decision_status: accepted
date: 2026-03-27
audience: humans_and_agents
---

# ADR-001: Monorepo structure

## Контекст

На старте Apartus нужно выбрать между монорепо (backend + frontend в одном репозитории) и split-репо (отдельные репозитории), либо Rails monolith с Inertia.js.

## Драйверы решения

- Скорость разработки в одиночку / малой команды.
- Единый CI/CD pipeline.
- Чёткое разделение ответственности backend/frontend.

## Рассмотренные варианты

| Вариант | Плюсы | Минусы |
|---|---|---|
| Monorepo `/backend` + `/frontend` | Единый CI, простой refactoring cross-stack, атомарные PR | Нужно аккуратно настраивать workflows |
| Split репо | Независимые релизы | Overhead на синхронизацию, сложнее atomic changes |
| Rails + Inertia.js | Один стек | Frontend заперт в Rails views, меньше гибкости для SPA фич |

## Решение

Monorepo с двумя top-level директориями: `/backend` (Rails 8 API-only) и `/frontend` (Vue 3 SPA).

## Последствия

### Положительные

- Атомарные изменения backend+frontend в одном PR.
- Один CI pipeline, общие badges.
- Проще переиспользовать конфиги (линтеры, editorconfig).

### Отрицательные

- CI jobs нужно разграничивать по путям (`paths:` filter).
- Release pipeline должен понимать оба стека.

## Влияние

Вся структура проекта, CI, deployment.
