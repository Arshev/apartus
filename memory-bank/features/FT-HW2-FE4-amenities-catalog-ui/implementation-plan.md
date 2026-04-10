---
title: "FT-HW2-FE4: Implementation Plan"
doc_kind: feature
doc_function: derived
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
---

# План имплементации

| STEP | Goal | Touchpoints |
|---|---|---|
| `STEP-01` | API `api/amenities.js` + `api/unitAmenities.js` | `src/api/` |
| `STEP-02` | Pinia `stores/amenities.js` | `src/stores/` |
| `STEP-03` | `AmenityListView.vue` — table + dialog CRUD | `src/views/` |
| `STEP-04` | UnitFormView amenity chips selector | `src/views/UnitFormView.vue` |
| `STEP-05` | Router: replace `/amenities` placeholder | `src/router/index.js` |
| `STEP-06` | Specs | `src/__tests__/` |
| `STEP-07` | Ratchet + simplify + close | `vitest.config.js`, docs |
