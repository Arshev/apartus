---
title: "FT-029: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план FT-029 Gantt keyboard shortcuts. Composable + wire-up + help dialog + tooltip hints."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_029_scope
  - ft_029_architecture
  - ft_029_acceptance_criteria
---

# План имплементации

## Цель

Добавить 6 shortcuts (`/`, `T`, `[`, `]`, `Esc`, `?`) для operational manager'а. Closes Persona red flag из Impeccable critique. Nielsen H7 (flexibility) 1 → 3.

## Current State

| Path | Current | Action |
|---|---|---|
| `frontend/src/composables/` | exists (empty or minimal) | Add `useGanttShortcuts.js` |
| `frontend/src/views/calendar/GanttCalendarView.vue` | FT-028 baseline | Add `searchInputEl` template ref, `helpOpen` ref, `<v-dialog>` help, wire composable, add kbd hints to titles |
| `frontend/src/locales/{ru,en}.json` | 448 keys | +5 keys: `calendar.gantt.shortcuts.{title, caption, keys.search, keys.today, keys.pan, keys.clear, keys.help}` + hint suffix |
| `frontend/__tests__/composables/` | may not exist | Create for `useGanttShortcuts.test.js` |
| `frontend/e2e/calendar-overlap.spec.js` | 10 tests | +1: press `/`, `T`, `Esc` sequence |

## Preconditions

| PRE | Ref | State | Blocks |
|---|---|---|---|
| `PRE-01` | feature.md status: active | ✓ | yes |
| `PRE-02` | FT-028 merged | ✓ (main @ `00021d3`) | yes |
| `PRE-03` | Baseline 683 tests | verify STEP-01 | yes |

## Approval Gates

| AG | Trigger | Applies | Why |
|---|---|---|---|
| `AG-01a` | После STEP-08 QA | evidence | Visual correctness — help dialog, tooltip hints |
| `AG-01b` | Перед merge (STEP-10) | full PR | Human sign-off |

## Порядок работ

| Step | Actor | Implements | Goal | Touchpoints | Verifies | EVID | Check |
|---|---|---|---|---|---|---|---|
| `STEP-01` | agent | PRE-* | Baseline 683/683 | — | n/a | n/a | `yarn test` |
| `STEP-02` | agent | REQ-08 | Locales +5 keys: `calendar.gantt.shortcuts.*` + hint suffixes для toolbar buttons | ru.json, en.json | CHK-04 | EVID-04 | parity |
| `STEP-03` | agent | REQ-01 | `composables/useGanttShortcuts.js` — window keydown handler с input+overlay guards, dispatch на event.code | `useGanttShortcuts.js` | REQ-01 | EVID-02 | `yarn test` |
| `STEP-04` | agent | REQ-01..06 tests | Unit tests: guard (skip input/overlay), dispatch per key, Esc cascade, `?` layout-safe | `__tests__/composables/useGanttShortcuts.test.js` | CHK-02 | EVID-02 | `yarn test` |
| `STEP-05` | agent | REQ-02,03,04,05,06 | Wire composable в `GanttCalendarView`: add `searchInputEl` ref, `helpOpen` ref, `focusSearchInput` helper, `shiftRange(dir)` helper | `GanttCalendarView.vue` | REQ-02..06 | EVID-02 | `yarn test` |
| `STEP-06` | agent | REQ-06,07,09 | Add help `<v-dialog>` template с shortcuts table + kbd styling. Add kbd hints к title props of Today, Search buttons. Autofocus close btn, focus restore | `GanttCalendarView.vue` | REQ-06,07,09 | EVID-02 | `yarn test` |
| `STEP-07` | agent | REQ-10 integration | Extend CalendarView.test.js: simulate keydown events, assert state changes | `__tests__/views/calendar/GanttCalendarView.test.js` | CHK-02 | EVID-02 | `yarn test` |
| `STEP-08` | agent | CHK-07 | E2e: press `/` → search opens focused; press `T` → today centered; press `Esc` with query → cleared | `e2e/calendar-overlap.spec.js` | CHK-07 | EVID-07 | `yarn test:e2e` |
| `STEP-09` | agent (AG-01a) | CHK-05 manual QA | Screenshots light+dark help dialog; tooltip hint visible on hover | `artifacts/ft-029/verify/chk-05/` | CHK-05 | EVID-05 | dev + manual |
| `STEP-10` | agent | full gate + docs | `yarn test:coverage` + `yarn build` + markdownlint + `git diff --stat` + parity. Update `domain/frontend.md`, `features/README.md`, `feature.md delivery_status` | — + docs | CHK-01,02,03,04,06 | EVID-01..06 | green |
| `STEP-11` | agent (AG-01b) | PR close | commit + push + PR + CI + merge | git + gh | All CHK | All EVID | `gh pr merge` |

## Execution Risks

| ER | Risk | Impact | Mitigation |
|---|---|---|---|
| `ER-01` | `searchInputEl.value?.focus?.()` не работает на Vuetify v-text-field (maybe needs inner input element) | shortcut not focusing | Test with actual Vuetify instance; fallback: `searchInputEl.value.$el.querySelector('input')?.focus()` |
| `ER-02` | `.v-overlay--active` selector wrong — Vuetify 4 may use `.v-overlay--active` OR different | Guard bypass | Verify в dev tools during STEP-06 QA; add both selectors if needed |
| `ER-03` | Focus restore after dialog close — v-dialog may unmount content before restore | Focus lost | Use `onAfterLeave` hook or ref snapshot |
| `ER-04` | E2e flake: `/` key sent before page ready | CI red | wait for `.gantt-item` before pressing |

## Stop Conditions

| STOP | Trigger | Action |
|---|---|---|
| `STOP-01` | AG-01b deny | Rework |
| `STOP-02` | Shortcut conflicts с native browser shortcut | Reassess key choice, escalate scope |

## Готово для приемки

- STEP-01..11 done, CHK-01..07 evidence
- PR merged, CI green, AG-01b given
