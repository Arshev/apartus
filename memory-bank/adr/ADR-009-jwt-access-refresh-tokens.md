---
title: "ADR-009: JWT access + refresh tokens with denylist"
doc_kind: adr
doc_function: canonical
purpose: JWT auth с access (15m) + refresh (30d) токенами и JwtDenylist для отзыва.
derived_from:
  - ADR-003-rails-8-builtin-auth.md
  - ../domain/architecture.md
status: active
decision_status: accepted
date: 2026-03-27
audience: humans_and_agents
---

# ADR-009: JWT access + refresh tokens

## Решение

JWT stateless auth с двумя токенами:

- **Access token** — short-lived (15 минут), содержит `user_id` и `exp`.
- **Refresh token** — long-lived (30 дней), хранится в `httpOnly` cookie.
- **JwtDenylist** модель для отзыва refresh токенов при logout или compromise.

## Рассмотренные варианты

| Вариант | Плюсы | Минусы |
|---|---|---|
| JWT access + refresh | Stateless API, token rotation, revocation через denylist | Чуть сложнее логики |
| Rails session + cookies | Совсем просто | Не подходит SPA с cross-origin |
| API token в БД | Легко revoke | Нет expiration, stateful lookup каждый запрос |

## Драйверы

- SPA архитектура, REST API.
- Нужна возможность отозвать скомпрометированный токен.
- Access token должен быть short-lived для безопасности.

## Последствия

### Положительные

- Stateless API, не требует session storage между реплик.
- Refresh flow даёт UX без частого логина.
- Denylist покрывает kompromis recovery.

### Отрицательные

- Access token нельзя отозвать мгновенно (TTL 15 минут).
- Нужна token rotation логика на frontend.

## Влияние

Phase 1 (Auth), все API endpoints с `authenticate_user!`, frontend auth store, `JwtDenylist` таблица.
