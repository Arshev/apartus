---
title: "FT-036 P3: Settings (General / Integrations / Members / Roles)"
doc_kind: feature
doc_function: phase
purpose: "Port SettingsView (474 LOC, 4 tabs) to pure PrimeVue + Tailwind. Tabs layout + 3 inline CRUD panels + telegram integration form."
derived_from:
  - ./feature.md
  - ./phase-2-simple-crud.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-036 P3: Settings

## What

### Problem

`SettingsView.vue` (474 LOC) is last large Vuetify view before Dashboard (P4). Contains:

- Tabs (v-tabs / v-window): 4 panels
- General: org name, currency select, locale select, save button
- Integrations: Telegram bot_token + chat_id form с test button
- Members: DataTable + add/edit/delete dialogs
- Roles: DataTable + add/edit/delete dialogs (system roles read-only)

Pattern reuses P2 primitives (PrimeVue Tabs, DataTable, Dialog, useConfirm, useToast) — no new infra needed.

### Outcome

| Metric | Target |
|---|---|
| SettingsView 0 Vuetify templates | grep `<v-` → 0 в SettingsView.vue |
| Tests ≥ baseline (832) | `yarn test` |
| Coverage ≥ 94.58% (P1 tip −1pp) | `yarn test:coverage` |
| MDI refs drop | baseline 62 → ≤ 50 (−12 refs in Settings) |
| i18n parity | 490+/490+ |
| Build green | `yarn build` |

### Scope

- `REQ-01` **Tabs migration.** Replace `v-tabs + v-window + v-tab + v-window-item` с PrimeVue `Tabs` component (v4+ uses `Tabs/TabList/Tab/TabPanels/TabPanel` — or plain Tailwind tabs если PrimeVue tabs require too many stubs).
- `REQ-02` **General panel.** PrimeVue `InputText` для name, `Select` для currency + locale, `Button` для save. `useToast()` instead of `v-snackbar`.
- `REQ-03` **Integrations (Telegram) panel.** InputText × 2 + 2 Buttons (Save, Test). Tailwind alert styling для error/success states.
- `REQ-04` **Members panel.** PrimeVue DataTable + Column + Dialog для add/edit, `useConfirm()` для delete, `useToast()` feedback. Role select via PrimeVue Select.
- `REQ-05` **Roles panel.** Same pattern. System role rows show disabled action buttons.
- `REQ-06` **State preservation.** Behavior intact: `tab` ref controls active panel, `loadOrg()` populates on mount, `handleOrgSave()` + `saveTelegram()` + `testTelegram()` — logic unchanged.
- `REQ-07` **PrimeVue Tabs stub.** Extend `mountWithPrimeVue` stubs с Tabs/TabList/Tab/TabPanels/TabPanel (passthrough).
- `REQ-08` **Test rewrite.** `SettingsView.test.js` — use mountWithPrimeVue, assertions on handlers + form state + tab value.
- `REQ-09` **Coverage ratchet.** ≥ 94.58% (P1 tip −1pp).

### Non-Scope

- `NS-01` **No behavior changes.** Форма сохраняет те же поля, same API calls, same validation rules.
- `NS-02` **No new auth/permission logic.** Store unchanged.
- `NS-03` **Billing/subscriptions** — not in view (no UI for it). Backend stays.
- `NS-04` **Invite flow as separate page** — invites live inside Members panel currently, preserve pattern.

### Constraints / Assumptions

- `ASM-01` P0..P2 merged on branch.
- `ASM-02` PrimeVue Tabs (v4) API: `<Tabs value="general">` + `<TabList><Tab value="general">...</Tab></TabList>` + `<TabPanels><TabPanel value="general">...</TabPanel></TabPanels>`.
- `CON-01..04` unchanged.

## How

### Solution

One-file port с reuse P2 patterns. Stub additions minimal. Tabs are passthrough (preserving children); `tab` ref still controls which panel renders. Use plain Tailwind tabs if PrimeVue Tabs proves awkward в jsdom.

### Change Surface

| Surface | Type |
|---|---|
| `frontend/src/views/SettingsView.vue` | rewrite |
| `frontend/src/__tests__/views/SettingsView.test.js` | rewrite |
| `frontend/src/__tests__/helpers/mountWithPrimeVue.js` | add Tabs stubs |

### Failure Modes

- `FM-01` **PrimeVue Tabs v4 API drift** — если Tabs component неудобен в jsdom, fallback: plain Tailwind tabs с `<button>` + v-show. Мы не теряем функциональность.
- `FM-02` **Dialog ×2 в одном view** (member + role) — должны быть independent. Proven pattern в AmenityListView.
- `FM-03` **Existing tests assertions on headers key/value pairs** — DataTable не use `headers` computed; need to rewrite those tests для inline Column template.

### Rollback

- Commit atomic; revert ok.

## Verify

### Exit Criteria

- `EC-01` REQ-01..09 реализованы.
- `EC-02` SettingsView 0 `<v-*>` templates.
- `EC-03` `yarn test --run` ≥ baseline green.
- `EC-04` Coverage ≥ 94.58%.
- `EC-05` `yarn build` green.

### Acceptance Scenarios

- `SC-01` Tab switching works (General → Integrations → Members → Roles).
- `SC-02` General save → toast; locale change applies via setAppLocale.
- `SC-03` Telegram save + test → UI feedback.
- `SC-04` Member add → new row appears; edit → role updates; delete confirm → removed.
- `SC-05` Role add → new row; system roles show disabled actions.
- `SC-06` Dark mode parity.

### Checks

| CHK | How |
|---|---|
| `CHK-01` | `yarn test:coverage` ≥ 94.58% |
| `CHK-02` | `yarn test` green |
| `CHK-03` | `yarn build` green |
| `CHK-04` | i18n parity |
| `CHK-05` | Manual QA |
| `CHK-06` | grep mdi- delta |
