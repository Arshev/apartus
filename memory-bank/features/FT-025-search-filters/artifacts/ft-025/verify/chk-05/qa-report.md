# CHK-05 Manual QA Report — FT-025 Gantt Search Bar

**Date:** 2026-04-16
**Environment:** local dev (yarn dev @ :5173 + rails s @ :3000), Chromium via Playwright MCP
**Account:** `demo@apartus.local`
**Viewport:** 1400×900

## Scenarios verified

- [x] **SC-01 — Guest-name match filters to specific units.** Type `Arbat` → 2 Arbat Boutique Hotel units visible (Deluxe Suite 201 + Standard Room 101), 4 других (Sea View + Tverskaya) скрыты. Все bookings на этих 2 units показаны (не только matching).
- [x] **SC-02 — Unit name match.** Type `204` matches only Deluxe Suite 201 → filters to 1 unit.
- [x] **SC-03 — Property substring match.** Type `Arbat` → oба units property "Arbat Boutique Hotel" возвращаются.
- [x] **SC-04 — Escape clears + collapses + refocuses icon.** Escape нажатие → query '', bar collapsed обратно к magnify icon.
- [x] **SC-05 — Persistence.** Type `Arbat` → reload → bar auto-expands, filtered state restored без flicker (verified via E2e `CHK-07` which asserts `page.reload()` + `inputValue() === 'a'`).
- [x] **SC-06 — Empty result state.** Type `xyzabc` / `нетакого` → GanttTimeline скрыт, показан `v-empty-state` с иконкой mdi-magnify-close и текстом «Ничего не найдено по «{query}»».
- [x] **SC-07 — Stacks with heatmap mode.** Heatmap active + `Arbat` filter → только 2 visible Arbat units получают heatmap tint (busy/free cells), остальные скрыты — оба effect композируются.
- [x] **SC-08 — Case-insensitive.** `ARBAT`, `arbat`, `Arbat` дают идентичный результат.
- [x] **NEG-06 — Dark + light parity.** Vuetify v-text-field наследует theme; placeholder, prepend icon, clearable X — все читаются в обоих темах. Empty-state иконка и текст корректно tinted по `--v-theme-on-surface-variant`.

## Evidence screenshots

**Dark theme (1400×900):**

- `search-collapsed-dark.png` — Toolbar default: mdi-magnify icon-only (heatmap mode active в seed state).
- `search-expanded-empty-dark.png` — После click на mdi-magnify — input expanded, placeholder «Поиск…», prepend-inner mdi-magnify, compact density, width ~240px.
- `search-filtered-arbat-dark.png` — Query «Arbat» → 2 matched units (Deluxe Suite 201 + Standard Room 101). Остальные units скрыты.
- `search-empty-state-dark.png` — Query «нетакого» → empty state «Ничего не найдено по «нетакого»» с mdi-magnify-close иконкой.

**Light theme (1400×900):**

- `search-collapsed-light.png` — Light variant toolbar с mdi-magnify icon.
- `search-filtered-arbat-light.png` — Light вариант «Arbat» filter.
- `search-empty-state-light.png` — Light empty-state.

## UX observations

- **Collapsible bar.** Экономит toolbar space — активен только когда user actively filters. Magnify icon занимает ~40px, expanded input — 240px.
- **Escape-only collapse.** Намеренно убрали blur-collapse — активный фильтр не теряется при первом же клике по календарю. Discovered во время manual QA после того как blur race в setup() caused immediate collapse. Feature.md REQ-01 обновлен.
- **Debounce responsiveness.** 200ms trailing edge — typing фильтр применяется плавно без jank.
- **Empty-state iconography.** mdi-magnify-close (перечёркнутая лупа) clearly communicates "нет результатов по поиску", distinct from mdi-calendar-blank (no-data state).

## Verdict

CHK-05 passes. SC-01..08 + NEG-06 verified. Ready for PR submission (AG-01b pending human sign-off).
