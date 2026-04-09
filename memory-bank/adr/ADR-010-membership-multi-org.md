---
title: "ADR-010: Membership model for multi-org"
doc_kind: adr
doc_function: canonical
purpose: User и Organization связаны через Membership (M:N), роль на уровне membership.
derived_from:
  - ../domain/schema.md
status: active
decision_status: accepted
date: 2026-03-27
audience: humans_and_agents
---

# ADR-010: Membership for multi-org

## Контекст

Пользователь PMS может одновременно работать на несколько организаций (например, manager в одной УК и owner в собственной частной организации). Каждая связь — своя роль.

## Решение

`User` ↔ `Organization` через `Membership` (M:N). Роль хранится на Membership (`role_enum`: member/manager/owner + опциональный `role_id` для custom ролей).

## Рассмотренные варианты

- **User belongs_to Organization** — один user = одна организация. Отбрасывается: не поддерживает мультиорг сценарий.

## Последствия

### Положительные

- Поддерживает multi-org сценарий из коробки.
- Роль на уровне связи — естественно.
- `X-Organization-Id` header выбирает текущий контекст на запрос.

### Отрицательные

- Все org-scoped контроллеры должны явно читать `Current.organization` — нельзя полагаться на `user.organization`.

## Влияние

Auth, все org-scoped запросы, `X-Organization-Id` header, Pundit policies, scope через `Current.organization.<relation>`.
