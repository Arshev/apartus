---
title: "FT-033: Gantt Density Toggle"
doc_kind: feature
doc_function: canonical
purpose: "Comfortable/compact row density toggle для Gantt Timeline. Closes re-critique P2 «empty grid expensive на wide viewports» — operational manager получает denser view когда нужно."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../FT-020-gantt-calendar/feature.md
  - ../FT-029-keyboard-shortcuts/feature.md
  - ../FT-030-sidebar-collapse/feature.md
  - ../../../.impeccable.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-033: Gantt Density Toggle

## What

### Problem

Re-critique (2026-04-18) P2 finding:

> **Empty grid feels expensive on wide viewports.** On 1440+ width with 6 units and sparse bookings, ~80% of the canvas is empty row tint. The refresh doesn't address row density — rows are tall (~52px).
>
> **Fix:** Density toggle (comfortable / compact 36px rows), persist to localStorage like sidebar.

Current `baseRowHeight: 36` + `itemHeight: 28` + lane expansion gives effective row height ~52-80px depending on lane count. На dense schedule (50+ units × 30 days) это блокирует scanning. Operational manager может хотеть сжать rows до минимума чтобы увидеть больше units одновременно.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | Density toggle available в toolbar | единый фиксированный | 2 modes: comfortable (current, default) / compact | Visual QA + component test |
| `MET-02` | Density persisted localStorage | N/A | `apartus-calendar-view.density: 'comfortable' \| 'compact'` | Component test |
| `MET-03` | Keyboard shortcut `D` | N/A | `D` toggles density (alongside existing shortcuts) | Composable test + e2e |
| `MET-04` | Coverage ratchet | current | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Density state.** New ref `density: ref<'comfortable' | 'compact'>` в `GanttCalendarView`. Default `'comfortable'` (backward-compat с existing behavior). Passed as prop to `GanttTimeline`.
- `REQ-02` **Row height mapping.** `GanttTimeline` derives `baseRowHeight` + `itemHeight` from `density` prop:
  - `comfortable` (default): `baseRowHeight: 36`, `itemHeight: 28` (current values)
  - `compact`: `baseRowHeight: 28`, `itemHeight: 22`
  Prop `density` passed down; existing `baseRowHeight` / `itemHeight` props remain (backward-compat for direct overrides in tests).
- `REQ-03` **Toolbar toggle button.** В `GanttCalendarView` toolbar, utilities cluster (FT-026): new `v-btn` icon `mdi-format-line-spacing` с title «Плотность (D)» (ru) / «Density (D)» (en). `variant="text"` когда `comfortable`, `variant="tonal"` когда `compact` (consistent с mode-button active pattern FT-026 REQ-06).
- `REQ-04` **Persistence.** Extend existing `loadStoredView` / `persistView`. New field `density: 'comfortable' | 'compact'`. Backward-compat: legacy payloads default `'comfortable'`. Restored sync в `setup()` (FT-025 ER-03 pattern).
- `REQ-05` **Keyboard shortcut `D`.** Extend `useGanttShortcuts` composable to accept `toggleDensity` handler. Wire в `GanttCalendarView`. Update `shortcutRows` array для help dialog (FT-029) — add `{ key: 'D', label: '...' }`.
- `REQ-06` **CSS transition.** Row height transitions 0.15s ease-out при smooth mode switch. Disabled on `prefers-reduced-motion`.
- `REQ-07` **i18n.** New keys: `calendar.gantt.density.{toggle, modeComfortable, modeCompact}`, `calendar.gantt.shortcuts.keys.density`.
- `REQ-08` **Accessibility.** Button `aria-label` = current density action. `aria-pressed="true"` когда compact (follows toggle button pattern).
- `REQ-09` **Tests.** Component (calendar state + persistence), composable (`D` dispatches), Timeline (derived row heights).

### Non-Scope

- `NS-01` **«Spacious» mode** (3rd density level, 48px rows) — YAGNI. MVP — бинарный toggle.
- `NS-02` **Per-unit density override** — overkill.
- `NS-03` **Auto-density** (scale rows based on visible unit count) — too clever; user preference wins.
- `NS-04` **Item font-size scaling при compact** — optional refinement; MVP keeps typography constant. Если реально illegible, follow-up.
- `NS-05` **Header height adjustment** — 50px header stays (FT-020 baseline).
- `NS-06` **Touch-friendly density on mobile** — mobile uses whatever density is persisted or the default. Responsive density override future FT.

### Constraints / Assumptions

- `ASM-01` FT-032 merged (baseline 741 tests).
- `ASM-02` `useGanttShortcuts` accepts optional handler params — `toggleDensity` добавляется без breaking signature.
- `ASM-03` `baseRowHeight` / `itemHeight` currently passed as props от `GanttCalendarView` defaults. Will be derived from `density` в Timeline if density prop set, иначе fall back to passed props.
- `ASM-04` Lane assignment unchanged — works with any row/item height.
- `CON-01` No new npm.
- `CON-02` No TypeScript.
- `CON-03` Coverage ratchet.
- `CON-04` No backend changes.

## How

### Solution

1. **`GanttCalendarView.vue`** — `density: ref('comfortable')`, `toggleDensity()` flips. Pass as `:density` prop to Timeline. Extend load/persistView. Wire into `useGanttShortcuts`.
2. **`GanttTimeline.vue`** — accept `density: String` prop. Computed `effectiveRowHeight` / `effectiveItemHeight` — derived from density mapping when density prop present, else fall back to existing `baseRowHeight` / `itemHeight` props. Pass derived values to Rows + Items.
3. **`useGanttShortcuts.js`** — add `D` key → `toggleDensity()` (optional, same pattern as `S` from FT-030).
4. **`shortcutRows`** в CalendarView — add row for D.
5. **Toolbar button** — single icon toggle in utilities cluster with tonal-when-compact variant.

Trade-off 1: explicit density prop vs just override baseRowHeight. Density-prop is semantically clearer (comfortable/compact matches Vuetify convention) and allows future tuning without API breaks.

Trade-off 2: default `comfortable` — matches current behavior = zero regression on reload for existing users (legacy payloads default here).

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `frontend/src/views/calendar/GanttCalendarView.vue` | code | density ref, toggleDensity, persistence, shortcut wire, toolbar button |
| `frontend/src/__tests__/views/calendar/GanttCalendarView.test.js` | code | Density toggle + persistence tests |
| `frontend/src/views/calendar/GanttTimeline.vue` | code | density prop + effective row/item height computed |
| `frontend/src/__tests__/views/calendar/GanttTimeline.test.js` | code | Density prop → row/item height |
| `frontend/src/composables/useGanttShortcuts.js` | code | `D` handler |
| `frontend/src/__tests__/composables/useGanttShortcuts.test.js` | code | `D` dispatch + backward-compat |
| `frontend/src/locales/ru.json`, `en.json` | data | +3 keys |
| `frontend/e2e/calendar-overlap.spec.js` | code | E2e: toggle button + `D` key |
| `memory-bank/domain/frontend.md` | doc | Mention density |
| `memory-bank/features/README.md` | doc | Register FT-033 |

### Flow

1. Mount → loadStoredView restores density (default `'comfortable'`).
2. Timeline derives row/item heights from density; rows render accordingly.
3. Click button OR press `D` → `toggleDensity()` flips state; watcher persists; Timeline re-derives heights; rows transition smoothly to new height.

### Contracts

| Contract | I/O | Producer/Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `density: 'comfortable' \| 'compact'` prop → Timeline | CalendarView / Timeline | Default `comfortable` |
| `CTR-02` | `localStorage('apartus-calendar-view').density` string | CalendarView | Type-guard; unknown → `comfortable` |
| `CTR-03` | `toggleDensity()` passed to useGanttShortcuts | CalendarView / composable | Same pattern as `toggleSidebar` (FT-030) |

### Failure Modes

- `FM-01` localStorage `density` non-string / unknown value → fallback `comfortable`.
- `FM-02` Rapid toggle → transition may queue; settles correctly (CSS handles).
- `FM-03` `D` pressed while input focused → input guard skips (FT-029).
- `FM-04` Active heatmap/idle/handover modes при density switch → works; layers recompute row positions via Vue reactivity.

### ADR Dependencies

Нет.

### Rollback

- `RB-01` Single squash commit revert. Legacy localStorage payloads без density → still default comfortable, no breaking.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..09` реализованы.
- `EC-02` Toggle button flips rows between ~36 и ~28 px.
- `EC-03` `D` keyboard shortcut toggles.
- `EC-04` Persistence через reload.
- `EC-05` 741+ tests green. Coverage ratchet.
- `EC-06` CI green.
- `EC-07` i18n parity +3 keys each.

### Acceptance Scenarios

- `SC-01` **Happy path.** Click density button → rows shrink from ~36px to ~28px. Icon/variant reflects compact state (tonal).
- `SC-02` **`D` keyboard.** Press `D` from body → density toggles.
- `SC-03` **Persistence.** Compact → reload → still compact.
- `SC-04` **Help dialog has `D` row.** `?` opens → 8 shortcuts listed (previously 7).
- `SC-05` **Modes coexist.** Heatmap active + density compact → cells shrink correctly.
- `SC-06` **Transition smooth.** Observe row height animation 0.15s.
- `SC-07` **Dark mode parity.** Toggle visible in both themes.

### Negative / Edge Cases

- `NEG-01` Corrupted localStorage (`density: 42`) → default comfortable.
- `NEG-02` `D` while input focused → input guard (FT-029) skips.
- `NEG-03` `prefers-reduced-motion` → instant switch, no transition.
- `NEG-04` Lane count > 2 (stacked bookings) → compact mode shrinks item height proportionally; still legible at 22px.

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | `CTR-01` | `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-02` | `CTR-01` | `SC-01,05` | `CHK-02` | `EVID-02` |
| `REQ-03` | | `SC-01,07` | `CHK-02,05` | `EVID-02,05` |
| `REQ-04` | `CTR-02`, `FM-01` | `SC-03`, `NEG-01` | `CHK-02` | `EVID-02` |
| `REQ-05` | `CTR-03`, `FM-03` | `SC-02`, `NEG-02` | `CHK-02,07` | `EVID-02,07` |
| `REQ-06` | | `SC-06`, `NEG-03` | `CHK-05` | `EVID-05` |
| `REQ-07` | | — | `CHK-04` | `EVID-04` |
| `REQ-08` | | — | `CHK-02` | `EVID-02` |
| `REQ-09` | | `EC-05` | `CHK-01,02,07` | `EVID-01,02,07` |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-05` | `yarn test:coverage` | ratchet met | `artifacts/ft-033/verify/chk-01/` |
| `CHK-02` | `REQ-01..05,08,09` + SCs/NEGs | `yarn test` | toggle flips; persistence; `D` shortcut; Timeline derives heights | `artifacts/ft-033/verify/chk-02/` |
| `CHK-03` | `EC-01` | `git diff --stat` | minimal | `artifacts/ft-033/verify/chk-03/` |
| `CHK-04` | `REQ-07` | parity | +3 keys | `artifacts/ft-033/verify/chk-04/` |
| `CHK-05` | `REQ-03,06` + `SC-01,06,07` | Manual QA screenshots light+dark comfortable+compact | Transition smooth, legible, toggle button visible | `artifacts/ft-033/verify/chk-05/` |
| `CHK-06` | `EC-06` | markdownlint + CI | 0 errors, 5/5 | `artifacts/ft-033/verify/chk-06/` |
| `CHK-07` | `SC-01,02,03` | `yarn test:e2e` | button click + `D` both toggle; reload persists | `artifacts/ft-033/verify/chk-07/` |

### Evidence

- `EVID-01..07` per standard evidence contract.

### Evidence contract

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-033/verify/chk-01/` |
| `EVID-02` | `yarn test` | `artifacts/ft-033/verify/chk-02/` |
| `EVID-03` | shell | `artifacts/ft-033/verify/chk-03/` |
| `EVID-04` | shell | `artifacts/ft-033/verify/chk-04/` |
| `EVID-05` | manual | `artifacts/ft-033/verify/chk-05/` |
| `EVID-06` | `markdownlint` + `gh` | `artifacts/ft-033/verify/chk-06/` |
| `EVID-07` | `yarn test:e2e` | `artifacts/ft-033/verify/chk-07/` |
