---
title: Feature Packages Index
doc_kind: feature
doc_function: index
purpose: Навигация по instantiated feature packages Apartus.
derived_from:
  - ../dna/governance.md
  - ../flows/feature-flow.md
status: active
audience: humans_and_agents
---

# Feature Packages

## HW-1 (archived, done)

Backend CRUD features, реализованные во время HW-1. Все merged в main (PR #6). Историческая форма Brief/Spec/Plan сохранена в `homeworks/hw-1/features/`; canonical owner теперь здесь.

| Package | Title | Status | Delivery |
|---|---|---|---|
| [FT-HW1-01-property-crud](FT-HW1-01-property-crud/feature.md) | Property CRUD (reference implementation) | archived | done |
| [FT-HW1-02-unit-crud](FT-HW1-02-unit-crud/feature.md) | Unit CRUD (nested под Property) | archived | done |
| [FT-HW1-03-amenities](FT-HW1-03-amenities/feature.md) | Amenities M:N (catalog + attach/detach) | archived | done |
| [FT-HW1-04-branches](FT-HW1-04-branches/feature.md) | Branch CRUD (adjacency list tree) | archived | done |
| [FT-HW1-05-property-branch-link](FT-HW1-05-property-branch-link/feature.md) | Property ↔ Branch link | archived | done |

## HW-2 (planned)

Frontend фичи, закрывающие UI долг HW-1. Будут созданы в Фазе 2 миграции, через полный feature-flow (Draft → Design Ready → Plan Ready → Execution → Done).

| Package | Status | Delivery | Scope |
|---|---|---|---|
| [FT-HW2-FE1-organization-shell](FT-HW2-FE1-organization-shell/feature.md) | active | done | Layout, navigation, org switcher, logout — frontend reference implementation |
| [FT-HW2-FE2-properties-ui](FT-HW2-FE2-properties-ui/feature.md) | active | done | Property list/form/branch selector, delete |
| [FT-HW2-FE3-units-ui](FT-HW2-FE3-units-ui/feature.md) | active | done | Unit list/form nested under Property |
| [FT-HW2-FE4-amenities-catalog-ui](FT-HW2-FE4-amenities-catalog-ui/feature.md) | active | done | Amenities catalog CRUD + unit attach/detach |

### Planned

| Planned package | Scope |
|---|---|
| FT-HW2-FE2-properties-ui | Property list/form/branch selector |
| FT-HW2-FE3-units-ui | Unit list/form/amenity chips под Property |
| FT-HW2-FE4-amenities-catalog-ui | Standalone amenities page |
| FT-HW2-FE5-branches-tree-ui | Clientside tree из flat API |

## Naming

- Архивные HW-1: `FT-HW1-NN-slug/`
- HW-2: `FT-HW2-FE-N-slug/`
- Новые фичи вне курсовых модулей: `FT-NNN-slug/`
