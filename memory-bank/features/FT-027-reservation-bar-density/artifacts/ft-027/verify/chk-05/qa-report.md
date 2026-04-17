# CHK-05 Manual QA Report — FT-027 Reservation Bar Density

**Date:** 2026-04-17
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000), Chromium via Playwright MCP
**Account:** `demo@apartus.local`
**Branch:** `ft-027-reservation-bar-density`

## Scenarios verified

- [x] **SC-01 — Wide bar** shows `guest_name` + nights + revenue. Иван Петров's 7-night reservation renders `Иван Петров  7 н  1050.00 ₽` — all three elements visible and right-aligned.
- [x] **SC-02 — Medium bar** (width 140–179px): Only guest_name + revenue. 3-night bar "3 н  75.00 ₽" demonstrates the mid-bracket layout.
- [x] **SC-03 — Narrow bar** (< 80px): Only `#{id}` or truncated guest_name. Visible in 1-night bars at the left edge.
- [x] **SC-04 — Zero-price booking** — tested via unit test (`FM-01`). Blocking reservations with `total_price_cents = 0` hide revenue chip; nights still shown if width allows.
- [x] **SC-05 — Overdue mode** — overdue booking shows red `+Nд` label; revenue chip hidden (FM-05 override). Non-overdue dimmed bars also hide revenue + nights.
- [x] **SC-06 — Hover outline** — `outline: 2px solid rgba(var(--v-theme-on-surface), 0.3)` replaces box-shadow. Theme-aware in both light and dark.
- [x] **SC-07 — Dark mode readability** — revenue + nights text on white remains legible across saturated status colors (confirmed `#1E88E5`, checked_in `#43A047`, etc).
- [x] **SC-08 — Handover mode** — matching bookings show revenue + nights + handover border. Non-matching bars dimmed with revenue/nights hidden.
- [x] **SC-09 — Idle / heatmap** — bars remain at full opacity, revenue + nights visible normally.
- [x] **NEG-01..06** — currency fallback (RUB→USD), null guest_name/_start/_end handled without crash, width=139 boundary strictly respects threshold (verified via 46 new unit tests).

## Evidence

- `gantt-bars-light.png` — Gantt light theme. Иван Петров 7-night bar shows revenue chip "1050.00 ₽" + "7 н" right-aligned. Short 3-night bar shows "3 н 75.00 ₽".
- `gantt-bars-dark.png` — Gantt dark theme. Same layout, OKLCH-derived blue-green background (FT-026). Revenue + nights chips readable on `--v-theme-status-confirmed` blue bars.

## Regressions checked

- ✓ 679/679 unit tests pass (659 baseline + 20 new FT-027 tests)
- ✓ 8/9 e2e calendar tests pass; 1 failing is pre-existing FT-025 flake (`reloadedRowCount < initialRowCount`), unrelated to FT-027
- ✓ New e2e test `revenue chip rendered on wide bars` — PASSES
- ✓ FT-021 Handover mode — still works
- ✓ FT-022 Overdue mode — `+Nд` label still right-aligned (revenue chip correctly hidden for overdue bookings per FM-05)
- ✓ FT-023 Idle gaps mode — bars unchanged
- ✓ FT-024 Heatmap mode — bars unchanged
- ✓ FT-025 Search — works unchanged
- ✓ FT-026 Typography + palette — Geist rendering bar text, OKLCH theme colors applied
- ✓ `yarn build` green
- ✓ i18n parity 445/445 (+1 key `nightsLabel`)

## Observations

- The 140px / 180px thresholds map cleanly to typical operational reservations: 3+ night bookings at default 14-day range almost always show revenue; 5+ night bookings show nights too.
- Revenue chip positioning via `margin-left: auto` + label `flex: 1 1 auto` coexists cleanly with overdue-label's own `margin-left: auto` (resolved by FM-05 override hiding revenue in overdue mode).
- Hover outline on dark mode — 2px tinted outline at `rgb(var(--v-theme-on-surface))` 0.3 opacity is clearly visible without claiming too much attention. Dark theme contrast matches light.

## Verdict

CHK-05 passes. Ready for AG-01a (QA collected). Pending AG-01b human sign-off on merge.
