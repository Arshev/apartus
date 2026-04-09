---
title: "ADR-005: Standard bigint primary keys"
doc_kind: adr
doc_function: canonical
purpose: Все модели используют стандартные Rails bigint PK, не UUID.
derived_from:
  - ../domain/architecture.md
status: active
decision_status: accepted
date: 2026-03-27
audience: humans_and_agents
---

# ADR-005: Standard bigint primary keys

## Контекст

Rails 8 по умолчанию даёт bigint PK. UUID — альтернатива для систем с публичным API и distributed writes.

## Решение

Стандартные bigint PK для всех моделей.

## Драйверы

- Простота разработки, меньше шума в БД.
- Производительность JOIN лучше, чем с UUID.
- Monotonic inserts, предсказуемая сортировка.
- UUID можно добавить позже для публичных API как secondary ключ, не ломая внутренний.

## Последствия

### Положительные

- Стандартный Rails паттерн.
- Нет коллизий с auto-increment.

### Отрицательные

- Предсказуемые ID раскрывают размер данных через API (устраняется авторизацией).

## Влияние

Все модели, все миграции.
