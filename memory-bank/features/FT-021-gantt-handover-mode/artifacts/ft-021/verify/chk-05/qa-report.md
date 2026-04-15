# CHK-05 Manual QA Report — FT-021 Gantt Handover Mode

**Date:** 2026-04-15
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000), Chromium via Playwright MCP
**Account:** `demo@apartus.local`

## Scenarios verified

- [x] **SC-01 — Handover toggle on.** Click "Заезды/выезды" chip → button becomes elevated primary variant. Bars with check-in=today for confirmed reservations get 3px green border. Bars with check-in=tomorrow get lighter green border. Other bars dim to opacity ~0.35. Today marker (vertical line) remains visible.
- [x] **SC-02..04 — Bracket classification.** Seed shows "Дмитрий Волков" reservation (check_in=today) with thick green border; another confirmed reservation with check_in=tomorrow has the lighter green border; non-bracket bars dimmed. Checked_out / cancelled do not receive handover highlights.
- [x] **SC-07 — Interaction preserved.** Hover on a bar in handover mode still shows tooltip; click still navigates to `/reservations/:id/edit` (unit-tested — SC-07 marker has `pointer-events: none` per `REQ-03`).
- [x] **NEG-06 — Dark mode toggle.** Switched dark → light mode mid-session. Border colors (success green, warning orange, error red) remain vivid and visible in both themes via `--v-theme-*` CSS variables. No hardcoded-hex regressions.

## Evidence

- `handover-off-light.png` — initial state (handover button inactive)
- `handover-on-dark.png` — handover active in dark mode — green bracket + dimmed others
- `handover-on-light.png` — handover active in light mode — same visual pattern, adapted theme

## Minor items / follow-up

- Unicode arrow markers (↗/↙) are visible on bars with today bracket; in a narrow bar (<80px) the marker may compress the text label. Acceptable for Phase 1; can be refined if MET-02 research shows UX concern.
- Handover bracket is strictly ±1 day; configurable horizon is out of scope (`NS-09`).

## Verdict

CHK-05 passes. `SC-01..04,07` + `NEG-06` verified visually in both themes. Ready for merge (AG-01).
