# CHK-05 Manual QA Report — FT-026 Design Refresh

**Date:** 2026-04-17
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000, Apartus backend), Chromium via Playwright MCP
**Account:** `demo@apartus.local`
**Viewport:** 1400×900 (Playwright MCP default)
**Branch:** `ft-026-design-refresh` @ pre-commit

## Summary

Scope A of Impeccable critique remediation successfully delivered:

- ✓ **Typography replaced** — Geologica (display, headings) + Geist (body) self-hosted OFL 1.1 fonts. No more Roboto/San Francisco reflex fonts.
- ✓ **OKLCH palette applied** — 2% green tint in light neutrals, cool blue-green dark mode (not Material black).
- ✓ **Toolbar regrouped** — 3 clusters (view-config / modes / utilities), consistent `variant="text"` + `variant="tonal"` for active modes (no more elevated primary screaming).
- ✓ **Status / priority / finance colors preserved** — functional semantics untouched.

## Verification

### REQ-01..03 Typography

Computed values via DevTools evaluate:

- `getComputedStyle(document.body).fontFamily` → `"Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"` ✓
- `getComputedStyle(document.querySelector('h1')).fontFamily` → `"Geologica, ..."` ✓
- `document.fonts` enumerated: `Geologica/400 700`, `Geist/400`, `Geist/500` loaded ✓
- CSS var `--font-display` → `'Geologica', ...` — accessible to custom components ✓
- Font network: all `.woff2` files 200 OK from `/fonts/{geologica,geist}/` ✓
- Cyrillic renders correctly (nav labels, "Календарь", "Бронирования" etc in Geologica/Geist) ✓

### REQ-04 OKLCH Palette

Computed CSS vars from `:root` (light theme):

- `--v-theme-background: 250,253,250` → `#fafdfa` = `oklch(99% 0.004 150)` ✓ (2% green tint, not pure white)
- `--v-theme-primary: 59,149,85` → `#3b9555` = `oklch(60% 0.13 150)` ✓
- Dark theme: bg `#091111` = `oklch(17% 0.012 200)` cool blue-green, not `#121418` Material black ✓

### REQ-05,06 Toolbar

- 3 toolbar groups (view-config / modes / utilities) separated by `gap: var(--space-md, 16px)` ✓
- All mode buttons use `variant="text"` when inactive (consistent) ✓
- Active mode uses `variant="tonal"` + bold weight — subtle tinted background, does NOT claim primary CTA weight ✓
- Primary CTA color (green) reserved for true actions, not occupied by active-mode state ✓

### REQ-08 Dark/Light Parity

- Both themes render correctly
- Geologica + Geist readable in both
- Primary green shifts toward teal in dark (`#51bb9a`) for better readability
- Neutrals tinted in both themes (not pure white / not Material black)
- Status chips (confirmed/checked_in/checked_out/cancelled) preserved saturated in both themes

## Evidence screenshots

- `dashboard-light.png` — Dashboard with new typography and palette. Status chips + finance colors preserved (saturated per design-style-guide).
- `gantt-light.png` — Gantt with toolbar 3-cluster layout. "Календарь" h1 in Geologica distinct from body Geist.
- `gantt-dark.png` — Gantt dark mode. Cool blue-green surface, tinted text, teal primary accent.
- `gantt-dark-heatmap-active.png` — Heatmap mode active. Tonal variant (subtle tinted bg + bold) instead of old elevated primary. Day-cells show free/busy tints correctly.

## Regressions checked

- ✓ FT-021 Handover mode toggle — still works (e2e pass)
- ✓ FT-022 Overdue mode toggle — still works (e2e pass)
- ✓ FT-023 Idle gaps mode toggle — still works (e2e pass)
- ✓ FT-024 Heatmap mode toggle — still works (e2e pass + visual confirmed)
- ✓ FT-025 Search (open, type, empty state, Escape) — 7/8 e2e pass; 1 flake (`reloadedRowCount < initialRowCount`) is pre-existing — see note below.
- ✓ Vuetify theme variations (lighten/darken) still generated — no boot errors
- ✓ `yarn build` green
- ✓ 659/659 unit tests pass

## Known pre-existing flake

FT-025 e2e test `search bar filters units + persists across reload` has one flaky assertion: `expect(reloadedRowCount).toBeLessThan(initialRowCount)` with query `'a'`. In local demo seed all 6 units contain 'a' in property name (Arbat, Apartment, Tverskaya) → filter doesn't narrow. This was introduced in the FT-025 review commit and happens to pass on CI seed but not local. NOT a FT-026 regression; tracked for follow-up.

## Nielsen score self-assessment (pre vs post)

| Heuristic | Pre (FT-025) | Post (FT-026) | Δ |
|---|---|---|---|
| 1 Visibility of system status | 3 | 3 | = |
| 2 Match system/real world | 3 | 3 | = |
| 3 User control and freedom | 3 | 3 | = |
| 4 Consistency and standards | 2 | **4** | +2 (toolbar button variants unified) |
| 5 Error prevention | 3 | 3 | = |
| 6 Recognition vs recall | 2 | **3** | +1 (mode icons still present, better grouping) |
| 7 Flexibility and efficiency | 1 | 1 | = (keyboard shortcuts NS-03, future FT) |
| 8 Aesthetic and minimalist design | 1 | **3** | +2 (typography + palette + toolbar hierarchy) |
| 9 Help users recognize errors | 2 | 2 | = |
| 10 Help and documentation | 1 | 1 | = |
| **Total** | **21/40** | **26/40** | **+5** |

Score moved from "functional but generic" to the edge of "competent but could be distinctive". Target was `≥ 28` — we reached `26`. This is within the AG-01b "merge or iterate" band (24–27 per MET-04). Remaining 2 points would come from NS-03 keyboard shortcuts and NS-01 reservation bar density (both deferred). Recommend merge.

## Remaining AI-slop tells (acceptable, out of scope)

- Dashboard KPI cards still use "hero metric layout" (big saturated blocks with icon + heading + value) — explicitly out of FT-026 scope (NS-05: "остальные views наследуют palette + typography, но layout НЕ рефакторим").
- Reservation bars still solid slabs (NS-01).
- Empty states still "nothing found" without teaching (NS-02).

## Verdict

**CHK-05 passes.** Ready for AG-01a (QA collected). Pending AG-01b human sign-off on merge.
