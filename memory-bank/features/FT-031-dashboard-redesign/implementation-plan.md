---
title: "FT-031: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "FT-031 Dashboard Redesign — editorial hierarchy rewrite of DashboardView.vue."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_031_scope
  - ft_031_architecture
  - ft_031_acceptance_criteria
---

# План имплементации

## Цель

Rewrite `DashboardView.vue` template to editorial layout: hero revenue + supporting metrics + horizontal status bar + clean upcoming lists. No backend changes. No new deps.

## Preconditions

| PRE | Ref | State | Blocks |
|---|---|---|---|
| `PRE-01` | feature.md status: active | ✓ | yes |
| `PRE-02` | FT-030 merged | ✓ (main @ `53c21d8`) | yes |
| `PRE-03` | Baseline 731 tests | verify STEP-01 | yes |

## Порядок работ

| Step | Actor | Implements | Goal | Touchpoints | Verifies | EVID | Check |
|---|---|---|---|---|---|---|---|
| `STEP-01` | agent | PRE-* | Baseline 731/731 + read current DashboardView.vue template + test file | — | n/a | n/a | `yarn test` |
| `STEP-02` | agent | REQ-01 | Hero section — greeting + revenue number + supporting metrics row + occupancy slim bar | `DashboardView.vue` (template + scoped styles) | REQ-01,02 | EVID-02 | `yarn test DashboardView.test.js` |
| `STEP-03` | agent | REQ-03 | Status breakdown — horizontal stacked bar + legend list. Pure CSS flex-basis percentages. Handle totalReservations=0 edge | `DashboardView.vue` | REQ-03, FM-01,04 | EVID-02 | `yarn test` |
| `STEP-04` | agent | REQ-04,05,06 | Upcoming lists — remove icon prefix from items + heading icons; no v-card color= attribute anywhere; left-aligned sections | `DashboardView.vue` | REQ-04..06 | EVID-02,03 | grep + `yarn test` |
| `STEP-05` | agent | REQ-09 | Responsive: hero `clamp()`, supporting metrics flex-wrap, check-ins/outs md-stack. Verify xs-md-lg | `DashboardView.vue` (scoped styles) | REQ-09 | EVID-05 | manual resize |
| `STEP-06` | agent | REQ-10 tests | Extend `DashboardView.test.js`: hero revenue value renders, status bar segments present (count matches), upcoming items rendered, empty state preserved | `__tests__/views/DashboardView.test.js` | CHK-02 | EVID-02 | `yarn test` |
| `STEP-07` | agent (AG-01a) | CHK-05 manual QA | Screenshots @ 1440 / 1024 / 768 / 390 × light+dark | `artifacts/ft-031/verify/chk-05/` | CHK-05 | EVID-05 | dev + manual |
| `STEP-08` | agent | CHK-03 grep | Run the CHK-03 grep pattern against `src/views/DashboardView.vue`; expect zero matches. | `artifacts/ft-031/verify/chk-03/` | CHK-03 | EVID-03 | grep |
| `STEP-09` | agent | full gate + docs | `yarn test:coverage` + `yarn build` + markdownlint + i18n parity + update docs | — + docs | CHK-01,02,04,06 | EVID-01,02,04,06 | all green |
| `STEP-10` | agent (AG-01b) | PR close | commit + push + PR + CI + merge | git + gh | All CHK | All EVID | `gh pr merge` |

## Approval Gates

| AG | Trigger | Applies | Why |
|---|---|---|---|
| `AG-01a` | После STEP-07 QA | evidence | Editorial hierarchy visible; responsive works; dark readable |
| `AG-01b` | Перед merge (STEP-10) | full PR | Human sign-off |

## Execution Risks

| ER | Risk | Impact | Mitigation |
|---|---|---|---|
| `ER-01` | Hero revenue font 3.5rem wraps awkwardly при длинных суммах на narrow vp | Visual break | clamp(1.75, 4vw, 3.5rem) + `overflow-wrap: anywhere` guard |
| `ER-02` | Existing DashboardView.test.js asserts Vuetify card color attrs → breaks | Test red | Read existing tests STEP-01; update selectors в STEP-06 |
| `ER-03` | Status bar при totalReservations=0 visually broken (zero-width segments) | UX | FM-01 explicit: empty bar with subtle «—» placeholder |

## Stop Conditions

| STOP | Trigger | Action |
|---|---|---|
| `STOP-01` | AG-01b deny | Rework per feedback |

## Готово для приемки

- STEP-01..10 done
- CHK-01..06 evidence
- PR merged, CI green, AG-01b given
