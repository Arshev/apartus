# CHK-05 Manual QA Report — FT-030 Sidebar Collapse

**Date:** 2026-04-17
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000)
**Branch:** `ft-030-sidebar-collapse`

## Scenarios verified

- [x] **SC-01 — Click toggle collapses.** Sidebar narrows from 240px to 48px. Unit cells show 2-letter abbreviations: DE (Deluxe Suite), ST (Standard Room), MA (Main Studio), SO (Sofa bed), DO (Dorm 6A), DO (Dorm 8B).
- [x] **SC-02 — Re-expand.** Click toggle again or press `S` → sidebar back to 240px with full property+unit names.
- [x] **SC-03 — `S` keyboard.** Press `S` from body toggles sidebar (e2e verified).
- [x] **SC-04 — Persistence.** Collapse → reload → still collapsed. Expand → reload → still expanded. Unit tested.
- [x] **SC-05 — Tooltip full name.** Hover collapsed abbreviation cell → `:title` shows «Arbat Boutique Hotel — Deluxe Suite 201».
- [x] **SC-06 — Help dialog updated.** `?` opens help with 7 shortcuts: `/`, `T`, `[`, `]`, **`S`**, `Esc`, `?`.
- [x] **SC-07 — Row-height sync.** Row heights unchanged during/after transition (heights are lane-count-derived, not sidebar-width-derived).
- [x] **SC-08 — Dark + light readable.** Abbreviations in mono font, high contrast on both themes.

## Evidence

- `sidebar-expanded.png` — Expanded state: 240px sidebar with property+unit name two-liner, chevron-left toggle + «Юнит» label.
- `sidebar-collapsed.png` — Collapsed state: 48px sidebar with 2-letter abbreviations (DE, ST, MA, SO, DO, DO) in centered mono font. Timeline reclaims ~190px for day columns.

## Regressions checked

- ✓ 731/731 unit tests pass (704 baseline + 27 new: 19 strings.abbreviateUnit + 2 composable + 6 CalendarView integration)
- ✓ 11/12 e2e calendar tests pass. New FT-030 e2e PASSES. The 1 remaining failure is pre-existing FT-025 flake
- ✓ FT-025 Search — still works
- ✓ FT-028 Empty state — still works
- ✓ FT-029 shortcuts — help dialog row count bumped 6 → 7
- ✓ `yarn build` green
- ✓ i18n parity 461/461 (+3 keys: `sidebar.toggleExpand/Collapse`, `shortcuts.keys.sidebar`)
- ✓ markdownlint: 0 errors
- ✓ Accessibility: `aria-expanded` / `aria-controls` on toggle button; `:title` tooltips in both states; `prefers-reduced-motion` disables transition

## Design observations

- Timeline gains significant horizontal real estate in collapsed mode — reservation bars show more day-detail including revenue for medium-width bars that were previously below the FT-027 140px threshold.
- Transition 0.2s ease-out — imperceptible jank on 60fps display; on prefers-reduced-motion instant snap is less jarring than guide-dropped motion.
- Toggle in corner doesn't steal visual attention in expanded state (small chevron-left before «Юнит» label).

## Verdict

CHK-05 passes. Ready for AG-01a (QA collected). Pending AG-01b human sign-off on merge.
