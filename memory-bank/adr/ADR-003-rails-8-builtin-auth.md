---
title: "ADR-003: Rails 8 built-in auth"
doc_kind: adr
doc_function: canonical
purpose: Использовать встроенный Rails 8 auth вместо Devise или custom JWT реализации.
derived_from:
  - ../domain/architecture.md
status: active
decision_status: accepted
date: 2026-03-27
audience: humans_and_agents
---

# ADR-003: Rails 8 built-in auth

## Контекст

Rails 8 приносит встроенную аутентификацию (has_secure_password, sessions generator). Альтернативы — Devise, кастомный JWT stack.

## Решение

Использовать встроенный Rails 8 auth как базу, поверх построить JWT access+refresh (см. [ADR-009](ADR-009-jwt-access-refresh-tokens.md)).

## Драйверы

- Меньше зависимостей.
- Rails 8 даёт достаточный функционал из коробки.
- Devise — overkill для API-only приложения.

## Последствия

### Положительные

- Нулевые внешние auth зависимости.
- Прозрачный код, легко кастомизировать.

### Отрицательные

- Нужно самим дописывать password reset, email confirmation когда потребуется.

## Влияние

Phase 1 (Auth & Multi-tenancy), все эндпоинты с `authenticate_user!`.
