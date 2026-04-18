---
title: "FT-030: Gantt Sidebar Collapse"
doc_kind: feature
doc_function: canonical
purpose: "Collapsible unit sidebar в Gantt Timeline. Освобождает до 200px horizontal space для bars на narrow viewports и больше days на wide. Closes Impeccable critique Q4 «Sidebar 240px fixed...18% viewport на 1280»."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../FT-020-gantt-calendar/feature.md
  - ../FT-026-design-refresh/feature.md
  - ../FT-027-reservation-bar-density/feature.md
  - ../FT-029-keyboard-shortcuts/feature.md
  - ../../../.impeccable.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-030: Gantt Sidebar Collapse

## What

### Problem

Impeccable critique (2026-04-17), provocative question #4:

> **Sidebar 240px фиксированный.** На экранах 1440+ это пустая трата; на 1280 — 18% viewport. Почему не резиновый с min/max и collapse-to-icon?

Sidebar держит property_name + unit_name в 240px колонке. Две строки текста в маленьком font-size. Для опытного менеджера это overhead: после первой недели работы unit mapping уже в голове, ему не нужно видеть «Arbat Boutique Hotel → Deluxe Suite 201» каждую секунду. Нужны **bars**, где денежная информация.

На 1280px viewport sidebar занимает 18.75% horizontal space — blocks существенную часть Gantt grid. На 1920+ — лишний.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | Sidebar collapse-to-icon toggle | fixed 240px | collapsed mode: 48px icon-only с initials/abbreviation | Component test + manual QA |
| `MET-02` | Toggle persisted между sessions | N/A | localStorage `sidebarCollapsed: boolean` | Component test |
| `MET-03` | Keyboard shortcut | N/A | `S` toggles sidebar (alongside FT-029 shortcuts) | Component test |
| `MET-04` | Coverage ratchet | текущий | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Sidebar collapsible state.** New ref `sidebarCollapsed: ref<boolean>` в `GanttCalendarView`. Default `false`. Passed as prop to `GanttTimeline`.
- `REQ-02` **Timeline grid responsiveness.** `grid-template-columns` switches: `240px 1fr` (expanded) ↔ `48px 1fr` (collapsed). CSS transition 0.2s `ease-out` для smooth animation (respects `prefers-reduced-motion`).
- `REQ-03` **Collapsed cell rendering.** При `collapsed === true` unit cells показывают:
  - 2-letter abbreviation от `unit.name` (e.g. `DS` для «Deluxe Suite 201», `D6` для «Dorm 6A») via string helper
  - Tooltip `:title` с полным `property_name — unit_name` (hover reveals full name, existing pattern FT-020 line 15)
- `REQ-04` **Toggle button** в Timeline corner header (top-left, where «Юнит» label currently). Icon-only `v-btn variant="text"`:
  - `mdi-chevron-left` когда expanded (click to collapse)
  - `mdi-chevron-right` когда collapsed (click to expand)
  - `:title` с keyboard hint `(S)` — consistent с FT-029 pattern
- `REQ-05` **Persistence** — extend existing `localStorage('apartus-calendar-view')` payload c полем `sidebarCollapsed`. Backward-compat: legacy payloads без поля → `false`.
- `REQ-06` **Keyboard shortcut `S`** — toggles `sidebarCollapsed`. Wire через existing `useGanttShortcuts` composable (FT-029). Handler registered, guards preserved.
- `REQ-07` **Help dialog** updated с `S` entry (7 shortcuts instead of 6).
- `REQ-08` **i18n** — новые keys: `calendar.gantt.sidebar.{toggleExpand, toggleCollapse}`, `calendar.gantt.shortcuts.keys.sidebar`.
- `REQ-09` **Accessibility.** Toggle button получает `:aria-expanded="!sidebarCollapsed"` (reflects controlled sidebar state). `aria-controls` указывает на sidebar element id. Sidebar — existing row structure preserved. `prefers-reduced-motion: reduce` убирает transition.
- `REQ-10` **Abbreviation helper** — pure `utils/strings.js#abbreviateUnit(unitName)`: returns 2 uppercase chars. Strategy (simplified — single rule):
  - Take first two alphanumeric characters of the first word with length ≥ 2 (skip stop-words «the», «a», «an»).
  - If only one word found → first 2 chars of that word.
  - Examples: «Deluxe Suite 201» → `DE`, «Dorm 6A» → `DO`, «Standard Room 101» → `ST`, «Main Studio» → `MA`, «Sofa bed» → `SO`.
  - Fallback (empty/invalid): `??`.
  - Matrix unit test covers these cases + edges.
- `REQ-11` **Tests.** Unit (abbreviateUnit), component (collapse state + grid-columns + icon toggle + persistence), e2e (click button → sidebar narrows; `S` keyboard toggles).

### Non-Scope

- `NS-01` **Resizable sidebar** (drag handle to set custom width) — больше feature, complexity не оправдана для MVP.
- `NS-02` **Per-unit custom order / drag-to-reorder** — отдельный FT.
- `NS-03` **Sidebar filters / grouping** (by property, status) — FT-025 search уже частично покрывает. Separate feature.
- `NS-04` **Mobile-first sidebar drawer** (slide-out panel на `<md`) — requires responsive state management beyond toggle.
- `NS-05` **Multi-line labels** (unit on first line, property on second) — currently done in expanded; collapsed mode не нужно.
- `NS-06` **Avatar или thumbnail для каждого unit** (photos from FT-004) — nice future but requires loading photos + memory.

### Constraints / Assumptions

- `ASM-01` FT-029 merged (baseline 704 tests + shortcuts composable).
- `ASM-02` `GanttTimeline` — `grid` layout через `.gantt-timeline { display: grid }`. Column adjust тривиальный.
- `ASM-03` `useGanttShortcuts` принимает callable handlers; добавить `toggleSidebar` как opt-in.
- `ASM-04` Seed data unit names содержат typical patterns (e.g. «Deluxe Suite 201») — abbreviation работает reasonable.
- `CON-01` No new npm packages.
- `CON-02` No TypeScript.
- `CON-03` Coverage ratchet.
- `CON-04` No backend changes.

## How

### Solution

1. **`utils/strings.js`** (new или existing) — `abbreviateUnit(name)` pure function.
2. **`GanttCalendarView.vue`** — `sidebarCollapsed: ref<boolean>`, `toggleSidebar()` helper, prop passed to Timeline. Extend `useGanttShortcuts` wiring с `S`. Help dialog row added.
3. **`GanttTimeline.vue`** — `:collapsed` prop, computed `gridColumns` (`'240px 1fr'` or `'48px 1fr'`). Corner slot имеет toggle button. Unit cells показывают abbreviation при collapsed — через v-if binding. Transition CSS.
4. **Persistence** — extend `loadStoredView` / `persistView` в CalendarView (added `sidebarCollapsed` field, parsed with type guard).

Trade-off: CSS transition vs instant snap. Transition 0.2s ease-out — не раздражает, дает feedback. `prefers-reduced-motion` disables.

Trade-off 2: 48px width vs 56px. 48 — minimal для Material touch target (48px icon button). Chose 48 — tight but functional.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `frontend/src/utils/strings.js` | code | New `abbreviateUnit` helper |
| `frontend/src/__tests__/utils/strings.test.js` | code | Matrix tests |
| `frontend/src/views/calendar/GanttTimeline.vue` | code | Collapsed state, grid responsiveness, abbreviation rendering |
| `frontend/src/__tests__/views/calendar/GanttTimeline.test.js` | code | Expand/collapse tests |
| `frontend/src/views/calendar/GanttCalendarView.vue` | code | Toggle state + persistence + `S` shortcut + help dialog +1 row |
| `frontend/src/__tests__/views/calendar/GanttCalendarView.test.js` | code | Persistence tests |
| `frontend/src/composables/useGanttShortcuts.js` | code | Add `S` → `toggleSidebar` handler |
| `frontend/src/__tests__/composables/useGanttShortcuts.test.js` | code | `S` dispatch test |
| `frontend/src/locales/{ru,en}.json` | data | +3 keys |
| `frontend/e2e/calendar-overlap.spec.js` | code | E2e: click toggle + `S` key both work |
| `memory-bank/domain/frontend.md` | doc | Sidebar collapse mention |
| `memory-bank/features/README.md` | doc | Register FT-030 |

### Flow

1. **Mount.** `loadStoredView` checks persisted `sidebarCollapsed`; default `false`.
2. **User clicks toggle button** (corner `mdi-chevron-left/right`). `toggleSidebar()` flips ref. `localStorage` persisted via watcher.
3. **User presses `S` key.** `useGanttShortcuts` dispatches → `toggleSidebar()`.
4. **Render.** `GanttTimeline` reads `:collapsed` prop, applies grid-template-columns + hides property_name + replaces unit_name с abbreviation.
5. **Hover collapsed cell.** `:title` attribute shows full name (existing pattern).
6. **Reload.** State restored from localStorage synchronously в `setup()` (FT-025 ER-03 pattern).

### Contracts

| Contract | I/O | Producer / Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `abbreviateUnit(name: string) → string(2 uppercase chars)` | utils / Timeline | Pure; null/empty → `'??'` fallback |
| `CTR-02` | `sidebarCollapsed: ref<boolean>` prop → Timeline | CalendarView / Timeline | Reactive |
| `CTR-03` | `toggleSidebar()` passed to `useGanttShortcuts` | CalendarView / composable | Handler для `S` key |
| `CTR-04` | `localStorage.apartus-calendar-view.sidebarCollapsed: boolean` | CalendarView | Default false; type-guard |

### Failure Modes

- `FM-01` Unit name empty/null → `abbreviateUnit` returns `'??'`.
- `FM-02` localStorage `sidebarCollapsed` is non-boolean (e.g. 0, string) → type-guard → fallback false.
- `FM-03` User rapid-clicks toggle — ref updates sync, CSS transition может "overshoot" but settles correctly.
- `FM-04` `S` pressed while search input focused — input guard (FT-029) skips handler, letter S types into input (expected).
- `FM-05` Sidebar width transition janks at 60fps limit → 0.2s short enough; accepted per ASM.

### ADR Dependencies

Нет.

### Rollback

- `RB-01` Single squash commit revert. No state migration. Legacy localStorage payloads без new field remain compatible on further sessions.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..11` реализованы.
- `EC-02` Toggle button collapses + expands sidebar.
- `EC-03` `S` keyboard shortcut toggles.
- `EC-04` Abbreviation правильно отображается в collapsed mode.
- `EC-05` Persistence works через reload.
- `EC-06` 704+ tests green. Coverage ratchet.
- `EC-07` CI green.
- `EC-08` Dark + light readable.

### Acceptance Scenarios

- `SC-01` **Happy path.** Click toggle button → sidebar narrows from 240px to 48px, unit cells show 2-letter abbreviations (DE for «Deluxe Suite 201», ST for «Standard Room 101», MA for «Main Studio», SO for «Sofa bed», DO for «Dorm 6A», DO for «Dorm 8B»).
- `SC-02` **Re-expand.** Click again → sidebar expands, full names restored.
- `SC-03` **`S` keyboard.** Press `S` from body → toggle. Verified sidebar state flips.
- `SC-04` **Persistence.** Collapse → reload → stays collapsed. Expand → reload → stays expanded.
- `SC-05` **Tooltip reveals full name.** Hover collapsed cell → title shows «Arbat Boutique Hotel — Deluxe Suite 201».
- `SC-06` **Help dialog has `S` entry.** Press `?` → 7 shortcuts listed including «S → Свернуть боковую панель».
- `SC-07` **Grid alignment.** Row heights остаются synced между sidebar cells и timeline rows после toggle (existing FT-020 `row-height-changed` emit). Row heights orthogonal к sidebar width — transition не retriggerит lane recompute. Test asserts computed `rowHeights` map unchanged before/after toggle.
- `SC-08` **Dark mode parity.** Collapsed sidebar readable; abbreviations high-contrast.

### Negative / Edge Cases

- `NEG-01` Abbreviation for empty name → «??» fallback, no crash.
- `NEG-02` Corrupted localStorage (non-boolean `sidebarCollapsed`) → fallback false.
- `NEG-03` `prefers-reduced-motion` active → CSS transition disabled.
- `NEG-04` `S` pressed while input focused — guard, letter types into input (FT-029 behavior preserved).

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | `CTR-02` | `SC-01,02` | `CHK-02` | `EVID-02` |
| `REQ-02` | | `SC-01,02` | `CHK-02,05` | `EVID-02,05` |
| `REQ-03` | `CTR-01` | `SC-01,05` | `CHK-02` | `EVID-02` |
| `REQ-04` | | `SC-01,02` | `CHK-02,05` | `EVID-02,05` |
| `REQ-05` | `CTR-04`, `FM-02` | `SC-04`, `NEG-02` | `CHK-02` | `EVID-02` |
| `REQ-06` | `CTR-03`, `FM-04` | `SC-03`, `NEG-04` | `CHK-02,07` | `EVID-02,07` |
| `REQ-07` | | `SC-06` | `CHK-02` | `EVID-02` |
| `REQ-08` | | — | `CHK-04` | `EVID-04` |
| `REQ-09` | | `NEG-03` | `CHK-05` | `EVID-05` |
| `REQ-10` | `CTR-01`, `FM-01` | `NEG-01` | `CHK-02` | `EVID-02` |
| `REQ-11` | | `EC-06` | `CHK-01,02,07` | `EVID-01,02,07` |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-06` | `yarn test:coverage` | ratchet met | `artifacts/ft-030/verify/chk-01/` |
| `CHK-02` | `REQ-01..07,10,11` + SCs/NEGs | `yarn test` | state toggle, abbreviation, persistence, shortcut `S` | `artifacts/ft-030/verify/chk-02/` |
| `CHK-03` | `EC-01` | `git diff --stat` | minimal | `artifacts/ft-030/verify/chk-03/` |
| `CHK-04` | `REQ-08` | locale parity | +3 keys each | `artifacts/ft-030/verify/chk-04/` |
| `CHK-05` | `EC-08` + `SC-01,05,08`, `NEG-03` | Manual QA screenshots | Light+dark expanded/collapsed, tooltip | `artifacts/ft-030/verify/chk-05/` |
| `CHK-06` | `EC-07` | markdownlint + CI | 0 errors, 5/5 | `artifacts/ft-030/verify/chk-06/` |
| `CHK-07` | `EC-02,03,05` + `SC-01,03,04` | `yarn test:e2e` | Click + `S` both toggle; reload preserves | `artifacts/ft-030/verify/chk-07/` |

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
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-030/verify/chk-01/` |
| `EVID-02` | `yarn test` | `artifacts/ft-030/verify/chk-02/` |
| `EVID-03` | shell | `artifacts/ft-030/verify/chk-03/` |
| `EVID-04` | shell | `artifacts/ft-030/verify/chk-04/` |
| `EVID-05` | manual | `artifacts/ft-030/verify/chk-05/` |
| `EVID-06` | `markdownlint` + `gh` | `artifacts/ft-030/verify/chk-06/` |
| `EVID-07` | `yarn test:e2e` | `artifacts/ft-030/verify/chk-07/` |
