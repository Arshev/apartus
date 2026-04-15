---
title: "FT-022: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план FT-022 Gantt Overdue Mode. Паттерн идентичен FT-021 — утилита + Item styling + toolbar + persistence. Пересмотр FT-021 toggleHandover на единый setSpecialMode helper."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_022_scope
  - ft_022_architecture
  - ft_022_acceptance_criteria
  - ft_022_blocker_state
---

# План имплементации

## Цель

Добавить overdue special mode на уже существующую Gantt calendar infrastructure (FT-020 merged + FT-021 merged). Единый PR, без backend-изменений, без новых npm. Refactor `toggleHandover` FT-021 через новый `setSpecialMode(mode)` helper для DRY mutual-exclusion.

## Current State / Reference Points

| Path | Current role | Why | Reuse |
|---|---|---|---|
| [`utils/gantt.js`](../../../frontend/src/utils/gantt.js) | Pure utils + FT-021 `getHandoverType` | Добавляем `getOverdueDays` по тому же паттерну | JSDoc, named export |
| [`utils/date.js`](../../../frontend/src/utils/date.js) | `startOfDay`, `parseIsoDate`, `diffDays` | Используем `diffDays` в getOverdueDays | Reuse |
| [`views/calendar/GanttTimelineItem.vue`](../../../frontend/src/views/calendar/GanttTimelineItem.vue) | `specialMode` prop + `handoverType` + `itemClasses` | Extend `itemClasses` для `specialMode === 'overdue'`; add `overdueLabel` span + pulse CSS | Mirror handover pattern |
| [`views/calendar/GanttCalendarView.vue`](../../../frontend/src/views/calendar/GanttCalendarView.vue) | `specialMode`, `toggleHandover`, `SUPPORTED_SPECIAL_MODES`, localStorage | Refactor `toggleHandover` → `setSpecialMode('handover')`; add `toggleOverdue`; extend array; add v-btn | Respect FT-021 `toggleHandover` exposed function — remains in defineExpose |
| `locales/ru.json`, `en.json` | `calendar.gantt.modes.handover`, `handoverMarkers.*` | Добавить `modes.overdue`, `overdueLabel` | Mirror structure |
| `__tests__/utils/gantt.test.js` | FT-021 `getHandoverType` tests | Добавить describe для `getOverdueDays` | — |
| `__tests__/views/calendar/GanttTimelineItem.test.js` | FT-021 handover tests | Добавить overdue tests | — |
| `__tests__/views/calendar/GanttCalendarView.test.js` | FT-021 toggleHandover + persistence | Extend для toggleOverdue + mutual exclusion + setSpecialMode + invalid 'overdue' fallback | Verify FT-021 toggleHandover tests still pass без модификации |
| `e2e/calendar-overlap.spec.js` | 4 tests (render, today, jump, handover) | Добавить 5-й тест для overdue | — |

## Test Strategy

| Test surface | Canonical refs | Existing | Planned | Local/CI | Manual | Approval |
|---|---|---|---|---|---|---|
| `getOverdueDays` | `CTR-01`, `REQ-02`, `CHK-02` | N/A | Matrix: `checked_in × check_out` (today / yesterday / 3d ago / future); non-checked_in → 0; invalid date → 0 | `yarn test gantt.test.js` | — | — |
| Item overdue styling | `REQ-03`, `CHK-02` | FT-021 handover styling tests | Extend: specialMode=overdue + overdueDays>0 → class + label span; overdueDays=0 → dimmed | `yarn test GanttTimelineItem.test.js` | — | — |
| CalendarView toggleOverdue + mutual exclusion | `REQ-01,05,06`, `CHK-02` | FT-021 toggleHandover tests | toggleOverdue flip, setSpecialMode helper, mutual exclusion (handover → overdue → ''), localStorage persist overdue, invalid 'overdue'->'' fallback, legacy payload backward-compat, **FT-021 toggleHandover tests pass без модификации** | `yarn test GanttCalendarView.test.js` | — | — |
| i18n parity | `REQ-07`, `CHK-04` | 435 keys ru == en | После FT-022: parity сохраняется с новыми ключами | node parity script | — | — |
| E2e overdue toggle | `SC-01..04`, `CHK-07` | 4 tests incl. handover | 5th: click overdue → `.gantt-item--overdue` or `--dimmed`; click handover затем overdue → specialMode transitions (mutual exclusion) | `yarn test:e2e` | — | — |
| Animation + dark + reduced-motion | `REQ-10`, `NEG-05`, `SC-06`, `CHK-05` | n/a (новое) | n/a (jsdom не умеет) | Manual dev QA + screenshots | Pulse visible / paused | `AG-01` |

## Open Questions

| OQ | Question | Why | Blocks | Default |
|---|---|---|---|---|
| `OQ-01` | Label format: `+5д` (short) или `+5 дн.` (short plural) — Phase 1? | NS-04 defers full plural; но «+1д» звучит плохо | `STEP-03` | Default: `+Nд` / `+Nd` без plural. Если user vetoes — escalation per NS-04. |

## Environment Contract

| Area | Contract | Used by | Failure |
|---|---|---|---|
| setup | `cd frontend && yarn install`; node 22 | all | module resolution |
| backend for e2e | `rails s -p 3000` + seed | `STEP-07` | 401 / timeout |
| test (vitest) | `yarn test [path]` | `STEP-02,04,05,06` | failure |
| test (e2e) | `yarn test:e2e [spec]` | `STEP-07` | Playwright failure |
| dev preview | `yarn dev` | `STEP-08` | — |

## Preconditions

| PRE | Ref | State | Used by | Blocks |
|---|---|---|---|---|
| `PRE-01` | `feature.md status: active` | FT-022 feature.md в active | all | yes |
| `PRE-02` | FT-020 + FT-021 merged в main | specialMode infrastructure exists | all | yes |
| `PRE-03` | `ASM-02` | Reservation model stable | `STEP-02` | yes |
| `PRE-04` | `utils/date.js#startOfDay`, `parseIsoDate`, `diffDays` | Доступны (FT-020) | `STEP-02` | yes |

## Workstreams

| WS | Implements | Result | Owner | Deps |
|---|---|---|---|---|
| `WS-1` | `REQ-02`, `CTR-01` | `getOverdueDays` + tests | agent | `PRE-*` |
| `WS-2` | `REQ-03,10` | Item overdue styling + pulse CSS + tests | agent | `WS-1` |
| `WS-3` | `REQ-01,05,06`, `CTR-02,03` | CalendarView `setSpecialMode` helper + toolbar extension + persistence + tests | agent | `WS-2` |
| `WS-4` | `REQ-07` | Locales | agent | параллельно с WS-3 |
| `WS-5` | `REQ-09` e2e | Playwright test | agent | `WS-3` |
| `WS-6` | Docs + closure | frontend.md subsection, FT-020 footnote update, feature.md delivery=done | agent | `WS-5` |

## Approval Gates

> AG-* — процедурные gates плана, не canonical AC.

| AG | Trigger | Applies | Why | Approver |
|---|---|---|---|---|
| `AG-01` | Перед PR merge | full PR | Визуальная корректность + pulse animation + reduced-motion не automated | User + screenshots |
| `AG-02` | Если нужен npm | `STEP-03` | Unicode icons должны рендериться | User |
| `AG-03` | Если нужен backend change | any | `CON-04` запрещает | User |

## Порядок работ

| Step | Actor | Implements | Goal | Touchpoints | Verifies | EVID | Check | Blocked by | Approval |
|---|---|---|---|---|---|---|---|---|---|
| `STEP-01` | agent | `PRE-04` | Grounding — подтвердить что FT-021 `toggleHandover` работает как baseline, читать его тесты | Read files | n/a | n/a | `yarn test GanttCalendarView.test.js` — все 22 passing | `PRE-01..04` | — |
| `STEP-02` | agent | `REQ-02`, `CTR-01` | Добавить `getOverdueDays(booking, today)` в `utils/gantt.js` | `utils/gantt.js` | `CHK-02` | `EVID-02` | `yarn test gantt.test.js` | `STEP-01` | — |
| `STEP-03` | agent | `REQ-02` tests | Unit tests matrix для getOverdueDays | `__tests__/utils/gantt.test.js` | `CHK-02` | `EVID-02` | `yarn test gantt.test.js` | `STEP-02` | — |
| `STEP-04` | agent | `REQ-03,10`, `FM-03,04` | Extend `GanttTimelineItem.vue` — `overdueDays` computed, class + label span (pointer-events:none), CSS `@keyframes overdue-pulse` + `@media (prefers-reduced-motion: reduce)` pause | `GanttTimelineItem.vue` | `CHK-02` (structure), `CHK-05` (animation manual) | `EVID-02`, `EVID-05` | `yarn test GanttTimelineItem.test.js` | `STEP-03` | — |
| `STEP-05` | agent | `REQ-03` tests | Extend Item tests: overdueDays>0 → class/label; =0 → dimmed; jsdom не проверяет animation | `__tests__/views/calendar/GanttTimelineItem.test.js` | `CHK-02` | `EVID-02` | `yarn test GanttTimelineItem.test.js` | `STEP-04` | — |
| `STEP-06` | agent | `REQ-07` | Locale keys: `calendar.gantt.modes.overdue` + `calendar.gantt.overdueLabel` (value `+{n}д` / `+{n}d` через `$t('...', { n: days })`) | `ru.json`, `en.json` | `CHK-04` | `EVID-04` | node parity script | параллельно | — |
| `STEP-07` | agent | `REQ-01,05,06`, `CTR-02,03`, `EC-04` | `GanttCalendarView.vue` — refactor `toggleHandover` → `setSpecialMode('handover')`; add `toggleOverdue`; extend `SUPPORTED_SPECIAL_MODES` с `'overdue'`; add second v-btn в toolbar с `:variant` switch (mirror handover); verify existing toggleHandover test passes без изменений | `GanttCalendarView.vue` | `CHK-02` | `EVID-02` | `yarn test GanttCalendarView.test.js` | `STEP-04, 06` | — |
| `STEP-08` | agent | `REQ-01,06` tests | Extend `GanttCalendarView.test.js`: toggleOverdue flip, setSpecialMode helper, mutual exclusion (handover → overdue), invalid 'overdue' fallback, combined persistence, legacy payload. FT-021 existing tests unchanged. | `__tests__/views/calendar/GanttCalendarView.test.js` | `CHK-02` | `EVID-02` | `yarn test GanttCalendarView.test.js` | `STEP-07` | — |
| `STEP-09` | agent | `REQ-09` e2e, `CHK-07` | Extend `e2e/calendar-overlap.spec.js`: click overdue button → assert `.gantt-item--overdue` or `.gantt-item--dimmed`. Click handover then overdue → `specialMode=overdue` (observable via DOM class). Re-click overdue → dimmed cleared. | `e2e/calendar-overlap.spec.js` | `CHK-07` | `EVID-07` | `yarn test:e2e` | `STEP-07` | — |
| `STEP-10` | agent (with `AG-01`) | `CHK-05` manual QA | Dev server + screenshots: light + dark + overdue active + pulse animation. Плюс reduced-motion тест (Chrome DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce` → pulse paused). | `artifacts/ft-022/verify/chk-05/` | `CHK-05` | `EVID-05` | dev + manual | `STEP-09` | `AG-01` |
| `STEP-11` | agent | full gate | Full test + build + lint. Evidence collection | n/a | `CHK-01,02,04,06` | `EVID-01,02,04,06` | `yarn test && yarn build && cd .. && markdownlint` | `STEP-10` | — |
| `STEP-12` | agent | Docs + closure | `domain/frontend.md` Overdue subsection; FT-020 footnote update (`[^ft-021]` → `[^ft-021,022]` or add FT-022 reference); FT-022 `delivery_status: done`; `features/README.md` | docs + frontmatters | `CHK-06` | `EVID-06` | markdownlint | `STEP-07` | — |
| `STEP-13` | agent (with `AG-01`) | PR close | Commit closure + push + open PR + watch CI + AG-01 approved → squash merge | git + gh | All CHK | All EVID | gh pr merge | `STEP-10..12` | `AG-01` |

## Parallelizable Work

- `PAR-01` STEP-06 (locales) параллельно с STEP-07 после STEP-04.
- `PAR-02` STEP-12 (docs) drafting параллельно с STEP-09..11 после STEP-07.

## Checkpoints

| CP | Refs | Condition | EVID |
|---|---|---|---|
| `CP-01` | STEP-01..03 | getOverdueDays + tests зелёные | EVID-02 |
| `CP-02` | STEP-04..06 | Item styling + locales + tests | EVID-02, EVID-04 |
| `CP-03` | STEP-07..08 | CalendarView toggle + mutual exclusion + tests | EVID-02 |
| `CP-04` | STEP-09 | E2e green | EVID-07 |
| `CP-05` | STEP-10..12 + AG-01 | Manual QA + docs + full gate | EVID-01,04,05,06 |
| `CP-06` | STEP-13 | PR merged, closure | all |

## Execution Risks

| ER | Risk | Impact | Mitigation | Trigger |
|---|---|---|---|---|
| `ER-01` | FT-021 `toggleHandover` test ломается после refactor | FT-021 regression | Keep `toggleHandover` как shim over `setSpecialMode('handover')`, exposed name сохраняется | `STEP-07` test failure |
| `ER-02` | CSS `@keyframes` конфликтует с Vuetify class | Анимация не играет | Use scoped `<style scoped>` + specific class selector | `STEP-10` manual QA |
| `ER-03` | `prefers-reduced-motion` не работает в current Chrome dev flags | CHK-05 заблокирован | Manual test via `chrome://flags` или devtools `Emulate CSS media feature` | `STEP-10` |
| `ER-04` | Seed не имеет overdue reservation — e2e тест не проверяет positive case | Только dimmed assertion работает | Extend e2e fallback on dimmed assertion (OR clause в CHK-07) | `STEP-09` первый run |

## Stop Conditions

| STOP | Ref | Trigger | Action | Fallback |
|---|---|---|---|---|
| `STOP-01` | `CHK-07`, `ER-04` | E2e flaky / seed не даёт overdue | Упростить до toolbar-only assertion, открыть follow-up issue | Reduced spec |
| `STOP-02` | `AG-01` | User не одобряет merge | Доработка | Pre-merge branch |

## Готово для приемки

- Все STEP-01..13 done
- Все CP-01..06 achieved
- Все CHK-01..07 с evidence
- PR merged, CI green, AG-01 given
- `delivery_status: done`
