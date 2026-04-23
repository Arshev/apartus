# Apartus — Session Context

## Product
Apartus — SaaS Property Management System (PMS) для управления краткосрочной и долгосрочной арендой. Единый центр управления объектами, бронированиями, гостями, финансами; хаб между площадками-агрегаторами (Booking.com, Airbnb, Островок) и собственниками недвижимости. Фокус — русскоязычный рынок.

Сегменты: Управляющие компании (10–500+ юнитов) и частные арендодатели (1–10 объектов).

## Stack
- Backend: Ruby 3.x, Rails 8 (API-only), PostgreSQL
- Frontend: Vue 3 (JS, без TypeScript — см. ADR-002), Vuetify 3, Vite, Pinia, vue-i18n
- Money: integer cents (ADR-004), per-org configurable currency (FT-015)
- Auth: Rails 8 built-in + JWT (ADR-003, ADR-009)
- Authorization: Pundit (nested pattern — ADR-012)
- Files: Active Storage
- PDF: Prawn (Arial TTF), отчёты по владельцам и финансам (FT-017)
- HTTP: axios + interceptors (ADR-006)

## Key Constraints
- PCON-01 Multi-tenant isolation: все запросы scoped через `Current.organization`. Чужой id → 404, не 403.
- PCON-02 Русский язык основной; FT-019 i18n уже внедрён (ru/en).
- PCON-03 Money fields — integer cents, суффикс `_cents`.
- PCON-04 Monorepo `/backend` + `/frontend` (ADR-001).
- No TypeScript на frontend (ADR-002).

## Module Boundaries
Backend: Organization → Branch → Property → Unit → Reservation (+ Guest, Pricing, Expense, Task, Owner, Subscription). Channel Manager (iCal). Active Storage для фото.
Frontend: views/, stores/, api/, composables/. Gantt Calendar — pixel-based timeline (FT-020..024, FT-030..034).

## Autonomy Boundaries
**Автопилот:** код, тесты (rspec/vitest/playwright), линтеры (rubocop-rails-omakase), ветки, чтение логов, memory-bank updates, feature артефакты.

**Супервизия (покажи план):** новые модели и миграции, API-контракт изменения, удаление кода вне фичи, PR в main, изменение routes/config.

**Эскалация (остановись):** новые gems / npm-пакеты без «да», правки существующих миграций, реализация auth (есть), TypeScript, production/live данные, payments/security, конфликтующие паттерны, destructive git (`--force`, `reset --hard`, `rebase -i`) без разрешения.

**Lifecycle enforcement:** автор ≠ ревьюер, draft→active только через review с 0 замечаний, implementation-plan обязателен для новых фич, simplify review отдельным проходом. Детали: `memory-bank/engineering/autonomy-boundaries.md`.

## Testing
- Backend: `cd backend && bundle exec rspec` (RSpec + FactoryBot)
- Frontend unit: `cd frontend && yarn test`
- Frontend E2E: `cd frontend && yarn pw` (Playwright)
- Bugfix → regression test first. Coverage ratchet: не понижать без ADR.
- Simplify review обязателен после функционального тестирования.

## Key References
- Problem & roadmap: `memory-bank/domain/problem.md`
- Архитектура: `memory-bank/domain/architecture.md`
- Schema: `memory-bank/domain/schema.md`
- API reference: `memory-bank/domain/api-reference.md`
- State machines: `memory-bank/domain/state-machines.md`
- Coding style + reference impls: `memory-bank/engineering/coding-style.md`
- Feature lifecycle + state schema: `memory-bank/flows/feature-flow.md`, `memory-bank/flows/state-schema.md`
- Review criteria (TAUS/IEEE 830): `memory-bank/flows/review-criteria.md`
- Priming prompts: `memory-bank/flows/prompts/`
- ADR 001–015: `memory-bank/adr/`
