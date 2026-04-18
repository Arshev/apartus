---
title: "FT-035: Reservation Form Redesign"
doc_kind: feature
doc_function: canonical
purpose: "Full redesign ReservationFormView: hybrid layout с sticky price breakdown, date range popup, guest quick-create dialog, per-org currency hookup. Закрывает AI-slop форму и включает workflow-ускорители для operational manager."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../../domain/money-and-currency.md
  - ../FT-002-reservations/feature.md
  - ../FT-003-pricing/feature.md
  - ../FT-015-configurable-currency/feature.md
  - ../FT-026-design-refresh/feature.md
  - ../../../.impeccable.md
status: active
delivery_status: planned
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-035: Reservation Form Redesign

## What

### Problem

`ReservationFormView` (180 строк) — vertical-stacked `v-text-field`/`v-select`, визуально плоский без иерархии, не следует Impeccable refresh (FT-026..034), и имеет функциональные пробелы:

1. **RUB-hardcoded.** Переменная `form.total_price_rub`, label «Цена (RUB)» — в конфликте с FT-015 per-org currency. Остальной UI (Dashboard/Gantt/Tooltip) уже использует `authStore.organization?.currency` + `formatMoney`, форма — нет.
2. **No price transparency.** Auto-calc работает, но breakdown не виден: user вводит даты, цена меняется — почему? Сколько ночей по base, сколько по seasonal? Operational manager должен доверять auto-calc, сейчас — чёрный ящик.
3. **Two native date inputs без nights counter.** Нет визуального range, нет счётчика ночей — пилот каждый раз считает вручную.
4. **Guest create вне формы.** Если гостя нет в списке — переход на `/guests/new`, потеря контекста резервации. Пилот бронирует 10+ раз в день; context switch дорогой.
5. **Editorial debt.** H1 `text-h4` (Vuetify default), секций нет, summary нет — форма «AI-slop» по Impeccable критерию: same-weight fields, no hierarchy, no information density.

Operational persona (manager, 10+ резерваций/день): хочет видеть цену-breakdown, быстро создавать нового гостя inline, визуально выбирать диапазон дат. Новичок (owner заходит раз в неделю): хочет понятную иерархию и подсказки.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | Form использует per-org currency end-to-end | `total_price_rub` hardcoded | `total_price_cents` + `formatMoney(_, currency)` везде | Code diff |
| `MET-02` | Price breakdown visible | нет | Sticky panel shows nights × rate rows + seasonal overrides + total | Visual QA |
| `MET-03` | Nights count visible | нет | Inline chip `"5 ночей"` в date display | Visual QA |
| `MET-04` | Guest create inline | переход на `/guests/new` | Dialog открывается из формы, гость выбран after create | E2E flow |
| `MET-05` | Editorial hierarchy | H1 + flat | H1 Geologica + 4 `<section>` с `<h2>` + summary card | Visual QA |
| `MET-06` | Coverage ratchet | current | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Hybrid layout.** Wide viewport (≥ 960px): 2-column grid — left: form sections (Unit & Dates / Guest / Pricing / Notes), right: sticky `ReservationPriceSummary` panel top-aligned. Narrow (< 960px): summary collapses в top collapsible card (default expanded), form single-column, sticky disabled. Breakpoint determined via Vuetify `useDisplay()` (`mdAndUp`).
- `REQ-02` **Editorial sections.** Каждая секция обёрнута в `<section>` с `<h2>` Geologica display (1.25rem, weight 500), margin-bottom 32px. Extract helper component `ReservationFormSection.vue` (slot-based wrapper).
- `REQ-03` **Date range popup picker.** Extract `ReservationDateRangePicker.vue`. Single readonly `v-text-field` display `"15 апр – 20 апр · 5 ночей"` → `v-menu` opens `v-date-picker multiple="range"`. On range complete emit `update:checkIn` + `update:checkOut`. Empty state: placeholder `"Выберите даты"`. Narrow viewport → `v-dialog` fullscreen вместо menu.
- `REQ-04` **Price breakdown panel.** Extract `ReservationPriceSummary.vue`. Props: `{ checkIn, checkOut, unitId, basePriceCents, seasonalPrices, currency, manualTotalCents, autoTotalCents, manualOverride }`. Renders:
  - Date range line + nights count
  - Breakdown rows grouped by price bucket: `"N × {formatMoney(price, currency)}"`, seasonal rows tagged `(сезон)`
  - Divider
  - `Итого: {formatMoney(total, currency)}` в Geologica weight 500
  - If `manualOverride` active AND `manualTotal !== autoTotal` → chip `"Ручная цена, расхождение: ±{diff}"` + кнопка `Пересчитать`
  - Empty/error states: `"Выберите юнит и даты"`, `"Ошибка расчёта"`
- `REQ-05` **Guest quick-create dialog.** Extract `GuestQuickCreateDialog.vue`. Compact variant `GuestFormView` (first_name, last_name required; email, phone optional; notes omitted). Triggered by `v-btn icon="mdi-plus"` next to guest autocomplete. On successful create — emit `created(guest)`, parent appends to guests list и устанавливает `form.guest_id`. On error — dialog stays open с inline alert, parent form untouched.
- `REQ-06` **Guest autocomplete.** Заменить `v-select` на `v-autocomplete` (type-to-filter, no free-text entry). Items source: existing guests list. Новый гость создаётся **только** через `GuestQuickCreateDialog`.
- `REQ-07` **Currency hookup.** Переименовать `form.total_price_rub` → `form.total_price_cents` (integer, cents). Total input — `v-text-field` с prefix/suffix symbol, displayed value = `centsToUnits(total_price_cents)`, on input → `total_price_cents = unitsToCents(...)`. Все отображения цены через `formatMoney(cents, currency)`. `currency` resolved from `authStore.organization?.currency || 'RUB'`. Add named export `getCurrencySymbol(code)` → `CURRENCIES[code]?.symbol ?? '$'` в `utils/currency.js` (CURRENCIES table уже содержит symbols, нужен только accessor).
- `REQ-08` **Manual override lock.** `manualOverride` ref: `false` initially; становится `true` если user редактирует total input напрямую. Auto-calc watcher bails out если `manualOverride`. Summary panel показывает `autoTotal` всегда; diff chip + `Пересчитать` кнопка. Click `Пересчитать` → `manualOverride = false`, watcher triggers, `form.total_price_cents = autoTotal`.
- `REQ-09` **Edit mode prefill.** GET `/reservations/:id` returns `total_price_cents` — prefill напрямую (без `/100` conversion), `manualOverride = true` initially (чтобы не перезаписать existing price при first watcher fire). В edit mode auto-recalc **не триггерится** изменением дат — user должен явно нажать `Пересчитать` чтобы сбросить lock и получить fresh auto-total. Rationale: existing reservation price may reflect negotiated/comped value, mute auto-recalc protects от accidental clobber.
- `REQ-10` **Nights counter.** В date range display — `"{range} · {N} ночей"`. i18n pluralization (`night`/`nights` en; `ночь`/`ночи`/`ночей` ru via `$tc`).
- `REQ-11` **Validation.** `unit_id`, `check_in`, `check_out` required; `check_out > check_in`; `guests_count >= 1`. Submit blocked via `formRef.validate()`. `total_price_cents` — no min (0 acceptable for comped stays).
- `REQ-12` **i18n parity.** Новые ключи в `reservations.form.*` (`priceBreakdown`, `manualPrice`, `recalc`, `seasonalLabel`, `nightsCount`, `dateRangePlaceholder`, `emptyPriceState`, `priceCalcError`) и `guests.quickCreate.*` (`title`, `submit`, `errors`). RU + EN обязательны.
- `REQ-13` **A11y.**
  - Каждая `<section>` имеет `aria-labelledby="section-N-heading"`
  - Date picker popup `role="dialog"` с Escape-close
  - Price summary `aria-live="polite"` для breakdown updates
  - Guest dialog focus trap (v-dialog default)
  - Manual-override chip `aria-live="polite"`
- `REQ-14` **Dark mode.** Summary panel tinted bg `rgb(var(--v-theme-surface-variant))` или analogous OKLCH tint, border `rgba(var(--v-theme-on-surface), 0.12)`. Диff-chip: warning-tinted.
- `REQ-15` **Tests.**
  - `ReservationPriceSummary.test.js` — breakdown pure-function (base only, 1 seasonal, 2 seasonals straddling, empty state, diff chip visibility) + `aria-live="polite"` attribute present
  - `ReservationDateRangePicker.test.js` — display format, nights count, menu open/close, range emit + popup `role="dialog"` presence
  - `GuestQuickCreateDialog.test.js` — submit success emits created; error stays open + dialog focus-trap attribute
  - `ReservationFormView.test.js` (expand existing) — prefill uses cents; manual override locks auto-calc; submit payload `total_price_cents`; currency from authStore; guest dialog flow; каждая `<section>` имеет `aria-labelledby`
- `REQ-16` **Coverage ratchet.** `floor(actual) - 1`, как после FT-034.

### Non-Scope

- `NS-01` **Discount / tax fields.** Separate FT if нужно бизнесу.
- `NS-02` **Availability check в picker** (disabled dates для already-booked). Nice-to-have, требует self-exclude logic в edit mode + loading UX. Separate small FT если понадобится.
- `NS-03` **Guest search by phone/email backend autocomplete.** Pока combobox фильтрует по label-string locally. Backend-side search — отдельный FT.
- `NS-04` **Multi-unit booking.** Domain-level изменение (одно reservation → несколько юнитов). Out of scope.
- `NS-05` **ReservationListView redesign.** Отдельный FT. Здесь только FormView.
- `NS-06` **Currency selector в форме.** Currency readonly из `authStore.organization.currency`; menu ведёт в Settings. Changing currency mid-form — не use case.
- `NS-07` **Backend schema changes.** `total_price_cents` уже существует; POST/PATCH `/reservations` accepts его. Backend не трогаем.
- `NS-08` **Booking widget (public).** `BookingWidgetView` — отдельная поверхность, здесь не меняем.

### Constraints / Assumptions

- `ASM-01` FT-034 merged (baseline ~754 tests).
- `ASM-02` `formatMoney`, `centsToUnits`, `unitsToCents`, `CURRENCIES` экспортируются из `utils/currency.js` (verified).
- `ASM-03` `authStore.organization?.currency` — established pattern (used в Dashboard, Gantt, Tooltip).
- `ASM-04` Vuetify 4 `v-date-picker` supports `multiple="range"` prop; emits `Date[]` (all dates in range inclusive). `checkIn = range[0]`, `checkOut = range[range.length - 1]`. Normalized в `ReservationDateRangePicker`.
- `ASM-05` `seasonalPricesApi.list(unitId)` — существующий endpoint (used сейчас), возвращает `[{ id, start_date, end_date, price_cents }]`.
- `ASM-06` Reservation API GET returns `total_price_cents` (не `_rub`) — проверить; если возвращает и то и другое, используем cents.
- `CON-01` No new npm dependencies. Все компоненты на Vuetify + существующих utils.
- `CON-02` No TypeScript (ADR-002).
- `CON-03` Coverage ratchet policy.
- `CON-04` Backend: zero changes (REQ/ASM confirmed above).
- `CON-05` i18n RU + EN parity mandatory.

## How

### Solution

**Overall approach:** Extract 4 focused components, keep `ReservationFormView` как orchestrator form-state + submit + watchers. Data flow:

```
ReservationFormView
├── form state { unit_id, guest_id, check_in, check_out, guests_count, total_price_cents, notes }
├── manualOverride ref
├── watch(unit+dates) → auto-calc → form.total_price_cents (if !manualOverride)
│
├── <ReservationFormSection title="Юнит и даты">
│     <v-autocomplete unit />
│     <ReservationDateRangePicker v-model:checkIn v-model:checkOut />
│
├── <ReservationFormSection title="Гость">
│     <v-autocomplete guest />  [+ Новый гость button]
│     <GuestQuickCreateDialog v-model @created />
│
├── <ReservationFormSection title="Цена">
│     <v-text-field total (cents↔units) @input=manualOverride=true />
│     <v-text-field guests_count />
│
├── <ReservationFormSection title="Заметки">
│     <v-textarea notes />
│
└── [Submit | Cancel]

ReservationPriceSummary (sibling / grid-column right, sticky)
├── props: checkIn, checkOut, unitId, basePriceCents, seasonalPrices, currency, manualTotalCents, autoTotalCents
├── breakdown computed: bucketed [(price, nights, seasonal)]
├── diff chip if manualOverride && manual !== auto
└── emits: recalc  (parent unsets manualOverride)
```

**Auto-calc remains in parent** (needs unitDataMap cache + access to form state); summary is pure display + triggers recalc event.

**Trade-offs:**
- **Component extraction vs inline.** Extracting 4 components добавляет файлы, но каждый < 120 строк, testable в изоляции, re-usable (DateRangePicker может пригодиться в Reports/Search filters). Inline version — один большой 400+-line файл, тяжёлый для LLM context и тестов. Chose extraction.
- **Autocomplete vs select for guest.** Autocomplete добавляет type-to-filter (nice UX для 500+ guests), strict id-only return (no free-text). Combobox rejected потому что разрешает Enter-to-create free-text, что размыло бы single-entry-point принцип (quick-create dialog).
- **Manual override UX.** Alternative — всегда blind auto-recalc. Rejected: user хочет задать скидку/надбавку. Current pattern (lock + recalc button) разделяет намерение.
- **Sticky summary vs fixed position.** Sticky (`position: sticky; top: 80px`) в grid-column — лучше чем `position: fixed` (избегает overlap с app-bar/drawer). Requires parent grid to have height > viewport для активации sticky.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `frontend/src/views/ReservationFormView.vue` | code | Orchestrator rewrite: form state, extracted sections, watchers, cents migration |
| `frontend/src/components/ReservationFormSection.vue` | code (new) | Slot wrapper: `<section>` + Geologica `<h2>` + editorial spacing |
| `frontend/src/components/ReservationDateRangePicker.vue` | code (new) | Readonly field + v-menu + v-date-picker range |
| `frontend/src/components/ReservationPriceSummary.vue` | code (new) | Sticky panel: breakdown + total + diff chip |
| `frontend/src/components/GuestQuickCreateDialog.vue` | code (new) | v-dialog + compact guest form |
| `frontend/src/utils/currency.js` | code | Add `getCurrencySymbol(code)` helper если нет (use для input prefix) |
| `frontend/src/locales/ru.json` | code | New keys `reservations.form.*`, `guests.quickCreate.*` |
| `frontend/src/locales/en.json` | code | Same keys EN |
| `frontend/src/__tests__/views/ReservationFormView.test.js` | code | Expand: prefill cents, manual override, guest dialog, currency hookup |
| `frontend/src/__tests__/components/ReservationPriceSummary.test.js` | code (new) | Breakdown computed + diff chip |
| `frontend/src/__tests__/components/ReservationDateRangePicker.test.js` | code (new) | Display format + range emit |
| `frontend/src/__tests__/components/GuestQuickCreateDialog.test.js` | code (new) | Submit emit + error state |
| `memory-bank/features/README.md` | doc | Register FT-035 row |

### Contracts

| Contract | I/O | Producer/Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `ReservationFormSection` props: `{ title: string, id?: string }`; slot: default | View (parent) → wrapper | `<h2 :id>` + slot content |
| `CTR-02` | `ReservationDateRangePicker` props: `{ modelValue: { checkIn, checkOut }, currency? }`; emits: `update:modelValue({ checkIn, checkOut })` | Parent / picker | ISO date strings |
| `CTR-03` | `ReservationPriceSummary` props: `{ checkIn, checkOut, unitId, basePriceCents, seasonalPrices, currency, manualTotalCents, autoTotalCents, manualOverride }`; emits: `recalc` | Parent / summary | Pure display |
| `CTR-04` | `GuestQuickCreateDialog` props: `{ modelValue: boolean }`; emits: `update:modelValue`, `created(guest)` | Parent / dialog | Guest object full from API |
| `CTR-05` | Reservation POST/PATCH payload: `{ unit_id, guest_id, check_in, check_out, guests_count, total_price_cents, notes }` | View → store → API | No `_rub` field |

### Failure Modes

- `FM-01` **Vuetify range emit edge** — если `v-date-picker` возвращает single-element array (user кликнул start, но не end), DateRangePicker не emit'ит `update:modelValue` до второго клика. Guard: require `range.length >= 2`.
- `FM-02` ~~Combobox free-text entry~~ — mitigated by REQ-06 выбор `v-autocomplete` вместо combobox (no free-text).
- `FM-03` **manualOverride не сбрасывается при unit change** — user выбрал юнит, задал manual price, сменил юнит → manual остаётся, misleading. Mitigation: reset `manualOverride = false` в watcher на `unit_id` change.
- `FM-04` **Edit mode initial watcher fires и перезаписывает** — см. REQ-09, set `manualOverride = true` в `loadReservation`. Reset только при явном unit change (not initial load).
- `FM-05` **Seasonal API 500** — already handled в existing code (sets `priceWarning`). Extend: summary panel shows error state chip.
- `FM-06` **Guest list стал stale после quick-create** — parent appends locally to `guests.value` (fast), но next mount refreshes from API (eventually consistent).
- `FM-07` **Narrow viewport sticky broken** — disabled via `position: static` on `md-and-down`. Summary становится top collapsible card.
- `FM-08` **Currency change в Settings во время открытой формы** — cents payload OK, display auto-updates через computed `currency`. No action needed.

### Rollback

- `RB-01` Single squash-commit revert. No schema changes, no data migration. New components are additive; rolling back restores old single-file form.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..16` реализованы.
- `EC-02` `ReservationFormView` orchestrator ≤ 200 строк после extraction.
- `EC-03` 754+ tests green; ratchet met.
- `EC-04` Manual QA: create new reservation (RU org + USD org), edit existing, guest quick-create, manual override+recalc — все SC-01..07 pass.
- `EC-05` Dark mode parity visual check.
- `EC-06` CI green (lint + tests).
- `EC-07` i18n RU + EN parity; no hardcoded user-visible strings.

### Acceptance Scenarios

- `SC-01` **Create from scratch.** `/reservations/new` → select Unit → click date field → popup range picker → 15–20 апр → display `"15 апр – 20 апр · 5 ночей"` → summary `5 × 5 000 ₽ = 25 000 ₽` → guests 2 → submit → POST с `total_price_cents: 2500000` → redirect `/reservations`.
- `SC-02` **Seasonal breakdown visible.** Dates 29 апр – 4 мая, seasonal 1–10 мая `7 000 ₽` base `5 000 ₽`. Summary: `2 × 5 000 ₽ + 3 × 7 000 ₽ (сезон) = 31 000 ₽`.
- `SC-03` **Guest quick create.** Combobox empty → `+ Новый гость` → dialog → fill first/last → submit → dialog closes, combobox shows new guest selected.
- `SC-04` **Manual override.** Auto `25 000 ₽` → user edits input → `20 000 ₽` → chip `"Ручная цена, скидка 5 000 ₽"` visible → submit sends `total_price_cents: 2000000`.
- `SC-05` **Recalc.** After SC-04, click `Пересчитать` chip → form.total reverts to 25 000 ₽ → chip disappears.
- `SC-06` **Edit existing.** `/reservations/42/edit` → form prefilled с cents (not `/100` conversion) → manualOverride initially true → user changes dates → price NOT auto-recalculated (until they click Пересчитать) → submit PATCH с updated cents.
- `SC-07` **Non-RUB currency.** Org = USD → all displays `$`, input prefix `$`, breakdown `5 × $50.00 = $250.00`. Payload same cents.
- `SC-08` **Narrow viewport.** `< 960px` → summary в top collapsible card, form single-column, sections stacked, sticky disabled.
- `SC-09` **Dark mode parity.** All tints + chips readable в dark с OKLCH palette.
- `SC-10` **Accessibility.** Tab through: unit → date field → date popup (Escape closes) → guest combo → + button (Enter opens dialog) → dialog focus trapped (Escape closes) → total → count → notes → submit. Screen reader announces section headings.

### Negative / Edge Cases

- `NEG-01` `checkOut <= checkIn` → validation blocks submit, inline error на date field.
- `NEG-02` Unit не выбран → summary shows `"Выберите юнит и даты"`; auto-calc не запускается.
- `NEG-03` Seasonal API 500 → summary shows `"Ошибка расчёта"`, form still submittable с manual price.
- `NEG-04` Guest dialog submit fail → dialog stays open with inline error; parent form untouched.
- `NEG-05` Autocomplete free-text + Enter → component itself не emit'ит не-selected значение (Vuetify `v-autocomplete` default behavior).
- `NEG-06` Unit change после manual override → `manualOverride = false`, re-auto-calculates (per FM-03).
- `NEG-07` Rapid unit/date changes → watcher debounce не нужен (cached unitDataMap), но protect against race (use request id).

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | layout grid | `SC-01,08` | `CHK-05` | `EVID-05` |
| `REQ-02` | `FormSection` | `SC-01` | `CHK-02,05` | `EVID-02,05` |
| `REQ-03` | `CTR-02` | `SC-01,10` | `CHK-02,05` | `EVID-02,05` |
| `REQ-04` | `CTR-03` | `SC-01,02,04,05` | `CHK-02,05` | `EVID-02,05` |
| `REQ-05` | `CTR-04` | `SC-03,NEG-04` | `CHK-02` | `EVID-02` |
| `REQ-06` | solution | `SC-03,NEG-05` | `CHK-02` | `EVID-02` |
| `REQ-07` | `CTR-05` | `SC-01,07` | `CHK-02` | `EVID-02` |
| `REQ-08` | solution | `SC-04,05` | `CHK-02,05` | `EVID-02,05` |
| `REQ-09` | `FM-04` | `SC-06` | `CHK-02` | `EVID-02` |
| `REQ-10` | `CTR-02` | `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-11` | solution | `NEG-01..05` | `CHK-02` | `EVID-02` |
| `REQ-12` | i18n | `EC-07` | `CHK-02,04` | `EVID-02` |
| `REQ-13` | solution | `SC-10` | `CHK-02,05` | `EVID-02,05` |
| `REQ-14` | solution | `SC-09` | `CHK-05` | `EVID-05` |
| `REQ-15` | testing | `EC-03` | `CHK-01,02` | `EVID-01,02` |
| `REQ-16` | ratchet | `EC-03` | `CHK-01` | `EVID-01` |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-03,REQ-16` | `yarn test:coverage` | ratchet met | `artifacts/ft-035/verify/chk-01/` |
| `CHK-02` | `REQ-01..11,15` + SCs | `yarn test` | all green | `artifacts/ft-035/verify/chk-02/` |
| `CHK-03` | — | diff stat | ~900 LoC added (4 new components + 4 test files + view rewrite + locales) | — |
| `CHK-04` | `REQ-12` | i18n key parity `ru.json` ↔ `en.json` | 0 missing | — |
| `CHK-05` | `REQ-01..04,08,13,14` + `SC-01..10` | Manual QA light+dark + narrow viewport screenshots | Visual + flow consistency | `artifacts/ft-035/verify/chk-05/` |
| `CHK-06` | `EC-06` | markdownlint + CI | 0 / green | — |

### Evidence

EVID-01..06 per standard contract.

### Evidence contract

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-035/verify/chk-01/` |
| `EVID-02` | `yarn test` | `artifacts/ft-035/verify/chk-02/` |
| `EVID-05` | manual QA | `artifacts/ft-035/verify/chk-05/` |
| `EVID-06` | markdownlint + `gh` | CI link |
