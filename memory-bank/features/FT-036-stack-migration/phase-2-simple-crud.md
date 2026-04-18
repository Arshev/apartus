---
title: "FT-036 P2: Simple CRUD Views"
doc_kind: feature
doc_function: phase
purpose: "Port 9 views: Property/Unit/Guest Form+List + AmenityList + BranchTree+BranchNode. Pure PrimeVue + Tailwind + Zod. No v-app wrapper constraints (all render inside DefaultLayout but don't depend on Vuetify layout APIs)."
derived_from:
  - ./feature.md
  - ./phase-1-layout-auth.md
status: active
delivery_status: planned
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-036 P2: Simple CRUD

## What

### Problem

After P1, layout + auth converted. P2 converts 9 CRUD views (~1600 LOC) following pattern established в P1: form views use Zod schemas + PrimeVue inputs + Tailwind layout. List views swap `v-data-table` для PrimeVue `DataTable`. Delete dialogs → PrimeVue `ConfirmDialog`.

Это validates pattern для последующих phases — после P2 мы уверены что:
- DataTable migration viable
- Form list workflow (add/edit/delete) works end-to-end
- Nested forms (Unit under Property) не блокируются миграцией

### Outcome

| Metric ID | Metric | Target | Measurement |
|---|---|---|---|
| `MET-01` | 9 views converted | Property/Unit/Guest Form+List + AmenityList + BranchTree+BranchNode | code review |
| `MET-02` | 0 Vuetify `<v-*>` templates | grep in converted views returns 0 | grep |
| `MET-03` | Zod schemas | property, unit, guest — reused across form+list | `src/schemas/` |
| `MET-04` | Tests pass + hybrid coverage | ≥ 92% (relaxed per epic REQ-14) | coverage |
| `MET-05` | MDI inventory delta | baseline 94 → ~60 after P2 (~−35) | grep |
| `MET-06` | i18n parity | 490/490 | parity script |
| `MET-07` | Build green | `yarn build` | CI |
| `MET-08` | DataTable migration viable | 4 list views + amenity + tree all use new component | code review |

### Scope

- `REQ-01` **Property** — Form + List. Form: Zod schema с `name`, `address`, `branch_id`. List: PrimeVue DataTable + row-level edit/delete.
- `REQ-02` **Unit** — Form + List nested под Property. Zod schema `name`, `base_price_cents`, `max_guests`, `property_id`. Price input uses currency prefix/suffix pattern из FT-035.
- `REQ-03` **Guest** — Form + List. Zod schema `first_name`, `last_name`, `email?`, `phone?`, `notes?` — refactor existing `GuestQuickCreateDialog` schema для reuse.
- `REQ-04` **Amenity catalog** — list view + inline create (Vuetify's version likely has inline form). Port to PrimeVue pattern с `Button` add + `Dialog` для edit/delete.
- `REQ-05` **Branches** — tree view + recursive BranchNode component. Tree data structure unchanged (Pinia store logic); only rendering + add/edit/delete dialogs migrate.
- `REQ-06` **Shared schemas.** Create `schemas/property.js`, `schemas/unit.js`, `schemas/guest.js`. Each exports create+update schemas (same fields typically) + `validate()` returning i18n key errors (pattern from P1 schemas/auth.js).
- `REQ-07` **DataTable migration.** All list views use PrimeVue `DataTable` component. Columns defined as template refs. Sort, filter, pagination — if Vuetify version had them, preserve. Density = `compact` / `small`.
- `REQ-08` **ConfirmDialog for deletion.** Replace `v-dialog` delete flow с PrimeVue `ConfirmDialog` + `useConfirm()` composable pattern. Install global `Toast` + `ConfirmDialog` на DefaultLayout.
- `REQ-09` **Nested Unit form.** UnitForm called with `:propertyId` prop. Property auto-filled на create route `/properties/:id/units/new`, editable не allowed. Same behavior как сейчас.
- `REQ-10` **Amenity attach/detach на Unit.** UnitFormView has amenity selector (multi-select). Migrate to PrimeVue `MultiSelect` + chips. List of amenity IDs sent через unitsApi.
- `REQ-11` **Icons — 22 MDI → PrimeIcons mappings в converted views.** Capture delta в `artifacts/ft-036/phase-2/mdi-inventory.txt`.
- `REQ-12` **Tests rewrite.** 9 test files для views + 3 new schema test files. Use `mountWithPrimeVue` (extended из P1 — includes Vuetify shell stubs + PrimeVue stubs).
- `REQ-13` **Add DataTable + Dialog stubs к mountWithPrimeVue.** Minimal pass-through templates so tests focus on logic not rendering.
- `REQ-14` **Coverage ratchet — relaxed.** Threshold 92% per epic REQ-14 (hybrid phase). Per-phase rule: coverage не падает > 1pp vs P1 tip.

### Non-Scope

- `NS-01` **No redesign.** Visual parity with current Vuetify layout — forms same fields, lists same columns. FT-026 editorial polish preserved через Tailwind classes.
- `NS-02` **No new features.** Existing CRUD behavior preserved verbatim.
- `NS-03` **No backend changes.** API contracts unchanged.
- `NS-04` **No store changes** (Pinia stores untouched per epic REQ-12).
- `NS-05` **No e2e tests restored** — per epic REQ-13, deferred to P7.
- `NS-06` **No other views touched** — Reservation (P6), Dashboard/Reports (P4), Gantt (P5), Settings (P3).

### Constraints / Assumptions

- `ASM-01` P0 + P1 merged on migration branch; 821/821 tests green.
- `ASM-02` PrimeVue DataTable supports всё что v-data-table делал: columns, rows, loading, sort, pagination. Если specific prop отсутствует, fallback — use unstyled pattern + Tailwind.
- `ASM-03` PrimeVue ConfirmDialog works в jsdom (stubbed если нужно).
- `ASM-04` Pinia stores expose enough state (items list, loading, error) — no refactor needed.
- `CON-01..04` unchanged (no TS, no backend, no deps beyond existing).

## How

### Solution

**Conversion order (не в spec — тактическое решение в plan):** начинать с самого простого и самостоятельного (Guest, 2 views, 209 LOC) для validation pattern. Затем Amenity, Branches, Unit (nested complexity), Property last.

**Shared module pattern:**

```text
src/schemas/
├── auth.js (P1)
├── property.js (P2)
├── unit.js (P2)
└── guest.js (P2)

src/components/
├── GuestQuickCreateDialog.vue (P6 — reservation flow)
├── AppTopbar.vue (P1)
├── AppSidebar.vue (P1)
├── ConfirmDialog — imported directly в views, no wrapper (P2)
```

### Change Surface

| Surface | Type |
|---|---|
| `frontend/src/views/PropertyFormView.vue` | rewrite |
| `frontend/src/views/PropertyListView.vue` | rewrite |
| `frontend/src/views/UnitFormView.vue` | rewrite |
| `frontend/src/views/UnitListView.vue` | rewrite |
| `frontend/src/views/GuestFormView.vue` | rewrite |
| `frontend/src/views/GuestListView.vue` | rewrite |
| `frontend/src/views/AmenityListView.vue` | rewrite |
| `frontend/src/views/BranchTreeView.vue` | rewrite |
| `frontend/src/views/BranchNode.vue` | rewrite |
| `frontend/src/schemas/property.js` | new |
| `frontend/src/schemas/unit.js` | new |
| `frontend/src/schemas/guest.js` | new |
| `frontend/src/components/GuestQuickCreateDialog.vue` | refactor — use schemas/guest.js |
| `frontend/src/__tests__/schemas/{property,unit,guest}.test.js` | new |
| `frontend/src/__tests__/views/*.test.js` | rewrite (7-9 files) |
| `frontend/src/__tests__/helpers/mountWithPrimeVue.js` | extend stubs (DataTable, Tree, MultiSelect, ConfirmDialog usage) |
| `frontend/src/layouts/DefaultLayout.vue` | add Toast + ConfirmDialog globals |

### Contracts

| Contract | I/O | Notes |
|---|---|---|
| `CTR-01` | `propertyCreateSchema`, `propertyUpdateSchema` + `validate()` | Zod, i18n keys |
| `CTR-02` | `unitCreateSchema`, `unitUpdateSchema` — `property_id` required on create, locked on update | Zod |
| `CTR-03` | `guestCreateSchema` — reused в GuestForm, GuestQuickCreateDialog | Zod |
| `CTR-04` | `ConfirmDialog` + `useConfirm()` composable pattern — `confirm.require({ message, accept })` | PrimeVue API |
| `CTR-05` | DataTable `:value="items"`, columns via template — consistent API через все list views | PrimeVue |

### Failure Modes

- `FM-01` **DataTable stub может не покрыть filter/sort logic** — stub как passthrough; tests asserting filtered/sorted output skip за пределами scope.
- `FM-02` **ConfirmDialog теleport** — stubbed в mountWithPrimeVue как passthrough.
- `FM-03` **BranchTree recursive rendering** — BranchNode calls itself via recursive import (`<component :is="BranchNode">`). Migration должен сохранить recursion через standard Vue pattern.
- `FM-04` **MultiSelect для amenities** — PrimeVue MultiSelect behavior differs from Vuetify (may require different `option-label`/`option-value` wiring). Test thoroughly.
- `FM-05` **Coverage drop > 1pp** — realistic в P2 потому что 9 views rewritten. Mitigation: если coverage падает > 1pp, investigate — likely test-count not matching view complexity. Adjust.
- `FM-06` **Nested Unit form loses property context** on mount — URL parsing логика same, just rendering different. Verify на initialRoute в test.
- `FM-07` **i18n drift** — new validation messages могут появиться. Verify parity after phase.

### Rollback

- `RB-01` Phase = set of commits на migration branch. Individual view revert possible (each view commit atomic).

## Verify

### Exit Criteria

- `EC-01` All `REQ-01..14` реализованы.
- `EC-02` 9 views contain 0 `<v-` templates (converted pages).
- `EC-03` `yarn test --run` — all tests green (≥ 821 from P1 baseline).
- `EC-04` `yarn test:coverage --run` — ≥ 92% (relaxed threshold для hybrid).
- `EC-05` `yarn build` green.
- `EC-06` Manual QA: create property → create unit under it → delete unit → create guest → delete guest — full CRUD round-trip works.
- `EC-07` MDI inventory drops (baseline 94 → target ≤ 65).

### Acceptance Scenarios

- `SC-01` **Property CRUD.** Create `/properties/new` → form submit → redirect to `/properties` list → see new row → click edit → update → delete → confirm → row removed.
- `SC-02` **Unit nested.** Navigate `/properties/:id/units/new` → property_id locked → submit → `/properties/:id/units`.
- `SC-03` **Guest CRUD.** Create guest → list row → edit → delete.
- `SC-04` **Amenity attach to unit.** Unit form shows MultiSelect с amenity list → select → save → list shows chips.
- `SC-05` **Branch tree add.** Click add-child on node → dialog opens → submit → tree updates.
- `SC-06` **Zod validation.** Empty required field → inline error. Submit blocked.
- `SC-07` **Delete confirmation.** Click delete → ConfirmDialog → cancel → nothing happens; confirm → row removed + toast.
- `SC-08` **Dark mode parity.** All 9 views render correctly в dark.

### Negative / Edge Cases

- `NEG-01` Network error на submit → inline error alert, form stays open.
- `NEG-02` Delete fails → toast error, row remains.
- `NEG-03` Very deep branch tree (5+ levels) → renders without overflow.

### Traceability matrix

| REQ | Acceptance | Checks | EVID |
|---|---|---|---|
| `REQ-01..03` | `SC-01,02,03,06,07`, `NEG-*` | `CHK-02,05` | `EVID-02` |
| `REQ-04` | `SC-04,07` | `CHK-02,05` | `EVID-02` |
| `REQ-05` | `SC-05` | `CHK-02,05` | `EVID-02` |
| `REQ-06` | `SC-01,02,03,06` | `CHK-02` | schema tests |
| `REQ-07,08` | `SC-01,07` | `CHK-02,05` | `EVID-02` |
| `REQ-09` | `SC-02` | `CHK-02` | `EVID-02` |
| `REQ-10` | `SC-04` | `CHK-02,05` | `EVID-02` |
| `REQ-11` | `EC-07` | `CHK-06` | grep |
| `REQ-12,13` | `EC-03` | `CHK-02` | `EVID-02` |
| `REQ-14` | `EC-04` | `CHK-01` | `EVID-01` |

### Checks

| CHK | Covers | How | Expected |
|---|---|---|---|
| `CHK-01` | `EC-04` | `yarn test:coverage` | ≥ 92% |
| `CHK-02` | `EC-03` | `yarn test` | all green |
| `CHK-03` | `EC-05` | `yarn build` | success |
| `CHK-04` | parity | i18n script | 490+/same |
| `CHK-05` | SCs | Manual QA | CRUD works |
| `CHK-06` | `EC-07` | git grep mdi- | ≤ 65 refs |

### Evidence

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | tests + coverage | `artifacts/ft-036/phase-2/` |
| `EVID-02` | tests | `artifacts/ft-036/phase-2/` |
