# CHK-05 Manual QA Report — FT-023 Gantt Idle Gaps Mode

**Date:** 2026-04-16
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000), Chromium via Playwright MCP
**Account:** `demo@apartus.local`

## Scenarios verified

- [x] **SC-01 — Happy path.** Click "Окна простоя" → button becomes elevated primary. На строках unit появляются red-hatched pattern зоны с dashed borders в промежутках между bookings. Lables `{n}д` (например `8д`, `13д`, `11д`) показывают длину gap.
- [x] **SC-02 — Empty unit.** Юниты без bookings (Main Studio, Dorm 6A в seed) → один gap на весь viewport с `13д` label.
- [x] **SC-04 — Mutual exclusion.** Switch handover → idle → overdue, затем re-idle → gaps появляются/исчезают согласно выбранной mode. e2e test подтверждает: `.gantt-row__idle-gap` count при handover=0.
- [x] **SC-05 — Persistence.** После toggle idle → reload → mode восстановлен (localStorage `{specialMode: 'idle'}`).
- [x] **SC-06 — Interaction preserved.** Click на bar (Иван Петров) через gap overlay → navigate to edit (pointer-events: none на gap layer защищает от intercept).
- [x] **NEG-05 — Dark + light mode.** Pattern читаем в обоих themes через `--v-theme-error` CSS var. Light mode — розовый на белом (контраст достаточен). Dark — красный на тёмном (контраст больше).

## Evidence

- `idle-on-light.png` — light theme, idle active (розовый hatched pattern на white background)
- `idle-on-dark.png` — dark theme, idle active (красный hatched pattern на dark surface)

## Observations

- Hatched pattern subtle enough чтобы не конкурировать с barrendering (bars поверх via z-index).
- Labels `{n}д` только когда gap width > 40px — избегаем overflow на маленьких gaps.
- Bars (голубые) на full opacity — REQ-05 соблюдён, не dimmed как в handover/overdue mode.

## Verdict

CHK-05 passes. SC-01,02,04,05,06 + NEG-05 verified. Ready for merge (AG-01).
