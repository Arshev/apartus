---
title: "ADR-006: Axios for API client"
doc_kind: adr
doc_function: canonical
purpose: Frontend использует axios для HTTP клиента вместо native fetch.
derived_from:
  - ../domain/frontend.md
status: active
decision_status: accepted
date: 2026-03-27
audience: humans_and_agents
---

# ADR-006: Axios for API client

## Решение

Axios для всех HTTP запросов с backend.

## Драйверы

- Interceptors для auth token и error handling.
- Встроенный baseURL.
- Автоматический JSON parse/stringify.
- Стандарт Vue-экосистемы.

## Рассмотренные варианты

- **Native fetch wrapper** — требует писать interceptors самим, меньше удобств.

## Последствия

### Положительные

- Единая точка auth/error handling через interceptors.
- Удобные abort signals, timeouts.

### Отрицательные

- Ещё одна зависимость (минимальный размер, приемлемо).

## Влияние

Весь frontend API слой (`src/services/api/`), auth store, все store actions.
