---
title: "FT-028: Empty State UX — Gantt search + no-data teach"
doc_kind: feature
doc_function: canonical
purpose: "Заменить dead-end empty state (\"Ничего не найдено\") на teaching UX с подсказкой про scope поиска + inline Clear action. Closes P2 empty-state finding из Impeccable critique."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../../engineering/design-style-guide.md
  - ../FT-020-gantt-calendar/feature.md
  - ../FT-025-search-filters/feature.md
  - ../FT-026-design-refresh/feature.md
  - ../FT-027-reservation-bar-density/feature.md
  - ../../../.impeccable.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-028: Empty State UX — Gantt search + no-data teach

## What

### Problem

Impeccable critique (2026-04-17), P2:

> **Empty state doesn't teach** — `search-empty-state-*.png` shows big grey magnifier + "Ничего не найдено" — dead end. Impeccable anti-pattern cited directly.
> **Fix:** add sub-line "Поиск ищет по названиям юнитов, объектов и гостям", plus an inline `v-btn variant="text"` "Очистить поиск"; optionally show recent successful searches.

Сейчас `/calendar` имеет 2 empty state:

1. **Gantt search empty state** (FT-025 introduced): `<v-empty-state icon="mdi-magnify-close" :title="$t('calendar.gantt.search.empty', { query })" />` — один title, без subtext, без action. Пользователь застрял — не понимает что пошло не так и как восстановиться.
2. **Gantt no-data empty state** (FT-020 baseline): `<v-empty-state icon="mdi-calendar-blank" :title="$t('calendar.emptyState.title')" :text="$t('calendar.emptyState.text')" />` — есть text, но тот просто объясняет «добавьте юниты», без CTA.

Оба — статичные. Impeccable DO: «Design empty states that teach the interface, not just say 'nothing here'».

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | Gantt search empty state has explanatory subtext | нет | subtext describes search scope (unit name, property, guest) | Component test |
| `MET-02` | Gantt search empty state has inline Clear action | нет | `v-btn variant="text"` вызывает `onSearchEscape` | Component test + e2e |
| `MET-03` | Gantt no-data empty state has inline CTA к properties/units | title + text only | `v-btn` → `/properties/new` | Component test |
| `MET-04` | Coverage ratchet | текущий | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Search empty subtext.** Добавить `text` prop к search `<v-empty-state>`: «По названиям юнитов, объектов и гостям» / «Matches unit, property, and guest names». Trimmed wording per `.impeccable.md` «quietly modern» — без «Поиск ищет по...» boilerplate. New locale key `calendar.gantt.search.emptyHint`.
- `REQ-02` **Search empty inline Clear action.** Добавить `<v-btn variant="text" prepend-icon="mdi-close">{{ $t('calendar.gantt.search.clear') }}</v-btn>` через `v-empty-state` `actions` slot. Click → `onSearchEscape()` (существующий handler, clears + collapses + refocuses icon).
- `REQ-03` **No-data empty state CTA.** Добавить `actions` slot с `<v-btn variant="tonal" color="primary" prepend-icon="mdi-plus">`{{ $t('calendar.emptyState.cta') }}`</v-btn>` → router push `/properties/new` (default create-first-property flow). Если организация already имеет properties but no units — refine CTA к units/new в follow-up.
- `REQ-04` **i18n parity.** Все новые keys в ru + en. Existing key `calendar.gantt.search.empty` unchanged.
- `REQ-05` **Accessibility.** Clear button получает `aria-label` = title text. Focus management: после Clear, focus returns to magnifier icon (existing `onSearchEscape` behavior per FT-025).
- `REQ-06` **Tests.** Component tests для обоих empty states — assert title, subtext, button presence, button click handler.

### Non-Scope

- `NS-01` **Remaining empty states** (reservations, guests, properties, tasks, expenses, channels, branches, amenities, settings) — каждый отдельный context. Этот FT только `/calendar`. Other views — follow-up FTs batchом when brand/voice stabilizes.
- `NS-02` **Recent searches history** (dropdown of last 5 queries) — addon UX, требует localStorage design. Phase 1 — только teaching hint.
- `NS-03` **Search-as-you-type suggestions** — autocomplete-style. Вне scope.
- `NS-04` **Empty state illustrations** (замена MDI icon на custom SVG / Lottie) — design system-level decision, не MVP.
- `NS-05` **Smart CTA dispatch** — если org already has properties + units but no reservations, CTA → `/reservations/new`. Currently MVP — simpler `/properties/new` default. Refinement in follow-up.
- `NS-06` **Contextual tutorial** (tooltip showing where to click) — больше feature, не fit в empty-state scope.

### Constraints / Assumptions

- `ASM-01` FT-027 merged (baseline 679 tests + bar density).
- `ASM-02` Vuetify 4 `v-empty-state` supports both `:text` prop и `actions` slot.
- `ASM-03` `onSearchEscape` handler существует в `GanttCalendarView` (FT-025 SC-07, line 261) — atomic clear + collapse + refocus magnifier button.
- `ASM-04` Router уже имеет `/properties/new` route (existing).
- `CON-01` No new npm.
- `CON-02` No TypeScript.
- `CON-03` Coverage ratchet.
- `CON-04` No backend changes.
- `CON-05` i18n parity должна сохраниться (additions к обоим locale).

## How

### Solution

1. **`GanttCalendarView.vue`** — обновить оба empty-state blocks:
   - Search empty: добавить `:text="$t('calendar.gantt.search.emptyHint')"` + `actions` slot с text-variant button
   - No-data empty: добавить `actions` slot с tonal-variant button → `router.push('/properties/new')`
2. **Locales** (`ru.json`, `en.json`):
   - `calendar.gantt.search.emptyHint`: «По названиям юнитов, объектов и гостям» / «Matches unit, property, and guest names»
   - `calendar.gantt.search.clear`: «Очистить поиск» / «Clear search»
   - `calendar.emptyState.cta`: «Добавить объект» / «Add property»
3. **Tests** — extend `GanttCalendarView.test.js` для search empty state + new test для no-data.

Trade-off: default CTA → `/properties/new` vs smart dispatch. Smart требует check `properties.length` via allUnits API which would be redundant call. В MVP простой — new org onboarding starts с add-property. Иначе empty state практически не show'ется (add units to existing property).

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `frontend/src/views/calendar/GanttCalendarView.vue` | code | Add `:text` + `actions` slots |
| `frontend/src/__tests__/views/calendar/GanttCalendarView.test.js` | code | Test empty state actions |
| `frontend/src/locales/ru.json`, `en.json` | data | +3 keys each |
| `frontend/e2e/calendar-overlap.spec.js` | code | E2e: click Clear button in search empty state restores view |
| `memory-bank/domain/frontend.md` | doc | Mention empty state teaching |
| `memory-bank/features/README.md` | doc | Register FT-028 |

### Flow

1. User types unmatched query → debouncedQuery non-empty → `filtered.units.length === 0` → search empty state renders с title + subtext + Clear button.
2. User clicks Clear → `onSearchEscape()` → clear query, collapse bar, refocus icon.
3. ИЛИ user видит no-data state на empty org → click «Add property» → navigate к `/properties/new`.

### Contracts

| Contract | I/O | Producer / Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `v-empty-state` `text` prop rendered as subtext | CalendarView / DOM | Existing Vuetify API |
| `CTR-02` | `v-empty-state actions` slot содержит single button per state | CalendarView / DOM | Button emits click → handler in CalendarView |
| `CTR-03` | `onSearchEscape()` вызывается из empty-state Clear button | CalendarView | Reuses FT-025 handler (no new logic) |

### Failure Modes

- `FM-01` Router navigate fails → Vue Router default handling; CTA button не ломает state (`v-empty-state` still rendered).
- `FM-02` `onSearchEscape` throws → existing FT-025 guard (`?.$el?.focus`); graceful.
- `FM-03` i18n missing new key (misdeployed env) → vue-i18n shows key literal as fallback. Not ideal but non-breaking.

### ADR Dependencies

Нет.

### Rollback

- `RB-01` Single squash commit revert → empty states возвращаются к FT-025 baseline (title only).

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..06` реализованы.
- `EC-02` Search empty state: title + subtext + Clear button.
- `EC-03` No-data empty state: title + text + Add-property CTA.
- `EC-04` i18n parity (+3 keys each).
- `EC-05` 679+ tests green.
- `EC-06` CI green.

### Acceptance Scenarios

- `SC-01` **Search empty with hint.** Type `xyznonexistent` → empty state renders: title «Ничего не найдено по "xyznonexistent"», subtext «Поиск ищет по названиям юнитов, объектов и гостям», Clear button visible.
- `SC-02` **Clear button restores.** Click Clear → `searchQuery = ''`, `searchOpen = false`, rows restored. Focus on magnifier icon.
- `SC-03` **Escape equivalence.** Same effect when press Escape.
- `SC-04` **No-data with CTA.** Org без юнитов → empty state с «Добавить объект» button. Click → navigate `/properties/new`.
- `SC-05` **Dark mode parity.** Both empty states readable в dark theme (FT-026 OKLCH palette).

### Negative / Edge Cases

- `NEG-01` `onSearchEscape` вызывается множественно → idempotent (existing FT-025 behavior).
- `NEG-02` User clicks CTA button on no-data state while loading → loading state takes precedence (existing `v-if="!loading"`), button not reachable.

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | `CTR-01` | `SC-01`, `SC-05` | `CHK-02` | `EVID-02` |
| `REQ-02` | `CTR-02,03` | `SC-02,03` | `CHK-02,07` | `EVID-02,07` |
| `REQ-03` | `CTR-02` | `SC-04` | `CHK-02` | `EVID-02` |
| `REQ-04` | | — | `CHK-04` | `EVID-04` |
| `REQ-05` | | `SC-02` | `CHK-02` | `EVID-02` |
| `REQ-06` | | `EC-05` | `CHK-01,02` | `EVID-01,02` |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-05` | `yarn test:coverage` | ratchet met, 0 failures | `artifacts/ft-028/verify/chk-01/` |
| `CHK-02` | `REQ-01..03,05,06` + SCs/NEGs | `yarn test GanttCalendarView.test.js` | search empty subtext + button, no-data CTA; click handlers triggered | `artifacts/ft-028/verify/chk-02/` |
| `CHK-03` | `EC-01` | `git diff main..HEAD --stat` | минимальный surface | `artifacts/ft-028/verify/chk-03/` |
| `CHK-04` | `REQ-04` | node locale parity | +3 keys each | `artifacts/ft-028/verify/chk-04/` |
| `CHK-05` | `SC-05` | Manual QA screenshots light + dark | Empty states readable | `artifacts/ft-028/verify/chk-05/` |
| `CHK-06` | `EC-06` | markdownlint + CI | 0 errors, 5/5 green | `artifacts/ft-028/verify/chk-06/` |
| `CHK-07` | `SC-02` | `yarn test:e2e` | Click Clear в search empty → restored view | `artifacts/ft-028/verify/chk-07/` |

### Evidence

- `EVID-01` Coverage.
- `EVID-02` Vitest log.
- `EVID-03` Git diff.
- `EVID-04` Locale parity.
- `EVID-05` Screenshots.
- `EVID-06` Lint + CI.
- `EVID-07` Playwright.

### Evidence contract

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-028/verify/chk-01/` |
| `EVID-02` | `yarn test` | `artifacts/ft-028/verify/chk-02/` |
| `EVID-03` | shell | `artifacts/ft-028/verify/chk-03/` |
| `EVID-04` | shell | `artifacts/ft-028/verify/chk-04/` |
| `EVID-05` | manual | `artifacts/ft-028/verify/chk-05/` |
| `EVID-06` | `markdownlint` + `gh` | `artifacts/ft-028/verify/chk-06/` |
| `EVID-07` | `yarn test:e2e` | `artifacts/ft-028/verify/chk-07/` |
