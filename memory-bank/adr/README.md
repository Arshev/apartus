---
title: Architecture Decision Records Index
doc_kind: adr
doc_function: index
purpose: Навигация по ADR Apartus. Все решения мигрированы из исходного `ai-docs/DECISIONS.md`.
derived_from:
  - ../dna/governance.md
  - ../flows/templates/adr/ADR-XXX.md
status: active
audience: humans_and_agents
---

# Architecture Decision Records

| ADR | Title | Status | Date |
|---|---|---|---|
| [ADR-001](ADR-001-monorepo-structure.md) | Monorepo structure (backend + frontend) | accepted | 2026-03-27 |
| [ADR-002](ADR-002-no-typescript-frontend.md) | No TypeScript on frontend | accepted | 2026-03-27 |
| [ADR-003](ADR-003-rails-8-builtin-auth.md) | Rails 8 built-in auth | accepted | 2026-03-27 |
| [ADR-004](ADR-004-integer-cents-for-money.md) | Integer cents for money fields | accepted | 2026-03-27 |
| [ADR-005](ADR-005-bigint-primary-keys.md) | Standard bigint primary keys | accepted | 2026-03-27 |
| [ADR-006](ADR-006-axios-api-client.md) | Axios for API client | accepted | 2026-03-27 |
| [ADR-007](ADR-007-api-health-endpoint.md) | Custom API health endpoint | accepted | 2026-03-27 |
| [ADR-008](ADR-008-no-docker-compose-local.md) | No Docker Compose for local dev | accepted | 2026-03-27 |
| [ADR-009](ADR-009-jwt-access-refresh-tokens.md) | JWT access + refresh tokens with denylist | accepted | 2026-03-27 |
| [ADR-010](ADR-010-membership-multi-org.md) | Membership model for multi-org | accepted | 2026-03-27 |
| [ADR-011](ADR-011-permissions-text-array.md) | Permissions as text[] array on Role | accepted | 2026-03-27 |
| [ADR-012](ADR-012-class-level-authorize-nested-controllers.md) | Class-level `authorize` in nested controllers | accepted | 2026-04-08 |
| [ADR-013](ADR-013-has-many-through-m2n.md) | has_many :through for Unit ↔ Amenity M:N | accepted | 2026-04-08 |
| [ADR-014](ADR-014-adjacency-list-branch-tree.md) | Adjacency list for Branch tree | accepted | 2026-04-09 |
| [ADR-015](ADR-015-cross-cutting-spec-patches.md) | Cross-cutting features own retrospective spec patches | accepted (historical) | 2026-04-09 |

Нумерация монотонная, не переиспользуется. Новые ADR заводятся из шаблона [`../flows/templates/adr/ADR-XXX.md`](../flows/templates/adr/ADR-XXX.md).
