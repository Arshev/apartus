---
title: "FT-HW1-04: Branches (adjacency list tree)"
doc_kind: feature
doc_function: canonical
purpose: CRUD для Branch с иерархией (self-referential), adjacency list без внешних gems.
derived_from:
  - ../FT-HW1-01-property-crud/feature.md
  - ../../adr/ADR-014-adjacency-list-branch-tree.md
status: archived
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-HW1-04: Branches

## What

### Problem

УК организует работу через подразделения ("Сочи" → "Адлер", "Центр"). Нужна иерархия Branch per organization. HW-1 scope — плоский CRUD + cycle prevention; tree view на фронте — HW-2 FE5.

### Scope

- `REQ-01` `POST/GET/PATCH/DELETE /api/v1/branches` (flat list endpoint, иерархия derived).
- `REQ-02` `parent_branch_id` self-FK, nullable для корней.
- `REQ-03` Custom валидации: `parent_branch_must_exist_in_org`, `parent_is_not_self`, `parent_is_not_descendant` (cycle check upward walk, on :update).
- `REQ-04` Uniqueness: case-insensitive per `[organization_id, parent_branch_id]`, через два partial unique индекса.
- `REQ-05` `before_destroy` блокирует удаление при наличии children или properties.

### Non-Scope

- `NS-01` Frontend tree UI (HW-2 FE5).
- `NS-02` Timezone field (отложено).
- `NS-03` Closure table (adjacency list достаточен на наших объёмах — ADR-014).
- `NS-04` Move/reparent bulk операции.

### Constraints

- `CON-01` Без новых gems (никакого `ancestry`/`closure_tree`).
- `CON-02` Cross-org `parent_branch_id` должен отклоняться (isolation enforced на controller+model).

## How

### Solution

Стандартный CRUD + Ruby custom validations для cycle check. Два partial unique индекса для разрешения NULL parent case (`WHERE parent_branch_id IS NULL` vs `IS NOT NULL`).

### Change Surface

| Surface | Why |
|---|---|
| `backend/app/models/branch.rb` | Self-ref model + validations |
| `backend/app/controllers/api/v1/branches_controller.rb` | CRUD |
| `backend/app/policies/branch_policy.rb` | Pundit |
| `backend/db/migrate/..._create_branches.rb` | Schema + partial unique indexes |
| Spec + factory | — |

## Verify

### Exit Criteria

- `EC-01` Flat CRUD работает.
- `EC-02` Cycle attempts → 422.
- `EC-03` Uniqueness case-insensitive per parent.
- `EC-04` Destroy с children/properties → 422.

### Acceptance Scenarios

- `SC-01` Create root branch → 201.
- `SC-02` Create child с существующим parent → 201.
- `SC-03` Update parent_branch_id на self → 422.
- `SC-04` Update parent_branch_id на descendant → 422 (cycle).
- `SC-05` Cross-org parent → 422.
- `NEG-01` Destroy branch with children → 422.
- `NEG-02` Destroy branch with properties → 422.

### Checks

| Check ID | Covers | How | Expected |
|---|---|---|---|
| `CHK-01` | все EC/SC/NEG | `bundle exec rspec spec/requests/api/v1/branches_spec.rb spec/models/branch_spec.rb` | Green |

### Evidence

- `EVID-01` RSpec green в CI.

## Historical Source

`homeworks/hw-1/features/04-branches/`.
