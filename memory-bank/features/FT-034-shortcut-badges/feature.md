---
title: "FT-034: Toolbar Shortcut Badges"
doc_kind: feature
doc_function: canonical
purpose: "Inline <kbd> shortcut-key badges on Gantt toolbar buttons (Linear/Notion style). Closes re-critique P2 — shortcuts peripherally visible, not only through tooltips."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../FT-029-keyboard-shortcuts/feature.md
  - ../FT-030-sidebar-collapse/feature.md
  - ../FT-033-density-toggle/feature.md
  - ../../../.impeccable.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-034: Toolbar Shortcut Badges

## What

### Problem

Re-critique (2026-04-18) P2:

> **Toolbar utilities (search/today/jump/refresh) still bare icons-first on the right.** No labels, no keyboard hints visible on buttons themselves, only via tooltip.
> **Fix:** Show shortcut letter as a subtle 10px mono badge on the button (`/`, `T`, `[`, `]`) — matches Linear/Notion convention.

Shortcuts discoverable currently только через `?` help dialog или hover tooltip. Peripheral reinforcement отсутствует. Operational manager после недели работы уже знает shortcut'ы, но new users don't.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | Toolbar buttons с shortcuts имеют inline badge | нет | `<kbd>` badges visible on search/today/density/sidebar toggle | Visual QA |
| `MET-02` | Badges styled consistently с help dialog kbd pattern | help dialog only | same `.text-mono` + tinted bg | Visual QA |
| `MET-03` | Coverage ratchet | current | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **`<kbd>` badges на 4 toolbar buttons**:
  - search-btn (collapsed state): badge `/`
  - today-btn: badge `T`
  - density-btn: badge `D`
  - sidebar-toggle-btn (corner): badge `S`
  - Other toolbar buttons (jump-to-date, refresh, range toggle, mode buttons) — **не меняются** (нет single-key shortcuts).
- `REQ-02` **Badge styling.** Small `<kbd>` element inside button, `font-family: var(--font-mono)`, font-size 10px, padding 1px 4px, tinted background `rgba(var(--v-theme-on-surface), 0.08)`, border `1px solid rgba(var(--v-theme-on-surface), 0.15)`, border-radius 3px. Inline-block. Margin-left 6px (after icon).
- `REQ-03` **Consistent с help dialog** — `.gantt-shortcuts__kbd` class уже есть (FT-029). Reuse or mirror styling.
- `REQ-04` **Accessibility.** `aria-hidden="true"` на badge (shortcut key уже в `aria-label` + `:title` existing pattern). No new tab stops.
- `REQ-05` **Collapsed sidebar — badge OK.** Sidebar toggle в corner shows `<` or `>` chevron + badge `S`. Horizontal space 48px достаточно для small badge.
- `REQ-06` **Tests.** Component — badges rendered in DOM для каждой кнопки с shortcut.
- `REQ-07` **i18n** — no new text (badges are single letters not translated).

### Non-Scope

- `NS-01` **Badges на buttons без shortcut** (jump-to-date, refresh, mode buttons) — не scope. Если later эти кнопки получат shortcuts, добавим badges.
- `NS-02` **Multi-key shortcuts** (`⌘K` combos) — не в этом FT. Если FT-036 командная палитра будет, получит свой badge формат.
- `NS-03` **Badge visibility toggle** ("скрыть хоткеи") — YAGNI.
- `NS-04` **Platform-aware badges** (⌘ vs Ctrl) — single-key shortcuts, problem не возникает.
- `NS-05` **Animation on first-use discovery** — badges statically visible, discovery pattern не нужен.

### Constraints / Assumptions

- `ASM-01` FT-033 merged (baseline 753 tests).
- `ASM-02` Shortcuts (/, T, D, S) все wired в FT-029/030/033.
- `ASM-03` `--font-mono` CSS var defined (FT-026).
- `CON-01` No new npm.
- `CON-02` No TypeScript.
- `CON-03` Coverage ratchet.
- `CON-04` No backend.

## How

### Solution

1. **Template** — добавить `<kbd aria-hidden="true" class="gantt-toolbar__kbd">{key}</kbd>` внутрь каждой target button. Для icon buttons (no text content): badge следует за icon; для text buttons: перед или после label.
2. **Shared CSS class** `.gantt-toolbar__kbd` в scoped style `GanttCalendarView.vue`. Для sidebar toggle — в `GanttTimeline.vue` добавить mirror style или reuse via :global. Simple путь: duplicate styling (CSS-scoped small duplication acceptable for 2 views).
3. **Tooltip preservation** — existing `:title="… (X)"` patterns сохраняются (screen readers + touch hover).

Trade-off: inline kbd inside button vs attribute on button. Inline kbd clearer visually, no CSS tricks needed. Chose inline.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `frontend/src/views/calendar/GanttCalendarView.vue` | code | Add kbd badges to search-btn, today-btn, density-btn + scoped style |
| `frontend/src/views/calendar/GanttTimeline.vue` | code | Add kbd badge to sidebar-toggle + scoped style |
| `frontend/src/__tests__/views/calendar/GanttCalendarView.test.js` | code | Badge rendered test |
| `frontend/src/__tests__/views/calendar/GanttTimeline.test.js` | code | Sidebar toggle badge test |
| `memory-bank/features/README.md` | doc | Register FT-034 |

### Contracts

| Contract | I/O | Producer/Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `<kbd class="gantt-toolbar__kbd">{key}</kbd>` inside button | View / DOM | `aria-hidden="true"` |

### Failure Modes

- `FM-01` Touch device (no keyboard) → badges visible but meaningless. Acceptable — tooltip says «… (T)» similarly no-op on touch.
- `FM-02` Badge на очень узком viewport — button может wrap или overflow. `flex-shrink: 0` + `min-width` guards. Prior art — mode icons scale OK.
- `FM-03` Dark mode contrast на kbd bg `rgba(on-surface, 0.08)` — adequate.

### Rollback

- `RB-01` Single squash commit revert. No state changes.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..07` реализованы.
- `EC-02` 4 badges visible в DOM.
- `EC-03` Consistent styling с help dialog kbd.
- `EC-04` 753+ tests green.
- `EC-05` CI green.

### Acceptance Scenarios

- `SC-01` **Default state.** Toolbar shows: search icon + `/` badge | Today icon + «Сегодня» + `T` badge | density icon + `D` badge. Sidebar corner `>` chevron + `S` badge.
- `SC-02` **Dark mode parity.** Badges readable в dark с OKLCH tinted neutrals.
- `SC-03` **Tooltip still works.** Hover search-btn → tooltip «Найти гостя или юнит (/)» visible.
- `SC-04` **Narrow viewport (compact mode button with badge).** Today-btn + label «Сегодня» + `T` badge — overall width ≤ 120px, не ломает layout.

### Negative / Edge Cases

- `NEG-01` Screen reader не читает kbd (aria-hidden) → uses :title/:aria-label — consistent.
- `NEG-02` Badge overflow at extreme zoom → acceptable (zoom is user-controlled accessibility).

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | `CTR-01` | `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-02` | | `SC-02` | `CHK-02,05` | `EVID-02,05` |
| `REQ-03` | | — | `CHK-05` | `EVID-05` |
| `REQ-04` | | `NEG-01` | `CHK-02` | `EVID-02` |
| `REQ-05` | | `SC-01` | `CHK-02,05` | `EVID-02,05` |
| `REQ-06` | | `EC-04` | `CHK-01,02` | `EVID-01,02` |
| `REQ-07` | | — | — | — |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-04` | `yarn test:coverage` | ratchet met | `artifacts/ft-034/verify/chk-01/` |
| `CHK-02` | `REQ-01,02,04..06` + SCs | `yarn test` | 4 badges rendered | `artifacts/ft-034/verify/chk-02/` |
| `CHK-03` | — | diff —stat | minimal | — |
| `CHK-04` | `REQ-07` | i18n unchanged | 0 changes | — |
| `CHK-05` | `REQ-02,03` + `SC-01..04` | Manual QA light+dark screenshots | Visual consistency | `artifacts/ft-034/verify/chk-05/` |
| `CHK-06` | `EC-05` | markdownlint + CI | 0/5-5 | — |

### Evidence

EVID-01..06 per standard contract.

### Evidence contract

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-034/verify/chk-01/` |
| `EVID-02` | `yarn test` | `artifacts/ft-034/verify/chk-02/` |
| `EVID-05` | manual | `artifacts/ft-034/verify/chk-05/` |
| `EVID-06` | `markdownlint` + `gh` | CI link |
