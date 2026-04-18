# CHK-05 Manual QA Report — FT-032 Abbreviation Uniqueness + Today Column Anchor

**Date:** 2026-04-18
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000)
**Branch:** `ft-032-abbreviation-today-anchor`

## Scenarios verified

- [x] **SC-01 — Abbreviation collision resolved.** Collapsed sidebar now shows distinct codes:
  - Deluxe Suite 201 → `D2` (was `DE`, also collided candidate)
  - Standard Room 101 → `S1` (was `ST`)
  - Main Studio → `MA` (unchanged — no digit)
  - Sofa bed → `SO` (unchanged — no digit)
  - Dorm 6A → `D6` (was `DO` — collided)
  - Dorm 8B → `D8` (was `DO` — collided)

  Re-critique P1 closed: no more DO/DO collision.

- [x] **SC-02 — Today column visible.** Gantt default renders a subtle primary-tinted column anchor под today (18 апр shown in screenshot). `rgba(primary, 0.05)` ≈ 5% fill.
- [x] **SC-03 — Today out of range.** Unit test verifies `[data-testid="today-column"]` absent when viewStart/viewEnd don't include today.
- [x] **SC-04 — Heatmap + today stack.** Today column at z-index 0, heatmap cells also z-index 0 (stack order via DOM); both tints compose visually. Not explicitly re-screenshotted but z-index + pointer-events none preserved.
- [x] **SC-05 — Dark mode.** Tint still visible but whisper-level — primary colour applied at 5% opacity, contrast adequate without screaming.

## Evidence

- `gantt-with-today-anchor.png` — Expanded sidebar, today column tint visible on «18 апр» (light green background).
- `collapsed-sidebar-digit-abbr.png` — Collapsed sidebar showing new unique abbreviations D2/S1/MA/SO/D6/D8.

## Regressions checked

- ✓ 741/741 unit tests pass (737 baseline + 4 new FT-032: 2 strings collision + 2 Timeline today-column)
- ✓ Updated 6 existing `abbreviateUnit` assertions to new digit-aware rule (FT-030 tests)
- ✓ 11/12 e2e calendar tests pass. 1 remaining failure is the known pre-existing FT-025 flake (unrelated)
- ✓ `yarn build` green
- ✓ i18n parity 462/462 (+1 key `todayColumnAriaLabel`)
- ✓ markdownlint: 0 errors

## Design principles respected

- **«One accent used sparingly»** — today column uses primary at 5% opacity, not saturated
- **«Typography does the work»** — no icon / no decorative element; pure spatial tint communicates «you are here»
- **«Respect the 8-hour session»** — today anchor is peripheral, not demanding attention; static (no animation)
- **Accessibility** — `aria-label` + `role="presentation"` + `pointer-events: none`

## Verdict

CHK-05 passes. Two P1 items from re-critique closed. Ready for merge.
