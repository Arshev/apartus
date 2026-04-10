---
title: "FT-HW2-FE3: Implementation Plan"
doc_kind: feature
doc_function: derived
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
---

# План имплементации

## Порядок работ

Mirror FE2 pattern: API → store → views → router → specs → ratchet.

| STEP | Goal | Touchpoints |
|---|---|---|
| `STEP-01` | API `api/units.js` (nested CRUD) | `src/api/units.js` |
| `STEP-02` | Pinia `stores/units.js` scoped to propertyId | `src/stores/units.js` |
| `STEP-03` | `UnitListView.vue` — table + delete | `src/views/UnitListView.vue` |
| `STEP-04` | `UnitFormView.vue` — create/edit | `src/views/UnitFormView.vue` |
| `STEP-05` | Router: unit routes + PropertyListView units link | `src/router/index.js`, `PropertyListView.vue` |
| `STEP-06` | Specs: api, store, views | `src/__tests__/` |
| `STEP-07` | Ratchet bump + simplify + close | `vitest.config.js`, `testing-policy.md` |

## Preconditions

- FE2 done (properties store, routes).
- Backend units API works with demo seed.
