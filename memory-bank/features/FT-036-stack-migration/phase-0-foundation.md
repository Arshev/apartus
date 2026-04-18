---
title: "FT-036 P0: Foundation"
doc_kind: feature
doc_function: phase
purpose: "Install PrimeVue 4 + Tailwind 4 + Zod stack; port OKLCH design tokens и fonts; remove Vuetify autoImport (keep dep temporarily for hybrid phases); smoke-convert one trivial view; verify baseline holds."
derived_from:
  - ./feature.md
  - ../FT-026-design-refresh/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-036 P0: Foundation

## What

### Problem

Migration требует работающей новой стека до того, как views будут портироваться. P0 = foundation layer: deps installed, theme ported, test helper готов, один trivial view (PlaceholderView) переведён как smoke test. Без P0 — каждая последующая phase will re-invent setup.

### Outcome

| Metric ID | Metric | Target | Measurement |
|---|---|---|---|
| `MET-01` | PrimeVue + Tailwind + Zod deps installed | all 7 packages in package.json | `cat package.json` |
| `MET-02` | OKLCH palette ported to Tailwind theme + PrimeVue preset | color token parity light+dark | visual comparison |
| `MET-03` | Fonts preserved | `--font-display/body/mono` CSS vars unchanged | grep |
| `MET-04` | Dark mode toggles via `class="dark"` on `<html>` | works in smoke view | manual |
| `MET-05` | Test helper works | `mountWithPrimeVue` or unstubbed mount passes | vitest green |
| `MET-06` | Test baseline preserved | 799+ tests green, coverage ≥ 94% | `yarn test:coverage` |
| `MET-07` | Build green | `yarn build` success | CI |
| `MET-08` | Smoke view converted | `PlaceholderView` uses PrimeVue + Tailwind | code review |

### Scope

- `REQ-01` **Install new stack deps.** Via `yarn add`:
  - `primevue@^4` `@primevue/themes@^4` `primeicons@^7`
  - `tailwindcss@^4` `@tailwindcss/vite@^4`
  - `zod@^3` `@primevue/forms@^4`
- `REQ-02` **Keep Vuetify installed.** Do NOT remove `vuetify` or `vite-plugin-vuetify` в P0 — hybrid state (P1..P6). Remove in P7.
- `REQ-03` **Tailwind 4 configuration — CSS-first `@theme` (no `tailwind.config.js`).** Create `frontend/src/styles/tailwind.css` entrypoint:
  - `@layer tailwind, primevue, vuetify, scoped;` (top-line layer declaration, before all imports — controls cascade order)
  - `@import "tailwindcss"`
  - `@import "primeicons/primeicons.css"`
  - `@theme` block с colors (OKLCH palette port — все non-Aura semantic tokens: status-*, priority-*, finance-*), fontFamily (display Geologica, body Geist, mono ui-monospace), borderRadius extensions
  - Dark mode variant via `@custom-variant dark (&:where(.dark, .dark *))` — Tailwind v4 CSS-first dark mode
  - No `tailwind.config.js` file generated (Tailwind 4 recommends CSS-first).
- `REQ-04` **Vite plugin.** Add `@tailwindcss/vite` plugin в `vite.config.js` — pragmatic Tailwind v4 pattern. Keep `vite-plugin-vuetify` сосуществует.
- `REQ-05` **PrimeVue plugin.** Create `frontend/src/plugins/primevue.js` exporting configured PrimeVue with:
  - Aura theme preset from `@primevue/themes/aura`
  - Custom primitives override: `primary-color` = OKLCH green (light/dark variants), surface scale tinted greens
  - `darkModeSelector: '.dark'` — same class as Tailwind
  - `cssLayer: { name: 'primevue', order: 'tailwind, primevue' }` для layer ordering
  - Ripple disabled (match Tailwind-first aesthetic, Vuetify ripple хоть был включён — не критично)
- `REQ-06` **Main.js integration.** `app.use(PrimeVue, primevueConfig)`, import tailwind.css, keep Vuetify install in hybrid period. Import order: tailwind.css → primevue plugin → vuetify plugin (layer cascade: tailwind → primevue → vuetify → scoped).
- `REQ-07` **Dark mode toggle — wired в P0 (no deferral).** Existing Vuetify theme toggle (currently calls `vuetify.theme.global.name.value = 'apartusDark'`) extended для одновременного toggle `document.documentElement.classList.toggle('dark', isDark)`. Это активирует Tailwind `dark:*` utilities + PrimeVue `darkModeSelector: '.dark'` + сохраняет Vuetify theme для hybrid views. Location: theme toggle composable/store (grep `apartusDark` для найти). Rationale: без этого SC-04 не проходит; PrimeVue views не reagировали бы на toggle.
- `REQ-08` **Test helper with upfront stub strategy.** Create `frontend/src/__tests__/helpers/mountWithPrimeVue.js`:
  - Plugins: `[pinia, router, i18n, PrimeVue]` (real PrimeVue plugin, not stubbed)
  - `attachTo: document.body` для teleport-based components
  - **Stubbed by default** (jsdom не имеет layout, PrimeVue overlays position via `getBoundingClientRect`):
    - `Menu`, `OverlayPanel`, `Popover`, `ConfirmDialog`, `Dialog`, `Toast`, `ConfirmPopup`, `DatePicker` (popup), `AutoComplete` (dropdown), `Select` (dropdown), `MultiSelect`, `Drawer`
    - Stubs используют pass-through templates + emit through activator slot (mirror to mountWithVuetify v-menu pattern)
  - **Real components (unstubbed):** `Button`, `InputText`, `InputNumber`, `Textarea`, `Checkbox`, `RadioButton`, `Card`, `Divider`, `ProgressBar`, plain layout
  - Keep existing `mountWithVuetify` working для hybrid tests.
- `REQ-09` **Smoke conversion + interaction validators.** Convert `src/views/PlaceholderView.vue` to PrimeVue + Tailwind. Include:
  - One PrimeVue `Button` (validates primary color from Aura preset)
  - One PrimeVue `InputText` (validates form primitive + Tailwind dark: class on focus ring)
  - One Tailwind utility-styled `<div>` с OKLCH surface color (validates Tailwind `@theme` connection)
  - Dark mode toggle button calling `classList.toggle('dark')` (validates SC-04)
  - Optional: one Zod schema `safeParse()` call on input change (validates Zod import path)
  Test passes с `mountWithPrimeVue`. Demonstrates end-to-end pipeline works.
- `REQ-10` **Font preservation.** `--font-display`, `--font-body`, `--font-mono` CSS vars в styles остаются unchanged. Tailwind `fontFamily.display/body/mono` reads from these vars.
- `REQ-11` **Icons + MDI inventory.** PrimeIcons installed, `primeicons/primeicons.css` imported через tailwind.css. MDI icons НЕ удаляются в P0 (used в Vuetify views). Migration per-view в P1..P6. **P0 artifact: `artifacts/ft-036/phase-0/mdi-inventory.txt`** — `git grep -nc "mdi-" src/` capture as baseline count; каждая phase записывает delta.
- `REQ-12` **Coverage ratchet — P0 strict.** After P0 `yarn test:coverage` ≥ 94% (baseline preserved). P0 converts только PlaceholderView — marginal impact on coverage. Per epic REQ-14, hybrid phases P2..P6 relaxed, P0/P1/P7 strict.
- `REQ-13` **Build sanity.** `yarn build` success. Bundle size change recorded (will grow temporarily due to dual stack).
- `REQ-14` **Atomic commits.** P0 delivered как serie of atomic commits (one logical change per commit) on migration branch. Exact sequence/count — determined в implementation-plan.md (не в spec per `must_not_define: implementation_sequence`).

### Non-Scope

- `NS-01` Convert any view beyond `PlaceholderView` — per P1..P6.
- `NS-02` Remove Vuetify dep — P7 only.
- `NS-03` Rewrite existing tests — happens в each phase views converted.
- `NS-04` Touch Gantt — P5.
- `NS-05` Touch Impeccable design critique — post-P7.
- `NS-06` Upgrade Vue/Vite major versions — not in scope.

### Constraints / Assumptions

- `ASM-01` Node/Yarn works for new deps install.
- `ASM-02` Tailwind 4 + `@tailwindcss/vite` compatible с Vite 7.
- `ASM-03` PrimeVue Aura preset поддерживает custom primitives (`definePreset` API).
- `ASM-04` `cssLayer` config ensures Tailwind utilities can override PrimeVue component styles без `!important`.
- `ASM-05` `PlaceholderView.vue` уже существует (проверено в FT-026).
- `CON-01` No TS.
- `CON-02` No new env vars.
- `CON-03` Backend untouched.

## How

### Solution

1. **Dep install** одним `yarn add` command.
2. **Tailwind v4 via CSS-first config** — `@theme` block в `tailwind.css` (не `tailwind.config.js`, это v3 паттерн). Colors defined с OKLCH source values matching FT-026 hex precisely.
3. **PrimeVue preset via `definePreset(Aura, { ... })`** — override primary color scale с OKLCH-derived hex. Surface tokens map to Tailwind CSS custom properties.
4. **Hybrid CSS layer order**: `@layer tailwind, primevue, vuetify, scoped` в entrypoint ensures утилитные классы могут перекрывать framework defaults без specificity wars.
5. **Test helper mirror**: `mountWithPrimeVue` = drop-in replacement of `mountWithVuetify` с подмнёной plugins array и stubs (минимальных — начать с unstubbed).
6. **PlaceholderView smoke** — используется только как `/404` fallback, безопасный choice.

### Change Surface

| Surface | Type | Notes |
|---|---|---|
| `frontend/package.json` | deps add | 7 new packages |
| `frontend/yarn.lock` | generated | after `yarn add` |
| `frontend/vite.config.js` | plugin add | `@tailwindcss/vite` |
| `frontend/src/styles/tailwind.css` | new | Tailwind entrypoint + `@theme` |
| `frontend/src/plugins/primevue.js` | new | Aura preset + darkModeSelector |
| `frontend/src/main.js` | edit | install PrimeVue, import tailwind.css |
| `frontend/src/__tests__/helpers/mountWithPrimeVue.js` | new | parallel helper |
| `frontend/src/views/PlaceholderView.vue` | edit | PrimeVue + Tailwind conversion |
| `frontend/src/__tests__/views/PlaceholderView.test.js` | edit | switch to mountWithPrimeVue |
| `memory-bank/features/README.md` | edit | register FT-036 |

### Contracts

| Contract | I/O | Producer/Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `primevueConfig` с `{ theme, darkModeSelector, cssLayer }` | plugin → main.js | Aura + custom primitives |
| `CTR-02` | Tailwind `@theme` tokens: `colors`, `fontFamily`, `borderRadius` | tailwind.css → utility classes | Single source truth |
| `CTR-03` | `mountWithPrimeVue(Component, { routes, initialRoute, props, slots })` | helper → test | Mirrors Vuetify helper signature |

### Failure Modes

- `FM-01` **Tailwind 4 `@theme` syntax drift** — official docs might differ. Verify on install, fallback to Tailwind 3 with `tailwind.config.js` if needed.
- `FM-02` **PrimeVue Aura preset не принимает OKLCH hex** — Aura expects full scale (50, 100, ..., 950). Mitigation: generate 11-step scale from primary hue using OKLCH math (L step 10% each) or use simpler `{ 500: '#3b9555' }` (Aura auto-interpolates).
- `FM-03` **Vuetify CSS leaks через PrimeVue components** — Vuetify resets (`html, body` rules) могут влиять. Mitigation: scope Vuetify CSS (not straightforward — accept minor dual-stack quirks until P7).
- `FM-04` **`cssLayer` name collision** — Vuetify also uses layers. Mitigation: explicit layer names `tailwind, primevue, vuetify, scoped`.
- `FM-05` **Test helper jsdom limitations** — PrimeVue `OverlayPanel`, `Menu` may use `teleport` to body, requires attachTo config. Mitigation: attachTo document body в helper.
- `FM-06` **Placeholder view не имеет enough interactivity** для smoke test (currently just text) → convert to include one button + one input to validate Tailwind + PrimeVue + Zod integration.

### Rollback

- `RB-01` P0 = one commit set на migration branch. `git reset --hard` на pre-P0 SHA в migration branch restores.
- `RB-02` Main untouched — no user impact даже если P0 reverted.

## Verify

### Exit Criteria

- `EC-01` All `REQ-01..14` implemented.
- `EC-02` `yarn install` successful; deps в `package.json`.
- `EC-03` `yarn build` green.
- `EC-04` `yarn test --run` — 799+ green (baseline preserved).
- `EC-05` `yarn test:coverage --run` — ≥ 94% (P0 strict per REQ-12).
- `EC-06` `yarn dev` запускается, `http://localhost:5173/placeholder-test` (или equivalent route) рендерит PlaceholderView без console errors.
- `EC-07` Dark mode toggle (via devtools `document.documentElement.classList.add('dark')`) меняет PlaceholderView Tailwind/PrimeVue styling.
- `EC-08` PrimeVue theme custom primitives не конфликтуют с Vuetify theme.
- `EC-09` Migration branch commits чистые и атомарные.

### Acceptance Scenarios

- `SC-01` **Stack install.** `yarn add` команды завершаются без peer-dep warnings; deps добавлены в package.json.
- `SC-02` **Tailwind utilities работают.** `<div class="bg-primary text-white p-4">` в PlaceholderView рендерит brand green bg в light, shifted dark variant в dark mode.
- `SC-03` **PrimeVue button рендерится** с OKLCH primary color matching FT-026 palette.
- `SC-04` **Dark mode parity.** Toggle `.dark` → PrimeVue surface darkens, Tailwind `dark:*` utilities применяются.
- `SC-05` **Test baseline held.** `yarn test --run` — 799+ green.
- `SC-06` **Build succeeds.** `yarn build` — dist генерируется.
- `SC-07` **Vuetify continues to work.** Dashboard, Gantt, existing views рендерятся как и раньше (visual QA — quick check).

### Negative / Edge Cases

- `NEG-01` `yarn add` fails (registry issue) → retry, rollback lock file changes.
- `NEG-02` Tailwind 4 syntax errors в `tailwind.css` → fallback to Tailwind 3 + `tailwind.config.js`.
- `NEG-03` PrimeVue theme import fails → check `@primevue/themes` path (may have changed in v4 releases).
- `NEG-04` Existing tests break на PlaceholderView switch → revert just that conversion, keep infra.

### Traceability matrix

| REQ | Design | Acceptance | Checks | EVID |
|---|---|---|---|---|
| `REQ-01` | solution | `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | solution | `SC-07` | `CHK-05` | manual |
| `REQ-03` | solution | `SC-02` | `CHK-02` | `EVID-02` |
| `REQ-04` | solution | `SC-06` | `CHK-03` | — |
| `REQ-05` | solution | `SC-03,04` | `CHK-02,05` | `EVID-02` |
| `REQ-06` | solution | `SC-06` | `CHK-03` | — |
| `REQ-07` | solution | `SC-04` | `CHK-05` | manual |
| `REQ-08` | solution | `SC-05` | `CHK-04` | `EVID-01` |
| `REQ-09` | solution | `SC-02,03` | `CHK-02,04` | `EVID-02` |
| `REQ-10` | solution | — | `CHK-02` | — |
| `REQ-11` | solution | — | `CHK-01` | — |
| `REQ-12` | ratchet | `EC-05` | `CHK-04` | `EVID-01` |
| `REQ-13` | solution | `SC-06` | `CHK-03` | — |
| `REQ-14` | solution | `EC-09` | `CHK-06` | — |

### Checks

| CHK | Covers | How | Expected | Evidence |
|---|---|---|---|---|
| `CHK-01` | install + docs | `cat package.json` diff | 7 packages added | `artifacts/ft-036/phase-0/deps.txt` |
| `CHK-02` | smoke view + theme | manual QA PlaceholderView light+dark | visual parity with FT-026 | `artifacts/ft-036/phase-0/smoke-screenshots/` |
| `CHK-03` | build | `yarn build` | green, bundle size recorded | `artifacts/ft-036/phase-0/build.log` |
| `CHK-04` | tests + coverage | `yarn test:coverage --run` | 799+ / ≥ 94% | `artifacts/ft-036/phase-0/coverage.log` |
| `CHK-05` | Vuetify hybrid | `yarn dev` → spot check 2-3 views | render OK | manual |
| `CHK-06` | commits | `git log` | clean atomic commits per REQ-14 | git |

### Evidence contract

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | tests + coverage | `artifacts/ft-036/phase-0/` |
| `EVID-02` | manual screenshots | `artifacts/ft-036/phase-0/smoke-screenshots/` |
