---
title: "FT-027: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план FT-027 Reservation Bar Density. Item-level revenue/nights + theme-aware hover outline. Отзеркален от FT-025/FT-026 pattern."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_027_scope
  - ft_027_architecture
  - ft_027_acceptance_criteria
---

# План имплементации

## Цель

Заменить solid-slab reservation bars на information-dense bars с revenue + nights progressive disclosure. Theme-aware hover outline. Нулевые backend changes.

## Current State / Reference Points

| Path | Current | Action |
|---|---|---|
| `frontend/src/views/calendar/GanttTimelineItem.vue` | `.gantt-item__label` + handover marker + overdue-label | Add `.gantt-item__revenue` + `.gantt-item__nights`, extend computed для thresholds + mode overrides. Swap hover box-shadow → outline |
| `frontend/src/views/calendar/GanttTimelineRow.vue` | Passes bookings to Items | Pull currency once from auth store, pass as prop |
| `frontend/src/utils/date.js` | `diffDays(a, b)` exists | Reuse — no changes |
| `frontend/src/utils/currency.js` | `formatMoney(cents, code)` exists | Reuse |
| `frontend/src/stores/auth.js` | `organization` exposed | Read `.currency` field (existing pattern in GanttTooltip) |
| `frontend/src/locales/{ru,en}.json` | +nightsLabel | Add `calendar.gantt.nightsLabel`: `{n} н` / `{n} n` |
| `frontend/src/__tests__/views/calendar/GanttTimelineItem.test.js` | Existing threshold/handover/overdue tests | Extend: revenue/nights matrix + mode overrides + pointer-events |
| `frontend/e2e/calendar-overlap.spec.js` | 8 calendar tests | +1 — revenue visibility on wide bar |

## Test Strategy

| Surface | Canonical | Existing | Planned | Local/CI | Manual | Approval |
|---|---|---|---|---|---|---|
| Item thresholds | REQ-03, CHK-02 | handover/overdue rendering tests | Matrix: 5 width buckets × (has price? / no price) × specialMode overrides | `yarn test GanttTimelineItem.test.js` | — | — |
| Revenue formatting | REQ-01, CHK-02 | currency.test.js covers formatMoney | Integration: Item wraps revenue in tabular span, correct currency from prop | `yarn test` | — | — |
| Nights calc | REQ-05, CHK-02 | date.test.js covers diffDays | Integration: 0, 1, 5 nights; invalid dates → hidden | `yarn test` | — | — |
| Hover outline | REQ-04, CHK-02 | N/A | JSDOM assert computed style has `outline: 2px` on :hover (limited — visual also needed) | `yarn test` + manual | — | AG-01a |
| pointer-events | REQ-09, CHK-02 | N/A | Click on revenue span triggers booking navigation (event propagates) | `yarn test` | — | — |
| i18n parity | REQ-07, CHK-04 | 444 keys | +1 each (`nightsLabel`) | node parity | — | — |
| E2e wide bar | SC-01, CHK-07 | FT-025 calendar.e2e 8 tests | +1: wide bar renders `.gantt-item__revenue`; narrow does not | `yarn test:e2e` | — | — |
| Dark/light readability | REQ-08, CHK-05 | FT-026 manual QA | Screenshot light + dark, hover state, overdue mode | Manual dev | Revenue + nights legible on all status colors | AG-01a |

## Open Questions

Нет — все blockers и should-fix от review addressed.

## Environment Contract

Standard: vite dev @ :5173, rails @ :3000 (Apartus backend), Bun installed.

## Preconditions

| PRE | Ref | State | Blocks |
|---|---|---|---|
| `PRE-01` | `feature.md status: active` | ✓ | yes |
| `PRE-02` | FT-026 merged | ✓ (main @ `a1f5488`) | yes |
| `PRE-03` | Baseline 659+ tests pass | verify в STEP-01 | yes |
| `PRE-04` | `total_price_cents` in reservation_json | ✓ (backend serializer) | yes |
| `PRE-05` | `diffDays(a, b) = b - a` in date.js | ✓ verified | yes |

## Workstreams

| WS | Implements | Result | Deps |
|---|---|---|---|
| `WS-1` | REQ-07 | Locales | PRE-* |
| `WS-2` | REQ-05, REQ-06 | Nights helper use in Item + currency prop | WS-1, PRE-* |
| `WS-3` | REQ-01..03, REQ-04 | Item template + thresholds + hover outline + scoped styles | WS-2 |
| `WS-4` | REQ-09 | pointer-events + click propagation test | WS-3 |
| `WS-5` | REQ-08 | Dark/light QA | WS-3 |
| `WS-6` | CHK-07 | E2e | WS-3 |
| `WS-7` | Docs + closure | frontend.md update, README, delivery_status | WS-5,6 |

## Approval Gates

| AG | Trigger | Applies | Why |
|---|---|---|---|
| `AG-01a` | После STEP-11 QA | QA evidence | Visual correctness в light+dark, hover outline, overdue mode override |
| `AG-01b` | Перед merge (STEP-14) | full PR | Human pre-merge sign-off |
| `AG-02` | Нужен npm | any STEP | CON-01 |
| `AG-03` | Backend change | any STEP | CON-04 |

## Порядок работ

| Step | Actor | Implements | Goal | Touchpoints | Verifies | EVID | Check |
|---|---|---|---|---|---|---|---|
| `STEP-01` | agent | PRE-* | Baseline 659+ tests + read existing Item template/tests | — | n/a | n/a | `yarn test` |
| `STEP-02` | agent | REQ-07 | Locales `calendar.gantt.nightsLabel`: ru `{n} н`, en `{n} n` | `ru.json`, `en.json` | CHK-04 | EVID-04 | node parity |
| `STEP-03` | agent | REQ-06 | `GanttTimelineRow.vue` — import `useAuthStore`, computed `currency` (`organization?.currency \|\| 'RUB'`), pass as prop to Item | `GanttTimelineRow.vue` | REQ-06 | EVID-02 | `yarn test GanttTimelineRow.test.js` |
| `STEP-04` | agent | REQ-05 | Item — import `diffDays` + `formatMoney`; computed `nights = diffDays(_start, _end)` with guard | `GanttTimelineItem.vue` | REQ-05 | EVID-02 | N/A (tests in 05/07) |
| `STEP-05` | agent | REQ-01,02,03 | Item template — add `<span class="gantt-item__revenue">` (v-if showRevenue) + `<span class="gantt-item__nights">` (v-if showNights); computeds for width thresholds + mode overrides | `GanttTimelineItem.vue` | REQ-01..03 | EVID-02 | `yarn test` |
| `STEP-06` | agent | REQ-04, REQ-09 | CSS — swap `.gantt-item:hover` box-shadow → `outline: 2px solid rgba(var(--v-theme-on-surface), 0.3); outline-offset: 2px`. Revenue/nights spans get pointer-events: none | `GanttTimelineItem.vue` (style) | REQ-04,09 | EVID-02,05 | `yarn test` + manual |
| `STEP-07` | agent | REQ-01..03,05,09 tests | Extend `GanttTimelineItem.test.js`: width threshold matrix, mode overrides (overdue, handover-dim), zero price, invalid nights, pointer-events (click on revenue span calls show-booking) | `__tests__/views/calendar/GanttTimelineItem.test.js` | CHK-02 | EVID-02 | `yarn test GanttTimelineItem.test.js` |
| `STEP-08` | agent | CHK-02 regression | Existing FT-021..026 tests still green | — | CHK-02 | EVID-02 | `yarn test` full |
| `STEP-09` | agent | CHK-07 e2e | Extend calendar.e2e: wide bar selector `.gantt-item__revenue` count > 0; narrow bar count = 0 | `e2e/calendar-overlap.spec.js` | CHK-07 | EVID-07 | `yarn test:e2e` |
| `STEP-10` | agent | full gate | `yarn test` + `yarn build` + markdownlint | — | CHK-01,02,06 | EVID-01,02,06 | all green |
| `STEP-11` | agent (AG-01a) | CHK-05 manual QA | Screenshots light+dark: (a) wide bar with revenue+nights, (b) narrow bar unchanged, (c) hover outline state, (d) overdue mode (no revenue), (e) handover mode dimmed (no revenue) | `artifacts/ft-027/verify/chk-05/` | CHK-05 | EVID-05 | dev + manual |
| `STEP-12` | agent | Docs + closure | Update `domain/frontend.md` Calendar (mention revenue/nights chips), `features/README.md` register, `feature.md delivery_status: done` | docs | CHK-06 | EVID-06 | markdownlint |
| `STEP-13` | agent | CHK-03 | `git diff main..HEAD --stat` minimal | — | CHK-03 | EVID-03 | diff check |
| `STEP-14` | agent (AG-01b) | PR close | commit + push + PR + CI + merge | git + gh | All CHK | All EVID | `gh pr merge` |

## Parallelizable

- `PAR-01` STEP-02 locales параллельно STEP-03..07.

## Checkpoints

| CP | Refs | Condition |
|---|---|---|
| `CP-01` | STEP-01..03 | Baseline + locales + currency prop |
| `CP-02` | STEP-04..06 | Item revenue/nights + hover outline |
| `CP-03` | STEP-07..08 | All tests green |
| `CP-04` | STEP-09 | E2e green |
| `CP-05` | STEP-10..11 + AG-01a | Gate + QA |
| `CP-06` | STEP-12..14 | Docs + merged |

## Execution Risks

| ER | Risk | Impact | Mitigation |
|---|---|---|---|
| `ER-01` | Revenue chip overlaps overdue-label в overdue mode если REQ-03 override не зарегистрирован | Visual regression FT-022 | REQ-03 Overrides строго hide revenue в overdue; STEP-07 test matrix покрывает combo |
| `ER-02` | Currency prop drilled — много re-renders при switch org | Perf | Currency таки компаним на Row-level, stable per org; no re-render concern |
| `ER-03` | Outline outside box может перекрыть соседние bars | Visual clutter | `outline-offset: 2px` + z-index 2 hover (existing). Bars имеют gap ≥ 2px между lanes |
| `ER-04` | Dimmed bars (handover/overdue) всё равно рендерят revenue если override logic broken | Illegible noise | Explicit STEP-07 test: specialMode=overdue non-matching → no revenue span |
| `ER-05` | Existing `.gantt-item__label { width: 100% }` конфликтует с новыми spans flex-shrink | Label takes все width, revenue/nights не видны | Change label to `flex: 1 1 auto; min-width: 0` для proper flex behavior |

## Stop Conditions

| STOP | Trigger | Action |
|---|---|---|
| `STOP-01` | E2e flaky после stabilization attempt | Reduce to unit-level assertion via DOM snapshot |
| `STOP-02` | AG-01b deny | Rework per feedback |
| `STOP-03` | Dark mode outline invisible (insufficient contrast) | Bump opacity 0.3 → 0.45 or switch to surface-inverse |

## Готово для приемки

- STEP-01..14 done, CP-01..06 achieved, CHK-01..07 evidence
- PR merged, CI green, AG-01b given
- `feature.md delivery_status: done`
- `features/README.md` включает FT-027
