---
title: Domain Index
doc_kind: domain
doc_function: index
purpose: Навигация по domain-слою Apartus — продуктовый контекст, архитектура, schema, frontend.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Domain

- [`problem.md`](problem.md) — canonical продуктовый контекст, целевые пользователи, MVP scope, non-goals, roadmap-capabilities.
- [`architecture.md`](architecture.md) — bounded contexts (backend/frontend), конвенции данных, module boundaries, обработка ошибок.
- [`schema.md`](schema.md) — текущее состояние моделей и связей (живой справочник, обновляется при изменениях схемы).
- [`frontend.md`](frontend.md) — UI surfaces, стек, design system Vuetify, i18n.
- [`api-reference.md`](api-reference.md) — полный REST API reference: все endpoints, методы, params, response shapes, status codes.
- [`state-machines.md`](state-machines.md) — статус-машины: Reservation (confirmed→checked_in→checked_out/cancelled), Task (pending→in_progress→completed).
- [`permissions.md`](permissions.md) — 20 permission codes, 3 preset roles, UI gating map, multi-tenancy isolation.
- [`money-and-currency.md`](money-and-currency.md) — money as cents, commission basis points, 11 currencies, formatMoney rules.
- [`integrations-strategy.md`](integrations-strategy.md) — стратегия интеграций: приоритеты, adapter architecture, build vs buy, провайдеры.
- [`pricing-strategy.md`](pricing-strategy.md) — тарифная сетка, unit economics, go-to-market pricing.
