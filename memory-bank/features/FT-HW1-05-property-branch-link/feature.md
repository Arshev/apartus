---
title: "FT-HW1-05: Property ↔ Branch Link"
doc_kind: feature
doc_function: canonical
purpose: Добавить nullable `branch_id` к Property, обновить F1 контракт, унифицировать F4 destroy dependents check.
derived_from:
  - ../FT-HW1-01-property-crud/feature.md
  - ../FT-HW1-04-branches/feature.md
  - ../../adr/ADR-015-cross-cutting-spec-patches.md
status: archived
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-HW1-05: Property ↔ Branch Link

## What

### Problem

В F1 Property был создан без `branch_id`. F4 ввёл Branch. Теперь нужно связать: Property → Branch (optional). Попутно — унифицировать `Branch#before_destroy` (раньше проверял только children, теперь и properties).

Фича cross-cutting: ретроспективно обновляет контракт F1 (добавляет `branch_id` и `branch` nested в JSON response) и F4 (обновляет сообщение `before_destroy`). См. ADR-015.

### Scope

- `REQ-01` Миграция: `branch_id` bigint nullable, FK `on_delete: restrict`, index.
- `REQ-02` `Property.belongs_to :branch, optional: true`.
- `REQ-03` Custom валидация `branch_must_exist_in_org` — проверяет не просто existence, но и совпадение organization_id.
- `REQ-04` `PATCH /api/v1/properties/:id` принимает `branch_id` (nullable).
- `REQ-05` Property JSON response включает `branch_id` и nested `branch: { id, name }` (или null).
- `REQ-06` `Branch#before_destroy :prevent_destroy_if_has_dependents` — объединённая проверка children || properties, с обновлённым сообщением ошибки.
- `REQ-07` Ретроспективные patches к FT-HW1-01 и FT-HW1-04 feature.md документам.

### Non-Scope

- `NS-01` Required link (branch_id остаётся optional).
- `NS-02` Массовое переназначение properties между branches.
- `NS-03` Frontend (HW-2 FE2 добавит branch selector).

### Constraints

- `CON-01` Не ломать существующие properties без branch (все остаются валидными).
- `CON-02` Backward-compatible JSON: `branch_id: null`, `branch: null` для unlinked.
- `CON-03` ADR-015 pattern: новая фича owns patch старых артефактов.

## How

### Solution

Миграция `add_reference :properties, :branch, foreign_key: true`, `on_delete: restrict`. Model-level кастомная валидация cross-org isolation. Controller принимает `branch_id` в permitted params. JSON serializer обновляется.

### Change Surface

| Surface | Why |
|---|---|
| `backend/db/migrate/..._add_branch_to_properties.rb` | Schema |
| `backend/app/models/property.rb` | belongs_to + validation |
| `backend/app/models/branch.rb` | Unified `prevent_destroy_if_has_dependents` |
| `backend/app/controllers/api/v1/properties_controller.rb` | Permitted params + serializer |
| Spec F1 patches | Retrospective update (ADR-015) |
| Spec F4 patches | Retrospective update (ADR-015) |

## Verify

### Exit Criteria

- `EC-01` PATCH Property с branch_id работает.
- `EC-02` GET Property возвращает nested branch.
- `EC-03` Cross-org branch_id → 422.
- `EC-04` Destroy Branch with linked Property → 422 с обновлённым сообщением.
- `EC-05` Null unlink работает.

### Acceptance Scenarios

- `SC-01` PATCH property с branch_id → 200 + nested branch в ответе.
- `SC-02` POST property с branch_id своей org → 201.
- `SC-03` PATCH с чужим branch_id → 422 `"does not exist in this organization"`.
- `SC-04` PATCH branch_id: null на linked property → 200, unlink.
- `SC-05` DELETE branch с linked property → 422 unified error.

### Checks

| Check ID | Covers | How | Expected |
|---|---|---|---|
| `CHK-01` | все EC/SC | `bundle exec rspec spec/requests/api/v1/properties_spec.rb spec/requests/api/v1/branches_spec.rb spec/models/property_spec.rb spec/models/branch_spec.rb` | Green |

### Evidence

- `EVID-01` RSpec green в CI.
- `EVID-02` 324 тестов total, backend coverage ~88%.

## Historical Source

`homeworks/hw-1/features/05-property-branch-link/`.
