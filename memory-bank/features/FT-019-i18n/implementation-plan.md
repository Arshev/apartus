---
title: "FT-019: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-plan для внедрения vue-i18n. Discovery context, шаги, test strategy, approval gates."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_019_scope
  - ft_019_architecture
  - ft_019_acceptance_criteria
  - ft_019_blocker_state
---

# План имплементации

## Цель текущего плана

Внедрить vue-i18n в frontend Apartus: установить пакет, создать locale-файлы (ru/en), заменить все hardcoded строки в 24 Vue-файлах, добавить language switcher, обновить тесты.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
|---|---|---|---|
| `frontend/src/main.js` | App bootstrap, подключает vuetify, pinia, router | Место подключения i18n plugin | Mirror: `app.use(i18n)` по аналогии с vuetify |
| `frontend/src/plugins/vuetify.js` | Vuetify plugin setup | Паттерн plugin-файла | Mirror: создать `plugins/i18n.js` |
| `frontend/src/plugins/pinia.js` | Pinia plugin setup | Паттерн plugin-файла | — |
| `frontend/src/stores/auth.js` | Auth store, `fetchCurrentUser`, `switchOrganization` | Место чтения org.settings.locale | Добавить locale sync |
| `frontend/src/views/SettingsView.vue` | Settings (General, Integrations, Members, Roles tabs) | Место language switcher | Добавить v-select в General tab |
| `frontend/src/components/AppSidebar.vue` | Sidebar navigation, русские labels | 5+ hardcoded строк | Заменить на `$t()` |
| `frontend/src/components/AppTopbar.vue` | Topbar, "Выйти" button | 2+ hardcoded строк | Заменить на `$t()` |
| `frontend/src/views/*.vue` (22 файла) | All view components | ~200+ hardcoded русских строк | Заменить на `$t()` |
| `frontend/src/__tests__/helpers/mountWithVuetify.js` | Test mount helper с Vuetify stubs | Место добавления i18n mock | Добавить i18n plugin в global.plugins |
| `frontend/vitest.config.js` | Test config, coverage threshold: 93 | Coverage ratchet | Не понижать |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites | Required CI suites | Manual-only gap | Approval ref |
|---|---|---|---|---|---|---|---|
| i18n plugin setup | `REQ-01`, `SC-02` | none | Unit test: default locale = ru, fallback works | `yarn test` | `frontend-test` | none | none |
| Language switch | `REQ-04`, `REQ-05`, `SC-01` | none | Integration test: switch locale → texts change | `yarn test` | `frontend-test` | none | none |
| Existing view tests | `REQ-06`, `EC-03` | 409 specs | Update mountWithVuetify to provide i18n | `yarn test` | `frontend-test` | none | none |
| Hardcoded string check | `REQ-03`, `EC-01` | none | `CHK-02` grep command | manual | — | Grep-based, not CI | none |
| Coverage ratchet | `EC-04` | 93% threshold | `yarn test:coverage` | `yarn test:coverage` | `frontend-test` | none | none |

## Open Questions / Ambiguities

| OQ ID | Question | Why unresolved | Blocks | Default action |
|---|---|---|---|---|
| `OQ-01` | Нужно ли переводить enum labels (property types, unit types, reservation statuses)? | Это data-level, не UI-level | `STEP-04` | Да, включаем в locale files — они отображаются в UI |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
|---|---|---|---|
| setup | `cd frontend && yarn install` после добавления vue-i18n | `STEP-01` | Import error |
| test | `cd frontend && yarn test` | `CHK-01`, `CHK-03` | Test failures |
| coverage | `cd frontend && yarn test:coverage` | `CHK-03` | Coverage below 93% |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
|---|---|---|---|---|
| `PRE-01` | `CON-01` | npm пакет `vue-i18n` одобрен пользователем | `STEP-01` | yes |
| `PRE-02` | `ASM-02` | Backend принимает `settings: {}` в PATCH /organizations | `STEP-05` | no (already works) |

## Approval Gates

| AG ID | Trigger | Applies to | Why approval required | Approver |
|---|---|---|---|---|
| `AG-01` | Добавление npm пакета `vue-i18n` | `STEP-01` | autonomy-boundaries.md: новые пакеты требуют согласования | User |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command | Blocked by | Needs approval | Escalate if |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `STEP-01` | agent | `REQ-01` | Install vue-i18n, create plugin | `package.json`, `src/plugins/i18n.js`, `src/main.js` | i18n plugin configured | `CHK-01` (partial) | `EVID-01` (partial) | `yarn dev` starts without errors | `PRE-01` | `AG-01` | Package conflicts |
| `STEP-02` | agent | `REQ-02` | Create ru.json and en.json locale files | `src/locales/ru.json`, `src/locales/en.json` | Locale files with hierarchical keys | `CHK-02` (partial) | `EVID-02` (partial) | JSON valid, key count matches | — | none | — |
| `STEP-03` | agent | `REQ-03` | Replace hardcoded strings in components | `src/components/AppSidebar.vue`, `src/components/AppTopbar.vue` | Components use `$t()` | `CHK-02` (partial) | `EVID-02` (partial) | `grep` finds 0 Cyrillic in components | `STEP-02` | none | — |
| `STEP-04` | agent | `REQ-03` | Replace hardcoded strings in all views | `src/views/*.vue` (22 files) | Views use `$t()` | `CHK-02` | `EVID-02` | `grep` finds 0 Cyrillic in views | `STEP-02` | none | >50 untranslatable strings |
| `STEP-05` | agent | `REQ-04`, `REQ-05` | Language switcher + persistence | `src/views/SettingsView.vue`, `src/stores/auth.js` | Locale switch works, persists via org settings | `CHK-01` (partial) | — | Manual: switch language, reload, verify | `STEP-01` | none | Backend rejects settings |
| `STEP-06` | agent | `REQ-06` | Update test infrastructure | `src/__tests__/helpers/mountWithVuetify.js`, `src/__tests__/setup.js` | i18n available in all tests | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` | `yarn test` + `yarn test:coverage` | `STEP-01` | none | >10 tests fail |
| `STEP-07` | agent | `REQ-07` | Update domain/frontend.md | `memory-bank/domain/frontend.md` | Localization section added | `CHK-04` | `EVID-04` | Read file | — | none | — |

## Parallelizable Work

- `PAR-01` После завершения STEP-01, STEP-02 (locale files) и STEP-05 (language switcher) могут идти параллельно. STEP-03/04 зависят от STEP-02.
- `PAR-02` STEP-07 (docs) может идти параллельно с любым STEP.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
|---|---|---|---|
| `CP-01` | `STEP-01`, `STEP-02` | i18n plugin работает, locale files созданы, `yarn dev` стартует | — |
| `CP-02` | `STEP-03`, `STEP-04` | 0 hardcoded Cyrillic в views/components | `EVID-02` |
| `CP-03` | `STEP-06` | All 409+ tests pass, coverage ≥93% | `EVID-01`, `EVID-03` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
|---|---|---|---|---|
| `ER-01` | vue-i18n конфликтует с Vuetify компонентами | Сломанные UI компоненты | Проверить совместимость версий до начала | Import errors в `yarn dev` |
| `ER-02` | Тесты массово ломаются из-за отсутствия i18n context | Блокирует STEP-06 | Приоритизировать STEP-06 (test infra) сразу после STEP-01 | >10 test failures |
| `ER-03` | Coverage падает ниже 93% из-за новых untested paths | Блокирует merge | Добавить тесты для i18n plugin и language switch | `yarn test:coverage` threshold fail |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
|---|---|---|---|---|
| `STOP-01` | `ER-01` | vue-i18n несовместим с текущим Vuetify | Удалить vue-i18n, откатить изменения | Состояние до STEP-01 |
| `STOP-02` | `ER-02` | >30 тестов ломаются без возможности починки в 3 итерации | Эскалировать upstream | Откатить до CP-01 |

## Готово для приемки

1. Все `CHK-*` из feature.md пройдены (CHK-01..04).
2. Все `EVID-*` заполнены (EVID-01..04).
3. `yarn test` — 0 failures.
4. `yarn test:coverage` — ≥93%.
5. `grep` — 0 hardcoded Cyrillic в views/components.
6. `domain/frontend.md` обновлён.
7. Simplify review пройден.
8. `feature.md` → `delivery_status: done`, план → `status: archived`.
