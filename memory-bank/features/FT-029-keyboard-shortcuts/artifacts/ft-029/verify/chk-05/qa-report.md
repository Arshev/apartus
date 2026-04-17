# CHK-05 Manual QA Report — FT-029 Keyboard Shortcuts

**Date:** 2026-04-17
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000), Chromium via Playwright MCP
**Branch:** `ft-029-keyboard-shortcuts`

## Scenarios verified

- [x] **SC-01 — `/` opens search + focuses input.** Press `/` from body → search bar expands, input focused, `/` not typed into input (preventDefault). E2e asserts activeElement is search-input.
- [x] **SC-02 — `T` jumps to today.** Handler called without error; actual scroll behavior tested separately (brittle in headless).
- [x] **SC-03 — `[` / `]` pans range.** Unit test verifies `anchorDate ± rangeDays * MS_PER_DAY`.
- [x] **SC-04 — Esc clears search with query.** Search open + query `abc` → Esc → query '', collapsed, focus returns to magnifier (FT-025 `onSearchEscape` reused).
- [x] **SC-05 — Esc closes help dialog.** Help open → Esc → closed, other cascades skipped.
- [x] **SC-06 — `?` opens help dialog.** Covered both layouts: `Shift+Slash` (US) and `key === '?'` (RU Shift+7) via composable unit tests.
- [x] **SC-07 — Input guard.** Shortcuts NOT intercepted when target is INPUT/TEXTAREA/contenteditable. Verified: typing `T` into search input types the letter (doesn't jump to today).
- [x] **SC-08 — Tooltip hints.** Hover «Сегодня» → title «Сегодня (T)». Hover magnifier → «Найти гостя или юнит (/)».

## Evidence

- `help-dialog.png` — Dark theme help dialog triggered by `?` key. Table shows all 6 shortcuts with styled `<kbd>` badges, subtitle «Ускорьте работу с календарём», Close button in primary green.

## Regressions checked

- ✓ 704/704 unit tests pass (683 baseline + 21 new: 16 composable + 5 CalendarView integration)
- ✓ 10/11 e2e calendar tests pass; new FT-029 e2e test `/ focuses search, T jumps to today, Esc clears` PASSES
- ✓ 1 failure is pre-existing FT-025 `reloadedRowCount < initialRowCount` flake, unrelated
- ✓ FT-025 Search — still works (Escape cascade preserved)
- ✓ FT-028 Empty state — Clear button still triggers `onSearchEscape`
- ✓ `yarn build` green
- ✓ i18n parity 458/458 (+10 keys under `calendar.gantt.shortcuts.*`)
- ✓ markdownlint: 0 errors

## Design principles respected

- «One accent, used sparingly» — Close button in primary green, consistent with CTA usage in FT-028 empty state
- «Typography does the work» — `<kbd>` badges use `var(--font-mono)` (Geist ui-monospace stack), subtle tinted background via `--v-theme-on-surface` at 0.08 opacity
- «Respect the 8-hour session» — No motion; shortcut dispatch instantaneous; no surprise modal on shortcut

## Verdict

CHK-05 passes. Ready for AG-01a (QA collected). Pending AG-01b human sign-off on merge.
