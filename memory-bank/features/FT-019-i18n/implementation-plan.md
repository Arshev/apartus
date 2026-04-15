---
title: "FT-019: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации FT-019 (vue-i18n). Discovery context, шаги, test strategy, approval gates."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_019_scope
  - ft_019_architecture
  - ft_019_acceptance_criteria
  - ft_019_blocker_state
---

# План имплементации

## Цель текущего плана

Внедрить vue-i18n в frontend Apartus: установить пакет, создать locale-файлы (ru/en), заменить все hardcoded строки (453 по baseline `MET-02`) в 24 Vue-файлах на `$t()`, добавить language switcher в SettingsView, обеспечить persistence через `organization.settings.locale`, обновить тесты.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
|---|---|---|---|
| `frontend/src/main.js` | App bootstrap: `app.use(vuetify)` → `app.use(pinia)` → `app.use(router)` (+ side-effect CSS import) | Место подключения i18n plugin: после pinia, до router | Mirror: `app.use(i18n)` |
| `frontend/src/plugins/vuetify.js` | Vuetify plugin с Apartus light/dark themes, component defaults | Паттерн plugin-файла; возможная интеграция Vuetify locale adapter | Создать `plugins/i18n.js` по аналогии |
| `frontend/src/stores/auth.js` | Auth store, `fetchCurrentUser()` (lines 82-114), `organization.value` | Точка чтения `organization.settings.locale` при boot (line 96) | Добавить locale sync после `organization.value = response.organization` |
| `frontend/src/views/SettingsView.vue` | Settings: 4 tabs (general, integrations, members, roles). General tab: org name + currency select | Language switcher → v-select в General tab (после currency, line ~19). `orgForm` ref + `handleOrgSave()` | Extend orgForm: `{ name, currency, locale }` |
| `frontend/src/api/organizations.js` | `update(data)` → PATCH `/organization` с `{ organization: data }` | Уже поддерживает `settings: {}` — locale persistence без изменений API | — |
| `frontend/src/components/AppSidebar.vue` | Sidebar navigation — 15 Cyrillic strings | Замена на `$t()` | — |
| `frontend/src/components/AppTopbar.vue` | Top bar — 1 Cyrillic string, dark mode toggle | Замена на `$t()` | — |
| `frontend/src/views/*.vue` (22 файла) | All views — ~438 Cyrillic strings total | Основной объём работы | — |
| `frontend/src/__tests__/helpers/mountWithVuetify.js` | Test helper, `plugins: [pinia, router]` (lines 131, 159) | Добавить i18n в plugins array в `_buildMount()` | — |
| `frontend/vitest.config.js` | Coverage threshold: 93% | Ratchet — не понижать | — |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites | Manual-only gap | Approval ref |
|---|---|---|---|---|---|---|
| i18n plugin setup, default/fallback locale | `REQ-01`, `SC-02`, `SC-03`, `NEG-01`, `NEG-02` | none | Vitest: plugin creates, default=ru, fallback on missing key (SC-03), invalid locale→ru | `yarn test` | none | none |
| Language switch | `REQ-04`, `REQ-05`, `SC-01` | none | Vitest: switch locale → `$t()` returns correct text, persists | `yarn test` | none | none |
| Hardcoded string elimination | `REQ-03`, `EC-01`, `CHK-02` | none | Shell grep (deterministic) | grep command | none | none |
| Existing test regression | `REQ-06`, `EC-03`, `EC-04` | 409 specs, 100% line coverage | Update mountWithVuetify, fix assertions matching Russian text | `yarn test:coverage` | none | none |
| Documentation | `REQ-07`, `CHK-04` | — | Manual read | — | Doc review | none |

## Open Questions / Ambiguities

| OQ ID | Question | Why unresolved | Blocks | Default action |
|---|---|---|---|---|
| `OQ-01` | Нужна ли интеграция Vuetify locale adapter для встроенных строк (data-table pagination, no-data)? | Vuetify 3 имеет свой locale — проверить, работает ли через vue-i18n adapter | `STEP-02` | Попробовать; если сложно — оставить Vuetify defaults, зафиксировать как known gap |
| `OQ-02` | Enum labels (property types, statuses, priorities) — включать в locale files? | Data-level vs UI-level | `STEP-03` | Да — они отображаются в UI как текст |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
|---|---|---|---|
| setup | `cd frontend && yarn install` после добавления vue-i18n | `STEP-01` | Module not found: vue-i18n |
| test | `cd frontend && yarn test` — все specs зелёные | `CHK-01`, `CHK-03` | Test failures |
| coverage | `cd frontend && yarn test:coverage` — threshold ≥93% | `CHK-03` | Coverage drop |
| grep | `grep -rn '[А-Яа-яЁё]' frontend/src/views/ frontend/src/components/ --include='*.vue'` | `CHK-02` | Non-zero matches |

## Preconditions

| PRE ID | Canonical ref | Required state | Used by | Blocks start |
|---|---|---|---|---|
| `PRE-01` | `CON-01` | npm пакет `vue-i18n` одобрен пользователем | `STEP-01` | yes |
| `PRE-02` | `ASM-02` | Backend `Organization#settings` принимает произвольные JSONB ключи через `settings: {}` | `STEP-06` | no (already verified) |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
|---|---|---|---|---|
| `WS-1` | `REQ-01` | i18n plugin setup + app integration | agent | `PRE-01` |
| `WS-2` | `REQ-02`, `REQ-03` | Locale JSON files + all Vue files converted to `$t()` | agent | `WS-1` |
| `WS-3` | `REQ-04`, `REQ-05` | Language switcher + locale persistence | agent | `WS-1` |
| `WS-4` | `REQ-06` | Test infrastructure + new i18n tests | agent | `WS-2`, `WS-3` |
| `WS-5` | `REQ-07` | Documentation update | agent | `WS-2` |

## Approval Gates

| AG ID | Trigger | Applies to | Why approval required | Approver |
|---|---|---|---|---|
| `AG-01` | Adding npm package `vue-i18n` | `STEP-01` | `CON-01`: autonomy-boundaries.md prohibits new packages without approval | User (human) |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command | Blocked by | Needs approval | Escalate if |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `STEP-01` | agent | `REQ-01` | Install vue-i18n, create `plugins/i18n.js`, register in `main.js` | `package.json`, `yarn.lock`, `plugins/i18n.js` (new), `main.js` | i18n plugin configured, app boots | `CHK-01` (partial) | `EVID-01` (partial) | `yarn dev` starts without errors | `PRE-01` | `AG-01` | Package conflicts |
| `STEP-02` | agent | `REQ-01` | Verify Vuetify locale adapter integration (resolve `OQ-01`) | `plugins/vuetify.js` (optional) | Vuetify built-in strings follow locale | `CHK-01` (partial) | `EVID-01` (partial) | App boots, data-table shows correct locale | `STEP-01` | none | Adapter breaks theme |
| `STEP-03` | agent | `REQ-02` | Create `locales/ru.json` — hierarchical keys for all 24 files | `locales/ru.json` (new) | Russian locale file, all UI strings | `CHK-02` (partial) | `EVID-02` (partial) | JSON valid | `STEP-01` | none | — |
| `STEP-04` | agent | `REQ-02` | Create `locales/en.json` — English translations | `locales/en.json` (new) | English locale file, key parity with ru.json | `CHK-02` (partial) | `EVID-02` (partial) | JSON valid, key count = ru.json | `STEP-03` | none | — |
| `STEP-05` | agent | `REQ-03` | Replace hardcoded strings in all 24 Vue files with `$t()` | 22 views + 2 components | Zero hardcoded Cyrillic | `CHK-02` | `EVID-02` | grep returns 0 matches | `STEP-03` | none | — |
| `STEP-06` | agent | `REQ-04`, `REQ-05` | Language switcher in SettingsView general tab + locale persistence in auth store | `SettingsView.vue`, `stores/auth.js` | Working language switch, persists on reload | `CHK-01` | `EVID-01` | Switch ru→en, reload, UI stays en | `STEP-05` | none | Backend rejects settings.locale |
| `STEP-07` | agent | `REQ-06` | Update `mountWithVuetify`, fix broken tests, add i18n-specific tests | `helpers/mountWithVuetify.js`, test files | All tests green, coverage ≥93% | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` | `yarn test:coverage` | `STEP-06` | none | Coverage <93% |
| `STEP-08` | agent | `REQ-07` | Update `domain/frontend.md` Localization section | `memory-bank/domain/frontend.md` | Doc reflects i18n architecture | `CHK-04` | `EVID-04` | Section exists | — | none | — |

## Parallelizable Work

- `PAR-01` `STEP-03`/`STEP-04` (locale files) — строго последовательно (en.json зависит от структуры ключей ru.json). NOT parallelizable.
- `PAR-02` `STEP-08` (docs) может идти параллельно с `STEP-07` (tests).
- `PAR-03` `STEP-02` (Vuetify adapter) может идти параллельно с `STEP-03` (locale files).

## Checkpoints

| CP ID | Refs | Condition | Evidence IDs |
|---|---|---|---|
| `CP-01` | `STEP-01`, `STEP-02` | App boots with i18n plugin, `$t('key')` resolves | — |
| `CP-02` | `STEP-03`, `STEP-04`, `STEP-05` | grep возвращает 0 hardcoded Cyrillic в views/components | `EVID-02` |
| `CP-03` | `STEP-06` | Language switch ru↔en works, persists through reload | `EVID-01` |
| `CP-04` | `STEP-07` | `yarn test:coverage` — 0 failures, coverage ≥93% | `EVID-01`, `EVID-03` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
|---|---|---|---|---|
| `ER-01` | vue-i18n Composition API mode конфликтует с Vuetify 3 | App crash / warnings | Fallback на Legacy API mode | Console errors при boot |
| `ER-02` | Тесты массово ломаются из-за отсутствия i18n context | Блокирует `STEP-07` | Приоритизировать test infra update (mountWithVuetify) | >10 test failures |
| `ER-03` | Пропущенные hardcoded строки (dynamic, computed, tooltips) | `CHK-02` fails | Второй проход grep + manual review | grep >0 after STEP-05 |
| `ER-04` | English translations неточные | UX degradation | Key-by-key review; uncertain → TODO comment | Post-execution review |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
|---|---|---|---|---|
| `STOP-01` | `ER-01` | vue-i18n несовместим с Vuetify 3 | Удалить vue-i18n, откатить все STEP | Состояние до FT-019 |
| `STOP-02` | `ER-02` | >30 тестов ломаются без fix в 3 итерации | Эскалировать | Откатить до CP-01 |

## Готово для приемки

- [ ] `CHK-01` pass: i18n тесты зелёные (language switch, default locale, fallback, invalid locale)
- [ ] `CHK-02` pass: grep возвращает 0 hardcoded Cyrillic в `.vue` файлах
- [ ] `CHK-03` pass: `yarn test:coverage` — 0 failures, coverage ≥93%
- [ ] `CHK-04` pass: `domain/frontend.md` Localization section обновлена
- [ ] `feature.md` → `delivery_status: done`
- [ ] `implementation-plan.md` → `status: archived`
