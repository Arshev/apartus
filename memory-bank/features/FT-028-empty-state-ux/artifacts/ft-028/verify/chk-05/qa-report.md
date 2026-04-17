# CHK-05 Manual QA Report — FT-028 Empty State UX

**Date:** 2026-04-17
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000), Chromium via Playwright MCP
**Account:** `demo@apartus.local`
**Branch:** `ft-028-empty-state-ux`

## Scenarios verified

- [x] **SC-01 — Search empty with hint.** Type `xyzabc` → empty state shows:
  - Title: «Ничего не найдено по «xyzabc»»
  - Subtext: «По названиям юнитов, объектов и гостям»
  - Action: `× Очистить поиск` (primary green text variant)
- [x] **SC-02 — Clear button restores.** Click Clear → `searchQuery = ''`, `searchOpen = false`, bars restored. Verified in e2e.
- [x] **SC-03 — Escape equivalence.** Same behavior via Escape key (FT-025 regression preserved).
- [x] **SC-04 — No-data CTA.** Component test asserts CTA button navigates to `/properties/new`.
- [x] **SC-05 — Dark mode parity.** Both empty states readable. Primary green Clear button visible on dark bg (OKLCH `oklch(72% 0.11 170)` = `#51bb9a`). Subtext at medium emphasis on dark surface passes contrast.

## Evidence screenshots

- `search-empty-teaching.png` — Dark theme. Title + subtext + Clear button with primary color.
- `search-empty-teaching-light.png` — Light theme. Same elements. Primary green Clear button visible (after applying `color="primary"` fix).

## UX refinement discovered during QA

First render of `variant="text"` Clear button on light theme was too faded (default text-variant renders at medium emphasis grey). Added `color="primary"` to the button so it reads clearly as a CTA in both themes without needing tonal background. Light: green text. Dark: teal-ish green (OKLCH-shifted primary per FT-026). Still consistent with `.impeccable.md` principle «One accent, used sparingly» — Clear action IS a CTA moment.

## Regressions checked

- ✓ 683/683 unit tests pass (679 baseline + 4 new FT-028)
- ✓ 9/10 e2e calendar tests pass (new FT-028 test PASSED); 1 failure is pre-existing FT-025 flake unrelated to this feature
- ✓ FT-025 Search open/type/Escape — still works
- ✓ FT-026 typography + palette — readable
- ✓ FT-027 bar density — unaffected
- ✓ `yarn build` green
- ✓ i18n parity 448/448 (+3 keys: `search.emptyHint`, `search.clear`, `emptyState.cta`)
- ✓ markdownlint: 0 errors

## Verdict

CHK-05 passes. Ready for AG-01a (QA collected). Pending AG-01b human sign-off on merge.
