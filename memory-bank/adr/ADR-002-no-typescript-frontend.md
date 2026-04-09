---
title: "ADR-002: No TypeScript on frontend"
doc_kind: adr
doc_function: canonical
purpose: Apartus frontend — чистый JavaScript без TypeScript на старте.
derived_from:
  - ../domain/frontend.md
status: active
decision_status: accepted
date: 2026-03-27
audience: humans_and_agents
---

# ADR-002: No TypeScript on frontend

## Контекст

Выбор между TS и чистым JS для Vue 3 SPA.

## Решение

Чистый JavaScript. Можно добавить TypeScript позже, если команда или сложность проекта потребуют.

## Драйверы

- Скорость разработки на старте.
- Меньше boilerplate.
- Один разработчик, риск type-bugs относительно низкий на размере MVP.

## Последствия

### Положительные

- Меньше зависимостей, быстрее dev loop.
- Нет TS-specific tooling overhead.

### Отрицательные

- Нет compile-time type safety — опора на runtime валидацию и тесты.
- Миграция на TS позже потребует работы.

## Влияние

Весь frontend, виджет бронирования, будущие фронтовые фичи.
