---
title: "FT-026: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план FT-026 Design Refresh. Последовательность: fonts → tokens → Vuetify OKLCH palette → toolbar restructure → QA re-critique."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_026_scope
  - ft_026_architecture
  - ft_026_acceptance_criteria
---

# План имплементации

## Цель

Заменить Vuetify-default Material look на typography-driven editorial-operational aesthetic, соответствующий `.impeccable.md`. Closes P0a+P0b+P1 от Impeccable critique (21/40 → ≥ 28/40 target).

## Current State / Reference Points

| Path | Current | Action |
|---|---|---|
| `frontend/src/plugins/vuetify.js` | light/dark themes с hex colors incl. pure `#FFFFFF`, `#121418`, status-*, priority-*, finance-* tokens | Rewrite **только** neutral + brand tokens через OKLCH-derived hex; status/priority/finance untouched |
| `frontend/src/styles/settings.scss` | `$body-font-family: ('Inter', ...)` не загружается; no CSS vars | Replace с `--font-display`, `--font-body`, `--font-mono`, `--tracking-*`, `--space-*` |
| `frontend/src/styles/` | `settings.scss`, `index.scss` (existing) | Add `fonts.scss`, `typography.scss` |
| `frontend/index.html` | no font preloads | Add `<link rel="preload" as="font">` для Geologica 500 + Geist 400 (Cyrillic + Latin subsets) |
| `frontend/public/fonts/` | doesn't exist | Create `{geologica,geist}/*.woff2` + `OFL.txt` |
| `frontend/src/main.js` | imports `@/styles/settings.scss` indirectly через Vuetify | Add explicit `import '@/styles/fonts.scss'` + `typography.scss` |
| `frontend/src/views/calendar/GanttCalendarView.vue` | flat toolbar 10+ buttons, 3 variant styles, `:color="primary"` + `variant="elevated"` для active mode | Group в 3 кластера, consistent `variant="text"`, `variant="tonal"` + bold для active |
| `memory-bank/engineering/design-style-guide.md` | reflects old Material + pure neutrals | Update palette + typography sections |

## Test Strategy

| Surface | Canonical | Existing | Planned | Local/CI | Manual | Approval |
|---|---|---|---|---|---|---|
| Vuetify theme updated | REQ-04, CHK-02 | existing tests depend on Vuetify stubs, не на raw colors | Existing tests pass unchanged; visual regression в QA | `yarn test` | — | — |
| Fonts загружаются | REQ-01,02, CHK-05 | N/A | Manual: DevTools Network check; visual glyph shape (Cyrillic + Latin) | manual dev | Screenshots light+dark | AG-01a |
| Toolbar restructure | REQ-05,06, CHK-02 | `GanttCalendarView.test.js` asserts existence of buttons | Tests pass; assertion шаблонов может измениться (e.g. wrapping div), update accordingly | `yarn test GanttCalendarView.test.js` | — | — |
| Status chips preserved | REQ-04, NEG-02 | task-priority + reservation-status chips | Manual check на reservations list + tasks board + Gantt bars | manual | — | AG-01a |
| Dark mode contrast WCAG AA | REQ-08, EC-07 | FT-024 QA precedent | Chrome DevTools Contrast checker на primary surfaces | manual | Contrast matrix | AG-01a |
| Re-critique Nielsen | MET-04 | baseline 21/40 | Launch critique agent post-merge-ready | agent call | — | AG-01b |

## Open Questions

Нет — все blockers от feature.md review addressed. Geologica + Geist Cyrillic верифицированы (OFL 1.1 обе).

## Environment Contract

Standard:

- `cd frontend && yarn dev` @ :5173
- backend @ :3000
- Manual QA через Playwright MCP или браузер
- Bun installed (`~/.bun/bin/bun`) из FT-025 для OKLCH compute через `bunx culori`

## Preconditions

| PRE | Ref | State | Blocks |
|---|---|---|---|
| `PRE-01` | feature.md `status: active` | ✓ | yes |
| `PRE-02` | FT-025 merged | ✓ (main @ `8a8f3d4`) | yes |
| `PRE-03` | Baseline 659 frontend tests pass | verify в STEP-01 | yes |
| `PRE-04` | `.impeccable.md` present в repo root | ✓ | yes |
| `PRE-05` | Bun installed для OKLCH precompute | ✓ (`~/.bun/bin`) | yes |

## Workstreams

| WS | Implements | Result | Deps |
|---|---|---|---|
| `WS-1` | REQ-01 | Font files downloaded + placed | PRE-* |
| `WS-2` | REQ-02, REQ-03 | SCSS tokens + typography utility classes | WS-1 |
| `WS-3` | REQ-04, ASM-05 | OKLCH → Vuetify theme hex | PRE-* (parallel с WS-1) |
| `WS-4` | REQ-05, REQ-06 | Toolbar grouping + tonal active state | WS-2 (needs tokens) + WS-3 (needs new primary) |
| `WS-5` | REQ-07, REQ-08 | Type scale utility classes + dark mode verification | WS-2 |
| `WS-6` | EC-05, EC-07, EC-08 | All tests + WCAG contrast + font loading verification | WS-4 |
| `WS-7` | MET-04 | Post-change re-critique via agent | WS-6 |
| `WS-8` | Docs + closure | style guide + frontend.md updates | WS-6 |

## Approval Gates

| AG | Trigger | Applies | Why |
|---|---|---|---|
| `AG-01a` | После STEP-12 QA | QA evidence | Screenshots + contrast + fonts loaded confirmed |
| `AG-01b` | Перед merge (STEP-15) | full PR | Human final sign-off — визуальная корректность в light+dark, re-critique score acceptable |
| `AG-02` | Нужен npm | any STEP | CON-01 |
| `AG-03` | Backend change | any STEP | CON-04 |
| `AG-04` | Любое отклонение от feature.md REQ | any STEP | Scope creep guard |

## Порядок работ

| Step | Actor | Implements | Goal | Touchpoints | Verifies | EVID | Check |
|---|---|---|---|---|---|---|---|
| `STEP-01` | agent | PRE-* | Baseline: verify 659/659 tests + read existing `vuetify.js` + `settings.scss` | — | n/a | n/a | `yarn test` |
| `STEP-02` | agent | REQ-01 (a) | Download Geologica (4 weights × latin+cyrillic = 8 files) + `OFL.txt` from Google Fonts via API (`fonts.googleapis.com/css2?family=Geologica:wght@400..700`) + resolve woff2 URLs | `public/fonts/geologica/` | — | n/a | file presence + size < 80KB each |
| `STEP-03` | agent | REQ-01 (b) | Download Geist (2 weights × latin+cyrillic = 4 files) + `OFL.txt` from `vercel/geist-font` raw GitHub | `public/fonts/geist/` | — | n/a | file presence |
| `STEP-04` | agent | REQ-02 | Create `src/styles/fonts.scss` with `@font-face` rules + `unicode-range` split. Update `settings.scss` to CSS vars. Add preloads в `index.html`. Import `fonts.scss` в `main.js` | `fonts.scss`, `settings.scss`, `index.html`, `main.js` | REQ-01,02 | EVID-05 | dev server serves fonts, DevTools Network 200 |
| `STEP-05` | agent | REQ-03, REQ-07 | Create `src/styles/typography.scss` with utility classes (`.text-display-*`, `.text-body`, `.text-label`, `.text-table-header`, `.text-tabular`). Apply `.text-tabular` к enumerated selectors (gantt day numbers, tooltip price, overdue label, money cells) | `typography.scss` + targeted Vue files | REQ-03,07 | EVID-05 | visual QA |
| `STEP-06` | agent | REQ-04 (compute) | OKLCH → rgb/hex compute via bunx culori CLI для всех neutral + brand values (light + dark). Emit comment block с source→computed mapping | scratchpad | — | n/a | verify parity в dev tool |
| `STEP-07` | agent | REQ-04 (apply) | Update `plugins/vuetify.js` theme colors — neutral + brand only. Status/priority/finance untouched (explicit preservation comment) | `plugins/vuetify.js` | REQ-04 | EVID-02 | `yarn test` passes + dev server renders |
| `STEP-08` | agent | REQ-05 | Restructure `GanttCalendarView.vue` toolbar into 3 clusters (view-config / modes / utilities) via `<div class="gantt-toolbar__group">` + `<v-spacer>` | `GanttCalendarView.vue` (template) | REQ-05 | EVID-05 | visual QA |
| `STEP-09` | agent | REQ-06 | Replace mode-btn active state — убрать `:color="primary" + variant="elevated"`, добавить `variant="tonal"` + bold weight через scoped class | `GanttCalendarView.vue` (template + scoped style) | REQ-06 | EVID-05 | visual QA |
| `STEP-10` | agent | REQ-05 (compact) | Viewport < 1280px: collapse modes-группа в `<v-menu>` overflow. Required per REQ-05 | `GanttCalendarView.vue` | REQ-05 | EVID-05 | resize QA в STEP-12 |
| `STEP-11` | agent | CHK-02 regression | Update existing `GanttCalendarView.test.js` selectors if toolbar structure changes break assertions. FT-025 search + mode toggles still green | `__tests__/views/calendar/GanttCalendarView.test.js` | CHK-02 | EVID-02 | `yarn test` |
| `STEP-12` | agent (AG-01a) | CHK-05 manual QA | Dev server + screenshots light+dark (collapsed, expanded, filtered, empty), DevTools Network (fonts 200), Chrome Contrast check на primary surfaces, status-chips regression | `artifacts/ft-026/verify/chk-05/` | CHK-05 | EVID-05 | dev + manual |
| `STEP-13` | agent | full gate | `yarn test` + `yarn test:e2e` + `yarn build` + markdownlint + `git diff main..HEAD --stat` (CHK-03 minimal surface) + `diff ru.json/en.json` (CHK-04 REQ-09 i18n unchanged: 0 diff expected) | — | CHK-01,02,03,04,06 | EVID-01,02,03,04,06 | all green, 0 locale diffs |
| `STEP-14` | agent | MET-04 re-critique | Launch independent critique agent on refreshed UI, capture Nielsen score, записать в re-critique.md | `artifacts/ft-026/verify/chk-05/re-critique.md` | MET-04 | EVID-05 | ≥ 28/40 |
| `STEP-15` | agent (AG-01b) | Docs + closure + PR | Update `design-style-guide.md` + `frontend.md` + `features/README.md`; `feature.md delivery_status: done`; commit + push + PR + CI | docs + git + gh | All CHK | All EVID | `gh pr merge --squash --delete-branch` |

## Parallelizable

- `PAR-01` STEP-02/03 (Geologica + Geist downloads) параллельно STEP-06 (OKLCH compute).
- ~~`PAR-02` STEP-10~~ — removed; STEP-10 mandatory per REQ-05.

## Checkpoints

| CP | Refs | Condition |
|---|---|---|
| `CP-01` | STEP-01..04 | Fonts downloaded + loaded + visible |
| `CP-02` | STEP-05..07 | Typography tokens + OKLCH palette applied |
| `CP-03` | STEP-08..11 | Toolbar restructured, tests green |
| `CP-04` | STEP-12..13 | QA evidence + all tests |
| `CP-05` | STEP-14 | Re-critique score ≥ 28 |
| `CP-06` | STEP-15 | PR merged, docs updated |

## Execution Risks

| ER | Risk | Impact | Mitigation |
|---|---|---|---|
| `ER-01` | Geologica Cyrillic files weight > 80KB budget (CON-05) | Preload budget blown | Use subset ranges explicitly (latin / cyrillic) не `latin-ext`; Google Fonts serves субсеты по `unicode-range` автоматически |
| `ER-02` | OKLCH → rgb drift в browsers с sRGB profile vs Display-P3 | ≤ 1% perceptual, invisible | Accepted per FM-02 |
| `ER-03` | `variant="tonal"` в active state выглядит слишком subtle → юзер не видит что mode активен | UX regression | Reinforce через bold weight + subtle 1px underline или dot indicator; confirm в QA |
| `ER-04` | Existing component tests ломаются из-за изменённой template structure в toolbar | Test red | Update selectors в STEP-11 concurrently; follow FT-025 pattern (`data-testid` stable) |
| `ER-05` | Vuetify 4.0.4 theme не принимает некоторый rgb triple (malformed) → boot error | App crashes | Validate rgb strings локально через `vuetify.js` compile step перед commit |
| `ER-06` | Re-critique score < 28/40 после всей работы | Scope target missed | Per MET-04: AG-01b merge or iterate. If < 24 — STOP and rework. |

## Stop Conditions

| STOP | Trigger | Action |
|---|---|---|
| `STOP-01` | Re-critique < 24/40 | Rework в отдельном pass; не merge |
| `STOP-02` | AG-01b deny | Rework per feedback |
| `STOP-03` | Font Cyrillic rendering broken despite presence | Apply RB-01..03 (revert merge commit, static assets removed, CSS rolled back); reopen FT-026 after font strategy revision |

## Готово для приемки

- STEP-01..15 done, CP-01..06 achieved, CHK-01..06 evidence собраны
- PR merged, CI green, AG-01b given
- `feature.md delivery_status: done`
- `features/README.md` включает FT-026
- Re-critique report закоммичен в `artifacts/ft-026/verify/chk-05/re-critique.md`
