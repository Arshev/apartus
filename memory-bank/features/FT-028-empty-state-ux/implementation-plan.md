---
title: "FT-028: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Small P2 — Gantt empty-state UX teaching. One view + locales + tests."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_028_scope
  - ft_028_architecture
  - ft_028_acceptance_criteria
---

# План имплементации

## Цель

Закрыть Impeccable P2 empty-state finding. Gantt search empty state и no-data empty state получают teaching subtext + inline action.

## Current State

| Path | Current | Action |
|---|---|---|
| `frontend/src/views/calendar/GanttCalendarView.vue` | 2 `v-empty-state` (search-empty lines ~128, no-data lines ~135) с title-only | Добавить `:text` prop + `actions` slot с button |
| `frontend/src/locales/ru.json`, `en.json` | `calendar.gantt.search.empty`, `calendar.emptyState.*` existing | +3 keys: `search.emptyHint`, `search.clear`, `emptyState.cta` |
| `frontend/src/__tests__/views/calendar/GanttCalendarView.test.js` | FT-025 search empty state assertion | Extend with subtext, button click, and no-data CTA |
| `frontend/e2e/calendar-overlap.spec.js` | 9 tests | +1: click Clear in search empty restores view |

## Preconditions

| PRE | Ref | State | Blocks |
|---|---|---|---|
| `PRE-01` | feature.md status: active | ✓ | yes |
| `PRE-02` | FT-027 merged | ✓ (main @ `362fc57`) | yes |
| `PRE-03` | Baseline 679 tests pass | verify в STEP-01 | yes |

## Workstreams

| WS | Implements | Result | Deps |
|---|---|---|---|
| `WS-1` | REQ-04 | Locales | PRE-* |
| `WS-2` | REQ-01,02,03,05 | Template + handler | WS-1 |
| `WS-3` | REQ-06 | Tests | WS-2 |
| `WS-4` | CHK-07 | E2e | WS-2 |
| `WS-5` | Docs + closure | frontend.md, README, feature.md delivery_status | WS-3,4 |

## Approval Gates

| AG | Trigger | Applies | Why |
|---|---|---|---|
| `AG-01a` | После STEP-07 QA | QA evidence | Visual correctness light+dark |
| `AG-01b` | Перед merge (STEP-09) | full PR | Human approval |

## Порядок работ

| Step | Actor | Implements | Goal | Touchpoints | Verifies | EVID | Check |
|---|---|---|---|---|---|---|---|
| `STEP-01` | agent | PRE-* | Baseline tests 679/679 | — | n/a | n/a | `yarn test` |
| `STEP-02` | agent | REQ-04 | Locales +3 keys each | ru.json, en.json | CHK-04 | EVID-04 | parity check |
| `STEP-03` | agent | REQ-01,02,05 | Search empty state: add `:text` + `actions` slot with Clear button → `onSearchEscape` | `GanttCalendarView.vue` | REQ-01,02 | EVID-02 | `yarn test` |
| `STEP-04` | agent | REQ-03 | No-data empty state: add `actions` slot with Add-property button → `router.push('/properties/new')` | `GanttCalendarView.vue` | REQ-03 | EVID-02 | `yarn test` |
| `STEP-05` | agent | REQ-06 tests | Extend CalendarView tests: subtext rendered; Clear button click triggers `onSearchEscape` effect (query cleared, searchOpen=false); CTA button click navigates | `__tests__/views/calendar/GanttCalendarView.test.js` | CHK-02 | EVID-02 | `yarn test` |
| `STEP-06` | agent | CHK-07 e2e | +1 test: type query → empty state → click Clear → rows restored | `e2e/calendar-overlap.spec.js` | CHK-07 | EVID-07 | `yarn test:e2e` |
| `STEP-07` | agent (AG-01a) | CHK-05 manual QA | Screenshots light+dark: search empty with button, no-data empty with CTA | `artifacts/ft-028/verify/chk-05/` | CHK-05 | EVID-05 | dev + manual |
| `STEP-08` | agent | full gate + docs | `yarn test:coverage` + `yarn build` + markdownlint + `git diff --stat` + parity. Update `domain/frontend.md`, `features/README.md`, `feature.md delivery_status` | — + docs | CHK-01,02,03,04,06 | EVID-01..06 | all green |
| `STEP-09` | agent (AG-01b) | PR close | Commit + push + PR + CI + AG-01b → squash merge, delete branch | git + gh | All CHK | All EVID | `gh pr merge` |

## Checkpoints

| CP | Refs | Condition |
|---|---|---|
| `CP-01` | STEP-01..02 | Baseline + locales |
| `CP-02` | STEP-03..05 | Empty states + tests |
| `CP-03` | STEP-06 | E2e |
| `CP-04` | STEP-07..08 + AG-01a | QA + gate |
| `CP-05` | STEP-09 | Merged |

## Execution Risks

| ER | Risk | Impact | Mitigation |
|---|---|---|---|
| `ER-01` | `v-empty-state actions` slot syntax not what we expect in Vuetify 4 | Template break | Verify via Vuetify docs or quick test before STEP-04 |
| `ER-02` | Click на Clear button не propagates blur на input (input is already collapsed by this point) | Focus lost | `onSearchEscape` already handles refocus — reuse |
| `ER-03` | E2e flake (empty state disappears before assertion) | Test failure | Use waitForSelector with timeout |

## Stop Conditions

| STOP | Trigger | Action |
|---|---|---|
| `STOP-01` | E2e repeatedly flaky after 2 stabilization attempts | Reduce e2e coverage to component test only |
| `STOP-02` | AG-01b deny | Rework per feedback |

## Готово для приемки

- STEP-01..09 done, CP-01..05 achieved, CHK-01..07 evidence
- PR merged, CI green, AG-01b given
- `feature.md delivery_status: done`
- `features/README.md` lists FT-028
