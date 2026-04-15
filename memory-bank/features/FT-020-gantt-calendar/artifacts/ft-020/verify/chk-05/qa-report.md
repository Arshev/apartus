# CHK-05 Manual QA Report — FT-020 Gantt Calendar Phase 1

**Date:** 2026-04-15
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000), Chromium headless via Playwright MCP
**Account:** `demo@apartus.local` (seed organization "Demo Hostel Network", RUB currency)

## Scenarios verified

- [x] **SC-01 — Happy path daily view.** `/calendar` renders: toolbar (7/14/30 range toggle, Today, jump-to-date, refresh), 2-level header (апрель 2026 → days with day-of-week + date), sticky-left unit sidebar (Arbat Boutique Hotel / Deluxe Suite 201, etc.), reservation bars with status colors, today-marker vertical line visible. Seed data renders 6 reservations across 6 units without errors.
- [x] **SC-02 — Tooltip.** Hover over "Иван Петров" bar → tooltip shows guest, check-in / check-out dates, price (formatted with ₽ currency from org), status ("Подтверждено"), property + unit. Mouse leave → tooltip disappears.
- [x] **NEG-09 — Dark mode toggle.** Click moon/sun icon in topbar → theme switches. Calendar adapts: dark surfaces, border colors, text contrast. Reservation bars keep status colors (status-confirmed blue, status-checked-in green, etc.). Today-marker visible. No hardcoded-hex regressions.

## Evidence

- `calendar-light.png` — full page, light theme
- `calendar-dark.png` — full page, dark theme (toggled)
- `calendar-dark-tooltip.png` — viewport with tooltip visible on hover

## Known minor items (follow-up, not blockers)

- Header "апрель 2026 г." includes `г.` suffix from Russian `toLocaleString` — acceptable per locale, not worth overriding.
- Context menu + jump-to-date date-picker click: interaction works but precise UX refinement (menu positioning, date-picker locale) could be polished in follow-up.

## Verdict

CHK-05 passes. Visual parity light/dark, design tokens applied, no hardcoded-hex regressions. Ready for AG-02 approval and merge.
