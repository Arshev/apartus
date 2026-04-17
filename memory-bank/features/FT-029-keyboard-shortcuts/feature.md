---
title: "FT-029: Gantt Keyboard Shortcuts"
doc_kind: feature
doc_function: canonical
purpose: "Keyboard shortcuts для operational manager на Gantt: `/` focus search, `T` today, `[` `]` prev/next range, `Esc` close overlays. Closes Persona red flag «Операционный менеджер 8h: no keyboard» из Impeccable critique."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../FT-020-gantt-calendar/feature.md
  - ../FT-025-search-filters/feature.md
  - ../FT-026-design-refresh/feature.md
  - ../FT-027-reservation-bar-density/feature.md
  - ../FT-028-empty-state-ux/feature.md
  - ../../../.impeccable.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-029: Gantt Keyboard Shortcuts

## What

### Problem

Impeccable critique (2026-04-17) Persona red flag #1:

> **Операционный менеджер 8h:** (1) no keyboard: `/` for search, `T` today, `[` `]` for prev/next range — he's on the mouse all day.

Heuristic-7 «Flexibility and efficiency» был **1/4** на Nielsen review. Сейчас pan/navigate/search всё через клики. Ограничивает throughput основного персонажа.

Стандарт SaaS (Linear, Notion, Stripe) — `/` focuses global search, `Esc` closes overlays, `[` `]` для navigation. Apartus этого не имеет.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | `/` focuses search input | нет | focuses search + открывает collapsible bar | Component test + e2e |
| `MET-02` | `T` jumps to today | нет | centers today в viewport | Component test + e2e |
| `MET-03` | `[` / `]` pans range | нет | `[` = prev rangeDays, `]` = next rangeDays | Component test + e2e |
| `MET-04` | Shortcuts discoverable | нет | tooltip подсказки на hover + help-overlay по `?` | Manual QA |
| `MET-05` | Coverage ratchet | текущий | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` **Global keyboard handler** на уровне `GanttCalendarView`. Attach/detach через `onMounted`/`onUnmounted` на `window.keydown`. Events игнорируются если:
  - `event.target` матчит `INPUT`, `TEXTAREA`, `[contenteditable]` селектор
  - ИЛИ есть active Vuetify overlay: `document.querySelector('.v-overlay--active')` (v-menu, v-dialog, date-picker — они имеют native Esc, не перебиваем)
  - ИЛИ `event.defaultPrevented` (другой handler уже обработал)
- `REQ-02` **`/` — focus search.** Открывает collapsible search bar (setSearchOpen) и focus'ит input. Prevent default чтобы `/` не попадал в строку. **Добавить `searchInputEl` template ref на `<v-text-field>` (FT-025 baseline не имеет — FT-029 introduces).** `await nextTick()` → focus: `searchInputEl.value?.focus?.()` (Vuetify `v-text-field` public API).
- `REQ-03` **`T` — today.** Вызывает `goToday()` (existing helper).
- `REQ-04` **`[` — prev range.** Anchor date ← anchorDate − rangeDays days. `]` — next range. Reuses existing `anchorDate` ref.
- `REQ-05` **`Esc` — close overlays.** Если search open с не-empty query — clear via `onSearchEscape` (existing FT-025 handler). Если search open c empty query — просто close (не clear). Если tooltip/contextMenu open — close.
- `REQ-06` **`?` — help overlay.** Открывает `v-dialog` с таблицей shortcuts + closeable via Esc. Content: 6 пар «key → action». **Layout-safe detection**: accept either `(event.code === 'Slash' && event.shiftKey)` (US-style) OR `event.key === '?'` (covers RU layout where `?` = Shift+7 with code `Digit7`). Fires on EITHER — no double-trigger because dialog already open on second attempt.
- `REQ-07` **Tooltip hints.** На existing toolbar buttons добавить kbd hint в `:title`: «Сегодня (T)», «Искать (/)» и т.д. Подсмотрено в Linear-style.
- `REQ-08` **i18n** — новые keys для help dialog title, caption, actions table + kbd labels.
- `REQ-09` **Accessibility.** Shortcuts не перехватывают клавиши когда active Vuetify overlay (`.v-overlay--active`). Help dialog role="dialog" + autofocus для close button + **focus возвращается на element что был focused до open** (через `document.activeElement` snapshot в open handler, restore в close).
- `REQ-10` **Tests** — unit для keyboard handler (simulate keydown event) + component для each shortcut + e2e для `/`, `T`, `Esc`.

### Non-Scope

- `NS-01` **`⌘K` / `Ctrl+K` command palette** (Linear-style) — большая фича, вне scope. Отдельный FT.
- `NS-02` **Arrow keys для focused-booking navigation** — требует selection state и focus ring; интереснее, но scope creep. Future.
- `NS-03` **`N` для new-reservation** — зависит от reservation form shell (FT-032). Defer.
- `NS-04` **Date picker shortcut (`⌘G` / jump)** — jump button имеет own modal, сокращения для него — отдельная UX. Phase 2.
- `NS-05` **Shortcuts вне Gantt** — остальные views (reservations list, tasks, settings). Другие FT по мере надобности.
- `NS-06` **Custom remapping** — user-configurable shortcuts. YAGNI для MVP.
- `NS-07` **Mac / PC modifier normalization** (`Cmd` vs `Ctrl`) — single-key shortcuts без modifiers, problem не возникает.

### Constraints / Assumptions

- `ASM-01` FT-028 merged (baseline 683 tests).
- `ASM-02` `goToday`, `anchorDate`, `onSearchEscape`, `searchOpen` — existing refs/functions в `GanttCalendarView`. **`searchInputEl` ref отсутствует в baseline (FT-025 uses `autofocus` на mount)** — добавляется как часть REQ-02 surface (template ref на `v-text-field`).
- `ASM-03` `v-dialog` поддерживает focus trap out-of-the-box.
- `CON-01` No new npm packages.
- `CON-02` No TypeScript.
- `CON-03` Coverage ratchet.
- `CON-04` No backend changes.
- `CON-05` Russian + English keyboard layouts: shortcuts работают по KeyboardEvent.code не event.key (e.g. `Slash` code for `/`, `BracketLeft` для `[`). Независимость от layout.

## How

### Solution

1. **Composable `useGanttShortcuts.js`** — new util. Принимает refs и handlers: `{ searchOpen, onOpenSearch, focusSearchInput, goToday, shiftRange, onSearchEscape, helpOpen }`. Attaches window listener, dispatches по event.code. Returns nothing side-effect-wise.
2. **`GanttCalendarView.vue`** — import composable, wire in `onMounted`. Add ref'ы для `helpOpen` + `searchInputEl`. Add `<v-dialog>` с shortcuts table.
3. **Locales** — new keys `calendar.gantt.shortcuts.{title, caption, keys.*}`.

**Trade-off — `event.code` over `event.key`.** Code = physical key position, layout-independent. Key = character after layout. Using `event.code` gives consistent UX across Russian + English layouts (`KeyT` fires whether user is in EN or RU mode). Downside: hint shows «/» universally but RU-layout users press the physical slash-position key (matches muscle memory anyway). Mitigation for `?`: accept both code+shift AND key==='?' per REQ-06, since Shift+7 on RU also produces `?`.

### Change Surface

| Surface | Type | Why |
|---|---|---|
| `frontend/src/composables/useGanttShortcuts.js` | code | New composable |
| `frontend/src/__tests__/composables/useGanttShortcuts.test.js` | code | Unit tests |
| `frontend/src/views/calendar/GanttCalendarView.vue` | code | Wire composable, add help dialog, add kbd hints to titles |
| `frontend/src/__tests__/views/calendar/GanttCalendarView.test.js` | code | Integration — keyboard triggers state changes |
| `frontend/e2e/calendar-overlap.spec.js` | code | E2e — press `/`, `T`, `Esc` |
| `frontend/src/locales/ru.json`, `en.json` | data | Shortcuts dialog + kbd hints |
| `memory-bank/domain/frontend.md` | doc | Mention shortcuts |
| `memory-bank/features/README.md` | doc | Register FT-029 |

### Flow

1. **Mount.** `useGanttShortcuts` attaches `window.addEventListener('keydown', handler)`.
2. **User presses `/`.** Handler checks target — `BODY`. Not input. Calls `onOpenSearch()` + `await nextTick` + focus input via ref. `preventDefault` — `/` doesn't land в focused input.
3. **`T`.** Handler calls `goToday()`.
4. **`[` / `]`.** Handler shifts `anchorDate.value = addDays(anchorDate.value, ∓rangeDays.value)`.
5. **`Esc`.** Cascades: help dialog → searchOpen+query → tooltip → contextMenu. First match takes action.
6. **`?` / `Shift+/`.** Opens help dialog. Display in table: `/`, `T`, `[`, `]`, `Esc`, `?`.
7. **Unmount.** Listener removed.

### Contracts

| Contract | I/O | Producer / Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `useGanttShortcuts({ ... })` → void (attaches + detaches lifecycle) | composable / CalendarView | Auto-cleanup on unmount |
| `CTR-02` | `window.keydown` handler — dispatches на event.code map | composable | Skips if target in `INPUT`, `TEXTAREA`, `[contenteditable]` |
| `CTR-03` | Help dialog `helpOpen: ref<boolean>` | CalendarView | Default false |

### Failure Modes

- `FM-01` User types в contenteditable element → handler ignores (target check).
- `FM-02` Multiple handlers in page (extension, browser) — `preventDefault` on our keys only; не blocks user-agent shortcuts (Ctrl+Tab, Cmd+R).
- `FM-03` Help dialog `?` while search open — dialog opens above search; Esc cascade closes dialog first.
- `FM-04` Unmount with help dialog open — listener removed; no stale handler.
- `FM-05` Layout-dependent `?` (Shift+`/` US vs Shift+`,` RU) — using `event.code === 'Slash'` normalizes.

### ADR Dependencies

Нет.

### Rollback

- `RB-01` Single squash commit revert. No state migrations, no API changes.

## Verify

### Exit Criteria

- `EC-01` Все `REQ-01..10` реализованы.
- `EC-02` `/`, `T`, `[`, `]`, `Esc`, `?` все работают.
- `EC-03` Shortcuts НЕ перехватываются когда focus в input.
- `EC-04` Help dialog открывается по `?` + closes по Esc.
- `EC-05` 683+ tests green. Coverage ratchet.
- `EC-06` CI green.
- `EC-07` i18n parity (+N keys each).
- `EC-08` Dark + light readable.

### Acceptance Scenarios

- `SC-01` **`/` opens search + focuses input.** Page loaded, no focus → press `/` → `searchOpen=true`, input focused, `/` не в input (preventDefault).
- `SC-02` **`T` goes to today.** Scroll away from today → press T → today marker centered.
- `SC-03` **`[` prev range, `]` next range.** At anchorDate=today, rangeDays=14 → `]` → anchorDate = today+14d.
- `SC-04` **`Esc` clears search with query.** Search open с `abc` → Esc → query cleared + bar collapsed (FT-025 behavior preserved).
- `SC-05` **`Esc` closes help dialog.** Help open → Esc → closed.
- `SC-06` **`?` opens help dialog.** `?` (Shift+`/`) → dialog with 6 shortcuts listed.
- `SC-07` **Input ignored.** Search bar open, focus in input → press `T` → T goes into input (not intercepted), no action.
- `SC-08` **Tooltip hints.** Hover «Сегодня» button → title «Сегодня (T)». Hover magnifier search button → «Найти гостя или юнит (/)». Только для shortcuts listed в этом FT (T, /, ?) — `[`, `]`, Esc не имеют dedicated toolbar buttons.

### Negative / Edge Cases

- `NEG-01` Handler vs typing in contextMenu list — list uses native focus, `Esc` closes menu (default v-menu behavior preserved).
- `NEG-02` `/` pressed while loading — action queued but no-op if no units yet.
- `NEG-03` Help dialog open while `[` pressed — ignored (dialog focus trap).
- `NEG-04` Caps Lock on — event.code unaffected (still `Slash`/`KeyT` etc).

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | `CTR-01,02`, `FM-01` | `SC-07` | `CHK-02` | `EVID-02` |
| `REQ-02` | | `SC-01` | `CHK-02,07` | `EVID-02,07` |
| `REQ-03` | | `SC-02` | `CHK-02,07` | `EVID-02,07` |
| `REQ-04` | | `SC-03` | `CHK-02` | `EVID-02` |
| `REQ-05` | | `SC-04,05` | `CHK-02,07` | `EVID-02,07` |
| `REQ-06` | `CTR-03` | `SC-05,06` | `CHK-02` | `EVID-02` |
| `REQ-07` | | `SC-08` | `CHK-02` | `EVID-02` |
| `REQ-08` | | — | `CHK-04` | `EVID-04` |
| `REQ-09` | | `SC-05` | `CHK-02` | `EVID-02` |
| `REQ-10` | | `EC-05` | `CHK-01,02,07` | `EVID-01,02,07` |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | `EC-05` | `yarn test:coverage` | ratchet met | `artifacts/ft-029/verify/chk-01/` |
| `CHK-02` | `REQ-01..07,09,10` + SCs/NEGs | `yarn test` | shortcut handler dispatches; input guard; Esc cascade | `artifacts/ft-029/verify/chk-02/` |
| `CHK-03` | `EC-01` | `git diff --stat` | minimal | `artifacts/ft-029/verify/chk-03/` |
| `CHK-04` | `REQ-08` | parity check | +N keys | `artifacts/ft-029/verify/chk-04/` |
| `CHK-05` | `EC-08` + `SC-06,08` | Manual QA screenshots: help dialog, tooltip hints | Both themes readable | `artifacts/ft-029/verify/chk-05/` |
| `CHK-06` | `EC-06` | markdownlint + CI | 0 errors, 5/5 | `artifacts/ft-029/verify/chk-06/` |
| `CHK-07` | `SC-01..05` | `yarn test:e2e` | `/` T Esc work end-to-end | `artifacts/ft-029/verify/chk-07/` |

### Evidence

- `EVID-01` Coverage.
- `EVID-02` Vitest log.
- `EVID-03` Git diff.
- `EVID-04` Locale parity.
- `EVID-05` Screenshots.
- `EVID-06` Lint + CI.
- `EVID-07` Playwright.

### Evidence contract

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-029/verify/chk-01/` |
| `EVID-02` | `yarn test` | `artifacts/ft-029/verify/chk-02/` |
| `EVID-03` | shell | `artifacts/ft-029/verify/chk-03/` |
| `EVID-04` | shell | `artifacts/ft-029/verify/chk-04/` |
| `EVID-05` | manual | `artifacts/ft-029/verify/chk-05/` |
| `EVID-06` | `markdownlint` + `gh` | `artifacts/ft-029/verify/chk-06/` |
| `EVID-07` | `yarn test:e2e` | `artifacts/ft-029/verify/chk-07/` |
