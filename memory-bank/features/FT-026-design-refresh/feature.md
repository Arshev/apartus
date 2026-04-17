---
title: "FT-026: Design Refresh — Typography, Palette, Toolbar Hierarchy"
doc_kind: feature
doc_function: canonical
purpose: "Первая итерация визуального ребрендинга Apartus — заменяет Vuetify default look на typography-driven editorial-operational aesthetic, соответствующий design context в .impeccable.md. Закрывает P0a+P0b+P1 от Impeccable critique."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../../engineering/design-style-guide.md
  - ../../engineering/coding-style.md
  - ../../engineering/testing-policy.md
  - ../../../.impeccable.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-026: Design Refresh — Typography, Palette, Toolbar Hierarchy

## What

### Problem

Impeccable critique (2026-04-17) поставил Apartus Gantt **21/40** по Nielsen heuristics — band «functional but generic». AI-slop test: **YES**. Три корневые проблемы:

1. **Typography = zero personality.** `settings.scss` декларирует Inter, но `index.html` его не загружает — рендерится OS default (SF / Segoe / Roboto). Все три — в банлисте `.impeccable.md`. Нет font pairing, нет tabular-nums для дат, нет weight variety.
2. **Neutrals pure + palette AI-slop.** `#FFFFFF`, `#121418`, `#212121` — никакого brand tint. Dark mode = inverted-Material. Не соответствует принципу «tinted neutrals toward brand hue» (OKLCH).
3. **Toolbar chaos.** 10+ controls в одной строке, три разных `v-btn` variant (`outlined`/`text`/`elevated`). Active-mode-button (heatmap) визуально дороже primary CTA. Режимы, view-config, utilities перемешаны без группировки.

Эти проблемы — на экране, на который операционный менеджер смотрит 8 часов. Они бьют по Impeccable principle #5 (respect the 8-hour session) и по brand personality («quietly modern», не «Vuetify default green»).

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | Распознаваемый font pair загружен и рендерится | OS default | Geologica (display) + Geist (body) self-hosted, preloaded, Cyrillic работает | DevTools Network + visual QA |
| `MET-02` | OKLCH palette с tinted neutrals применена | HSL/hex, pure neutrals | OKLCH vars в `settings.scss` и Vuetify theme, light BG с ~2% green tint | Inspect CSS computed values |
| `MET-03` | Toolbar сгруппирован в 3 кластера с consistent button-style | 10+ mixed controls | View-config / Modes / Utilities, единый `variant="text"` + tonal active | Component test + manual QA |
| `MET-04` | Nielsen re-score после fixes | 21/40 | ≥ 28/40 | Повторный critique |
| `MET-05` | Coverage ratchet | текущий | `floor(actual) - 1` | `vitest.config.js` |

### Scope

- `REQ-01` **Self-host OFL fonts with Cyrillic support.** Добавить `frontend/public/fonts/geologica/` (weights 400 + 500 + 600) + `geist/` (400 + 500) + `LICENSE` файлы в каждую директорию. Оба шрифта — **OFL 1.1**. Geologica (Google Fonts, display) и Geist (Vercel, body) — оба имеют полный Cyrillic subset (U+0400-U+04FF) verified. `<link rel="preload" as="font" type="font/woff2" crossorigin>` в `index.html` для критичных weights (Geologica 500 + Geist 400, Cyrillic + Latin subsets). `@font-face` rules в `src/styles/fonts.scss` с `font-display: swap`.
- `REQ-02` **Typography tokens.** В `settings.scss` заменить `$body-font-family` и добавить CSS vars на `:root`:
  - `--font-display`: `'Geologica', ui-sans-serif, system-ui, sans-serif`
  - `--font-body`: `'Geist', ui-sans-serif, system-ui, sans-serif`
  - `--font-mono`: `ui-monospace, 'SF Mono', Menlo, monospace` (для IDs/timestamps)
  - Body default = body font. Headings (`.text-h1..h6`) = display.
- `REQ-03` **OpenType features — scoped.** `font-variant-numeric: tabular-nums` применяется к конкретным элементам через utility class `.text-tabular` + auto-applied на: `.gantt-timeline__day-number` (date header), `.money-cell` (finance tables), `.gantt-tooltip__price`, `.gantt-item__overdue-label`, `.dashboard-metric__value`. Список закрытый, добавления требуют отдельного change. `font-feature-settings: 'ss01'` применяется к Geist body (stylistic alternate для лучшей читабельности цифр). Geologica features: `'ss02', 'cv11'` — если доступны в выбранной подсетке, иначе не критично.
- `REQ-04` **OKLCH palette refresh (neutrals + brand only).** Rewrite ТОЛЬКО `themes.light.colors` / `themes.dark.colors` **neutral + brand** tokens в `plugins/vuetify.js`. Precomputed via `culori` offline → rgb hex committed с inline comment `// oklch(L% C H) source`. Affected tokens:
  - Light: `background` (было `#FFFFFF` → `oklch(99% 0.004 150)`), `surface`, `surface-light`, `on-surface`, `on-background`, `border-color`, `primary` (keep green hue, move to OKLCH)
  - Dark: зеркально для `background` (было `#121418` → `oklch(17% 0.012 200)` — cool blue-green), surfaces, on-surface, border
  - **Явно сохраняются без изменений** (functional status semantics per `design-style-guide.md`): `error`, `warning`, `info`, `success`, `status-confirmed`, `status-checked-in`, `status-checked-out`, `status-cancelled`, `status-pending`, `status-blocked`, `priority-low/medium/high/urgent`, `finance-revenue`, `finance-expense`.
- `REQ-05` **Toolbar hierarchy в `GanttCalendarView.vue`.** Split toolbar на 3 группы через `d-flex` + `<v-spacer>`/`gap`:
  - Group 1 (view-config): `v-btn-toggle` с range (7/14/30)
  - Group 2 (modes): row из 4 mode-кнопок, consistent `variant="text"` с tonal active state (см. REQ-06). На viewport **< 1280px** (Vuetify `md` breakpoint) modes-группа collapsible в `<v-menu>` через `v-btn icon="mdi-view-dashboard-variant"` с меткой количества активных modes.
  - Group 3 (utilities): search + today + jump + refresh
- `REQ-06` **Active-mode visual rewrite.** Убрать `:color="primary"` + `variant="elevated"` для active modes. Заменить на: `variant="tonal"` (Vuetify built-in, subtle brand-tinted bg) + bold weight. Primary CTA color reserved для реальных actions (submit, create).
- `REQ-07` **Type scale в app UI.** 5-step modular scale с 1.25 ratio, rem-fixed (не fluid — CLAUDE guidance: app UIs fix, marketing fluid). Toolbar buttons — 14px/500, body — 14px/400, labels — 12px/400. Table headers — 11px/600 uppercase с `letter-spacing: 0.05em`.
- `REQ-08` **Dark mode remains first-class.** Оба theme проверяются на contrast WCAG AA и визуально в manual QA.
- `REQ-09` **i18n — no breaking copy changes.** Existing keys в ru/en **не меняются**. Допускается добавление новых keys **только** для новых UI-элементов, появившихся от toolbar restructure (e.g. `calendar.gantt.modes.groupLabel` для mode-dropdown trigger в compact viewport). Parity ru↔en поддерживается (equal key count).

### Non-Scope

- `NS-01` **Reservation bar redesign** (P1 from critique — revenue-number, channel-rib). Отложено на FT-027, чтобы не раздувать PR.
- `NS-02` **Empty state UX copy** (P2 — «поиск по…» hint). FT-028.
- `NS-03` **Keyboard shortcuts** (persona red flag). Отдельный FT-029.
- `NS-04` **Sidebar collapse-to-icon.** FT-030.
- `NS-05` **Marketing / public pages redesign** — scope только `/calendar` + global shell (header/nav). Остальные views (`/reservations`, `/tasks`, etc.) наследуют palette + typography автоматически через Vuetify theme и CSS vars, но их layout НЕ рефакторим в этом PR.
- `NS-06` **New component library / swap Vuetify.** Категорически нет — остаёмся на Vuetify 4, меняем только theme + scoped styles.
- `NS-07` **Switch к paid fonts** (Söhne, GT America). User explicit: OFL only.
- `NS-08` **Icon library swap.** MDI остаётся, но reducing icon weight в toolbar через variant choices — это REQ-05/06.
- `NS-09` **Motion overhaul.** `prefers-reduced-motion` уже respected (FT-022); animation tweaks — nice-to-have, не scope.
- `NS-10` **Breaking changes в `--v-theme-*` naming** — нет. Только значения цветов меняются.

### Constraints / Assumptions

- `ASM-01` FT-025 merged (baseline 659 tests + 8 e2e).
- `ASM-02` Vuetify 4.0.4 theme API parses только `#hex | rgb[a] | hsl[a] | var(--...)` в `colorUtils.js` (lines 8, 13, 102) — НЕ `oklch()`. Стратегия: compute OKLCH offline через `culori` CLI (bundled с bun via ephemeral `bunx culori-cli`) или через online tool (oklch.com / oklchroma.com / color.js). Rgb hex значения commitятся в `plugins/vuetify.js` с inline `// oklch(L% C H) source` comments для rationale и future tuning.
- `ASM-03` `index.html` и `vite.config.js` позволяют добавить `<link rel="preload" as="font">` + `/public/fonts/*` статически.
- `ASM-04` **Cyrillic verified** для обоих шрифтов:
  - **Geologica** (Google Fonts, display) — OFL 1.1, glyph coverage U+0400–U+04FF confirmed (full Cyrillic). By Monotype, specifically designed for UI/app work.
  - **Geist** (Vercel, body) — OFL 1.1, 134 Cyrillic glyphs (U+0400-U+04EF) confirmed в репозитории `vercel/geist-font`.
- `CON-01` No new npm packages. Шрифты self-hosted из `public/fonts/`.
- `CON-02` No TypeScript.
- `CON-03` Coverage ratchet — per `testing-policy.md` «не ниже текущего после floor». Формула `floor(actual) - 1` в vitest.config = standard. Reuse как есть.
- `CON-04` No backend changes.
- `CON-05` Размер шрифт-файлов: каждый weight subset ≤ 80 KB (woff2). Total preload ≤ 200 KB (critical: Geologica 500 cyrillic+latin + Geist 400 cyrillic+latin).
- `ASM-05` **License compliance verified.** Обе лицензии — OFL 1.1 (SIL Open Font License) — позволяют self-host, web embedding, derivative work, and redistribution с обязательством: (a) сохранить LICENSE file в font directory, (b) not sell fonts directly. Соответствует `CON-01` (no purchase).

## How

### Solution

1. **Font pipeline.** Download woff2 files + `OFL.txt` из Google Fonts (Geologica display) и `vercel/geist-font` repo (Geist body). Положить в `frontend/public/fonts/{geologica,geist}/` с: `{font}-{weight}.woff2` (4 weights Geologica × latin+cyrillic subsets = 8 files; 2 weights Geist × 2 subsets = 4 files) + `OFL.txt` license. `@font-face` rules в новом `src/styles/fonts.scss` с `unicode-range` split (Latin vs Cyrillic subsets — browser подгружает только нужный). Imported в `main.js` до Vuetify.

2. **CSS vars pipeline.** `src/styles/settings.scss` — добавить `--font-display`, `--font-body`, `--font-mono`, `--tracking-tight/normal/wide`, `--space-*` tokens (4pt scale: 4/8/12/16/24/32/48/64/96). Existing `$body-font-family` SASS var — заменить на CSS var reference.

3. **Vuetify theme.** `src/plugins/vuetify.js` — rewrite `themes.light.colors` и `themes.dark.colors` для neutral + brand tokens. OKLCH values computed offline через `culori` или online tool ([oklch.com](https://oklch.com)) и закомиленные как `#hex` triples с inline comment: `// oklch(99% 0.004 150) → #fcfdfc`. Status/priority/finance tokens — untouched.

4. **Toolbar.** `GanttCalendarView.vue` template:
   - Replace current flat row с `<div class="gantt-toolbar">` содержащим 3 `<div class="gantt-toolbar__group">`.
   - Group 2 (modes): все 4 mode-кнопок, `variant="text"`, `:color="specialMode === 'X' ? 'primary' : undefined"` **заменено на** `:class="{ 'gantt-mode-btn--active': specialMode === 'X' }"` + new scoped style с subtle tinted bg + bold.
   - Add `<v-spacer>` between groups для visual breathing.

5. **Type scale.** Utility classes в `src/styles/typography.scss`: `.text-display-1..3`, `.text-body`, `.text-label`, `.text-table-header`. Headings используют `var(--font-display)`. Body tables/inputs — default body. Tabular numerics on `.text-tabular`.

**Trade-off 1:** OKLCH-as-rgb (precompute) vs CSS `oklch()` runtime. Runtime — чище, но Vuetify 4 parses только rgb triples в theme config. Precompute — точнее работает с Vuetify variations, но требует re-compute при каждом tune. Выбираем precompute + inline comment с OKLCH source.

**Trade-off 2:** Google Fonts CDN vs self-host. CDN быстрее на cold cache, но self-host — reliable offline dev, privacy (no Google tracking), no external dep. Выбираем self-host (Impeccable skill рекомендация).

**Trade-off 3:** Replace Vuetify theme primary vs добавить parallel token. Replace — cleaner, no legacy. Parallel — safer rollback. Выбираем replace: OKLCH computed green близок к существующему `#43A047` (delta ≤ 2% perceptual), visual regression низкий.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `frontend/public/fonts/geologica/*.woff2` + `LICENSE` | assets | OFL 1.1 display font (Cyrillic + Latin) |
| `frontend/public/fonts/geist/*.woff2` + `LICENSE` | assets | OFL 1.1 body font (Cyrillic + Latin) |
| `frontend/src/styles/fonts.scss` | code | New `@font-face` declarations |
| `frontend/src/styles/settings.scss` | code | CSS vars for font / spacing / tracking |
| `frontend/src/styles/typography.scss` | code | New utility classes |
| `frontend/src/main.js` | code | Import `fonts.scss` + `typography.scss` |
| `frontend/index.html` | code | `<link rel="preload" as="font">` для critical subset |
| `frontend/src/plugins/vuetify.js` | code | OKLCH-derived rgb values в theme colors |
| `frontend/src/views/calendar/GanttCalendarView.vue` | code | Toolbar restructure, mode-btn style |
| `frontend/src/__tests__/views/calendar/GanttCalendarView.test.js` | code | Regression safety — tests still pass |
| `memory-bank/engineering/design-style-guide.md` | doc | Update palette + typography sections |
| `memory-bank/domain/frontend.md` | doc | Update Stack mention — new fonts |
| `memory-bank/features/README.md` | doc | Register FT-026 |

### Flow

1. **Build.** Vite собирает `public/fonts/*` как static assets. `@font-face` rules loaded сразу.
2. **Boot.** `index.html` preload hits 2 font files (Geologica 500, Geist 400). Browser starts downloading. CSS vars применяются при первом paint (font-display swap показывает fallback до готовности).
3. **Runtime.** Vuetify theme читает OKLCH-computed rgb → CSS vars `--v-theme-*` обновлены. Components рендерятся с новой палитрой + typography.
4. **Toolbar click.** User clicks mode → `setSpecialMode()` unchanged; visual активного state теперь через `tonal` variant + `--mode-btn-active` class.

### Contracts

| Contract | I/O | Producer/Consumer | Notes |
|---|---|---|---|
| `CTR-01` | CSS vars exposed: `--font-display`, `--font-body`, `--font-mono`, `--space-*` | `settings.scss` → all views | Must be defined on `:root` |
| `CTR-02` | Vuetify theme colors produce OKLCH-derived rgb in `--v-theme-{primary,background,surface,on-surface,...}` | `plugins/vuetify.js` → components | Legacy `--v-theme-*` naming preserved (no breaking) |
| `CTR-03` | `@font-face src: url('/fonts/...')` — paths resolve from Vite root | browser / build | Static assets must be in `public/fonts` |

### Failure Modes

- `FM-01` Font file 404 → `font-display: swap` shows fallback (system sans). Non-blocking.
- `FM-02` OKLCH rgb conversion drift (browser color-profile differences) → < 1% perceptual, acceptable.
- `FM-03` Vuetify theme color string не парсится → boot-time error caught by Vuetify. Mitigation: validate rgb strings locally before commit.
- `FM-04` Cyrillic subset не загрузился (network / 404) → browser falls back через `font-display: swap` на system sans. UI остаётся читабельным, русский текст рендерится системным шрифтом (не идеально, но не ломающе).
- `FM-05` Preload race в dev (vite HMR) → harmless; шрифты всё равно загружаются.
- `FM-06` Dark mode regression на status chips → visual QA catches.

### ADR Dependencies

Нет strict dependency, но **recommended** to write ADR-00X («Typography stack + OKLCH palette strategy») after merge — rationale для typography selection (banlist reasoning) и OKLCH precompute workflow переживёт feature.md archival cycle. Не блокер для execution.

### Rollback

- `RB-01` Вся feature = single squash-merged commit (PR pattern consistent с FT-021..025). Rollback = `git revert <merge-sha>` + redeploy frontend. Нет state migrations, нет API contract changes, нет backend touch — revert безопасен.
- `RB-02` Font files в `public/fonts/` — static assets; revert удаляет их из дистрибуции, browser cache очищается естественно.
- `RB-03` OKLCH color changes — pure CSS/config. Revert возвращает старую палитру, Vuetify theme re-computes корректно.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..09` реализованы.
- `EC-02` General Sans + Geist рендерятся (DevTools Network 200 + visible glyph shape).
- `EC-03` OKLCH palette применена в обеих темах.
- `EC-04` Toolbar сгруппирован в 3 кластера, active mode через tonal variant.
- `EC-05` Все 659 existing tests pass. Coverage ratchet met.
- `EC-06` CI green.
- `EC-07` WCAG AA contrast (>4.5:1 body, >3:1 UI) в light + dark через manual check.
- `EC-08` No regression на status chips / priority badges / finance colors (visual QA).

`MET-04` (Nielsen re-critique ≥ 28/40) — **outcome target, не blocking gate**. Tracked в `artifacts/ft-026/verify/chk-05/re-critique.md`. Если re-score = 24-27 — AG-01 решает, merge or iterate. Если < 24 — automatic STOP для rework.

### Acceptance Scenarios

- `SC-01` **Happy path light.** Open `/calendar` → headings в General Sans, body в Geist, numeric даты tabular, tinted-white BG. Toolbar: 3 groups visible, active mode — tonal не primary.
- `SC-02` **Dark mode.** Toggle theme → cool blue-green BG (not Material black), text контрастный, status chips остаются saturated.
- `SC-03` **Font fallback.** Simulate 404 на `geist-400.woff2` → UI рендерится system sans, layout не ломается.
- `SC-04` **Tabular nums in header.** Resize viewport → date numbers (16, 17, ..., 29) don't jitter.
- `SC-05` **Active mode visual weight.** Heatmap active + hover Today button → Today более призывная визуально? Actually: today = utility, не CTA, так что they should be peer. Assert: Heatmap active bg less saturated than primary button hover.
- `SC-06` **Existing feature regression.** Click search, type, Escape — FT-025 works unchanged.
- `SC-07` **Re-critique score.** Run Impeccable critique после merge → ≥ 28/40, AI-slop test «partial» или «no» (not «yes»).

### Negative / Edge Cases

- `NEG-01` Font subset отсутствует → fallback to system sans, no crash.
- `NEG-02` Vuetify theme update не ломает status chips (`status-*` tokens from design-style-guide.md preserved).
- `NEG-03` Old localStorage state (view prefs) compatible → no breaking, only visual.
- `NEG-04` Browsers без OKLCH support (Safari < 15.4) → fallback chain в CSS? Actually Vuetify computes rgb at config time — no runtime oklch(), universal support.

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | `CTR-03`, `FM-01,04` | `SC-01,03` | `CHK-02,05` | `EVID-02,05` |
| `REQ-02` | `CTR-01` | `SC-01` | `CHK-02,05` | `EVID-02,05` |
| `REQ-03` | | `SC-04` | `CHK-05` | `EVID-05` |
| `REQ-04` | `CTR-02`, `FM-02,03` | `SC-01,02`, `NEG-02,04` | `CHK-02,05` | `EVID-02,05` |
| `REQ-05` | | `SC-01,05` | `CHK-02,05` | `EVID-02,05` |
| `REQ-06` | | `SC-05` | `CHK-05` | `EVID-05` |
| `REQ-07` | | `SC-01` | `CHK-05` | `EVID-05` |
| `REQ-08` | | `SC-02`, `EC-08` | `CHK-05` | `EVID-05` |
| `REQ-09` | | — | `CHK-03,04` | `EVID-03,04` |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-05` | `yarn test:coverage` | ratchet met, 659+ pass | `artifacts/ft-026/verify/chk-01/` |
| `CHK-02` | `REQ-01..06,09` + SCs | `yarn test + yarn test:e2e` | все pass incl. FT-025 | `artifacts/ft-026/verify/chk-02/` |
| `CHK-03` | `EC-01` | `git diff main..HEAD --stat` | минимальный surface | `artifacts/ft-026/verify/chk-03/` |
| `CHK-04` | `REQ-09` | diff ru.json / en.json | 0 changes | `artifacts/ft-026/verify/chk-04/` |
| `CHK-05` | `REQ-01..08`, `EC-02,03,04,07,08` + SCs/NEGs | Manual QA: screenshots light+dark, DevTools Network для шрифтов, contrast checker, impeccable re-critique | Nielsen ≥ 28; fonts load; OKLCH colors visible | `artifacts/ft-026/verify/chk-05/` |
| `CHK-06` | `EC-06` | markdownlint + CI | 0 errors, 5/5 green | `artifacts/ft-026/verify/chk-06/` |

### Evidence

- `EVID-01` Coverage report.
- `EVID-02` Vitest + Playwright log.
- `EVID-03` Git diff stat.
- `EVID-04` i18n parity diff.
- `EVID-05` Screenshots light+dark, DevTools Network, contrast matrix, re-critique report.
- `EVID-06` Lint + CI links.

### Evidence contract

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-026/verify/chk-01/` |
| `EVID-02` | `yarn test`/`test:e2e` | `artifacts/ft-026/verify/chk-02/` |
| `EVID-03` | shell | `artifacts/ft-026/verify/chk-03/` |
| `EVID-04` | shell | `artifacts/ft-026/verify/chk-04/` |
| `EVID-05` | manual + impeccable | `artifacts/ft-026/verify/chk-05/` |
| `EVID-06` | `markdownlint` + `gh` | `artifacts/ft-026/verify/chk-06/` |
