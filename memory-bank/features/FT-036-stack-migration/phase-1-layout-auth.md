---
title: "FT-036 P1: Layout & Auth Shell"
doc_kind: feature
doc_function: phase
purpose: "Port AppTopbar + AppSidebar + auth pages (Login/Register/SelectOrg) to PrimeVue + Tailwind. Keep v-app/v-app-bar/v-navigation-drawer outer shells для preservation layout injection context (Gantt + other Vuetify views depend)."
derived_from:
  - ./feature.md
  - ./phase-0-foundation.md
status: active
delivery_status: planned
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-036 P1: Layout & Auth Shell

## What

### Problem

P0 established dual-stack foundation но все views still Vuetify. P1 конвертирует layout chrome (topbar, sidebar) и auth pages (login, register, select-org). Это позволяет user log in через PrimeVue shell и validates end-to-end patterns which future phases reuse.

**Key risk (reviewer I3):** replacing AppTopbar/AppSidebar shifts layout math. Gantt + other Vuetify views depend on v-main's content-area calculation. Mitigation — сохранить v-app-bar/v-navigation-drawer outer shells; replace только inner content.

### Outcome

| Metric ID | Metric | Target | Measurement |
|---|---|---|---|
| `MET-01` | 5 views converted | AppTopbar, AppSidebar, LoginPage, RegisterPage, SelectOrganizationPage | code review |
| `MET-02` | Auth pages 0 Vuetify references | grep `v-` → 0 в 3 auth pages | grep |
| `MET-03` | Topbar/Sidebar outer shells only | v-app-bar + v-navigation-drawer as wrappers; all inner = PrimeVue/Tailwind | code review |
| `MET-04` | Gantt + Dashboard visual parity | no layout shift, header height unchanged, sidebar width unchanged | manual QA |
| `MET-05` | Tests green + coverage held | ≥ 94%, test count preserved or grown | `yarn test:coverage` |
| `MET-06` | MDI inventory delta | baseline 123 → lower by ~30 (5 views converted) | grep |
| `MET-07` | i18n parity untouched | RU 483 / EN 483 | parity script |
| `MET-08` | Zod schemas introduced | LoginPage + RegisterPage use Zod | code |

### Scope

- `REQ-01` **LoginPage — pure PrimeVue + Tailwind + Zod.** Route `/auth/login` has `meta.guest`, rendered outside DefaultLayout — no v-app wrapper constraint. Use:
  - `InputText` (email, password), PrimeIcons for visual hints (`pi-envelope`, `pi-lock`, `pi-eye`/`pi-eye-slash` toggle)
  - `Button` для submit + "toggle password visibility"
  - Zod schema `{ email: z.string().email(), password: z.string().min(1) }`; submit blocked if `safeParse` fails
  - Tailwind утилиты для centered card layout (grid + mx-auto + max-w-md)
  - Error alert rendered via `<div>` с Tailwind `bg-red-50 dark:bg-red-950` instead of `v-alert`
  - All existing i18n keys preserved (auth.login.*)
- `REQ-02` **RegisterPage — pure PrimeVue + Tailwind + Zod.** 6 fields: org_name, first_name, last_name, email, password, password_confirmation. Zod schema с `.refine()` для password match + `.min(8)` для length. Same layout pattern as LoginPage но wider (max-w-lg). Standalone, no v-app wrapper.
- `REQ-03` **SelectOrganizationPage — pure PrimeVue + Tailwind.** List of orgs, click → `selectOrganization(org)`. Uses PrimeVue `Card` + tailwind hover-highlighted list-items. PrimeIcons `pi-building` вместо `mdi-domain`. Standalone.
- `REQ-04` **AppTopbar — hybrid shell.** Keep `<v-app-bar>` как outer element (preserves v-main layout injection). Replace inner content:
  - Burger button → PrimeVue `Button icon="pi pi-bars" text` или Tailwind `<button>`
  - Brand text «Apartus» → Tailwind styled `<h1>` with font-display + primary color
  - Theme toggle → PrimeVue `Button icon="pi pi-sun/pi-moon" text` (preserve existing toggleTheme + syncDarkClass logic from P0)
  - User menu → PrimeVue `Menu` component (popup) triggered by Button; logout item inside
  - Progress bar extension → PrimeVue `ProgressBar` or Tailwind-styled div
- `REQ-05` **AppSidebar — hybrid shell.** Keep `<v-navigation-drawer>` outer, rewire content:
  - Organization switcher → PrimeVue `Menu` triggered by Tailwind-styled button row
  - Nav items list → Tailwind flex column с PrimeIcons + router-link. Active state via `router-link-active` class + Tailwind `bg-primary-50 dark:bg-primary-950`.
  - All nav labels preserved (nav.*) i18n keys unchanged
- `REQ-06` **Icon migration — 5 views only.** MDI → PrimeIcons mapping для touched views:
  - `mdi-domain` → `pi pi-building`
  - `mdi-chevron-down` → `pi pi-chevron-down`
  - `mdi-view-dashboard` → `pi pi-home`
  - `mdi-calendar-check` → `pi pi-calendar-check`
  - `mdi-calendar-month` → `pi pi-calendar`
  - `mdi-account-group` → `pi pi-users`
  - `mdi-account-key` → `pi pi-id-card`
  - `mdi-swap-horizontal` → `pi pi-sync`
  - `mdi-clipboard-check` → `pi pi-check-square`
  - `mdi-cash-minus` → `pi pi-money-bill`
  - `mdi-chart-bar` → `pi pi-chart-bar`
  - `mdi-star-circle` → `pi pi-star`
  - `mdi-source-branch` → `pi pi-sitemap`
  - `mdi-cog` → `pi pi-cog`
  - `mdi-account` → `pi pi-user`
  - `mdi-logout` → `pi pi-sign-out`
  - `mdi-weather-sunny` → `pi pi-sun`
  - `mdi-weather-night` → `pi pi-moon`
  - `mdi-email` → `pi pi-envelope`
  - `mdi-lock` → `pi pi-lock`
  - `mdi-lock-check` → `pi pi-lock`
  - `mdi-eye` / `mdi-eye-off` → `pi pi-eye` / `pi pi-eye-slash`
- `REQ-07` **Tests — rewrite.** 4 test files affected: `AppTopbar.test.js`, `AppSidebar.test.js`, `LoginPage.test.js`, `RegisterPage.test.js`. Use `mountWithPrimeVue` где standalone (auth pages), hybrid-mount (both helpers) для AppTopbar/AppSidebar. Assertions obligated только на logic (toggleTheme, handleLogout, navItems, handleLogin, rules) и aria.
- `REQ-08` **Zod schema reuse.** Create `frontend/src/schemas/auth.js` exporting `loginSchema`, `registerSchema` — reusable в tests + future phases.
- `REQ-09` **Coverage ratchet — strict (P1 per epic REQ-14).** Full suite green, coverage ≥ 94%.
- `REQ-10` **Visual parity acceptance — Gantt + Dashboard.** After P1, manually open Gantt and Dashboard; verify:
  - Topbar height unchanged (no vertical shift)
  - Sidebar width unchanged (256px default Vuetify — must preserve)
  - Gantt internal header alignment intact (FT-033 fix still works)
  - Screenshot artifacts `artifacts/ft-036/phase-1/gantt-before-after/`
- `REQ-11` **i18n untouched.** All existing `auth.*`, `nav.*`, `topbar.*` keys preserved verbatim. Parity RU/EN maintained.

### Non-Scope

- `NS-01` Remove v-app from DefaultLayout — P7.
- `NS-02` Redesign any auth flow логику — just visual port.
- `NS-03` Touch any other view — per subsequent phases.
- `NS-04` Change routing — unchanged.
- `NS-05` Change auth store — unchanged.
- `NS-06` Introduce storybook для components — post-P7.

### Constraints / Assumptions

- `ASM-01` P0 merged on migration branch (deps + tailwind.css + primevue plugin + mountWithPrimeVue helper).
- `ASM-02` `v-app-bar` + `v-navigation-drawer` кооперируют с наполнением из PrimeVue/Tailwind без CSS conflicts (pre-validated: Tailwind утилиты работают как classes на любом child).
- `ASM-03` PrimeVue Menu component stubs в mountWithPrimeVue достаточны для test rendering.
- `CON-01` No TS, no backend, no store changes.
- `CON-02` Auth pages — standalone guest routes (no v-app wrapper; this is known, router.js confirmed).

## How

### Solution

**Auth pages (3)** — full rewrite, pure PrimeVue + Tailwind + Zod, no Vuetify. These are standalone (guest routes) so v-app не требуется.

**AppTopbar / AppSidebar** — hybrid shells: outer `v-app-bar`/`v-navigation-drawer` preserved (for v-main layout calc), inner content = PrimeVue primitives + Tailwind utilities. Visual parity preserved через careful height/width matching с Vuetify defaults (64px topbar, 256px sidebar).

### Change Surface

| Surface | Type | Notes |
|---|---|---|
| `frontend/src/pages/auth/LoginPage.vue` | rewrite | pure PrimeVue + Tailwind + Zod |
| `frontend/src/pages/auth/RegisterPage.vue` | rewrite | pure PrimeVue + Tailwind + Zod |
| `frontend/src/pages/auth/SelectOrganizationPage.vue` | rewrite | pure PrimeVue + Tailwind |
| `frontend/src/components/AppTopbar.vue` | rewrite inner content | v-app-bar shell kept |
| `frontend/src/components/AppSidebar.vue` | rewrite inner content | v-navigation-drawer shell kept |
| `frontend/src/schemas/auth.js` | new | Zod schemas (login, register) |
| `frontend/src/__tests__/pages/auth/LoginPage.test.js` | rewrite | mountWithPrimeVue |
| `frontend/src/__tests__/pages/auth/RegisterPage.test.js` | rewrite | mountWithPrimeVue |
| `frontend/src/__tests__/components/AppTopbar.test.js` | rewrite | hybrid helpers |
| `frontend/src/__tests__/components/AppSidebar.test.js` | rewrite | hybrid helpers |

### Contracts

| Contract | I/O | Producer/Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `loginSchema` Zod object | schemas/auth.js → LoginPage | `{ email, password }` |
| `CTR-02` | `registerSchema` Zod object с `.refine()` | schemas/auth.js → RegisterPage | email, pwd-match, min-length |
| `CTR-03` | AppTopbar `@toggleDrawer` emit | DefaultLayout consumer | Unchanged |
| `CTR-04` | AppSidebar `v-model` (drawer open state) | DefaultLayout consumer | Unchanged |

### Failure Modes

- `FM-01` **v-navigation-drawer width mismatch** — Vuetify default 256px; Tailwind rewrites inside should use `w-full`, не hardcoded. Width owned by v-navigation-drawer.
- `FM-02` **v-app-bar height = 64px default** — topbar inner content flex-height должен match. Tailwind `h-full` внутри.
- `FM-03` **Menu component jsdom** — PrimeVue `Menu` stubbed в mountWithPrimeVue — tests не проверяют actual popup, just props + event wiring.
- `FM-04` **Organization switcher stuck** — if PrimeVue Menu doesn't emit click → stub-based test may not catch runtime bug. Mitigation: manual QA verifies switch works.
- `FM-05` **Nav active state** — `router-link-active` class applied by Vue Router; Tailwind needs explicit rule для active state highlighting. Verify all 13 nav items.
- `FM-06` **Zod error messages — English default** — показывать через `result.error.issues[0]?.message` либо map on error codes to i18n keys. Simple path: use `.min(1, t('common.validation.required'))` syntax в schemas с i18n import inside Page (schemas construct on-demand).

### Rollback

- `RB-01` P1 = set of commits on migration branch. Revert via git reset к P0 tip.

## Verify

### Exit Criteria

- `EC-01` All `REQ-01..11` реализованы.
- `EC-02` 5 converted views show no `<v-` templates (auth pages) / only shell `v-app-bar`+`v-navigation-drawer` (AppTopbar/Sidebar).
- `EC-03` `yarn test --run` — tests ≥ 804 green (baseline from P0).
- `EC-04` `yarn test:coverage --run` — ≥ 94%.
- `EC-05` `yarn build` green.
- `EC-06` Manual QA: login flow works end-to-end (login → dashboard); topbar toggle theme still works; sidebar org switch works; Gantt layout unchanged.
- `EC-07` MDI inventory drops ~25-30 refs (5 views touched).

### Acceptance Scenarios

- `SC-01` **Login flow.** `/auth/login` → pure PrimeVue layout; submit with valid creds → redirect `/`.
- `SC-02` **Invalid login.** Empty email → Zod error chip visible, submit blocked; wrong creds → authStore.error shown в Tailwind alert.
- `SC-03` **Register flow.** `/auth/register` → 6 fields; submit → redirect `/`. Password mismatch → inline error.
- `SC-04` **Topbar interactions.** Burger click → drawer toggles. Theme toggle → dark class on `<html>` flipped, PrimeVue + Vuetify + Tailwind all reflect. User menu → logout → `/auth/login`.
- `SC-05` **Sidebar nav.** 13 nav items clickable; active route highlighted. Organization switcher opens menu, click → switchOrganization + redirect `/`.
- `SC-06` **Gantt parity (reviewer I3).** `/calendar` loads, header corner aligned to grid (FT-033 fix preserved), no visible shift.
- `SC-07` **Dashboard parity.** `/` loads, editorial hierarchy preserved (FT-031), no shift.
- `SC-08` **Dark mode.** Toggle theme → все 5 converted views + existing Vuetify views retain readability.

### Negative / Edge Cases

- `NEG-01` Invalid email → Zod schema blocks submit.
- `NEG-02` Auth error → form stays open с error alert.
- `NEG-03` Organization switch fails (network) → menu stays open.
- `NEG-04` Very narrow viewport (< 640px) → auth card still centered via max-w + px-4.

### Traceability matrix

| REQ | Acceptance | Checks | EVID |
|---|---|---|---|
| `REQ-01` | `SC-01,02,08`, `NEG-01,02` | `CHK-02,05` | `EVID-02` |
| `REQ-02` | `SC-03,08`, `NEG-04` | `CHK-02,05` | `EVID-02` |
| `REQ-03` | `SC-05` | `CHK-05` | manual |
| `REQ-04` | `SC-04,08` | `CHK-02,05` | `EVID-02` |
| `REQ-05` | `SC-05,08` | `CHK-02,05` | `EVID-02` |
| `REQ-06` | `EC-07` | `CHK-06` | grep |
| `REQ-07` | `EC-03` | `CHK-02` | `EVID-02` |
| `REQ-08` | `SC-01,03` | `CHK-02` | code |
| `REQ-09` | `EC-04` | `CHK-01` | `EVID-01` |
| `REQ-10` | `SC-06,07` | `CHK-05` | `EVID-05` |
| `REQ-11` | — | `CHK-04` | parity script |

### Checks

| CHK | Covers | How | Expected |
|---|---|---|---|
| `CHK-01` | `EC-04` | `yarn test:coverage` | ≥ 94% |
| `CHK-02` | `EC-03` | `yarn test` | all green |
| `CHK-03` | `EC-05` | `yarn build` | success |
| `CHK-04` | `REQ-11` | i18n parity script | 483/483 |
| `CHK-05` | `SC-04..07,NEG-*` | Manual QA | functional + visual |
| `CHK-06` | `EC-07` | git grep mdi- count | delta ~25-30 |

### Evidence

| EVID | Producer | Path |
|---|---|---|
| `EVID-01` | `yarn test:coverage` | `artifacts/ft-036/phase-1/` |
| `EVID-02` | `yarn test` | `artifacts/ft-036/phase-1/` |
| `EVID-05` | manual screenshots | `artifacts/ft-036/phase-1/gantt-before-after/` |
