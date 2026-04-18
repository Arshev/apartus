---
title: "FT-036: Frontend Stack Migration — Vuetify 4 → PrimeVue 4 + Tailwind CSS"
doc_kind: feature
doc_function: canonical
purpose: "Epic migration from Vuetify 4 to PrimeVue 4 + Tailwind CSS 4 + Zod validation. AI-friendly stack, cleaner utility-based styling, explicit schema validation. Delivered in 8 phases on long-lived branch."
derived_from:
  - ../../domain/frontend.md
  - ../../domain/architecture.md
  - ../../engineering/design-style-guide.md
  - ../../../.impeccable.md
  - ../FT-026-design-refresh/feature.md
status: active
delivery_status: planned
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-036: Frontend Stack Migration

## What

### Problem

Frontend на Vuetify 4.0.4 имеет накопленные трения, часть из которых усиливается scale'ом:

1. **Opinionated theming** — `rgb(var(--v-theme-*))` token pattern verbose, layout-inject errors (v-app-bar/v-navigation-drawer) требуют test stub workarounds.
2. **Custom-CSS coupling** — FT-033 alignment bug показал: Vuetify defaults (Geologica font height) заставляют жестко задавать `--gantt-header-height`. Frame-of-reference drift.
3. **AI-coding friction** — Vuetify slots/activator magic, `return-object` edge cases, v-date-picker `multiple="range"` emit shape, per-version API churn. Tailwind utility-class code AI пишет на порядок точнее.
4. **Test stub maintenance** — `mountWithVuetify.js` содержит 22 stubs + per-component prop lists; каждый новый Vuetify component требует нового stub (FT-035 extended tests).
5. **Design system port challenge** — FT-026 investment (OKLCH palette, Geologica+Geist, tinted neutrals) завязан на `vuetify.js` + scoped styles. Хочется чистого Tailwind theme config + design tokens.

Кумулятивно: velocity на новых UI features ограничивается Vuetify-specific knowledge, а AI-assistance сильнее на Tailwind.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement |
|---|---|---|---|---|
| `MET-01` | Vuetify dependency in package.json | `vuetify ^4.0.4` | absent | `package.json` |
| `MET-02` | `@mdi/font` dependency | present | absent (PrimeIcons заменяет) | `package.json` |
| `MET-03` | New UI stack installed | — | `primevue@4`, `@primevue/themes@4`, `primeicons@7`, `tailwindcss@4`, `@tailwindcss/vite@4`, `zod@3`, `@primevue/forms@4` | `package.json` |
| `MET-04` | Test baseline preserved (final, post-P7) | 799/799, coverage 95.33% | tests ≥ 799, coverage ≥ 94% | `yarn test:coverage` |
| `MET-05` | All 8 phases delivered | 0/8 | 8/8 | feature/FT-036-stack-migration/phase-*.md |
| `MET-06` | Visual parity (key views) | screenshots pre-migration | no regression in Dashboard, Gantt, Reservations, Settings | Manual QA light+dark |
| `MET-07` | Build success | `yarn build` green | `yarn build` green после каждой phase | CI |
| `MET-08` | All i18n keys preserved | RU 483 / EN 483 | unchanged | JSON parity script |

### Scope

- `REQ-01` **Full Vuetify removal.** `vuetify` и `vite-plugin-vuetify` удалены из `package.json` и `vite.config.js`; нет ни одной `<v-*>` директивы в `src/**/*.vue`; `mountWithVuetify` test helper удалён или полностью переписан без Vuetify stubs.
- `REQ-02` **PrimeVue 4 как UI framework.** `primevue` + `@primevue/themes` + `primeicons` установлены. Aura preset настроен с portированными design tokens (OKLCH palette FT-026). Dark mode через PrimeVue `darkModeSelector` pattern.
- `REQ-03` **Tailwind CSS 4.** `tailwindcss@4` + `@tailwindcss/vite` installed. Theme config переносит:
  - OKLCH palette (primary green, status colors, surface tints)
  - fontFamily: display Geologica, body Geist, mono ui-monospace
  - extend spacing/radius под текущую design language
  - Dark mode через `class="dark"` на `<html>`
- `REQ-04` **Zod + @primevue/forms для validation.** Все form validation — через Zod schemas. PrimeVue `<Form>` component с Zod resolver (если форма non-trivial). Для trivial single-field — прямой `zod.parse()` в submit.
- `REQ-05` **Icons migration.** MDI icons (`mdi-*`) заменены PrimeIcons (`pi pi-*`). Gantt custom icons если есть — остаются.
- `REQ-06` **Design token port — layered.** `--font-display`, `--font-body`, `--font-mono` CSS vars сохраняются.
  - **PrimeVue Aura preset** owns: `primary` scale (50..950) derived from OKLCH green, `surface` scale, semantic `success/info/warn/danger` — via `definePreset`.
  - **Tailwind `@theme` в tailwind.css** owns: fontFamily, borderRadius, spacing extensions, AND все **non-Aura semantic tokens** (reservation `status-*`, task `priority-*`, finance `revenue/expense`) как plain CSS custom properties + utility classes.
  - `--gantt-header-height` и прочие Gantt pixel-math vars — **не трогаются** (не Vuetify-specific).
  - Aura cannot hold all 17 light + 17 dark tokens as primitives — это не его abstraction. Semantic tokens mapping: Aura-native (primary/surface/success/etc.) → `definePreset` override. Non-Aura (status/priority/finance) → Tailwind tokens.
- `REQ-07` **Test infrastructure.** Новый `mountWithPrimeVue.js` helper или — при возможности — mount компонентов unstubbed (PrimeVue не требует layout-inject). Vitest + @vue/test-utils остаются. Coverage ratchet сохраняется ≥ 94%.
- `REQ-08` **Phased delivery.** Migration выполняется в 8 phases (P0..P7), каждая — отдельный spec `phase-N-<name>.md` + отдельный review gate + commits на long-lived branch `feature/ft-036-stack-migration`. Final merge в main только после P7.
- `REQ-09` **Hybrid стадия разрешена.** Между P0 и P7 система может содержать mixed Vuetify + PrimeVue views. Это ожидаемо. Tests должны проходить в hybrid state.
- `REQ-10` **Gantt CSS preservation.** FT-020..034 custom pixel-math (lane positioning, today-marker, hatched patterns, heatmap tints) переносится **как есть** в new context. Gantt — наибольший visual regression risk.
- `REQ-11` **i18n untouched.** Keys, parity, vue-i18n plugin — не меняются. Migration не затрагивает translations.
- `REQ-12` **Pinia stores untouched.** Data layer (stores, api/, utils/) не меняется. Только view layer.
- `REQ-13` **Playwright e2e — skipped during migration, restored в P7.** 20 existing e2e specs в `frontend/e2e/` используют Vuetify-specific селекторы и будут ломаться incrementally с P1. Strategy: mark e2e suite skipped при старте P1 (CI e2e job → allowed-to-fail или skip list); restore + rewrite selectors в P7 против final PrimeVue DOM. Alternatively each phase может обновить свои e2e selectors — author's choice per-phase, документируется в phase spec.
- `REQ-14` **Coverage ratchet — relaxed during hybrid phases.** Baseline 95.33% / threshold 94%. P0, P1, P7 hold threshold ≥ 94%. **P2..P6 (hybrid phases) — relaxed threshold 92%** (temporary 2pp drop allowed during view-rewrite churn). Per-phase rule: coverage не должно упасть > 1pp vs tip of previous phase. P7 restores threshold to ≥ 94% (final MET-04).
- `REQ-15` **Visual QA protocol.** После P4 (Dashboard) и P5 (Gantt) — manual screenshot comparison light+dark. Regression = blocker на phase merge.

### Non-Scope

- `NS-01` **No TypeScript migration.** ADR-002 в силе — JavaScript только.
- `NS-02` **No backend changes.** API contracts unchanged.
- `NS-03` **No new features в рамках миграции.** Migration preserves существующий functionality. Bug fixes incidental — разрешены только если минимальны.
- `NS-04` **No design system redesign.** FT-026 palette/typography/hierarchy сохраняется. Это port, не refresh.
- `NS-05` **No state management change.** Pinia остаётся.
- `NS-06` **No routing change.** vue-router unchanged.
- `NS-07` **No i18n lib change.** vue-i18n unchanged.
- `NS-08` **No storybook introduction.** Отложено до post-migration.
- `NS-09` **No Gantt rewrite.** Gantt CSS/logic переносится as-is, не переписывается.
- `NS-10` **No Booking widget redesign.** BookingWidget — порт без functional changes.
- `NS-11` **No TypeScript-first validation adapter.** Zod JS-only, no `z.infer<>` usage.
- `NS-12` **No VeeValidate.** Evaluated, rejected в пользу @primevue/forms + Zod.

### Constraints / Assumptions

- `ASM-01` FT-035 merged (baseline 799 tests, coverage 95.33%, threshold 94%).
- `ASM-02` Vuetify 4 → PrimeVue 4 — оба shipped stable, active 2026.
- `ASM-03` Tailwind 4 + `@tailwindcss/vite` поддерживает наш Vite 7 setup.
- `ASM-04` PrimeVue Aura theme позволяет custom primitives для OKLCH palette.
- `ASM-05` Zod ≥ 3.22 работает с @primevue/forms resolver.
- `CON-01` No TypeScript (ADR-002).
- `CON-02` Solo developer → phased approach обязателен, no "big bang".
- `CON-03` Hybrid state (Vuetify + PrimeVue) должен быть work-able между phases.
- `CON-04` Long-lived branch `feature/ft-036-stack-migration` — final merge только после P7.
- `CON-05` Coverage ratchet ≥ 94% обязателен каждую phase.

## How

### Solution

**Phased migration on long-lived branch.** Vuetify и PrimeVue сосуществуют во время миграции; каждая phase переводит slice of views. Order максимизирует safety (foundation первой, риск-heavy Gantt ближе к концу).

### Phases

| Phase | Name | Scope | Specs |
|---|---|---|---|
| `PH-00` | Foundation | Install deps, Tailwind config с OKLCH port, PrimeVue Aura theme, Dark mode wiring, remove Vuetify autoImport (keep dep), new test mount helper, smoke test one trivial view converted | `phase-0-foundation.md` |
| `PH-01` | Layout & auth shell | `AppSidebar`, `AppTopbar`, `LoginView`, `SignupView` — чтобы user мог log in в PrimeVue-based shell | `phase-1-layout-auth.md` |
| `PH-02` | Simple CRUD | `PropertyForm/List`, `UnitForm/List`, `GuestForm/List`, `AmenityCatalog`, `BranchesTree` | `phase-2-simple-crud.md` |
| `PH-03` | Settings & members | `SettingsView`, member invites, role management | `phase-3-settings.md` |
| `PH-04` | Dashboard & reports | `DashboardView`, `ReportsView`, `ExpenseList`, `FinancesView`, `OwnerStatementView` | `phase-4-dashboard-reports.md` |
| `PH-05` | Gantt calendar | `GanttCalendarView`, `GanttTimeline/Row/Item/Tooltip/Header`, all FT-020..034 features | `phase-5-gantt.md` |
| `PH-06` | Reservations & booking widget | `ReservationFormView` (FT-035), `ReservationListView`, `BookingWidgetView` | `phase-6-reservations.md` |
| `PH-07` | Finalization | Remove Vuetify+MDI deps, clean vite.config, final Impeccable critique, docs update, coverage ratchet validate | `phase-7-finalization.md` |

Каждая phase spec — свой `feature.md`-style document в `memory-bank/features/FT-036-stack-migration/`, со своим REQ/NS/CHK/EVID blocks, своим reviewer pass, своим commit set.

### Change Surface (cumulative)

| Surface | Type | Phase |
|---|---|---|
| `frontend/package.json` | deps add/remove | P0, P7 |
| `frontend/vite.config.js` | Tailwind plugin add, Vuetify plugin remove | P0, P7 |
| `frontend/src/main.js` | PrimeVue install, Vuetify remove | P0, P7 |
| `frontend/src/plugins/vuetify.js` | deprecate/remove | P0, P7 |
| `frontend/src/plugins/primevue.js` | code (new) | P0 |
| `frontend/src/styles/tailwind.css` | new entrypoint | P0 |
| `frontend/src/styles/tailwind.css` | new (OKLCH palette port via `@theme`) | P0 |
| `frontend/src/__tests__/helpers/mountWithVuetify.js` | replace with mountWithPrimeVue or drop | P0 |
| `frontend/src/views/**` | progressive rewrite | P1..P6 |
| `frontend/src/components/**` | progressive rewrite | P1..P6 |
| `frontend/src/__tests__/**` | progressive rewrite | P1..P6 |
| `memory-bank/features/FT-036-stack-migration/phase-N-*.md` | new specs | each phase |
| `memory-bank/domain/frontend.md` | updated post-P7 | P7 |
| `memory-bank/engineering/design-style-guide.md` | updated post-P7 | P7 |

### Contracts

| Contract | I/O | Producer/Consumer | Notes |
|---|---|---|---|
| `CTR-01` | PrimeVue Aura preset: `primary` + `surface` scales + Aura-native semantic tokens (`success/info/warn/danger`) via `definePreset` with OKLCH-derived hex | plugin → app theme | Non-Aura tokens (status/priority/finance) живут в Tailwind `@theme` per REQ-06 |
| `CTR-02` | Tailwind theme config: colors, fontFamily, spacing | tailwind.config.js → utility classes | `@theme` directive в CSS entrypoint |
| `CTR-03` | Zod schema per form | form definition → submit handler | `schema.safeParse(data)` pattern |
| `CTR-04` | Dark mode toggle: `document.documentElement.classList.toggle('dark')` | theme store → DOM | Same class used by Tailwind + PrimeVue |

### Failure Modes

- `FM-01` **Hybrid state Vuetify+PrimeVue CSS conflicts** — Vuetify resets / defaults могут leak. Mitigation: in P0 isolate Vuetify CSS scope или preserve as-is and test each phase.
- `FM-02` **PrimeVue Aura palette incompatible с our OKLCH values** — Aura builds gradient scales. Mitigation: use `definePreset` с explicit primitives override.
- `FM-03` **Tailwind 4 config syntax drift from 3.x** — Tailwind 4 uses `@theme` в CSS not `tailwind.config.js`. Mitigation: следовать официальным docs, verify in P0.
- `FM-04` **Gantt pixel-math regression** — CSS cascade differs. Mitigation: P5 имеет dedicated QA protocol, visual parity screenshots.
- `FM-05` **Test stubs explosion в P0** — без layout-inject workarounds primitives могут работать напрямую, но некоторые случаи (overlay, menu) могут требовать stubs. Mitigation: try unstubbed first, add stubs минимально.
- `FM-06` **Zod schema переписывание** — existing `rules.required/minOne` inline rules переводятся в schemas. Some edge cases (async validation, cross-field) — проверить в P2.
- `FM-07` **i18n fallback в Zod error messages** — Zod default English messages. Mitigation: custom error map с i18n lookup.
- `FM-08` **Long-lived branch conflicts с main** — если main движется параллельно (hotfixes, docs), rebase затраты. Mitigation: **`git merge main` в migration branch в начале каждой phase**; hotfixes на main welcome но migration branch остаётся authoritative для frontend changes. Feature work на main — paused пока migration активна.

### Rollback

- `RB-01` Каждая phase = independent commit set. Any phase revertable via `git revert` (или branch reset перед merge).
- `RB-02` Full rollback = не мержить migration branch; оставить Vuetify состояние на main.
- `RB-03` Post-merge recovery: migration branch tagged перед final merge; can reset main to pre-migration SHA если catastrophic.

## Verify

### Exit Criteria

- `EC-01` Все 8 phases (P0..P7) delivered и merged в migration branch.
- `EC-02` `vuetify`, `vite-plugin-vuetify`, `@mdi/font` отсутствуют в `frontend/package.json`.
- `EC-03` Grep `<v-` в `frontend/src/**/*.vue` возвращает 0 результатов (за вычетом comments).
- `EC-04` `yarn test:coverage --run` — tests ≥ 799, coverage ≥ 94% (post-P7). Hybrid phases — per-phase threshold per REQ-14.
- `EC-05` **Post-P7** `yarn build` — success, production bundle размер не вырос > 15% vs baseline. Hybrid phases (P0..P6) — bundle size logged только информативно (будет больше из-за dual stack, не blocker).
- `EC-06` CI на migration branch зелёный перед final merge.
- `EC-07` Manual QA после P5 и P6 подтверждает visual parity.
- `EC-08` i18n parity сохранена (RU 483 / EN 483).
- `EC-09` Migration branch merged в main через одиночный squash PR.
- `EC-10` `memory-bank/domain/frontend.md` + `engineering/design-style-guide.md` updated под новый стек.

### Acceptance Scenarios (high-level, detailed SC per phase)

- `SC-01` **End-to-end flow after migration.** User логинится → navigates Gantt → creates reservation → edits → receives email confirmation — всё работает без errors.
- `SC-02` **Dark mode parity.** Theme toggle работает на всех views; PrimeVue `p-dark` class + Tailwind `dark:` utilities консистентны.
- `SC-03` **Non-RUB currency rendering.** Switch to USD в Settings → Dashboard, Gantt, Reservation forms показывают `$`, Booking widget тоже.
- `SC-04` **No Vuetify residue.** `rgb(var(--v-theme-*))` не используется нигде в scoped styles.

### Traceability matrix

| REQ | Phase | Checks | EVID |
|---|---|---|---|
| `REQ-01` | P7 | grep verification + package.json diff | manual |
| `REQ-02` | P0, enforced through P7 | PrimeVue Aura preset import verified | build |
| `REQ-03` | P0, refined through P7 | Tailwind config + utility classes usage | build |
| `REQ-04` | P2+ (first forms) | Zod schema per form present | code review |
| `REQ-05` | P0..P6 | grep `mdi-` → 0 | grep |
| `REQ-06` | P0 | OKLCH palette tests identical visual rendering | QA |
| `REQ-07` | P0, refined each phase | mountWithPrimeVue helper + tests green | test suite |
| `REQ-08` | — | 8 phase specs written, each reviewed | memory-bank |
| `REQ-09` | P1..P6 | each phase end: full suite green in hybrid state | test suite |
| `REQ-10` | P5 | Gantt visual parity screenshots | QA |
| `REQ-11` | — | i18n parity script | JSON diff |
| `REQ-12` | — | git diff `src/stores/ src/api/ src/utils/` minimal | git |
| `REQ-13` | P6 | e2e tests green | playwright |
| `REQ-14` | each phase | `yarn test:coverage` meets threshold | coverage |
| `REQ-15` | P4, P5 | manual QA protocol executed | screenshots |

### Checks (meta, per-phase checks in phase specs)

| CHK | Covers | How | Expected |
|---|---|---|---|
| `CHK-01` | `EC-01..03` | `git log` phases count; grep Vuetify residue | 8 commits + 0 residue |
| `CHK-02` | `EC-04` | `yarn test:coverage --run` | 799+ / ≥ 94% |
| `CHK-03` | `EC-05` | `yarn build` | success; bundle stat |
| `CHK-04` | `EC-07` | manual screenshots comparison | no regression |
| `CHK-05` | `EC-08` | i18n parity script | RU = EN keys |
| `CHK-06` | `EC-06` | CI on migration branch | all green |

### Evidence contract

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | per-phase tests | `artifacts/ft-036/phase-N/` |
| `EVID-02` | manual QA screenshots | `artifacts/ft-036/qa/` |
| `EVID-03` | bundle size comparison | `artifacts/ft-036/bundle/` |
| `EVID-04` | final CI link | PR body |
