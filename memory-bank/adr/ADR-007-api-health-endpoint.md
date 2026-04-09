---
title: "ADR-007: Custom API health endpoint"
doc_kind: adr
doc_function: canonical
purpose: Apartus имеет собственный GET /api/v1/health поверх Rails built-in /up.
derived_from:
  - ../domain/architecture.md
status: active
decision_status: accepted
date: 2026-03-27
audience: humans_and_agents
---

# ADR-007: API health endpoint

## Решение

`GET /api/v1/health` возвращает `{ status: "ok" }`. Дополняет Rails built-in `/up`.

## Драйверы

- CI smoke tests проверяют API слой отдельно от Rails internals.
- Будущие readiness probes (Kubernetes/Kamal) могут хотеть проверять именно API.
- Health check под `/api/v1` консистентен с остальными эндпоинтами.

## Последствия

### Положительные

- Явная проверка API routing, controllers, JWT middleware chain.
- Не зависит от Rails engine internals.

### Отрицательные

- Минимальное дублирование с `/up`.

## Влияние

CI smoke test, будущий deployment health checks, frontend connection probe.
