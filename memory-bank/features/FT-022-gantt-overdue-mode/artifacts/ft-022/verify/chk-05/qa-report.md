# CHK-05 Manual QA Report — FT-022 Gantt Overdue Mode

**Date:** 2026-04-15
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000), Chromium via Playwright MCP
**Account:** `demo@apartus.local`

## Scenarios verified

- [x] **SC-01 — Happy path.** Click "Просрочки" → button becomes elevated primary variant. В seed присутствует ≥1 reservation с `status='checked_in'` и `check_out < today` — bar получает красный border (`--v-theme-error`) + `+Nд` label в правом углу. Остальные бары dimmed (opacity 0.35). Re-click → state normal.
- [x] **SC-02 — Mutual exclusion.** Активированный overdue, затем click "Заезды/выезды" → overdue деактивируется (button без primary color), handover активируется. Бары перераспределяются по handover logic. Проверено e2e (test 5/5 pass).
- [x] **SC-03 — No overdue в org.** Активировать overdue при отсутствии соответствующих reservations → все бары dimmed, кнопка primary. Нет crash.
- [x] **SC-04 — Persistence.** Активировать overdue → reload → restored.
- [x] **SC-05 — Interaction preserved.** Click на overdue bar → navigate to edit (label не перехватывает из-за `pointer-events: none`).
- [x] **SC-06 — Reduced motion.** CSS `@media (prefers-reduced-motion: reduce)` переопределяет `animation: none`. Проверено в CSS coverage; runtime-тест через Chrome DevTools `Rendering → Emulate CSS media feature` — pulse останавливается.
- [x] **NEG-05 — Dark mode toggle.** Switch light ↔ dark с активным overdue — border цвет (error) сохраняется через CSS vars. No hardcoded hex.

## Evidence

- `overdue-on-light.png` — light mode, overdue active (ясно виден красный border на bar с `status=checked_in` + `check_out < today`)
- `overdue-on-dark.png` — dark mode, overdue active (button в elevated-primary state)

## Minor observations (follow-up, non-blocking)

- Dark-mode screenshot показывает preimushestvenno dimmed бары — это корректно (demo seed не имеет множества overdue в текущем 14d range).
- Pulse анимация визуально subtle (`box-shadow` 0→4px). Это намеренно мягкая подсветка, не навязчивая.

## Verdict

CHK-05 passes. All scenarios SC-01..06 + NEG-05 verified. Ready for merge (AG-01).
