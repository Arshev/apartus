---
title: "FT-019: Frontend Internationalization (vue-i18n)"
doc_kind: feature
doc_function: canonical
purpose: "Внедрение vue-i18n для поддержки нескольких языков UI. Русский — primary, английский — secondary. Все hardcoded строки выносятся в locale-файлы."
derived_from:
  - ../../domain/problem.md
  - ../../domain/frontend.md
  - ../../engineering/coding-style.md
status: active
delivery_status: planned
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-019: Frontend Internationalization (vue-i18n)

## What

### Problem

UI Apartus содержит 453 строки с hardcoded кириллицей в 24 Vue-файлах (22 views + 2 components). Это блокирует выход на международный рынок и делает невозможным переключение языка без ручной замены строк в каждом файле.

Текущее состояние зафиксировано в [domain/frontend.md, Localization](../../domain/frontend.md): строки inline, i18n отложен. FT-015 (configurable currency) подтвердил, что международные клиенты — реальный сегмент.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
|---|---|---|---|---|
| `MET-01` | Locale-файлы покрывают все UI-строки | 0 | 2 (ru, en) | `src/locales/ru.json` + `en.json` key count match |
| `MET-02` | Строки с hardcoded кириллицей в Vue files | 453 (grep baseline) | 0 | `grep -rn '[А-Яа-яЁё]' src/views/ src/components/ --include='*.vue'` |
| `MET-03` | Coverage ratchet | 93 | `floor(actual) - 1` | vitest.config.js |

### Scope

- `REQ-01` Установить и настроить `vue-i18n` (Composition API mode) как Vite plugin. Locale по умолчанию: `ru`. Fallback locale: `ru`.
- `REQ-02` Создать locale-файлы `src/locales/ru.json` и `src/locales/en.json` с иерархической структурой по views/components.
- `REQ-03` Заменить все hardcoded русские строки во всех `.vue` файлах на `$t('key')` / `t('key')` вызовы.
- `REQ-04` Добавить language switcher в `SettingsView.vue` (вкладка "Общие" / `value="general"`) — `v-select` с выбором ru/en. Сохранение в `organization.settings.locale` через PATCH `/api/v1/organizations` (backend уже принимает `settings: {}` через `organization_params`).
- `REQ-05` Locale persistence: при загрузке приложения читать `organization.settings.locale` и устанавливать `i18n.global.locale`. Fallback на `ru` если не задано.
- `REQ-06` Frontend тесты: обновить существующие тесты для работы с i18n plugin (global mock или provide), добавить тест на language switch.
- `REQ-07` Обновить `domain/frontend.md` — раздел Localization с описанием i18n architecture.

### Non-Scope

- `NS-01` Backend i18n (API error messages, mailer templates) — отдельная фича.
- `NS-02` Третьи языки (кроме ru/en).
- `NS-03` RTL layout support.
- `NS-04` Автоматическое определение языка по browser locale.
- `NS-05` Перевод PDF-отчётов (FT-017).
- `NS-06` Перевод E2E тестов.

### Constraints / Assumptions

- `ASM-01` `vue-i18n` — единственный допустимый i18n пакет (де-факто стандарт для Vue 3).
- `CON-01` Требует согласования на добавление npm пакета `vue-i18n` (autonomy-boundaries.md).
- `CON-02` Все существующие тесты должны продолжить работать после внедрения i18n.
- `ASM-02` Backend `Organization#settings` уже поддерживает произвольные JSONB-поля — locale будет храниться как `settings.locale`.

## How

### Solution

Внедрить `vue-i18n` в Composition API mode. Создать два JSON locale-файла (ru/en) с иерархической структурой, повторяющей layout views. Все `<template>` строки заменить на `{{ $t('key') }}`. Language switcher в SettingsView сохраняет выбор в org settings. При boot приложение читает org locale и устанавливает `i18n.global.locale.value`.

Trade-off: JSON locale files vs SFC `<i18n>` blocks. Выбираем JSON — проще для внешних переводчиков, один файл на язык, стандартный формат.

### Change Surface

| Surface | Type | Why it changes |
|---|---|---|
| `frontend/src/plugins/i18n.js` | code (new) | Plugin setup, locale files import |
| `frontend/src/locales/ru.json` | data (new) | Русские строки |
| `frontend/src/locales/en.json` | data (new) | Английские строки |
| `frontend/src/main.js` | code | Подключение i18n plugin |
| `frontend/src/views/*.vue` (all ~20 views) | code | `$t()` вместо hardcoded строк |
| `frontend/src/components/*.vue` (sidebar, topbar) | code | `$t()` вместо hardcoded строк |
| `frontend/src/views/SettingsView.vue` | code | Language switcher UI |
| `frontend/src/stores/auth.js` | code | Set locale on org load |
| `frontend/src/__tests__/` | code | i18n plugin mock/provide |
| `memory-bank/domain/frontend.md` | doc | Localization раздел |

### Flow

1. Приложение загружается → `fetchCurrentUser()` → читает `organization.settings.locale`.
2. Устанавливает `i18n.global.locale.value = locale || 'ru'`.
3. Все `$t('key')` разрешаются через текущий locale.
4. Пользователь меняет язык в Settings → PATCH `/api/v1/organizations` с `settings.locale` → `i18n.global.locale.value` обновляется → UI перерисовывается.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
|---|---|---|---|
| `CTR-01` | `organization.settings.locale` (string: "ru"/"en") | Backend (JSONB) / Frontend (i18n) | Fallback: "ru" если отсутствует |

### Failure Modes

- `FM-01` Отсутствующий ключ в locale-файле → vue-i18n показывает key path вместо текста. Mitigation: fallback locale = ru, все ключи должны присутствовать в обоих файлах.
- `FM-02` Тесты ломаются из-за отсутствия i18n plugin → Mitigation: global mock в test setup или provide в mountWithVuetify.
- `FM-03` Backend не принимает `settings.locale` через `organization_params` → Mitigation: проверить `OrganizationsController#organization_params` (`params.require(:organization).permit(:name, :currency, settings: {})`). `settings: {}` уже разрешает произвольные ключи; если нет — добавить. Это backend-изменение, зафиксировать в STEP.

### ADR Dependencies

Нет новых ADR. `CON-01` (добавление vue-i18n) требует AG в implementation-plan.

## Verify

### Exit Criteria

- `EC-01` Все UI-строки вынесены в locale-файлы; `grep` по `.vue` не находит hardcoded русских строк (кроме locale keys).
- `EC-02` Переключение ru↔en в Settings работает и сохраняется.
- `EC-03` Все существующие тесты проходят.
- `EC-04` Coverage ratchet не понижен.

### Acceptance Scenarios

- `SC-01` Happy path: пользователь открывает приложение → UI на русском → идёт в Settings (вкладка "Общие") → переключает язык на English → PATCH `/api/v1/organizations` сохраняет `settings.locale="en"` → все labels, buttons, menu items отображаются на английском → полная перезагрузка страницы → `fetchCurrentUser` возвращает `locale="en"` → UI остаётся на английском.
- `SC-02` Default locale: новая организация (без `settings.locale`) → UI на русском (fallback).
- `SC-03` Missing key resilience: если в en.json отсутствует ключ → отображается русский текст (fallback locale).

### Negative / Edge Cases

- `NEG-01` Некорректный locale в settings (e.g. "de") → fallback на ru.
- `NEG-02` Backend возвращает organization без settings → locale = ru.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
|---|---|---|---|---|
| `REQ-01` | `ASM-01`, `CON-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | | `EC-01`, `SC-01`, `SC-03` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |
| `REQ-03` | | `EC-01`, `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-04` | `CTR-01` | `EC-02`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-05` | `CTR-01`, `FM-03` | `EC-02`, `SC-02`, `NEG-01`, `NEG-02` | `CHK-01` | `EVID-01` |
| `REQ-06` | `FM-02` | `EC-03`, `EC-04` | `CHK-03` | `EVID-03` |
| `REQ-07` | | `EC-01` | `CHK-04` | `EVID-04` |

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
|---|---|---|---|---|
| `CHK-01` | `EC-02`, `SC-01`, `SC-02`, `NEG-01`, `NEG-02` | `cd frontend && yarn test -- --grep "i18n\|locale\|language"` | i18n-specific tests pass: language switch, default locale, fallback, invalid locale | `artifacts/ft-019/verify/chk-01/` |
| `CHK-02` | `EC-01` | `grep -rn '[А-Яа-яЁё]' frontend/src/views/ frontend/src/components/ --include='*.vue' \| grep -v '^\s*//' \| grep -v 'locales\|__tests__'` | 0 matches — ни одной hardcoded кириллической строки в template/script секциях .vue файлов | `artifacts/ft-019/verify/chk-02/` |
| `CHK-03` | `EC-03`, `EC-04` | `cd frontend && yarn test:coverage` | Coverage ≥ 93% threshold, 0 failures, full regression green | `artifacts/ft-019/verify/chk-03/` |
| `CHK-04` | `REQ-07` | Read `memory-bank/domain/frontend.md` Localization section | Section exists and describes i18n architecture | `artifacts/ft-019/verify/chk-04/` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
|---|---|---|
| `CHK-01` | `EVID-01` | `artifacts/ft-019/verify/chk-01/` |
| `CHK-02` | `EVID-02` | `artifacts/ft-019/verify/chk-02/` |
| `CHK-03` | `EVID-03` | `artifacts/ft-019/verify/chk-03/` |
| `CHK-04` | `EVID-04` | `artifacts/ft-019/verify/chk-04/` |

### Evidence

- `EVID-01` Vitest output: all tests pass including i18n/language switch tests.
- `EVID-02` grep output: 0 hardcoded Cyrillic strings in views/components.
- `EVID-03` Vitest coverage output: threshold met.
- `EVID-04` Screenshot or content of updated `domain/frontend.md` Localization section.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
|---|---|---|---|---|
| `EVID-01` | Vitest run log | `yarn test` | `artifacts/ft-019/verify/chk-01/` | `CHK-01` |
| `EVID-02` | grep output | shell command | `artifacts/ft-019/verify/chk-02/` | `CHK-02` |
| `EVID-03` | Coverage report | `yarn test:coverage` | `artifacts/ft-019/verify/chk-03/` | `CHK-03` |
| `EVID-04` | Doc content | manual read | `artifacts/ft-019/verify/chk-04/` | `CHK-04` |
