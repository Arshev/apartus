---
title: "FT-036 P7: Finalization"
doc_kind: feature
doc_function: phase
purpose: "Final phase — remove Vuetify + MDI + vite-plugin-vuetify, clean config, update docs, prepare for merge."
derived_from:
  - ./feature.md
  - ./phase-6-reservations.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-036 P7: Finalization

## What

### Problem

Post-P6, migration branch still has:
- Vuetify + @mdi/font + vite-plugin-vuetify in package.json
- 2 views missed in earlier phases (ChannelListView, TaskBoardView)
- v-app / v-app-bar / v-navigation-drawer wrappers in DefaultLayout / AppTopbar / AppSidebar (were hybrid shells P1..P6)
- `plugins/vuetify.js` (theme config)
- `styles/settings.scss` (Vuetify SASS overrides)
- `mountWithVuetify.js` helper + VUETIFY_SHELL_STUBS в PrimeVue helper
- `vuetify/locale` import in i18n plugin
- docs referencing Vuetify

### Outcome

| Metric | Target | Actual |
|---|---|---|
| `vuetify` in package.json | absent | ✅ removed |
| `vite-plugin-vuetify` | absent | ✅ removed |
| `@mdi/font` | absent | ✅ removed |
| `<v-*>` templates in src/ | 0 | ✅ 0 |
| `import ... from 'vuetify'` | 0 | ✅ 0 |
| MDI refs (`mdi-`) | 0 | ✅ 0 |
| Tests green | ≥ 835 | ✅ 835 |
| Coverage | ≥ 94% | ✅ 95.23% |
| Build green | success | ✅ 1.28s |

### Scope

- `REQ-01` **Port missed views (P0..P6 gaps).** ChannelListView + TaskBoardView — full rewrite with DataTable + Dialog + useConfirm/useToast pattern. PrimeIcons + Tailwind status/priority chips via `color-mix()` tints.
- `REQ-02` **Drop Vuetify shells from layout chrome.** `v-app` → `<div class="app-shell">`, `v-app-bar` → `<header class="app-topbar">`, `v-navigation-drawer` → `<aside class="app-sidebar">`, `v-main` → `<main>`. DefaultLayout owns fixed-topbar + sidebar positioning via scoped CSS.
- `REQ-03` **Theme toggle post-Vuetify.** AppTopbar no longer uses `useTheme()`. New SSoT: `document.documentElement.classList.contains('dark')` + localStorage `apartus-theme` (values `'light'`/`'dark'`; legacy `'apartusLight'`/`'apartusDark'` still accepted on read).
- `REQ-04` **Remove all Vuetify deps.** `yarn remove vuetify vite-plugin-vuetify @mdi/font`.
- `REQ-05` **Remove Vuetify from config.** `vite.config.js` — only `@vitejs/plugin-vue` + `@tailwindcss/vite`. `main.js` — no Vuetify import. `plugins/i18n.js` — no `vuetify/locale` adapter.
- `REQ-06` **Delete obsolete files.** `plugins/vuetify.js`, `__tests__/helpers/mountWithVuetify.js`, `styles/settings.scss`.
- `REQ-07` **Clean test helper.** `mountWithPrimeVue.js` — remove `VUETIFY_SHELL_STUBS` export + `createVuetify()` call + `vuetify` plugin registration.
- `REQ-08` **CSS layer cleanup.** `tailwind.css` `@layer` declaration: `tailwind, primevue, scoped` (removed `vuetify`). PrimeVue plugin `cssLayer.order` same.
- `REQ-09` **Docs update.** `memory-bank/domain/frontend.md` — Stack section: PrimeVue 4 + Tailwind 4 + Zod 3 + PrimeIcons 7. Component Rules section rewritten. Layout section mentions `schemas/` + `composables/`.
- `REQ-10` **Coverage ratchet restore.** Threshold returns to 94% (P1 baseline); actual 95.23% well above.
- `REQ-11` **Build sanity.** Final `yarn build` green, bundle stabilized.

### Non-Scope

- `NS-01` **e2e test restoration.** Per epic REQ-13, e2e Playwright specs are deferred — they reference Vuetify selectors and need rewrite in a follow-up feature (FT-037 или later). Skip list still in place.
- `NS-02` **Impeccable critique.** Epic EC-10 mentions optional critique — deferred.
- `NS-03` **Storybook.** NS from epic holds.

### Constraints / Assumptions

- `ASM-01` P0..P6 delivered.
- `ASM-02` No Vuetify-dependent code remaining after REQ-01/02 — verified via grep.
- `CON-01..04` unchanged.

## How

### Solution

Mechanical cleanup — no new patterns. Port 2 missed views using P2/P3 DataTable+Dialog+useConfirm/useToast recipe. Replace shells with plain HTML5 + Tailwind positioning.

### Change Surface

| Surface | Type |
|---|---|
| `frontend/src/views/ChannelListView.vue` | rewrite |
| `frontend/src/views/TaskBoardView.vue` | rewrite |
| `frontend/src/layouts/DefaultLayout.vue` | rewrite (shell + fixed positioning) |
| `frontend/src/components/AppTopbar.vue` | rewrite (drop v-app-bar + useTheme) |
| `frontend/src/components/AppSidebar.vue` | drop v-navigation-drawer wrapper |
| `frontend/src/plugins/vuetify.js` | **deleted** |
| `frontend/src/styles/settings.scss` | **deleted** |
| `frontend/src/__tests__/helpers/mountWithVuetify.js` | **deleted** |
| `frontend/src/__tests__/helpers/mountWithPrimeVue.js` | drop VUETIFY_SHELL_STUBS + vuetify plugin |
| `frontend/src/main.js` | drop vuetify import |
| `frontend/vite.config.js` | drop vite-plugin-vuetify + SCSS config |
| `frontend/src/plugins/i18n.js` | drop vuetify/locale adapter |
| `frontend/src/plugins/primevue.js` | update cssLayer order (drop vuetify) |
| `frontend/src/styles/tailwind.css` | update `@layer` declaration (drop vuetify) |
| `frontend/package.json` | remove 3 deps |
| `memory-bank/domain/frontend.md` | Stack + Rules rewrites |
| `memory-bank/features/FT-036-stack-migration/feature.md` | mark delivery_status=done |

### Failure Modes

- `FM-01` **Missed Vuetify imports.** Verified via grep: 0 remaining. (primevue.js comment about "Apartus OKLCH-derived primary green (#3b9555 from FT-026 palette)" — documentation only.)
- `FM-02` **Theme toggle legacy storage.** Old users with `apartus-theme: 'apartusDark'` in localStorage — AppTopbar `onMounted` reader accepts both new (`'dark'`) and legacy values.
- `FM-03` **e2e specs broken.** Per NS-01; not a P7 concern.

### Rollback

- Per-commit atomic. Migration branch untouched on main until user approves merge.

## Verify

### Exit Criteria

- `EC-01` All REQ реализованы.
- `EC-02` Grep `<v-[a-z]` в `src/**/*.vue` → 0. ✅
- `EC-03` Grep `from 'vuetify'` → 0. ✅
- `EC-04` Grep `mdi-` → 0. ✅
- `EC-05` `yarn build` green. ✅ (1.28s)
- `EC-06` `yarn test --run` — 835 green. ✅
- `EC-07` `yarn test:coverage` — ≥ 94%. ✅ (95.23%)
- `EC-08` `memory-bank/domain/frontend.md` updated. ✅
- `EC-09` Epic `feature.md` delivery_status: done. ✅
- `EC-10` Migration branch ready for final review + merge (user-paused pre-merge).

### Checks

| CHK | How | Actual |
|---|---|---|
| `CHK-01` | `yarn test:coverage --run` | 95.23% lines |
| `CHK-02` | `yarn test --run` | 835 / 835 |
| `CHK-03` | `yarn build` | success 1.28s |
| `CHK-04` | `git grep "<v-\|from 'vuetify\|mdi-" src/` | 0 results |
| `CHK-05` | i18n parity | RU = EN keys unchanged |
| `CHK-06` | Final epic review by user | **pending** |
