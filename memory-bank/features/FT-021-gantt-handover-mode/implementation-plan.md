---
title: "FT-021: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации FT-021 Gantt Handover Mode. Discovery context, шаги, риски. Не переопределяет canonical scope/architecture/AC из feature.md."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_021_scope
  - ft_021_architecture
  - ft_021_acceptance_criteria
  - ft_021_blocker_state
---

# План имплементации

## Цель текущего плана

Добавить в существующий Gantt calendar (FT-020 merged) toolbar-toggle для handover mode — подсветки reservations с check-in/out в bracket ±1 day от сегодня. Без backend-изменений, без новых npm-пакетов. Feature-пакет закрывается одним PR.

## Current State / Reference Points

FT-020 Phase 1 уже доставлена — все Gantt-компоненты и утилиты существуют. FT-021 расширяет их, не создаёт новых файлов кроме одного спека.

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| [`frontend/src/utils/gantt.js`](../../../frontend/src/utils/gantt.js) | Pure Gantt math (`dateToPixel`, `bookingWidth`, `generateTopLevelDates`, `generateBottomLevelDates`, `assignLanes`) | Добавляем `getHandoverType(booking, today)` по паттерну остальных pure functions | Экспорт как named export, JSDoc |
| [`frontend/src/utils/date.js`](../../../frontend/src/utils/date.js) | `parseIsoDate`, `startOfDay`, `addDays`, etc. | `getHandoverType` использует `parseIsoDate` + `startOfDay` | Reuse, не дублировать |
| [`frontend/src/views/calendar/GanttTimelineItem.vue`](../../../frontend/src/views/calendar/GanttTimelineItem.vue) | Bar render + click/contextmenu/hover emits; computed `itemStyle`, `label` | Добавляется prop `specialMode`, computed `handoverType`, новые классы + icon marker | Мimic existing computed-classes pattern |
| [`frontend/src/views/calendar/GanttTimelineRow.vue`](../../../frontend/src/views/calendar/GanttTimelineRow.vue) | Per-unit row, parses reservations, `assignLanes`, прокидывает emits | Добавляется prop `specialMode`, прокидывается в item | Passthrough only |
| [`frontend/src/views/calendar/GanttTimeline.vue`](../../../frontend/src/views/calendar/GanttTimeline.vue) | Viewport, pixelsPerMs, header + rows orchestration, today marker | Добавляется prop `specialMode`, прокидывается в rows | Passthrough only |
| [`frontend/src/views/calendar/GanttCalendarView.vue`](../../../frontend/src/views/calendar/GanttCalendarView.vue) | Entry component, toolbar, range state, localStorage, reservation actions | Добавляется reactive `specialMode`, toolbar-кнопка, persistence в localStorage, prop в Timeline | См. existing `rangeDays` pattern |
| [`frontend/src/locales/ru.json`](../../../frontend/src/locales/ru.json), [`en.json`](../../../frontend/src/locales/en.json) | `calendar.gantt.*` namespace | Добавляем `calendar.gantt.modes.handover` (toolbar label) и `calendar.gantt.handoverMarkers.{checkinToday,...}` если нужны accessible labels | Mirrored структура ru/en |
| [`frontend/src/__tests__/utils/gantt.test.js`](../../../frontend/src/__tests__/utils/gantt.test.js) | Unit-tests для утилит | Добавляется describe-блок для `getHandoverType` | Pattern from existing tests |
| [`frontend/src/__tests__/views/calendar/GanttTimelineItem.test.js`](../../../frontend/src/__tests__/views/calendar/GanttTimelineItem.test.js) | Item component tests | Добавляются кейсы `specialMode='handover'` с разными handoverTypes | Extend existing setup |
| [`frontend/src/__tests__/views/calendar/GanttTimelineRow.test.js`](../../../frontend/src/__tests__/views/calendar/GanttTimelineRow.test.js) | Row tests | Prop passthrough через stub | Extend |
| [`frontend/src/__tests__/views/calendar/GanttCalendarView.test.js`](../../../frontend/src/__tests__/views/calendar/GanttCalendarView.test.js) | Orchestration tests | Toggle + localStorage roundtrip + unknown-value guard | Extend |
| [`frontend/e2e/calendar-overlap.spec.js`](../../../frontend/e2e/calendar-overlap.spec.js) | 3 e2e assertions (render, today marker, date picker) | Добавляется 4-й тест — toggle handover, assert `.gantt-item--handover-*` class appears | Extend same spec, keep existing 3 |

## Test Strategy

| Test surface | Canonical refs | Existing coverage (FT-020) | Planned FT-021 coverage | Required local / CI | Manual-only gap | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `utils/gantt.js#getHandoverType` | `CTR-01`, `REQ-02`, `CHK-02` | N/A (new function) | Unit — 5-branch matrix (each type + null), + edge cases: `null` guest_name OK, `cancelled`/`checked_out` → null, invalid ISO date → null | `yarn test src/__tests__/utils/gantt.test.js` | — | — |
| `GanttTimelineItem.vue` handover styling | `REQ-03`, `CHK-02,05` | Render + status-color + click/contextmenu | Extend: `specialMode='handover'` → handoverType class; icon marker DOM (pointer-events: none); dimmed when null | `yarn test src/__tests__/views/calendar/GanttTimelineItem.test.js` | — | — |
| Prop passthrough (Timeline → Row → Item) | `REQ-04`, `CHK-02` | N/A | Test stub-based — passthrough-check через `specialMode` prop in each boundary | `yarn test src/__tests__/views/calendar/` | — | — |
| `GanttCalendarView.vue` toggle + persistence | `REQ-05,06`, `CTR-02`, `CHK-02` | localStorage round-trip для rangeDays | Toggle specialMode via exposed method; persist в localStorage; invalid value → `''` fallback; backwards-compat (payload без specialMode) | `yarn test src/__tests__/views/calendar/GanttCalendarView.test.js` | — | — |
| i18n keys parity | `REQ-07`, `CHK-04` | ru == en (430 keys) | После FT-021: ru == en с новыми ключами | `node script` сравнение keysets (existing pattern) | — | — |
| E2e handover activation | `SC-01..04`, `CHK-07` | Render, today marker, date picker | Extend spec: click toggle → assert `.gantt-item` с `.gantt-item--handover-*` или `.gantt-item--dimmed` классами присутствуют | `yarn test:e2e e2e/calendar-overlap.spec.js` | — | — |
| Dark + light mode visual | `REQ-08`, `NEG-06`, `CHK-05` | QA report + screenshots (FT-020 chk-05) | Тот же pattern — активация handover + скриншоты в обоих themes | Manual QA (dev server) | Pixel comparison не оправдан для single mode | `AG-02` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default / escalation |
| --- | --- | --- | --- | --- |
| `OQ-01` | Нужен ли `calendar.gantt.handoverMarkers.*` в locales (tooltip текст на иконке ↗/↙)? Или Unicode символа достаточно без `aria-label`? | Accessibility — screen readers произносят Unicode arrow как «north east arrow», что непонятно пользователю. | `STEP-05` (i18n) | Default: добавить `aria-label` через `calendar.gantt.handoverMarkers.checkinToday` etc. (4 ключа), используется как `title` на span. Если a11y-audit не проводится — можно опустить. |
| `OQ-02` | Icon как `<span>↗</span>` vs `<v-icon>mdi-arrow-up-right</v-icon>`? | Unicode — 1 line, mdi — Vuetify-native. | `STEP-03` (Item styling) | Default: Unicode — проще, не добавляет зависимость от MDI, рендерится в jsdom (проверено в rentprog паттерне). Escalate если контраст недостаточен. |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup (frontend) | `cd frontend && yarn install`, node 22 | all steps | `yarn test` fails with module resolution |
| setup (backend for e2e) | `cd backend && bin/rails s -p 3000` + seed | `STEP-09` | e2e timeout / 401 |
| test (vitest) | `yarn test [path]` | `STEP-02, 04, 05, 07, 08` | test failures |
| test (e2e) | `yarn test:e2e [spec]` | `STEP-09` | Playwright failures |
| dev preview | `yarn dev` — для `STEP-10` manual QA | `STEP-10` | — |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `feature.md / status: active` | FT-021 feature.md в `status: active`, `delivery_status: not_started` | All | yes |
| `PRE-02` | `ASM-01` | FT-020 Phase 1 merged в main — все Gantt компоненты + utils существуют | All | yes |
| `PRE-03` | `ASM-02` | Reservation model stable — check_in/out date, status enum без изменений | `STEP-02, 04` | yes |
| `PRE-04` | `CON-01` | `parseIsoDate` и `startOfDay` доступны из `utils/date.js` | `STEP-02` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-1` | `REQ-02`, `CTR-01` | `getHandoverType` pure function + tests | agent | `PRE-01..04` |
| `WS-2` | `REQ-03`, `REQ-04` | Item styling + prop propagation через Timeline/Row | agent | `WS-1` |
| `WS-3` | `REQ-01,05,06`, `CTR-02,03` | Toolbar toggle + localStorage + tests | agent | `WS-2` |
| `WS-4` | `REQ-07` | i18n keys | agent | после `WS-3` (или параллельно) |
| `WS-5` | `REQ-09` (e2e часть), `CHK-07` | Playwright assertion | agent | `WS-3` merged на локальном level |
| `WS-6` | Docs, backlog update | Docs consistent | agent | после `WS-5` |

## Approval Gates

> AG-* — процедурные approval gates плана реализации (escalation points при отклонении от плана). Они не переопределяют AC из sibling feature.md — canonical scope/budget gates остаются за ней.

| AG ID | Trigger | Applies to | Why approval required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | Перед PR merge | full PR | Визуальная корректность handover borders + icons в light + dark mode нельзя automated | User approval в PR review + скриншоты в `artifacts/ft-021/verify/chk-05/` |
| `AG-02` | Если в процессе обнаружится необходимость npm | `STEP-03` если Unicode icons не рендерятся корректно | Добавление MDI icons требует `@mdi/font` — уже есть в deps. Escalate только если нужен другой пакет. | User approval |
| `AG-03` | Если требуется backend change | любой STEP | Feature декларирует no-schema-changes | User approval + обновление feature.md `CON-04` |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command | Blocked by | Approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `PRE-04` | Грounding: sanity-check что `startOfDay` и `parseIsoDate` доступны в `utils/date.js` и работают как документировано в FT-020 | Read `utils/date.js` | note в плане | n/a | n/a | `node -e "import('./src/utils/date.js').then(m => console.log(typeof m.startOfDay, typeof m.parseIsoDate))"` | `PRE-01..04` | none | Отсутствие функции → `AG-03` (backend-расширение не нужно, но это структурный блокер) |
| `STEP-02` | agent | `REQ-02`, `CTR-01` | Добавить `getHandoverType(booking, today)` в `utils/gantt.js` | `utils/gantt.js` (extend) | Function + JSDoc | `CHK-02` | `EVID-02` | `yarn test src/__tests__/utils/gantt.test.js` | `STEP-01` | none | Функция не pure (зависит от внешнего состояния) — redesign |
| `STEP-03` | agent | `REQ-02`, test strategy utils-row | Unit-тесты для `getHandoverType` — 5-branch matrix + edge cases | `__tests__/utils/gantt.test.js` (extend) | Tests | `CHK-02` | `EVID-02` | `yarn test src/__tests__/utils/gantt.test.js` | `STEP-02` | none | — |
| `STEP-04a` | agent | `REQ-03`, `CTR-03` (Item part) | `GanttTimelineItem.vue`: prop `specialMode`, computed `handoverType`, классы + icon marker span (pointer-events: none) | `views/calendar/GanttTimelineItem.vue` | Styled bar | `CHK-02` | `EVID-02` | `yarn test src/__tests__/views/calendar/GanttTimelineItem.test.js` | `STEP-03` | none | `SC-07` ломается (клик перехватывается иконкой) — добавить `pointer-events: none` |
| `STEP-04b` | agent | `REQ-04` (Row passthrough) | `GanttTimelineRow.vue`: принимает prop `specialMode`, прокидывает в Item | `views/calendar/GanttTimelineRow.vue` | Passthrough | `CHK-02` | `EVID-02` | `yarn test src/__tests__/views/calendar/GanttTimelineRow.test.js` | `STEP-04a` | none | — |
| `STEP-04c` | agent | `REQ-04` (Timeline passthrough) | `GanttTimeline.vue`: принимает prop `specialMode`, прокидывает в Row | `views/calendar/GanttTimeline.vue` | Passthrough | `CHK-02` | `EVID-02` | `yarn test src/__tests__/views/calendar/GanttTimeline.test.js` | `STEP-04b` | none | — |
| `STEP-05` | agent | `REQ-07`, `OQ-01` | Добавить в ru.json + en.json: `calendar.gantt.modes.handover` (toolbar label). **По умолчанию — действовать по OQ-01 default** (добавить `calendar.gantt.handoverMarkers.{checkinToday,checkinTomorrow,checkoutToday,checkoutTomorrow}` для aria-label). Escalation только если пользователь явно указал "без a11y" ДО начала этого STEP. | `locales/ru.json`, `en.json` | Keys | `CHK-04` | `EVID-04` | `node` script сравнение keysets (ru == en), grep на новые ключи | `STEP-02` (OQ-01 resolved via default) | none | Если keys conflict с existing namespace — rename |
| `STEP-06` | agent | `REQ-03,04` tests | Component tests для Item: все 5 handoverTypes → классы рендерятся корректно. Row/Timeline passthrough tests (stub-based). | `__tests__/views/calendar/GanttTimelineItem.test.js`, `GanttTimelineRow.test.js`, `GanttTimeline.test.js` | Tests | `CHK-02` | `EVID-02` | `yarn test src/__tests__/views/calendar/` | `STEP-04c` | none | — |
| `STEP-07` | agent | `REQ-01,05,06`, `CTR-02`, `ER-02` mitigation | `GanttCalendarView.vue`: reactive `specialMode`, `toggleHandover` function, `v-btn` в toolbar с `:color="specialMode === 'handover' ? 'primary' : undefined"` **и `:variant="specialMode === 'handover' ? 'elevated' : 'text'"` (mitigates `ER-02` — видимость active state в dark mode)**, localStorage read/write с backward-compat + unknown-value guard (`validModes.includes(stored) ? stored : ''`), prop в `GanttTimeline` | `views/calendar/GanttCalendarView.vue` | Toggle + persistence | `CHK-02` | `EVID-02` | `yarn test src/__tests__/views/calendar/GanttCalendarView.test.js` | `STEP-04c, 05` | none | — |
| `STEP-08` | agent | `REQ-01,05,06` tests, `NEG-03` | Extend `GanttCalendarView.test.js`: (a) toggle state change, (b) localStorage round-trip с `specialMode`, (c) **backward-compat test — legacy payload `{rangeDays:14}` без specialMode → specialMode resolves to `''` без exception**, (d) invalid value `{specialMode:'invalid'}` → `''` fallback, (e) prop passed to Timeline stub | `__tests__/views/calendar/GanttCalendarView.test.js` | Tests | `CHK-02` | `EVID-02` | `yarn test src/__tests__/views/calendar/GanttCalendarView.test.js` | `STEP-07` | none | — |
| `STEP-09` | agent | `REQ-09` (e2e), `CHK-07`, `SC-01..04` | Extend `e2e/calendar-overlap.spec.js`: 4-й тест — click handover button, assert появляются `.gantt-item--handover-*` или `.gantt-item--dimmed` классы в DOM | `e2e/calendar-overlap.spec.js` | Playwright assertions | `CHK-07` | `EVID-07` | `yarn test:e2e e2e/calendar-overlap.spec.js` | `STEP-07` | none | Flaky → `STOP-01` |
| `STEP-10` | agent (with `AG-01`) | `CHK-05`, `NEG-06` | Manual QA: start `yarn dev`, login, `/calendar`, toggle handover. Скриншоты light + dark mode в `artifacts/ft-021/verify/chk-05/`. QA report: SC-01..04, NEG-06. | `artifacts/ft-021/verify/chk-05/` (3 screenshots + qa-report.md) | Evidence | `CHK-05` | `EVID-05` | dev server + manual checklist | `STEP-09` | `AG-01` | Визуальный дефект → fix или escalate |
| `STEP-11` | agent | full gate | Full test suite + build + markdownlint. Evidence collection в `artifacts/ft-021/verify/chk-{01,02,04,06}/`. | n/a | Green status | `CHK-01, 02, 04, 06` | `EVID-01, 02, 04, 06` | `yarn test && yarn build && cd .. && npx markdownlint-cli2 "**/*.md"` | `STEP-10` | none | Coverage drop → add tests |
| `STEP-12` | agent | `REQ-09` docs часть, `FT-020 NS-02` footnote | Update `memory-bank/domain/frontend.md` Calendar section (добавить subsection Handover mode). **Footnote у FT-020 `NS-02` — использовать markdown footnote syntax: `NS-02 ... deferred.[^ft-021]` + в конце секции Non-Scope `[^ft-021]: See FT-021 for Phase 1 handover implementation.`**. Не переписывать существующий NS-02 текст. | `domain/frontend.md`, `features/FT-020-gantt-calendar/feature.md` (append-only footnote) | Updated docs | `CHK-06` | `EVID-06` | `markdownlint` | `STEP-07` | none | — |
| `STEP-13` | agent (with `AG-01`) | feature closure | **Последний commit в PR перед merge** — frontmatter flip `feature.md delivery_status: not_started → done` + `features/README.md` reflects → push → CI green → `AG-01` approved → squash merge. | `feature.md` frontmatter, `features/README.md` (один commit) | Closure | All CHK | All EVID | Manual review + merge | `STEP-10..12` | `AG-01` | Хоть один CHK не закрыт → не мержить |

## Parallelizable Work

- `PAR-01` `STEP-05` (i18n keys) можно делать параллельно с `STEP-06..08` (component tests/toggle).
- `PAR-02` `STEP-12` (docs) можно делать параллельно с `STEP-09..11` после `STEP-07`.
- `PAR-03` `STEP-10` manual QA не параллелится — требует всё reverted green.

## Checkpoints

| CP ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01..03`, `CHK-02` | `getHandoverType` + tests зелёные | `EVID-02` |
| `CP-02` | `STEP-04a,04b,04c,06`, `CHK-02` | Item styling + Row/Timeline prop passthrough + component tests зелёные | `EVID-02` |
| `CP-03` | `STEP-07..08`, `CHK-02` | CalendarView toggle + persistence + tests зелёные | `EVID-02` |
| `CP-04` | `STEP-09`, `CHK-07` | E2e handover test passes | `EVID-07` |
| `CP-05` | `STEP-10..12`, `AG-01`, `CHK-01,04,05,06` | Manual QA + docs + lint + evidence complete | `EVID-01,04,05,06` |
| `CP-06` | `STEP-13`, all CHK | Closure | all EVID |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | `today` vs `check_in` timezone edge в e2e (e2e dev Rails + seed reservations с прошлыми/будущими датами) | Handover mode не подсвечивает ожидаемые reservations | Seed расширен / использование relative-date в e2e (`addDays(today, 0/1)`) | `STEP-09` — seed не содержит reservations с check_in=today |
| `ER-02` | Vuetify `<v-btn>` с `:color="undefined"` визуально не отличается от активной в dark mode | UX — пользователь не видит active state | Use explicit `:variant="specialMode === 'handover' ? 'elevated' : 'text'"` | `STEP-10` manual QA mismatch |
| `ER-03` | Icon Unicode рендерится лесенкой или обрезается в узких барах | Визуальный дефект | `pointer-events: none` + absolute-positioning либо скрыть при width < X | `STEP-10` manual QA |
| `ER-04` | localStorage corruption приводит к `specialMode: 'invalid'` которое обходит guard | chip random-активна | Guard: `validModes.includes(stored) ? stored : ''` | Unit test NEG-03 |

## Stop Conditions

| STOP ID | Related refs | Trigger | Immediate action | Safe fallback |
| --- | --- | --- | --- | --- |
| `STOP-01` | `CHK-07`, `ER-01` | E2e fails 3 retries | Упростить assertion — просто check что toolbar button toggleable (без проверки класса bars). Open follow-up issue. | Reduced e2e с toolbar-only |
| `STOP-02` | `AG-01` | Пользователь не одобряет merge после manual QA | Доработка по фидбеку, повторный QA | Pre-merge branch state |
| `STOP-03` | `AG-03` | Обнаружено required backend change | Halt, обновить `feature.md` `CON-04` → упомянуть требование, reopen scope | Plan на паузе |

## Готово для приемки

План исчерпан когда:

- Все `STEP-01..13` пройдены
- Все `CP-01..06` achieved
- Все `CHK-01..07` имеют evidence
- `feature.md` в `delivery_status: done`
- PR merged (AG-01 given)
- CI green
