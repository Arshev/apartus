# CHK-05 Manual QA Report — FT-024 Gantt Heatmap Mode

**Date:** 2026-04-16
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000), Chromium via Playwright MCP
**Account:** `demo@apartus.local`

## Scenarios verified

- [x] **SC-01 — Happy path.** Click "Тепловая карта" → button becomes elevated primary. Каждая day-cell в row получает background tint: free (зелёный `--v-theme-success` 0.15 opacity), busy (красный `--v-theme-error` 0.20 opacity). Bars (голубые) остаются на full opacity поверх.
- [x] **SC-02 — Free cells dominate в seed.** Demo seed имеет mostly short/past bookings, поэтому free cells преобладают. Видны busy cells где reservation активен (например рядом с Иван Петров bar).
- [x] **SC-04 — Mutual exclusion.** E2e test 6/7 confirms: click idle после heatmap → heat cells исчезают, idle gaps появляются. Symmetric для всех 4 modes.
- [x] **SC-05 — Persistence.** After reload — mode сохраняется.
- [x] **SC-06 — Interaction preserved.** Click на Иван Петров bar в heatmap mode → navigate to edit (z-index 0 + pointer-events: none защищают).
- [x] **SC-07 — Cancelled / checked_out not busy.** Seed имеет checked_out reservations — они корректно игнорируются, cells остаются free.
- [x] **NEG-02 — Dark/light mode.** Tints через CSS vars. Light — розовый/зелёный, dark — тёмно-красный/тёмно-зелёный. Субтле, не конкурирует с bar colors.

## Evidence

- `heatmap-on-light.png` — light theme, heatmap active. Зелёный tint на свободных днях, красный на занятых. Бар "Иван Петров" справа — busy cells под ним.
- `heatmap-on-dark.png` — dark theme, heatmap active. Тот же паттерн через CSS vars. Contrast достаточен.

## Observations

- **NS-02 closure visible**: toolbar теперь имеет все 4 special modes (Заезды/выезды, Просрочки, Окна простоя, Тепловая карта) — FT-020 NS-02 полностью закрыт после этого PR.
- Tint opacity (0.15 free, 0.20 busy) — subtle, позволяет bars выделяться без конкуренции.
- Performance: 15 days × 6 units = 90 cells в viewport — без lag.

## Verdict

CHK-05 passes. SC-01,02,04,05,06,07 + NEG-02 verified. Ready for merge (AG-01). **Closes FT-020 NS-02.**
