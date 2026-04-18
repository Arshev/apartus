---
title: "FT-032: Abbreviation Uniqueness + Today Column Anchor"
doc_kind: feature
doc_function: canonical
purpose: "Closes 2 P1 findings from Gantt re-critique (2026-04-18): (1) collapsed sidebar abbreviation collision (`DO` + `DO` for «Dorm 6A» + «Dorm 8B»); (2) no visible today-column anchor на grid."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../FT-020-gantt-calendar/feature.md
  - ../FT-026-design-refresh/feature.md
  - ../FT-030-sidebar-collapse/feature.md
  - ../../../.impeccable.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-032: Abbreviation Uniqueness + Today Column Anchor

## What

### Problem

Re-critique (2026-04-18, Nielsen 29/40) flagged 2 P1 issues:

**P1 Abbreviation collision (Heuristic 2).** `abbreviateUnit` (FT-030) maps «Dorm 6A» и «Dorm 8B» одинаково к `DO` — user в collapsed sidebar видит две строки `DO DO` и теряет one bit needed to map row → unit. Hover tooltip rescues, но promise «I remember unit mapping» нарушен.

**P1 Today column not anchored (Heuristic 1).** Timeline grid не имеет visible «you are here» highlight на today's column. Only the thin vertical today-marker line exists (FT-020), но она easy to lose в peripheral vision. Operational manager returning к табу не сразу находит opening — месячный label «Апрель 2026 г.» maleнький centered.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | Abbreviation uniqueness within visible units | non-unique possible (DO/DO) | unique per-property. 2 «Dorm 6A» + «Dorm 8B» → distinct (e.g. `D6` / `D8`) | Unit test matrix |
| `MET-02` | Today column has background tint | thin line only | subtle `surface-variant` background на today's column full height | Visual QA + component test |
| `MET-03` | Nielsen H1+H2 improved | 3+3 | ≥ 4+4 | Re-critique after merge (nice-to-have, soft MET) |
| `MET-04` | Coverage ratchet | current | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **`abbreviateUnit` — digit-aware fallback.** Update `utils/strings.js#abbreviateUnit(name)`. New rule (keeping API signature):
  - Primary: first 2 alphanumeric chars of first significant word (current behavior) → «Deluxe Suite» → `DE`.
  - BUT if word contains digits (e.g. «Dorm 6A», «Studio 204»), return first letter + first digit: «Dorm 6A» → `D6`, «Studio 204» → `S2`.
  - This trades general-purpose «2 significant letters» in favor of disambiguation когда digits present — the typical unit-naming pattern в industry.
  - Stop-words skipped unchanged (`the`, `a`, `an`).
  - Cyrillic support preserved.
  - Empty/invalid → `??`.
- `REQ-02` **Tests updated + collision matrix.** Extend `utils/strings.test.js`:
  - Update existing expectations to new rule.
  - Add collision test: `abbreviateUnit('Dorm 6A')` ≠ `abbreviateUnit('Dorm 8B')`.
  - Cyrillic preserved: «Люкс 101» → `Л1` (first letter + first digit).
- `REQ-03` **Today column anchor.** В `GanttTimeline.vue` добавить subtle background-tint на today's column через existing `todayLeft` + column-width calc. Render as absolute-positioned `<div class="gantt-timeline__today-column">` layer:
  - `position: absolute; left: todayLeft; top: 0; bottom: 0; width: dayWidthPx`
  - `background: rgba(var(--v-theme-primary), 0.04)` — whisper-level tint (not saturated)
  - `pointer-events: none; z-index: 0`
  - Spans header + all rows (full timeline height)
  - Only rendered когда `todayInRange === true` (existing computed)
- `REQ-04` **Today column header bold.** Day cell в `GanttTimelineHeader` для today gets `font-weight: 600` + same primary tint background (matches column layer). Current today text is already tinted primary (FT-020), но weight same как другие — bump to 600.
- `REQ-05` **Accessibility.** `aria-label` на today column layer («Сегодня, {date}»). `prefers-reduced-motion` — no motion applicable (background static).
- `REQ-06` **i18n.** New key `calendar.gantt.todayColumnAriaLabel` для aria-label.
- `REQ-07` **Tests.** Unit (abbreviateUnit matrix update) + component (today column renders when todayInRange, absent otherwise) + e2e no new (covered by existing calendar smoke).

### Non-Scope

- `NS-01` **Density toggle** (re-critique P2) — отдельный FT-033 если возьмём.
- `NS-02` **Shortcut badges на toolbar buttons** (re-critique P2) — FT-034.
- `NS-03` **Multi-character collision** (if 5+ units all start с `Dorm 1X` family) — current rule handles с digit disambiguator; edge case с 3+ digit-twin units (`Dorm 10A`/`Dorm 10B`) still collides on `D1`. Deferred — requires property-aware context passed as array, API change.
- `NS-04` **Per-user (vs per-browser) sidebar persistence** — отдельная multi-user UX concern. Not in this scope.
- `NS-05` **Today column active state в heatmap mode** — heatmap already paints cells; today-tint stacks on top correctly. No special handling.
- `NS-06` **Weekend-column tints** (subtle Sat/Sun shading) — nice-to-have editorial touch, separate FT.
- `NS-07` **Visible month-change vertical rule** (when month rolls from April → May within 14d range) — future.

### Constraints / Assumptions

- `ASM-01` FT-031 merged (baseline 737 tests).
- `ASM-02` `abbreviateUnit` existing signature — keep `(name: string) → string` (2 chars). No API break.
- `ASM-03` `todayLeft`, `todayInRange`, `pixelsPerMs` already computed в `GanttTimeline.vue` (FT-020).
- `ASM-04` Day width = `pixelsPerMs * MS_PER_DAY` — existing constant.
- `CON-01` No new npm packages.
- `CON-02` No TypeScript.
- `CON-03` Coverage ratchet.
- `CON-04` No backend changes.

## How

### Solution

1. **`utils/strings.js#abbreviateUnit` — add digit branch.** Check если первое significant word матчит `/[a-zA-Z\u0400-\u04FF]+\d/` (letter-then-digit pattern), return `word[0] + firstDigit`. Otherwise существующее behavior.
2. **`GanttTimeline.vue` — today column layer.** Добавить `<div v-if="todayInRange" class="gantt-timeline__today-column" :style="todayColumnStyle">` внутри `.gantt-timeline__inner` (above header + rows). z-index: 0 (ниже items). Style: `left`, `width` computed.
3. **Header bold today day.** Existing `.gantt-timeline-header__day--today` class — убедиться что добавляется + add `font-weight: 600` CSS.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `frontend/src/utils/strings.js` | code | Update `abbreviateUnit` digit branch |
| `frontend/src/__tests__/utils/strings.test.js` | code | Update matrix + add collision test |
| `frontend/src/views/calendar/GanttTimeline.vue` | code | Today column layer + `todayColumnStyle` computed |
| `frontend/src/__tests__/views/calendar/GanttTimeline.test.js` | code | Today column render test |
| `frontend/src/views/calendar/GanttTimelineHeader.vue` | code | Today day cell font-weight + primary tint (check existing) |
| `frontend/src/locales/ru.json`, `en.json` | data | +1 key `todayColumnAriaLabel` |
| `memory-bank/domain/frontend.md` | doc | Small update to sidebar collapse section (new digit rule) |
| `memory-bank/features/README.md` | doc | Register FT-032 |

### Flow

1. **Render Timeline.** `todayInRange` computed. If true → render `today-column` div spanning full height with tint background.
2. **Collapsed sidebar.** `abbreviateUnit` called per unit. With new rule, «Dorm 6A» → `D6`, «Dorm 8B» → `D8` — unique.
3. **Hover today column.** `:aria-label` reveals full date; no interaction handler (pointer-events none).

### Contracts

| Contract | I/O | Producer / Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `abbreviateUnit(name)` — same signature | utils / Timeline | Rule updated; empty/invalid fallback unchanged (`??`) |
| `CTR-02` | `todayColumnStyle: { left, width }` | Timeline computed | `left = todayLeft; width = pixelsPerMs * MS_PER_DAY` |

### Failure Modes

- `FM-01` `todayInRange === false` (user jumped to far past/future) → today column not rendered, no layout shift.
- `FM-02` `pixelsPerMs` changes due to viewport resize → today column width updates reactively (computed).
- `FM-03` Today column overlap с heatmap cells → both render, today тint (primary 0.04) layers over heatmap tint (error/success 0.15-0.20) — blend acceptable.
- `FM-04` Today column overlap с idle-gap pattern → same z-index-0 layer, pattern visible through 4% tint.
- `FM-05` Abbreviation rule change breaks существующие tests для «Dorm 6A» → `DO` → tests MUST update to new `D6` expectation (REQ-02).

### ADR Dependencies

Нет.

### Rollback

- `RB-01` Single squash commit revert. No state migration.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..07` реализованы.
- `EC-02` `abbreviateUnit('Dorm 6A') !== abbreviateUnit('Dorm 8B')`.
- `EC-03` Today column visible в default range (viewport has today).
- `EC-04` 737+ tests green. Coverage ratchet.
- `EC-05` CI green.
- `EC-06` Dark + light readable.

### Acceptance Scenarios

- `SC-01` **Collision resolved.** Sidebar collapsed → 6 demo units show DE / ST / MA / SO / **D6** / **D8** (not DO/DO).
- `SC-02` **Today column visible.** Gantt default → today column has subtle primary tint (5% alpha). Date header bold.
- `SC-03` **Today out of range.** User clicks «Перейти к дате» → Jul 1 2026 → today column не рендерится.
- `SC-04` **Heatmap + today stack.** Heatmap mode active + today column → today tint visible поверх free/busy cells.
- `SC-05` **Dark mode.** Today tint visible but not screaming — `rgba(primary, 0.04)` на dark background = ~3-4% brightness delta.

### Negative / Edge Cases

- `NEG-01` Unit name «5A» (no letters) → abbreviation first alphanumeric → `5A`.
- `NEG-02` Unit name «A» (single char) → duplicated `AA` (existing fallback).
- `NEG-03` Collision между 2 properties имеющих «Dorm 6A» → abbreviation `D6` duplicated, но они в разных property groups — acceptable within scope.
- `NEG-04` Today at viewport edge (left-edge overlap sidebar) → today column renders в main scroll area, не sidebar. Visual check.

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | `CTR-01`, `FM-05` | `SC-01`, `NEG-01,02,03` | `CHK-02` | `EVID-02` |
| `REQ-02` | | `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-03` | `CTR-02`, `FM-01..04` | `SC-02..05` | `CHK-02,05` | `EVID-02,05` |
| `REQ-04` | | `SC-02` | `CHK-02,05` | `EVID-02,05` |
| `REQ-05` | | `SC-02` | `CHK-02` | `EVID-02` |
| `REQ-06` | | — | `CHK-04` | `EVID-04` |
| `REQ-07` | | `EC-04` | `CHK-01,02` | `EVID-01,02` |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-04` | `yarn test:coverage` | ratchet met | `artifacts/ft-032/verify/chk-01/` |
| `CHK-02` | `REQ-01..05,07` + SCs/NEGs | `yarn test strings.test.js + GanttTimeline.test.js` | collision resolved; today column renders when todayInRange | `artifacts/ft-032/verify/chk-02/` |
| `CHK-03` | `EC-01` | `git diff --stat` | minimal | `artifacts/ft-032/verify/chk-03/` |
| `CHK-04` | `REQ-06` | locale parity | +1 key each | `artifacts/ft-032/verify/chk-04/` |
| `CHK-05` | `SC-02..05` | Manual QA light+dark screenshots: collapsed sidebar (D6/D8 distinct), today column visible, heatmap overlay | Both tints compose correctly | `artifacts/ft-032/verify/chk-05/` |
| `CHK-06` | `EC-05` | markdownlint + CI | 0 errors, 5/5 | `artifacts/ft-032/verify/chk-06/` |

### Evidence

- `EVID-01` Coverage.
- `EVID-02` Vitest log.
- `EVID-03` Git diff.
- `EVID-04` Locale parity.
- `EVID-05` Screenshots.
- `EVID-06` Lint + CI.

### Evidence contract

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-032/verify/chk-01/` |
| `EVID-02` | `yarn test` | `artifacts/ft-032/verify/chk-02/` |
| `EVID-03` | shell | `artifacts/ft-032/verify/chk-03/` |
| `EVID-04` | shell | `artifacts/ft-032/verify/chk-04/` |
| `EVID-05` | manual | `artifacts/ft-032/verify/chk-05/` |
| `EVID-06` | `markdownlint` + `gh` | `artifacts/ft-032/verify/chk-06/` |
