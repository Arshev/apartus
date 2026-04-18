---
title: "FT-031: Dashboard Redesign — Editorial Hierarchy"
doc_kind: feature
doc_function: canonical
purpose: "Replace dashboard's AI-slop «hero-metric + identical-card-grid» layout с editorial typography-driven hierarchy. Applies Impeccable design principles consistent с FT-026..FT-030 refresh line."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../../engineering/design-style-guide.md
  - ../FT-026-design-refresh/feature.md
  - ../FT-027-reservation-bar-density/feature.md
  - ../../../.impeccable.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-031: Dashboard Redesign — Editorial Hierarchy

## What

### Problem

Impeccable critique (2026-04-17) noted dashboard как residual AI-slop tell after FT-026:

> KPI cards still use "hero metric layout" (big saturated blocks with icon + heading + value) — explicitly out of FT-026 scope.

Current `DashboardView.vue` has **two** Impeccable banlist patterns:

1. **Hero metric layout** — 4 saturated colored cards (primary/info/finance/secondary) each ~200×120px с icon + label + large number. Impeccable explicitly rejects: «big number, small label, supporting stats, gradient accent».
2. **Identical card grid** — 4 status cards (confirmed/checked_in/checked_out/cancelled) одинакового размера, identical layout (center-aligned big number + caption). Impeccable: «Do not use identical card grids».

Плюс:

- **Everything centered** — «DO NOT center everything. Left-aligned text with asymmetric layouts feels more designed».
- **Icon-on-every-heading** — «DO NOT put large icons with rounded corners above every heading».
- **Saturated chip overload** — status colors are functional (FT-026 NS-06 preserved), but здесь used decoratively как card backgrounds, а не как chips в content.

Result: владелец, заходящий раз в неделю, видит первым делом 8 кричащих блоков, а не самое важное — **revenue за месяц и что впереди** (заезды/выезды).

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | Hero section показывает revenue как primary focus | 4 identical-weight cards | одно крупное число + supporting metrics inline, left-aligned | Visual QA + component test |
| `MET-02` | Status breakdown заменен на denser visualization | 4 identical saturated blocks | horizontal stacked bar + legend list | Visual QA |
| `MET-03` | Icon-on-heading reduced | 4 headings with icons | 0 — headings naked typography | Grep check |
| `MET-04` | Saturated-card-background removed | 4 cards with `color="primary/info/..."` | 0 — neutral surfaces, accent on content | Grep |
| `MET-05` | Coverage ratchet | current | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Hero section.** Top-of-page:
  - Greeting (`h1`, Geologica display font, existing) stays.
  - Below greeting: **single large revenue number** (`.dashboard-hero__value` — 3.5rem Geologica display, tabular-nums), label «Выручка в этом месяце» (12px uppercase, track-wide).
  - Inline supporting metrics row: `Юнитов · Загрузка · Бронирований` — small labels + values в одной horizontal line, separated by subtle `·` (middot) OR plain `  ` spacing. No cards.
- `REQ-02` **Occupancy compact viz.** Горизонтальная progress bar, 2px height, под supporting metrics row. Tinted primary color, subtle. Не circular, не large bar.
- `REQ-03` **Status breakdown — horizontal stacked bar.** Заменяет 4 saturated cards. Single horizontal bar segmented by reservation status (confirmed blue / checked_in green / checked_out grey / cancelled red). Legend list below с color dot + status name + count, left-aligned. Total reservations — prominent number слева от bar.
- `REQ-04` **Upcoming check-ins/outs — simplified lists.** Existing outlined cards остаются, но:
  - Remove icon-on-heading (text-only heading: «Заезды · 7 дней»).
  - Remove bullet-circle-icon prefix on list items.
  - Each item: guest_name | unit_name right-aligned date. Monospace date для tabular.
  - Empty state text + subtle icon (existing behavior preserved, no change).
- `REQ-05` **Left-aligned asymmetry.** No centered content. Headings left. Status breakdown bar 60% width, not full. Check-ins/outs — 50/50 grid (acceptable asymmetry comes from content density, not layout width).
- `REQ-06` **No saturated card backgrounds.** All cards — `variant="outlined"` or no card at all (just sections с spacing). Status colors applied only к functional chips/dots/bar segments.
- `REQ-07` **i18n** — no text changes (existing keys), only layout. Potentially add new keys для legend если text differs.
- `REQ-08` **Dark + light parity.** Geologica + Geist font stack from FT-026. OKLCH tinted neutrals from FT-026. Both themes already established.
- `REQ-09` **Responsive.**
  - **xs (< 600)**: hero font `clamp(1.75rem, 4vw, 3.5rem)` — auto-downscale; supporting metrics stack in 2 rows; status bar legend wraps 2-per-row; check-ins/outs stack vertically.
  - **sm-md (600-1280)**: hero full-width; supporting metrics single row; check-ins/outs side-by-side на ≥ md (960).
  - **lg+**: editorial hierarchy, ~60% width сдержанная status-bar, не full.
- `REQ-10` **Tests.** Component tests: KPI values rendered, status bar segments proportional to counts, upcoming lists render. No visual regression tests (handled manually QA).

### Non-Scope

- `NS-01` **Charts library (chart.js, apexcharts)** — no new npm. Revenue trend chart / historical comparison — nice but требует deps. Bar chart для status — plain CSS flex + percentage widths.
- `NS-02` **Custom illustrations** — no empty-state illustrations beyond existing MDI icons.
- `NS-03` **Dashboard customization** (rearrange widgets, drag-to-reorder) — vast scope, follow-up.
- `NS-04` **Month-over-month comparison** (revenue Δ% vs last month) — backend API не exposes. Future enhancement когда API добавит.
- `NS-05` **Notification widgets** (overdue, pending approvals) — separate FT.
- `NS-06` **Owner-specific dashboard view** — multi-role dashboards, отдельный FT когда owner role UI матёреет.
- `NS-07` **Data refresh / polling** — manual refresh существует (existing); auto-refresh outside scope.
- `NS-08` **Keyboard shortcuts для dashboard** — FT-029 только /calendar scope. Separate FT.

### Constraints / Assumptions

- `ASM-01` FT-030 merged (baseline 731 tests + abbreviateUnit util).
- `ASM-02` `/api/v1/dashboard` serializer exposes existing fields (`total_units`, `occupancy_rate`, `revenue_this_month`, `reservations_by_status`, `upcoming_check_ins`, `upcoming_check_outs`). Не меняем backend.
- `ASM-03` `status-*` color tokens (FT-026 NS-06) — functional, preserved, reused для bar segments + legend dots.
- `CON-01` No new npm packages.
- `CON-02` No TypeScript.
- `CON-03` Coverage ratchet.
- `CON-04` No backend changes.

## How

### Solution

1. **`DashboardView.vue`** — полный rewrite template. Script logic unchanged (computed `totalReservations`, `formatPrice`, etc). Sections:
   - Hero: greeting + org name → revenue hero → supporting metrics row → occupancy slim bar
   - Status breakdown: total + horizontal stacked bar + legend list
   - Upcoming: 2-col grid, clean lists
2. **New styles** (scoped) — hero values, legend dots, bar segment percentages via `flex-basis: {count/total*100}%`.
3. **Typography**:
   - Hero revenue: `font-family: var(--font-display)`, 3.5rem, font-weight 600, tabular-nums.
   - Supporting metrics: label 11px uppercase track-wide, value 18px body font bold.
   - Status counts: 14px, tabular.
4. **Status bar**: `<div class="status-bar" role="img" :aria-label="...">` containing `<span class="status-bar__segment" :style="{flexBasis}" :class="status-{type}">` — each segment colored via existing `background: rgb(var(--v-theme-status-confirmed))` tokens.

Trade-off 1 (plain CSS bar vs chart lib): plain CSS — no dep, lightweight, enough для proportional view. Chart lib overkill.

Trade-off 2 (card vs section): cards create visual noise on dashboards — Impeccable warns «Don't wrap everything in cards». Sections separated by spacing alone (`space-xl`) + optional subtle `border-bottom: 1px rgba(on-surface, 0.08)` для section dividers.

Trade-off 3 (revenue format — resolved): full `1 234 567 ₽` always (via existing `formatMoney`) — precision matters для operational. Font sizes responsive через `clamp(1.75rem, 4vw, 3.5rem)` — natural downscale на narrow viewports без abbreviation complexity. Long values (> 10 digits) wrap через `overflow-wrap: anywhere`.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `frontend/src/views/DashboardView.vue` | code | Full template rewrite + scoped styles |
| `frontend/src/__tests__/views/DashboardView.test.js` | code | Extend — KPI values, status bar segments, upcoming lists |
| `frontend/src/locales/ru.json`, `en.json` | data | Add «legend» keys if needed (e.g. «Всего броней» already exists?) |
| `memory-bank/engineering/design-style-guide.md` | doc | Dashboard section — editorial hierarchy principle |
| `memory-bank/features/README.md` | doc | Register FT-031 |

### Flow

1. User navigates `/` (main). DashboardView loaded, fetches `/api/v1/dashboard`.
2. Hero renders immediately: greeting + org + revenue number (with skeleton/placeholder while loading).
3. Once data arrives: supporting metrics + occupancy bar + status breakdown + upcoming lists populate.
4. User scan: revenue (primary) → что впереди (secondary) → status summary (tertiary).

### Contracts

| Contract | I/O | Producer / Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `dashboard data shape` | API → DashboardView | Unchanged from baseline |
| `CTR-02` | Status bar segment flex-basis = `count / totalReservations * 100%` | View | 0% when totalReservations = 0 (renders empty bar) |

### Failure Modes

- `FM-01` `totalReservations = 0` → status bar renders empty (0-width segments), legend still shows «0» counts.
- `FM-02` API returns `null` for optional fields → existing guards preserved (falsy coerces to 0).
- `FM-03` Extremely large revenue (> 1 billion cents) → `formatPrice` handles; hero font wraps via `overflow-wrap: break-word`.
- `FM-04` Single status dominates (e.g. 100 confirmed, 0 others) → bar shows one full-width segment; legend zeros present.
- `FM-05` Dark mode contrast на status dots в legend — dots use saturated tokens (FT-026 preserved), contrast adequate.

### ADR Dependencies

Нет.

### Rollback

- `RB-01` Single squash commit revert. Template rewrite — all-or-nothing.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..10` реализованы.
- `EC-02` Hero revenue number visible и dominant.
- `EC-03` Status breakdown rendered as horizontal stacked bar + legend.
- `EC-04` No saturated-colored card backgrounds (grep check).
- `EC-05` No icon-on-every-heading (grep).
- `EC-06` 731+ tests green. Coverage ratchet.
- `EC-07` CI green.
- `EC-08` Dark + light themes correct.

### Acceptance Scenarios

- `SC-01` **Happy path.** Demo seed → hero shows «2 535.00 ₽» (revenue this month) dominant; supporting row: «6 юнитов · 33% загрузка · 10 броней»; occupancy bar at 33% width; status bar proportional (5 blue / 2 green / 2 grey / 1 red); upcoming Иван Петров listed.
- `SC-02` **Empty reservations.** `total_units > 0`, `total_reservations == 0` → status bar empty, legend all zeros; upcoming lists empty-state text.
- `SC-03` **Zero units.** `total_units == 0` → hero/metrics render with zeros, no error.
- `SC-04` **Left-aligned.** Inspect DOM: `.dashboard-hero` has `text-align: left`; no `text-center` on section headings.
- `SC-05` **Dark mode.** Toggle theme → revenue number legible (high contrast), bar segments saturated but not screaming.
- `SC-06` **Responsive md.** Resize to 768px → supporting metrics row wraps; check-ins/outs stack vertically.

### Negative / Edge Cases

- `NEG-01` API error → existing `v-alert` error visible, no layout break.
- `NEG-02` Loading state → `v-progress-linear` (existing) while data null.
- `NEG-03` Extremely long org name → `text-overflow: ellipsis` or wrap safe.
- `NEG-04` Status total = 0 but upcoming lists non-empty → acceptable; lists independent.

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | | `SC-01,03,04` | `CHK-02,05` | `EVID-02,05` |
| `REQ-02` | | `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-03` | `CTR-02`, `FM-01,04` | `SC-01,02` | `CHK-02,05` | `EVID-02,05` |
| `REQ-04` | | `SC-01,02` | `CHK-02` | `EVID-02` |
| `REQ-05` | | `SC-04` | `CHK-02,05` | `EVID-02,05` |
| `REQ-06` | | `EC-04` | `CHK-03` | `EVID-03` |
| `REQ-07` | | — | `CHK-04` | `EVID-04` |
| `REQ-08` | | `SC-05` | `CHK-05` | `EVID-05` |
| `REQ-09` | | `SC-06` | `CHK-05` | `EVID-05` |
| `REQ-10` | | `EC-06` | `CHK-01,02` | `EVID-01,02` |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-06` | `yarn test:coverage` | ratchet met | `artifacts/ft-031/verify/chk-01/` |
| `CHK-02` | `REQ-01..05,10` + SCs | `yarn test DashboardView.test.js` | hero value present, bar segments proportional, upcoming lists render | `artifacts/ft-031/verify/chk-02/` |
| `CHK-03` | `REQ-06` | `grep -E '<v-card[^>]*color="(primary\|info\|secondary\|finance-revenue\|status-[a-z-]+)"' DashboardView.vue` | 0 matches на `<v-card color=...>` (saturated card backgrounds gone). Dots / chips могут иметь color (legend). Pipe targets explicit token names — no false positives | `artifacts/ft-031/verify/chk-03/` |
| `CHK-04` | `REQ-07` | locale parity | no reduction (possibly +few keys) | `artifacts/ft-031/verify/chk-04/` |
| `CHK-05` | `REQ-01..05,08,09` + SCs | Manual QA screenshots @ 1440 / 1024 / 768 / 390 px в light+dark themes | Editorial hierarchy readable; hero font scales via clamp; status bar + legend preserve proportions; check-ins/outs stack at `<md` | `artifacts/ft-031/verify/chk-05/` |
| `CHK-06` | `EC-07` | markdownlint + CI | 0 errors, 5/5 | `artifacts/ft-031/verify/chk-06/` |

### Evidence

- `EVID-01` Coverage.
- `EVID-02` Vitest log.
- `EVID-03` grep output.
- `EVID-04` Locale parity.
- `EVID-05` Screenshots.
- `EVID-06` Lint + CI.

### Evidence contract

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-031/verify/chk-01/` |
| `EVID-02` | `yarn test` | `artifacts/ft-031/verify/chk-02/` |
| `EVID-03` | shell | `artifacts/ft-031/verify/chk-03/` |
| `EVID-04` | shell | `artifacts/ft-031/verify/chk-04/` |
| `EVID-05` | manual | `artifacts/ft-031/verify/chk-05/` |
| `EVID-06` | `markdownlint` + `gh` | `artifacts/ft-031/verify/chk-06/` |
