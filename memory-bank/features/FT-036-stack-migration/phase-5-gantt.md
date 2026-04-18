---
title: "FT-036 P5: Gantt Calendar"
doc_kind: feature
doc_function: phase
purpose: "Port 6 Gantt views + useGanttShortcuts composable (~1900 LOC) from Vuetify to PrimeVue + Tailwind. **Highest-risk phase — preserves all FT-020..034 investment**: pixel-math lane positioning, today-marker, hatched idle patterns, heatmap tints, keyboard shortcuts, sidebar collapse, density toggle, kbd shortcut badges."
derived_from:
  - ./feature.md
  - ./phase-4-dashboard-reports.md
  - ../FT-020-gantt-calendar/feature.md
  - ../FT-021-gantt-handover-mode/feature.md
  - ../FT-022-gantt-overdue-mode/feature.md
  - ../FT-023-gantt-idle-gaps-mode/feature.md
  - ../FT-024-gantt-heatmap-mode/feature.md
  - ../FT-025-search-filters/feature.md
  - ../FT-027-reservation-bar-density/feature.md
  - ../FT-028-empty-state-ux/feature.md
  - ../FT-029-keyboard-shortcuts/feature.md
  - ../FT-030-sidebar-collapse/feature.md
  - ../FT-032-abbreviation-today-anchor/feature.md
  - ../FT-033-density-toggle/feature.md
  - ../FT-034-shortcut-badges/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-036 P5: Gantt Calendar

## What

### Problem

Gantt is **~1900 LOC accumulated design/interaction investment** from FT-020..034. Migration has high visual regression risk. Pragmatic strategy: **preserve all custom CSS (pixel math, lane positioning, hatched patterns, tinted cells) — only swap Vuetify chrome (v-btn, v-menu, v-icon, v-tooltip, v-dialog)** to PrimeVue/Tailwind equivalents.

Files:
- `GanttCalendarView.vue` (732) — orchestrator: toolbar, modes, keyboard shortcuts integration, density toggle, sidebar, help dialog, empty states, context menu
- `GanttTimeline.vue` (389) — grid + sidebar: today-column anchor, `--gantt-header-height` CSS var, abbreviated unit names в collapsed sidebar
- `GanttTimelineHeader.vue` (123) — date header strip
- `GanttTimelineRow.vue` (228) — per-unit row: lanes, idle gaps, heatmap cells
- `GanttTimelineItem.vue` (315) — reservation bar: density thresholds, revenue chip, nights indicator, kbd overlays
- `GanttTooltip.vue` (112) — reservation hover preview
- `composables/useGanttShortcuts.js` (148) — keyboard handlers: `/`, `T`, `[`, `]`, `S`, `D`, `Esc`, `?`

### Outcome

| Metric | Target |
|---|---|
| 6 views + 1 composable with 0 `<v-*>` templates | grep |
| All FT-020..034 invariants preserved | per-feature checklist в Verify |
| Tests ≥ baseline (835) green | `yarn test` |
| Coverage ≥ 94.58% (floor) | `yarn test:coverage` |
| MDI refs drop | 40 → ≤ 15 (−25 from Gantt icons) |
| Build green | `yarn build` |
| Visual parity (manual screenshots) | `artifacts/ft-036/phase-5/` |

### Scope

- `REQ-01` **Preserve all custom CSS** — pixel math (`--gantt-header-height: 64px`, lane positioning, today-marker, hatched idle pattern, heatmap tints). Replace only Vuetify theme tokens `rgb(var(--v-theme-*))` → equivalent Tailwind `@theme` vars or `rgb(var(--p-surface-*))` from PrimeVue.
- `REQ-02` **Replace v-btn + v-icon → Tailwind button + PrimeIcon**, preserving all event handlers, `:title`, `aria-label`, shortcut kbd badges (FT-034). Icons replaced via MDI → PrimeIcons mapping (same table as P1/P2).
- `REQ-03` **v-menu (toolbar modes dropdown, context menu)** → PrimeVue `Menu` popup pattern.
- `REQ-04` **v-tooltip** → native `title` attribute or custom Tailwind tooltip. PrimeVue's tooltip directive optional.
- `REQ-05` **v-dialog (help/shortcuts dialog)** → PrimeVue `Dialog`.
- `REQ-06` **v-text-field (search input)** → PrimeVue `InputText`. Search debouncing logic preserved (FT-025).
- `REQ-07` **v-progress-linear (loading state)** → Tailwind styled div с animate-pulse (per pattern from P4).
- `REQ-08` **v-app-bar-nav-icon / v-spacer** if used → replaced.
- `REQ-09` **Preserve `useGanttShortcuts` composable** as-is — no Vuetify dependency там (pure event listeners). Verify.
- `REQ-10` **Preserve localStorage state** — density, sidebar collapse, search open state (all localStorage keys under `apartus-calendar-view`).
- `REQ-11` **Tests preserved** — GanttCalendarView, GanttTimeline, GanttTimelineRow, GanttTimelineItem, GanttTimelineHeader, GanttTooltip, useGanttShortcuts — all tests pass post-migration (may need mountWithPrimeVue switch but assertions same).

### Non-Scope

- `NS-01` **No feature changes.** Gantt behavior identical.
- `NS-02` **No redesign.** Visual parity strictly preserved.
- `NS-03` **No Gantt extraction to separate package.** Stays в `views/calendar/`.
- `NS-04` **No new keyboard shortcuts.**
- `NS-05` **No performance optimizations.**

### Constraints / Assumptions

- `ASM-01` P0..P4 merged.
- `ASM-02` Gantt custom CSS не завязан на Vuetify layout-inject (grid positioned via `position: absolute` + inline styles).
- `ASM-03` `useGanttShortcuts` composable уже checks `document.querySelector('.v-overlay--active')` для PrimeVue overlay equivalent — update selector if needed to `.p-dialog-visible` or similar.
- `CON-01..04` unchanged.

## How

### Solution

**Minimal-intrusion migration:** preserve template structure + all scoped CSS. Replace только:
- `<v-btn>` → `<button class="gantt-btn ...">` (custom class, preserve kbd badges)
- `<v-icon>` → `<i class="pi pi-*" />`
- `<v-menu>` → PrimeVue Menu popup
- `<v-dialog>` → PrimeVue Dialog
- `<v-text-field>` → PrimeVue InputText
- `<v-progress-linear>` → animated Tailwind div
- Remove Vuetify theme-color utility classes (`color="primary"` на v-btn → Tailwind `bg-primary-600 text-white`)

Replace Vuetify theme token references:
- `rgb(var(--v-theme-on-surface))` → `rgb(var(--p-surface-900))` (light) / `rgb(var(--p-surface-0))` (dark via `:where(.dark)`)
- `rgb(var(--v-theme-surface))` → `rgb(var(--p-surface-0))` / dark variant
- `rgb(var(--v-theme-primary))` → `var(--color-primary-500)` (Tailwind @theme)
- `rgb(var(--v-theme-status-*))` → `var(--color-status-*)` (уже в tailwind.css)

### Change Surface

| Surface | Type |
|---|---|
| `frontend/src/views/calendar/GanttCalendarView.vue` | rewrite |
| `frontend/src/views/calendar/GanttTimeline.vue` | rewrite |
| `frontend/src/views/calendar/GanttTimelineHeader.vue` | rewrite |
| `frontend/src/views/calendar/GanttTimelineRow.vue` | rewrite |
| `frontend/src/views/calendar/GanttTimelineItem.vue` | rewrite |
| `frontend/src/views/calendar/GanttTooltip.vue` | rewrite |
| `frontend/src/composables/useGanttShortcuts.js` | minor update (overlay selector) |
| `frontend/src/__tests__/views/calendar/*.test.js` | switch to mountWithPrimeVue |
| `frontend/src/__tests__/composables/useGanttShortcuts.test.js` | preserved, minor updates если есть |

### Contracts

| Contract | Notes |
|---|---|
| `CTR-01` | All Gantt components export same props/emits shape as current — no API changes for callers |
| `CTR-02` | `useGanttShortcuts` composable signature unchanged |
| `CTR-03` | localStorage keys `apartus-calendar-view.*` unchanged |

### Failure Modes

- `FM-01` **Visual regression в lane positioning** — if CSS var `--gantt-header-height` or lane pixel math changes, Gantt becomes misaligned (FT-033 bug). Mitigation: preserve scoped styles verbatim, only swap color/chrome tokens.
- `FM-02` **Keyboard shortcut overlay detection** — `useGanttShortcuts` guards against firing while dialog open via `.v-overlay--active` check. PrimeVue Dialog uses `.p-dialog-mask` selector. Update carefully.
- `FM-03` **Context menu positioning** — v-menu auto-positions near trigger. PrimeVue Menu requires manual `show(event)` + sometimes reposition. May need fallback.
- `FM-04` **v-tooltip directive** — inline `v-tooltip="text"` won't work без PrimeVue `Tooltip` directive or fallback. Use native `:title` (sufficient for desktop; mobile loses tooltip).
- `FM-05` **kbd badges positioning** (FT-034) — overlaid on buttons via absolute positioning. Preserve classes exactly.
- `FM-06` **Search debounce** (FT-025) — `setTimeout` logic preserved; just input component swap.
- `FM-07` **Tests that use v-btn-stub/v-menu-stub** — update assertions to PrimeVue selectors OR loosen to `.find('button[title="..."]')`.

### Rollback

Per-file atomic commits. If one component breaks irreparably — revert только that file, keep rest.

## Verify

### Exit Criteria

- `EC-01` All REQ реализованы.
- `EC-02` 6 Gantt views + composable 0 `<v-*>` templates.
- `EC-03` `yarn test --run` ≥ 835 green.
- `EC-04` Coverage ≥ 94.58%.
- `EC-05` `yarn build` green.
- `EC-06` **FT-020..034 feature-by-feature smoke check** (manual QA в dev server):
  - FT-020: base grid + lanes + today marker render
  - FT-021: handover mode — upcoming check-in/out bracket ±1d highlight
  - FT-022: overdue mode — pulse animation on check_in < today + checked_in
  - FT-023: idle gaps — hatched pattern between bookings
  - FT-024: heatmap — day cell tints by occupancy
  - FT-025: search — debounced filter, `/` focus shortcut
  - FT-027: reservation bar density — revenue chip + nights indicator at thresholds
  - FT-028: empty states
  - FT-029: keyboard shortcuts (/, T, [, ], Esc, ?, D, S)
  - FT-030: sidebar collapse 240→48px, abbreviated unit names
  - FT-032: today-column background anchor, abbreviateUnit digit-aware
  - FT-033: density toggle (comfortable↔compact), corner/header alignment preserved
  - FT-034: kbd badges на 4 toolbar buttons

### Acceptance Scenarios (minimal — full matrix в manual QA)

- `SC-01` Gantt loads без console errors, shows existing reservations.
- `SC-02` Keyboard shortcut `/` opens search.
- `SC-03` Density toggle flips 36/28px ↔ 30/22px row/item heights.
- `SC-04` Sidebar collapse to 48px, unit names show as abbreviations.
- `SC-05` Dark mode parity across all 4 special modes.

### Checks

| CHK | How |
|---|---|
| `CHK-01` | `yarn test:coverage` ≥ 94.58% |
| `CHK-02` | `yarn test` green |
| `CHK-03` | `yarn build` green |
| `CHK-04` | i18n parity |
| `CHK-05` | Manual QA Gantt feature-by-feature smoke |
| `CHK-06` | grep mdi- delta |
| `CHK-07` | Scoped CSS diff review — verify pixel math untouched |
