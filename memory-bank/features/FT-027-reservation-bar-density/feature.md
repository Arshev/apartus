---
title: "FT-027: Reservation Bar Density"
doc_kind: feature
doc_function: canonical
purpose: "Reservation bars на Gantt должны нести больше 1 бита информации. Правый-align revenue chip + nights indicator + theme-aware hover outline. Закрывает P1 reservation-bar finding из Impeccable critique."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../../engineering/design-style-guide.md
  - ../../engineering/coding-style.md
  - ../../engineering/testing-policy.md
  - ../FT-020-gantt-calendar/feature.md
  - ../FT-026-design-refresh/feature.md
  - ../../../.impeccable.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-027: Reservation Bar Density

## What

### Problem

Impeccable critique (2026-04-17): **reservation bars — dumb slabs.** Каждый бар несёт только 1 бит (status color), при том что booking имеет 7+ useful полей (guest, revenue, nights, guests_count, property, unit). Для operational manager'а с 8-часовой сменой это критично — чтобы увидеть revenue он должен открыть каждую бронь индивидуально.

Реализация сейчас (`GanttTimelineItem.vue`):

- `width < 30px`: ничего
- `width ≥ 30`: `#{id}`
- `width ≥ 80`: `guest_name`

Revenue (`total_price_cents`), nights count, guests count — **нигде в bar не видны**, только в tooltip (hover-only).

**P1 fix per critique:**
> Show revenue micro-number right-aligned when width > 120; subtle internal vertical striping for multi-night vs single-night; replace hover `box-shadow: rgba(0,0,0,0.25)` with outline in theme-aware `rgb(var(--v-theme-on-surface))`.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | Revenue visible в bar без tooltip | только в tooltip | right-aligned chip на баре при width ≥ 140px | Visual QA + component test |
| `MET-02` | Nights count visible как compact indicator | только через calc в tooltip | subtle "Nн" между guest_name и revenue при width ≥ 180px | Visual QA |
| `MET-03` | Hover affordance theme-aware | `box-shadow: rgba(0,0,0,0.25)` | `outline: 2px solid rgba(var(--v-theme-on-surface), 0.3)` | Visual QA + component test |
| `MET-04` | Coverage ratchet | текущий | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Revenue chip right-aligned.** При `width ≥ 140px` и `booking.total_price_cents > 0` показать `<span class="gantt-item__revenue">{formattedPrice}</span>` справа от label. Formatted через `formatMoney(cents, currency)` из existing util с currency из `authStore.organization?.currency || 'RUB'`. Tabular numerics через `.text-tabular` (FT-026). Font-size: 11px, opacity: 0.9, line-height: 1, white-space: nowrap, flex-shrink: 0. **Sizing rationale**: at 11px Geist typical RUB value `"3 500 ₽"` ≈ 55px, `"125 000 ₽"` ≈ 70px, worst-case 6-digit `"999 999 ₽"` ≈ 80px. Guest_name min readable ≈ 50px ellipsis. Padding 6px × 2 = 12px. Gap 6px. 50 + 6 + 70 + 12 = 138px → 140px threshold covers typical revenue без truncating guest_name.
- `REQ-02` **Nights count indicator.** При `width ≥ 180px` показать `<span class="gantt-item__nights">Nн</span>` (Latin N + «н» + «d» en). Между guest_name (flex-grow) и revenue chip. Compact, font-size: 10px, opacity: 0.75, padding: 0 6px. Localized `{n}н` / `{n}d`.
- `REQ-03` **Progressive disclosure thresholds.** Stratify visible content by width:

  | Width | Label | Nights | Revenue |
  |---|---|---|---|
  | < 30 | — | — | — |
  | 30–79 | `#{id}` | — | — |
  | 80–139 | `guest_name` | — | — |
  | 140–179 | `guest_name` | — | ✓ |
  | ≥ 180 | `guest_name` | ✓ | ✓ |

  **Overrides (priority order):**
  - `specialMode === 'overdue'` AND `overdueDays > 0` → `showRevenue = false` (overdue-label takes the right slot; см. FM-05). Nights следуют тем же правилам.
  - `specialMode === 'handover'` AND booking не matches handover type (dimmed class) → `showRevenue = false`, `showNights = false` (dimmed bars become illegible at 0.35 opacity — см. S-1).
  - `specialMode === 'overdue'` AND booking не matches overdue → dimmed, revenue + nights hidden по той же причине.
  - All other modes (idle / heatmap / empty / handover-matching) → thresholds unchanged.

- `REQ-04` **Hover affordance — theme-aware outline.** Replace `box-shadow: 0 2px 8px rgba(0,0,0,0.25)` на `outline: 2px solid rgba(var(--v-theme-on-surface), 0.3); outline-offset: 2px`. Light/dark адаптируется автоматически. Z-index bump на hover unchanged.
- `REQ-05` **Nights calculation.** Pure helper `utils/date.js#diffDays(a, b)` (returns `b - a` в днях) уже существует (FT-020). Reuse — `const nights = diffDays(booking._start, booking._end)` с guard: `Number.isFinite(nights) && nights > 0` иначе `showNights = false`.
- `REQ-06` **Booking currency consistency.** Currency берётся **один раз** на Row-level и прокидывается пропом в Item, а не caching per-Item (performance + consistency с существующим pattern).
- `REQ-07` **i18n** — новый key `calendar.gantt.nightsLabel` (ru: `{n} н`, en: `{n} n`). Single-letter suffix — neutral tone, fits «quietly modern» brand voice из `.impeccable.md`. Не конфликтует с `overdueLabel.{n}д` (overdue use Cyrillic «д», nights use «н»). Full word variant (`{n} ночей` / `{n} nights`) — deferred when bar width permits (NS, future FT).
- `REQ-08` **Dark/light mode parity** — revenue chip и nights indicator читаются на всех status color backgrounds (white text на saturated bg).
- `REQ-09` **Accessibility.** Revenue + nights spans получают `pointer-events: none` (CSS), не перехватывают click/contextmenu от bar (parent). Регрессия check в `CHK-02`: assert click на revenue span triggers booking navigation (event propagates to bar). Tooltip показывает full info при hover (existing).

### Non-Scope

- `NS-01` **Channel / source rib** (критик также упомянул «leading 2-3px accent rib coloured by channel») — отложено, т.к. в Apartus reservation model нет `channel` поля напрямую (Channel Manager FT-011 пока через iCal import, не маркирует reservation origin). Future FT при появлении field.
- `NS-02` **Multi-night vertical striping.** Subtle separators между днями внутри bar — прикольная идея, но добавляет visual noise когда активен heatmap/idle (конкурирует с day-cells). Откладываем, нужен дополнительный UX-тест.
- `NS-03` **Revenue abbreviation** (e.g. "3.5k" для экономии места) — loses precision. MVP — полная сумма когда есть место, иначе спрятать. Abbreviation может прийти в follow-up если пользователи попросят.
- `NS-04` **Guests count icon** (e.g. 👥2) — полезно, но 3 элемента в bar это уже много. Tooltip покрывает.
- `NS-05` **Price-per-night calculation** (`total/nights`) — derived, может путать. Показываем только общий revenue.
- `NS-06` **Revenue color coding by threshold** (e.g. красный для «дешевая бронь») — добавляет subjective judgment, out of scope operational display.
- `NS-07` **Bar striping по статусу guests (returning / VIP)** — нет guest-tier поля в model. Future.
- `NS-08` **Status chip в bar** — current pattern уже conveys статус через background color, дублирование избыточно.

### Constraints / Assumptions

- `ASM-01` FT-026 merged (baseline 659 tests + OKLCH palette + Geist/Geologica fonts).
- `ASM-02` `booking.total_price_cents` доступен в reservation_json serializer (verified).
- `ASM-03` `auth.organization.currency` поле заполнено для любой logged-in org (existing pattern в GanttTooltip FT-020).
- `ASM-04` Default currency fallback — `'RUB'` (existing).
- `ASM-05` `diffDays` в `utils/date.js` доступен и работает с existing enriched `_start`, `_end`.
- `CON-01` No new npm packages.
- `CON-02` No TypeScript.
- `CON-03` Coverage ratchet.
- `CON-04` No backend changes (`total_price_cents` уже exposed).
- `CON-05` Performance: 30d × 50 units × avg 3 reservations = 4500 Items × 2 additional spans = 9000 DOM nodes extra, acceptable (static, no listeners).

## How

### Solution

1. **`GanttTimelineItem.vue`** — добавить 2 новых `<span>` elements:
   - `.gantt-item__revenue` — right-aligned через `margin-left: auto` (overrides overdue label positioning — see FM-02)
   - `.gantt-item__nights` — inline after label, before revenue

   Template structure (when all visible): `[marker]? [label] [nights]? [overdue-label]? [revenue]?`. Nights and revenue both `pointer-events: none`.
2. **`GanttTimelineRow.vue`** — compute `currency` once per Row (реально pull из auth store), проkinуть в Item prop.
3. **Computed thresholds** — новые props `showRevenue`, `showNights` на базе `width` pluggable through single computed.
4. **CSS** — hover replaces box-shadow с outline. New scoped styles для revenue / nights.
5. **Currency формат** через existing `formatMoney` util (no duplicate).

Trade-off 1 (revenue position — right-align vs below label): right-align (chosen) — соответствует critique, экономит vertical space в compact 28px bar, симметрично с `overdueLabel` которое уже там.

Trade-off 2 (nights на баре vs только tooltip): MVP включаем — revenue + nights вместе дают «сколько + сколько дней» glanceable, что exactly operational need. Tooltip остаётся для deeper info (check-in/out dates, property, unit, status).

Trade-off 3 (outline vs border): outline не occupies space в box model, не смещает flex children, работает с absolute positioning. Border сместил бы content.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `frontend/src/views/calendar/GanttTimelineItem.vue` | code | Add revenue/nights spans + thresholds + outline hover |
| `frontend/src/__tests__/views/calendar/GanttTimelineItem.test.js` | code | Threshold matrix + revenue rendering tests |
| `frontend/src/views/calendar/GanttTimelineRow.vue` | code | Pass `currency` prop to Item; compute once |
| `frontend/src/locales/ru.json`, `en.json` | data | `calendar.gantt.nightsLabel` |
| `frontend/e2e/calendar-overlap.spec.js` | code | E2e: при wide bar revenue visible; при narrow только guest_name |
| `memory-bank/domain/frontend.md` | doc | Update Calendar section mention revenue/nights on bars |
| `memory-bank/features/README.md` | doc | Register FT-027 |

### Flow

1. **Render.** Row fetches `currency` from auth store (one time per mount). Передаёт в `<GanttTimelineItem>` как prop.
2. **Compute.** Item — computed `showRevenue`, `showNights` based on `width` thresholds (REQ-03).
3. **Template.** Conditional `<span v-if="showRevenue">` and `<span v-if="showNights">` render.
4. **Hover.** CSS `:hover` — outline instead of box-shadow.

### Contracts

| Contract | I/O | Producer / Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `GanttTimelineRow → GanttTimelineItem.currency: string` | Row / Item | Fetched once per Row from `authStore.organization?.currency` with fallback `'RUB'` |
| `CTR-02` | `<span class="gantt-item__revenue">{formattedPrice}</span>` приkrываn `v-if="showRevenue"` | Item / DOM | Always text-content if shown; no html injection |
| `CTR-03` | `<span class="gantt-item__nights">{n} н</span>` (ru) / `{n} n` (en) прикрытo `v-if="showNights"` | Item / DOM | Single-letter neutral suffix per REQ-07 |

### Failure Modes

- `FM-01` `total_price_cents = 0 / null / undefined` → `showRevenue = false` (bookings без цены — blocking reservations).
- `FM-02` Invalid `_start`/`_end` для nights calc → `nights = 0` → showNights returns false.
- `FM-03` Extremely expensive booking (> 1M cents) → `formatMoney` handles; width threshold 140px enough для "12 500 000 ₽".
- `FM-04` Currency config unknown → `formatMoney` already falls back to USD.
- `FM-05` Overdue label coexistence — resolved в REQ-03 «Overrides». Overdue-label имеет приоритет (visual urgency, `+Nд` красный), revenue скрывается в overdue mode для overdue bookings. Non-overdue bookings в overdue mode — dimmed, revenue/nights тоже скрыты.
- `FM-06` Handover/overdue dimming + revenue readability — dimmed bar (opacity 0.35) рендерил бы revenue/nights с effective alpha ~0.32, illegible. REQ-03 Override скрывает оба chip на dimmed bars.
- `FM-07` Very narrow bar (< 30px) — nothing rendered, unchanged.

### ADR Dependencies

Нет.

### Rollback

- `RB-01` Squash-merge single commit. `git revert <sha>` возвращает старый template + CSS hover box-shadow.
- `RB-02` No state migrations, no API changes.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..09` реализованы.
- `EC-02` Revenue chip виден в bars width ≥ 140px при non-zero total_price_cents.
- `EC-03` Nights indicator виден в bars width ≥ 180px.
- `EC-04` Hover показывает theme-aware outline (не box-shadow).
- `EC-05` FT-021..026 existing mode tests pass (regression safety).
- `EC-06` 659+ tests green. Coverage ratchet met.
- `EC-07` CI green.
- `EC-08` i18n parity ru↔en (+1 key `nightsLabel`).

### Acceptance Scenarios

- `SC-01` **Happy path wide bar.** Бронирование на 5 дней (width ~200px) в confirmed status. Ожидаем: guest_name слева, `5 ноч.` middle-ish, revenue `12 500 ₽` right-aligned. Status color background preserved.
- `SC-02` **Medium bar.** 3 дня (~120-140px). Guest_name + revenue (без nights). `showNights = false`.
- `SC-03` **Narrow bar.** 1 день (~40-80px). Только `#{id}` или truncated guest_name (unchanged from baseline).
- `SC-04` **Zero price booking.** Blocking reservation (total_price_cents = 0). Revenue НЕ показан, nights показаны если width ≥ 180.
- `SC-05` **Overdue mode active.** В overdue mode у overdue booking виден красный `+Nд` label справа. Revenue chip — **hidden** (FM-05). Non-overdue bookings в overdue mode — dimmed (existing).
- `SC-06` **Hover outline.** Hover над bar → 2px tinted outline вокруг (не saturated box-shadow). Visible в обоих темах.
- `SC-07` **Dark mode readability.** Revenue + nights text читаем white/near-white на всех status colors в dark theme.
- `SC-08` **Regression handover mode.** Handover active → border + marker visible. Revenue + nights не конфликтуют (outline on top, handover borders inside).
- `SC-09` **Regression idle/heatmap.** Idle gaps / heatmap mode → bars rendered поверх backgrounds — revenue/nights остаются readable.

### Negative / Edge Cases

- `NEG-01` Currency unknown — `formatMoney` falls back к USD. Assert `$12500.00` когда unknown.
- `NEG-02` `auth.organization` null — fallback `'RUB'` (existing pattern).
- `NEG-03` `total_price_cents = null` → revenue hidden. Not shown.
- `NEG-04` `diffDays(undefined, undefined)` → guard → `nights = 0` → nights hidden.
- `NEG-05` `nights = 0` (check_in = check_out) — edge case; `showNights = false`.
- `NEG-06` `width = 139.9px` (float) — `showRevenue` false (threshold strictly `≥ 140`).

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | `CTR-02`, `FM-01,03,04` | `SC-01,02,04`, `NEG-01..03` | `CHK-02` | `EVID-02` |
| `REQ-02` | `CTR-03`, `FM-02` | `SC-01`, `NEG-04,05` | `CHK-02` | `EVID-02` |
| `REQ-03` | | `SC-01..04` | `CHK-02` | `EVID-02` |
| `REQ-04` | | `SC-06` | `CHK-02`, `CHK-05` | `EVID-02`, `EVID-05` |
| `REQ-05` | | `SC-01`, `NEG-04,05` | `CHK-02` | `EVID-02` |
| `REQ-06` | `CTR-01` | `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-07` | | `SC-01` | `CHK-04` | `EVID-04` |
| `REQ-08` | | `SC-07` | `CHK-05` | `EVID-05` |
| `REQ-09` | | `SC-01` | `CHK-02` | `EVID-02` |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-06` | `yarn test:coverage` | ratchet met | `artifacts/ft-027/verify/chk-01/` |
| `CHK-02` | `REQ-01..06,09` + SCs/NEGs | `yarn test views/calendar/GanttTimelineItem.test.js` | Threshold matrix + revenue/nights rendering; outline on hover | `artifacts/ft-027/verify/chk-02/` |
| `CHK-03` | `EC-01` | `git diff main..HEAD --stat` | minimal change surface | `artifacts/ft-027/verify/chk-03/` |
| `CHK-04` | `REQ-07` | node locale parity check | +1 key each | `artifacts/ft-027/verify/chk-04/` |
| `CHK-05` | `REQ-04,08` + `SC-06,07` | Manual QA screenshots (light+dark, hover, overdue mode) | Outline + chip readability confirmed | `artifacts/ft-027/verify/chk-05/` |
| `CHK-06` | `EC-07` | markdownlint + CI | 0 errors, 5/5 green | `artifacts/ft-027/verify/chk-06/` |
| `CHK-07` | `EC-02,03` + `SC-01,03` | `yarn test:e2e` new assertion | Wide bar → revenue visible; narrow bar → no revenue | `artifacts/ft-027/verify/chk-07/` |

### Evidence

- `EVID-01` Coverage.
- `EVID-02` Vitest log.
- `EVID-03` Git diff.
- `EVID-04` grep + locale parity.
- `EVID-05` Screenshots.
- `EVID-06` Lint + CI.
- `EVID-07` Playwright.

### Evidence contract

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-027/verify/chk-01/` |
| `EVID-02` | `yarn test` | `artifacts/ft-027/verify/chk-02/` |
| `EVID-03` | shell | `artifacts/ft-027/verify/chk-03/` |
| `EVID-04` | shell | `artifacts/ft-027/verify/chk-04/` |
| `EVID-05` | manual | `artifacts/ft-027/verify/chk-05/` |
| `EVID-06` | `markdownlint` + `gh` | `artifacts/ft-027/verify/chk-06/` |
| `EVID-07` | `yarn test:e2e` | `artifacts/ft-027/verify/chk-07/` |
