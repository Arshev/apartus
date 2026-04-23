---
title: Apartus Testing Policy
doc_kind: engineering
doc_function: canonical
purpose: Testing policy Apartus — backend RSpec + frontend Vitest, coverage ratchet, manual-only исключения, simplify review.
derived_from:
  - ../dna/governance.md
  - ../flows/feature-flow.md
status: active
canonical_for:
  - apartus_testing_policy
  - coverage_ratchet_rules
  - simplify_review_discipline
audience: humans_and_agents
last_verified: 2026-04-13
---

# Testing Policy

## Stack

- **Backend:** RSpec, FactoryBot, Shoulda Matchers, SimpleCov
- **Frontend:** Vitest + jsdom, v8 coverage provider
- **Data:** FactoryBot factories для backend, test helpers для Vitest. Seeded test DB через `bin/rails db:test:prepare`.

## Local Commands

```bash
# Backend
cd backend && bundle exec rspec
cd backend && bundle exec rubocop

# Frontend
cd frontend && yarn test
cd frontend && yarn test:coverage
cd frontend && yarn build
```

## CI Jobs

- `backend-test` — RSpec full suite, SimpleCov ratchet
- `backend-lint` — RuboCop
- `frontend-test` — Vitest с coverage
- `frontend-build` — Vite production build
- Coverage badges обновляются на push в `main` (см. `.github/workflows/`).

## Core Rules

- Любое изменение детерминированного поведения получает automated regression coverage.
- Любой bugfix добавляет regression test на воспроизводимый сценарий.
- Любой новый или изменённый API contract получает request spec (backend) или integration test (frontend).
- Required suites должны быть зелёными локально и в CI до handoff.
- Manual-only verify допустим только для UI-нюансов без детерминированной проверки (визуальная верстка) и требует явного `AG-*` с approval.

## Coverage Ratchet

**Механизм:**

- Backend: `backend/spec/spec_helper.rb` содержит `SimpleCov.minimum_coverage line: N`.
- Frontend: `frontend/vitest.config.js` содержит `test.coverage.thresholds.lines: N`.

**Правила подъёма:**

- После merge каждой feature смотрим фактический процент покрытия и поднимаем floor до `floor(actual) - 1` (буфер против флейков).
- **Никогда не понижаем** существующий порог без ADR.
- Текущие ratchet thresholds (enforced через CI):
  - Backend: `SimpleCov.minimum_coverage line: 98` (`backend/spec/spec_helper.rb`)
  - Frontend: `test.coverage.thresholds.lines: 93` (`frontend/vitest.config.js`)
- Фактические числа (spec counts, actual %) — в CI output. Не дублируются здесь, чтобы не устаревали.

## Ownership Split

- Canonical test case inventory фичи задаётся в `feature.md` через `SC-*`, `NEG-*`, `CHK-*`, `EVID-*` — см. [`../flows/feature-flow.md`](../flows/feature-flow.md).
- `implementation-plan.md` владеет только стратегией исполнения: какие test surfaces обновляем, какие gaps временно manual-only.

## Что считается Sufficient Coverage

- Покрыт основной changed behavior.
- Покрыты новые/изменённые contracts и события.
- Покрыты критичные failure modes из `FM-*`.
- Покрыты feature-specific negative/edge scenarios (`NEG-*`), если они меняют verdict.
- Процент — не самоцель; сценарное + контрактное покрытие обязательно.

## Project-Specific Conventions

### Backend (RSpec)

- Request specs — в `spec/requests/api/v1/<resource>_spec.rb`. Полное HTTP-покрытие: happy path + auth + authorization + validation + cross-org isolation.
- Model specs — валидации, ассоциации, custom методы, callbacks. FactoryBot traits для вариантов.
- Policy specs — Pundit policies в `spec/policies/`.
- **Multi-tenant isolation** — обязательный test case в request specs: запрос с чужим `organization_id` должен возвращать 404, не 403.
- **Reference implementation:** `spec/requests/api/v1/properties_spec.rb` — эталонная структура request spec'а.

### Frontend (Vitest)

- Тесты рядом с кодом (`src/**/*.test.js`) или в `src/__tests__/`.
- Тестируем: stores (Pinia), pure composables, API клиенты (с mocked axios), критичные компоненты.
- Не мокаем глобально — test helpers per suite.
- Snapshot-тесты использовать экономно, только для стабильных UI.
- `src/__tests__/setup.js` — localStorage polyfill для Node 25+ (setupFiles в vitest.config.js).
- `src/__tests__/helpers/mountWithVuetify.js` — mount helper с Vuetify stubs для jsdom.

### E2E (Playwright)

- Файлы в `frontend/e2e/*.spec.js`. Конфиг: `playwright.config.js`.
- 220 тестов, 22 файла. 100% покрытие интерактивных элементов (все кнопки, формы, диалоги, переходы).
- Запуск: `cd frontend && npx playwright test`. Требует работающий backend на порту 3000 с seed данными.
- `e2e/helpers.js` — shared `login(page)` и `DEMO_USER` credentials.
- Каждый view покрыт: load, CRUD (create/edit/delete), validation, error handling, snackbar feedback.
- Stateful: тесты зависят от seed data (`db/seeds.rb`) — 5 guests, 10 reservations, 6 units, 3 properties.

## Simplify Review

Отдельный проход после функциональных тестов, до closure gate.

- Цель — минимальная сложность, нет premature abstractions, нет dead code, нет дублирования.
- Три похожие строки лучше premature abstraction.
- Complexity оправдана только со ссылкой на `CON-*`, `FM-*` или `DEC-*`.

## Verification Context Separation

1. **Функциональная верификация** — tests pass, SC-* покрыты
2. **Agent-first code review** — соответствие спеке, безопасность, архитектура (см. [`flows/prompts/code-review.md`](../flows/prompts/code-review.md))
3. **Simplify review** — код минимально сложен
4. **Acceptance** — end-to-end по `SC-*`

Каждый проход — логически отдельный. Для мелких features допустимо в одной сессии, но simplify review никогда не пропускается.
