---
title: "FT-030: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "FT-030 Sidebar Collapse — toggle + abbreviation + persistence + S shortcut."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_030_scope
  - ft_030_architecture
  - ft_030_acceptance_criteria
---

# План имплементации

## Цель

Collapsible Gantt unit sidebar. 240px ↔ 48px + abbreviations + persistence + `S` shortcut.

## Preconditions

| PRE | Ref | State | Blocks |
|---|---|---|---|
| `PRE-01` | feature.md status: active | ✓ | yes |
| `PRE-02` | FT-029 merged | ✓ (main @ `7341aa2`) | yes |
| `PRE-03` | Baseline 704 tests | verify STEP-01 | yes |

## Порядок работ

| Step | Actor | Implements | Goal | Touchpoints | Verifies | EVID | Check |
|---|---|---|---|---|---|---|---|
| `STEP-01` | agent | PRE-* | Baseline 704/704 | — | n/a | n/a | `yarn test` |
| `STEP-02` | agent | REQ-10 | `utils/strings.js#abbreviateUnit` | `utils/strings.js` | CHK-02 | EVID-02 | `yarn test` |
| `STEP-03` | agent | REQ-10 tests | Matrix unit tests для `abbreviateUnit` | `__tests__/utils/strings.test.js` | CHK-02 | EVID-02 | `yarn test` |
| `STEP-04` | agent | REQ-08 | Locales +3 keys | `ru.json`, `en.json` | CHK-04 | EVID-04 | parity |
| `STEP-05` | agent | REQ-01,05 | `GanttCalendarView`: `sidebarCollapsed` ref, `toggleSidebar()`, extend load/persistView | `GanttCalendarView.vue` | REQ-01,05 | EVID-02 | `yarn test` |
| `STEP-06` | agent | REQ-06,07 | Wire `S` в `useGanttShortcuts`, add row в `shortcutRows` | `useGanttShortcuts.js`, `GanttCalendarView.vue` | REQ-06,07 | EVID-02 | `yarn test` |
| `STEP-07` | agent | REQ-06 tests | Composable test для `S` + integration test для `toggleSidebar` | tests | CHK-02 | EVID-02 | `yarn test` |
| `STEP-08` | agent | REQ-02,03,04,09 | `GanttTimeline.vue`: `:collapsed` prop, `gridColumns` computed, corner toggle button with `aria-expanded/controls`, unit cells abbreviation, CSS transition | `GanttTimeline.vue` | REQ-02,03,04,09 | EVID-02,05 | `yarn test` |
| `STEP-09` | agent | REQ-02,03 tests | Timeline tests — collapsed prop flips grid + cells | `__tests__/views/calendar/GanttTimeline.test.js` | CHK-02 | EVID-02 | `yarn test` |
| `STEP-10` | agent | CHK-07 e2e | Click toggle + `S` key both toggle; reload preserves | `e2e/calendar-overlap.spec.js` | CHK-07 | EVID-07 | `yarn test:e2e` |
| `STEP-11` | agent (AG-01a) | CHK-05 manual QA | Screenshots light+dark expanded+collapsed, hover tooltip reveals full name | `artifacts/ft-030/verify/chk-05/` | CHK-05 | EVID-05 | dev + manual |
| `STEP-12` | agent | full gate + docs | tests + build + lint + i18n parity + doc updates + `delivery_status: done` | — + docs | CHK-01..06 | EVID-01..06 | green |
| `STEP-13` | agent (AG-01b) | PR close | commit + push + PR + CI + merge | git + gh | All CHK | All EVID | `gh pr merge` |

## Execution Risks

| ER | Risk | Impact | Mitigation |
|---|---|---|---|
| `ER-01` | Toggle button inside 50px corner overlaps «Юнит» label text | Clumsy UX | Remove text label when collapsed; icon-only corner when collapsed |
| `ER-02` | Grid transition (240px → 48px) janks when rows have diff heights | Visual | `will-change: grid-template-columns` hint; measured only if observed |
| `ER-03` | `S` shortcut сталкивается с typing (e.g. user типa property name) | Hijack | Input guard (FT-029) covers это — test passes |

## Готово для приемки

- STEP-01..13 done, CHK-01..07 evidence
- PR merged, CI green, AG-01b given
