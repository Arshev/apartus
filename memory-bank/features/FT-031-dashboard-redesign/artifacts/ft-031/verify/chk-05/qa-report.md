# CHK-05 Manual QA Report — FT-031 Dashboard Redesign

**Date:** 2026-04-18
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000)
**Branch:** `ft-031-dashboard-redesign`

## Before / After

**Before** (FT-026 baseline): 4 saturated KPI cards (primary/info/finance/secondary colored ~200×120px blocks) + 4 identical status cards (confirmed blue, checked_in green, checked_out grey, cancelled red). Every heading had an icon. Centered everything. Textbook AI-slop "hero metric layout" + "identical card grids".

**After**: Editorial hierarchy:

- **Revenue hero** — «2535.00 ₽» в Geologica display 3.5rem, dominant
- **Supporting metrics inline** — 6 ЮНИТОВ · 0% ЗАГРУЗКА · 10 БРОНИ, small tabular-nums, uppercase track-wide labels
- **Occupancy slim bar** — 2px horizontal bar, tinted primary
- **Status breakdown** — total count + horizontal stacked bar (segments proportional: 5 blue, 2 green, 2 grey, 1 red) + legend list with color dots
- **Upcoming lists** — clean text rows, guest name + unit + right-aligned date. No icon-on-heading. No bullet-dot prefixes.
- Left-aligned throughout

## Scenarios verified

- [x] **SC-01 — Happy path.** Hero shows «2535.00 ₽» dominant; supporting row has 6 Юнитов + 0% Загрузка + 10 Брони; status bar proportional (5/2/2/1); Иван Петров in upcoming check-ins with «Deluxe Suite 201 · 2026-04-24».
- [x] **SC-02 — Empty reservations.** Unit tested — when totalReservations=0, all statusSegments return `flexBasis: '0%'` and bar shows `—` placeholder.
- [x] **SC-03 — Zero units.** Hero renders with «0 ₽» safely.
- [x] **SC-04 — Left-aligned.** Inspect: `.dashboard-hero` is left-aligned, no `text-center` on section headings.
- [x] **SC-05 — Dark mode.** Toggle → `#091111` cool blue-green background; Geologica revenue readable white. Status dots saturated against dark surface — clear but not screaming.
- [x] **SC-06 — Responsive md.** Supporting metrics `gap: 32px + flex-wrap` handles narrowing; check-ins/outs `v-col md="6"` stacks vertically on `<md`.

## Evidence

- `dashboard-light.png` — Light theme, full editorial layout.
- `dashboard-dark.png` — Dark theme. Same layout, OKLCH-derived dark palette from FT-026.

## Regressions checked

- ✓ 737/737 unit tests pass (731 baseline + 6 new FT-031)
- ✓ All 4 existing DashboardView tests still pass (greeting / loadDashboard / formatPrice / error)
- ✓ `yarn build` green
- ✓ `grep -E '<v-card[^>]*color="(primary|info|secondary|finance-revenue|status-[a-z-]+)"' DashboardView.vue` → **0 matches** (CHK-03 pass)
- ✓ i18n parity 461/461 (no changes)
- ✓ markdownlint: 0 errors

## Design principles observed

- **«Typography does the work»** — hierarchy через Geologica display 3.5rem hero → 20px supporting values → 13-14px list rows. No box-based hierarchy.
- **«Tinted neutrals»** — FT-026 palette from `#fafdfa` / `#091111` base. No saturated card backgrounds.
- **«One accent used sparingly»** — primary green only on active nav item, occupancy bar fill, «Главная» text. Status colors functional (dots + bar segments).
- **«60/30/10 rule»** — ~60% neutral surfaces, 30% secondary text (medium-emphasis labels), ~10% accent (status dots / bar).
- **«Left-aligned asymmetry»** — deliberate breathing room on right side, content density on left.

## Verdict

CHK-05 passes. Ready for AG-01a (QA collected). Pending AG-01b human sign-off on merge.
