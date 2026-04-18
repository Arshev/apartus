---
title: "FT-036 P6: Reservations + Booking Widget"
doc_kind: feature
doc_function: phase
purpose: "Port Reservation views + FT-035 helper components + BookingWidget to pure PrimeVue + Tailwind + Zod. Final view-level phase before P7 cleanup."
derived_from:
  - ./feature.md
  - ./phase-5-gantt.md
  - ../FT-035-reservation-form-redesign/feature.md
  - ../FT-010-booking-widget/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-036 P6: Reservations & Booking Widget

## What

### Problem

Last view-level phase. Reservation slice has significant FT-035 investment (hybrid layout, price summary, guest quick-create dialog, date range picker, form sections). BookingWidget is public-facing (guest-consuming, no auth) — no layout wrapper.

Files:
- `ReservationFormView.vue` (377) — FT-035 hybrid form: 4 sections + sticky price summary + Zod validation
- `ReservationListView.vue` (135) — CRUD list + action buttons
- `BookingWidgetView.vue` (134) — public widget
- `components/ReservationFormSection.vue` — slot wrapper (FT-035)
- `components/ReservationDateRangePicker.vue` — popup range picker (FT-035)
- `components/ReservationPriceSummary.vue` — sticky breakdown panel (FT-035)
- `components/GuestQuickCreateDialog.vue` — inline guest create (FT-035)

### Outcome

| Metric | Target |
|---|---|
| 3 views + 4 components 0 Vuetify templates | grep |
| FT-035 invariants preserved | Manual QA reservation form flow |
| Tests ≥ baseline (835) green | `yarn test` |
| Coverage ≥ 94.58% | `yarn test:coverage` |
| MDI refs drop | 19 → ≤ 5 | grep |
| Build green | `yarn build` |
| i18n parity | 490+ |

### Scope

- `REQ-01` **ReservationListView.** DataTable + Column, ConfirmDialog for delete, Toast for success/error. Action buttons (check-in, check-out, cancel, edit, delete).
- `REQ-02` **ReservationFormView** (FT-035 hybrid layout preserved). All PrimeVue: InputText, Select (unit+guest autocomplete), Button, Textarea. Sticky price summary layout unchanged.
- `REQ-03` **ReservationFormSection** — simple slot wrapper. Already mostly Vuetify-free (just extracted helper).
- `REQ-04` **ReservationDateRangePicker** — replace v-menu+v-text-field+v-date-picker с PrimeVue DatePicker (range mode).
- `REQ-05` **ReservationPriceSummary** — replace v-chip+v-btn с Tailwind styled spans + Button.
- `REQ-06` **GuestQuickCreateDialog** — replace v-dialog+v-text-field+v-btn с PrimeVue Dialog+InputText+Button. Uses guestSchema.
- `REQ-07` **BookingWidgetView** — public page, no DefaultLayout. Port с Tailwind only (no PrimeVue Toast for public simplicity — inline alerts).
- `REQ-08` **Preserve FT-035 invariants:**
  - Hybrid 2-col layout (≥ 960px) с sticky summary
  - Manual override lock + Пересчитать button
  - total_price_cents SSoT
  - Per-org currency (authStore.organization.currency)
  - 4 editorial sections
- `REQ-09` **Tests** — switch 6 test files to mountWithPrimeVue, preserve all assertions.
- `REQ-10` **Coverage ratchet.** ≥ 94.58%.

### Non-Scope

- `NS-01` **No behavior changes.** Same workflow, same fields, same API calls.
- `NS-02` **BookingWidget redesign** — port only.
- `NS-03` **New payment flow** — out.
- `NS-04` **e2e tests** — restored в P7.

### Constraints / Assumptions

- `ASM-01` P0..P5 merged.
- `ASM-02` PrimeVue DatePicker supports range mode (`selectionMode="range"`).
- `CON-01..04` unchanged.

## How

### Solution

Reuse patterns:
- DataTable + Dialog + useConfirm/useToast (P2/P3)
- InputText + Select + Textarea + Button (P1-P4)
- Tailwind editorial hierarchy (P4 Dashboard)
- color-mix for opacity tints (P5 Gantt)

### Change Surface

| File | Type |
|---|---|
| `frontend/src/views/ReservationListView.vue` | rewrite |
| `frontend/src/views/ReservationFormView.vue` | rewrite |
| `frontend/src/views/BookingWidgetView.vue` | rewrite |
| `frontend/src/components/ReservationFormSection.vue` | minor (scoped CSS) |
| `frontend/src/components/ReservationDateRangePicker.vue` | rewrite |
| `frontend/src/components/ReservationPriceSummary.vue` | rewrite (tokens + Button) |
| `frontend/src/components/GuestQuickCreateDialog.vue` | rewrite |
| Tests для 7 files | rewrite (mountWithPrimeVue) |

### Failure Modes

- `FM-01` **PrimeVue DatePicker range API** — verify `selectionMode="range"` emits same shape.
- `FM-02` **BookingWidget standalone** — no Toast/ConfirmDialog services available. Use inline alerts only.
- `FM-03` **FT-035 manual override UX** — preserve exact behavior (`manualOverride` ref + Пересчитать button).
- `FM-04` **Sticky price summary** — `position: sticky` CSS unchanged.
- `FM-05` **Form section `<h2>` aria-labelledby** — preserved.

### Rollback

Per-file atomic commits.

## Verify

### Exit Criteria

- `EC-01..10` per spec.
- `EC-02` 3 views + 4 components 0 Vuetify templates.
- `EC-03` Tests green.
- `EC-04` Coverage ≥ 94.58%.
- `EC-05` Build green.

### Acceptance Scenarios

- `SC-01` Reservation list CRUD works.
- `SC-02` Reservation form: create/edit with all FT-035 features — date range picker, price summary (breakdown + manual override + recalc), guest quick-create.
- `SC-03` BookingWidget renders standalone (no auth).
- `SC-04` Dark mode parity.

### Checks

| CHK | How |
|---|---|
| `CHK-01` | coverage ≥ 94.58% |
| `CHK-02` | tests green |
| `CHK-03` | build green |
| `CHK-04` | i18n parity |
| `CHK-05` | Manual QA flow (login → reservations → create → save → list → edit → delete) |
| `CHK-06` | mdi- grep |
