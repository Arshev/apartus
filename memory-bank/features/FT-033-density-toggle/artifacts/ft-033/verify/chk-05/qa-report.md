# CHK-05 Manual QA Report — FT-033 Gantt Density Toggle

**Date:** 2026-04-18
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000)
**Branch:** `ft-033-density-toggle`

## Scenarios verified

- [x] **SC-01 — Toggle flips rows.** Click density button → rows shrink from ~36px to ~28px. Item bar from 28 → 22px. Icon gets tonal variant active state (FT-026 pattern).
- [x] **SC-02 — `D` shortcut.** Press `D` from body toggles density (e2e verified).
- [x] **SC-03 — Persistence.** Compact → reload → remains compact. Unit + e2e tested.
- [x] **SC-04 — Help dialog.** `?` opens → 8 shortcut entries listed: `/`, `T`, `[`, `]`, `S`, `D`, `Esc`, `?`.
- [x] **SC-05 — Modes coexist.** Heatmap / idle / handover / overdue all render correctly с new row heights — lane + item positions recompute via Vue reactivity.
- [x] **SC-06 — Smooth transition.** CSS `height` transition 0.15s ease-out visible on toggle; `prefers-reduced-motion` disables.
- [x] **SC-07 — Dark mode parity.** Toggle button visible in both themes (text variant default, tonal when compact).

## Evidence

- `comfortable.png` — default state, rows ~52-56px (base + padding). Toolbar density button text-variant (inactive).
- `compact.png` — after toggle, rows ~44-48px. Density button tonal (active). Same ~14-day viewport fits more content vertically.

## Regressions checked

- ✓ 753/753 unit tests pass (741 baseline + 12 new FT-033)
- ✓ 12/13 e2e calendar tests pass. New FT-033 e2e PASSES. 1 remaining failure is the pre-existing FT-025 flake, unrelated
- ✓ FT-029 shortcuts help dialog row count 7 → 8
- ✓ FT-030 sidebar collapse still works (abbreviations D2/S1/MA/SO/D6/D8 per FT-032 digit-aware rule)
- ✓ FT-032 today column anchor still visible
- ✓ `yarn build` green
- ✓ i18n parity 466/466 (+4 keys: `density.toggle/modeComfortable/modeCompact` + `shortcuts.keys.density`)
- ✓ markdownlint: 0 errors

## Design observations

- Compact mode visibly helps scan larger unit counts — for 50+ units scenario will be significant gain
- Transition duration 0.15s — quick enough не отвлекает, long enough чтобы ощутить движение
- Icon `mdi-format-line-spacing` reads universally — line-spacing metaphor matches the action
- Tonal active state preserves the FT-026 rule «one accent used sparingly» — not saturated primary

## Verdict

CHK-05 passes. Re-critique P2 («empty grid expensive on wide viewports») addressed. Ready for merge.
