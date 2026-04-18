---
title: "FT-036 P4: Dashboard + Reports + Finances + Owner"
doc_kind: feature
doc_function: phase
purpose: "Port 5 analytics views (~990 LOC) to pure PrimeVue + Tailwind. Dashboard editorial layout preserved per FT-031. All money formatting via formatMoney + authStore.currency."
derived_from:
  - ./feature.md
  - ./phase-3-settings.md
  - ../FT-031-dashboard-redesign/feature.md
status: active
delivery_status: planned
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-036 P4: Dashboard & Reports

## What

### Problem

5 analytics views remaining в hybrid state:
- **DashboardView** (406 LOC) — FT-031 editorial hero + status bar + upcoming lists. Highest visual-preservation risk.
- **ReportsView** (160 LOC) — occupancy / ADR / RevPAR + monthly table.
- **ExpenseListView** (162 LOC) — CRUD list + period filter.
- **OwnerListView** (145 LOC) — owner directory CRUD.
- **OwnerStatementView** (114 LOC) — per-owner P&L breakdown.

All reuse P2/P3 patterns (DataTable, Dialog, ConfirmDialog, Toast). No new infra.

### Outcome

| Metric | Target |
|---|---|
| 5 views with 0 `<v-*>` templates | grep |
| Dashboard FT-031 editorial hierarchy preserved | Manual QA |
| All money через formatMoney(cents, currency) | code review |
| Tests ≥ baseline (830) green | `yarn test` |
| Coverage ≥ 94.58% (P1 tip −1pp) | `yarn test:coverage` |
| MDI refs drop | 54 → ≤ 35 (~−20) |
| Build green | `yarn build` |

### Scope

- `REQ-01` **DashboardView.** Editorial hero (Geologica display, `clamp(1.75rem, 4vw, 3.5rem)`) + horizontal stacked status bar + upcoming lists. Vuetify replaced с:
  - `v-card` → Tailwind `<div class="rounded-xl border bg-surface-0">`
  - `v-progress-circular/v-progress-linear` → PrimeVue `ProgressBar` or Tailwind `<div class="animate-pulse">`
  - `v-btn` → PrimeVue Button
  - `v-icon` → PrimeIcons
  - `v-chip` → Tailwind styled span
- `REQ-02` **ReportsView.** Summary cards + monthly `v-data-table` → PrimeVue DataTable. Period selector → `v-select` → PrimeVue Select.
- `REQ-03` **ExpenseListView.** Standard CRUD pattern: DataTable + Dialog + useConfirm/useToast. Expense schema in `schemas/expense.js` (create date/amount/category required).
- `REQ-04` **OwnerListView.** Same CRUD pattern. Owner schema в `schemas/owner.js`.
- `REQ-05` **OwnerStatementView.** Read-only per-owner financial breakdown. Tailwind table + status chips.
- `REQ-06` **Money formatting invariant.** Every money value renders через `formatMoney(cents, currency)` where `currency = authStore.organization?.currency || 'RUB'`. No hardcoded `₽`.
- `REQ-07` **Dashboard empty-state preservation.** FT-031 patterns (no KPI card grids, no saturated accent background) — verify не regress.
- `REQ-08` **Tests rewrite.** 5 test files — mountWithPrimeVue pattern.
- `REQ-09` **Coverage ratchet.** ≥ 94.58% floor.

### Non-Scope

- `NS-01` **No new analytics features.** Same metrics, same endpoints.
- `NS-02` **No backend changes.**
- `NS-03` **No chart libraries.** Current views don't use charts (just tables + number blocks).
- `NS-04` **PDF export (FT-017)** — PDF generation is backend; frontend just links.
- `NS-05` **Period picker redesign** — keep same month/quarter/year enum.

### Constraints / Assumptions

- `ASM-01` P0..P3 merged.
- `ASM-02` DashboardView uses `authStore.organization?.currency` pattern already (FT-031).
- `ASM-03` Reports/Expense/Owner already use `formatMoney` from utils.
- `CON-01..04` unchanged.

## How

### Solution

Standard P2/P3 pattern reuse. Dashboard получает most attention для visual parity (FT-031/FT-026 investment preservation via Tailwind tokens + Geologica). Rest = mechanical DataTable + Dialog migration.

### Change Surface

| Surface | Type |
|---|---|
| `frontend/src/views/DashboardView.vue` | rewrite |
| `frontend/src/views/ReportsView.vue` | rewrite |
| `frontend/src/views/ExpenseListView.vue` | rewrite |
| `frontend/src/views/OwnerListView.vue` | rewrite |
| `frontend/src/views/OwnerStatementView.vue` | rewrite |
| `frontend/src/schemas/expense.js` | new (Zod) |
| `frontend/src/schemas/owner.js` | new (Zod) |
| `frontend/src/__tests__/views/*.test.js` | rewrite (5) |
| `frontend/src/__tests__/schemas/` | extend crud.test.js |

### Failure Modes

- `FM-01` **Dashboard editorial regression** — if Tailwind utility mapping loses Geologica rendering or OKLCH tint → FT-031 regression. Mitigation: visual QA required; test count preserved.
- `FM-02` **Money formatting drift** — грёп `₽|\$|€` в templates → 0 hardcoded symbols (only через formatMoney).
- `FM-03` **Reports period filter** — Select option-value vs option-label semantics.
- `FM-04` **Dialog ×2 в одной view** (expenses edit+delete, owners edit+delete) — proven pattern.

### Rollback

Per-view atomic commits; revert selectively.

## Verify

### Exit Criteria

- `EC-01` REQ-01..09 реализованы.
- `EC-02` 5 views 0 `<v-*>` templates.
- `EC-03` `yarn test --run` ≥ 830 green.
- `EC-04` Coverage ≥ 94.58%.
- `EC-05` `yarn build` green.
- `EC-06` Manual QA Dashboard dark+light — FT-031 parity.

### Acceptance Scenarios

- `SC-01` Dashboard displays revenue + status bar + upcoming checkins — все live data from store.
- `SC-02` Reports shows occupancy/ADR/RevPAR для selected period.
- `SC-03` Expense CRUD: add/edit/delete round-trip.
- `SC-04` Owner CRUD.
- `SC-05` OwnerStatement показывает breakdown.
- `SC-06` All money in one currency (org default или switched in Settings).

### Checks

| CHK | How |
|---|---|
| `CHK-01` | `yarn test:coverage` ≥ 94.58% |
| `CHK-02` | `yarn test` green |
| `CHK-03` | `yarn build` green |
| `CHK-04` | i18n parity |
| `CHK-05` | Manual QA Dashboard dark+light |
| `CHK-06` | grep mdi- delta ≤ 35 refs |
