---
title: "FT-HW2-FE5: Implementation Plan"
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
| `STEP-01` | Extend `api/branches.js` with get/create/update/destroy | `src/api/branches.js` |
| `STEP-02` | Pinia `stores/branches.js` with flat items + buildTree computed | `src/stores/branches.js` |
| `STEP-03` | `BranchTreeView.vue` — v-treeview + dialog CRUD | `src/views/BranchTreeView.vue` |
| `STEP-04` | Router: replace placeholder | `src/router/index.js` |
| `STEP-05` | Specs: buildTree, store, API, view | `src/__tests__/` |
| `STEP-06` | Ratchet + simplify + close | `vitest.config.js`, docs |
