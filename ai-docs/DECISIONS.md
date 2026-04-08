# Apartus — Architectural Decisions

> Лог ключевых архитектурных и технических решений.
> Формат: решение, альтернативы, причина выбора.
> Обновляется при принятии решений, влияющих на архитектуру.

---

<!-- Template:
## DEC-NNN: Title (YYYY-MM-DD)

**Решение:** что выбрали
**Альтернативы:** что рассматривали
**Причина:** почему выбрали именно это
**Влияние:** на какие модули/фазы влияет
-->

## DEC-001: Monorepo structure (2026-03-27)

**Решение:** Монорепо с `/backend` (Rails API) и `/frontend` (Vue SPA)
**Альтернативы:** Отдельные репозитории, Rails monolith с Inertia.js
**Причина:** Простота разработки на старте, единый CI/CD, при этом чёткое разделение backend/frontend
**Влияние:** Вся структура проекта, деплой

## DEC-002: No TypeScript (2026-03-27)

**Решение:** Чистый JavaScript во frontend
**Альтернативы:** TypeScript
**Причина:** Скорость разработки на старте, меньше boilerplate, можно добавить позже
**Влияние:** Frontend, виджет бронирования

## DEC-003: Rails 8 built-in auth (2026-03-27)

**Решение:** Использовать встроенную аутентификацию Rails 8
**Альтернативы:** Devise, custom JWT
**Причина:** Rails 8 предоставляет достаточный функционал из коробки, меньше зависимостей
**Влияние:** Phase 1 (Auth)

## DEC-004: Integer cents for money (2026-03-27)

**Решение:** Хранить деньги как integer с суффиксом `_cents`
**Альтернативы:** decimal, money gem, string
**Причина:** Точность без проблем с float, простота, стандартный паттерн
**Влияние:** Все модели с денежными полями (Phase 4, 6, 7)

## DEC-005: Standard bigint PKs (2026-03-27)

**Решение:** Стандартные bigint primary keys
**Альтернативы:** UUID
**Причина:** Проще для разработки, лучше производительность при JOIN, UUID можно добавить позже для публичных API
**Влияние:** Все модели

## DEC-006: Axios for API client (2026-03-27)

**Решение:** Axios для HTTP-клиента на frontend
**Альтернативы:** Native fetch wrapper
**Причина:** Interceptors для auth-токенов, встроенный baseURL, auto-JSON, стандарт Vue-экосистемы
**Влияние:** Frontend, все API-запросы

## DEC-007: Health check endpoint (2026-03-27)

**Решение:** GET /api/v1/health возвращает `{ status: "ok" }`
**Альтернативы:** Использовать только Rails built-in /up
**Причина:** CI smoke tests, будущие readiness probes, проверка API-слоя отдельно от Rails
**Влияние:** CI, мониторинг

## DEC-008: No Docker Compose (2026-03-27)

**Решение:** PostgreSQL нативный, без Docker Compose для локальной разработки
**Альтернативы:** Docker Compose с PostgreSQL + Redis
**Причина:** PG уже установлен нативно, деплой через Kamal, Redis пока не нужен (Solid * работают с PG)
**Влияние:** Локальная разработка, onboarding

## DEC-009: JWT token-based auth (2026-03-27)

**Решение:** JWT с access (15min) + refresh (30d) токенами, JwtDenylist для отзыва
**Альтернативы:** Session + cookies (Rails default), API token в БД
**Причина:** Паттерн из проекта fines, stateless, хорошо работает для SPA с token refresh
**Влияние:** Phase 1, все API-запросы, frontend auth store

## DEC-010: Membership model for multi-org (2026-03-27)

**Решение:** User <-> Organization через Membership (many-to-many), роль на уровне membership
**Альтернативы:** User belongs_to Organization (как в fines)
**Причина:** PMS-менеджер может управлять несколькими организациями с разными ролями
**Влияние:** Auth, все org-scoped запросы, X-Organization-Id header

## DEC-011: Permissions as text array on Role (2026-03-27)

**Решение:** Разрешения хранятся как text[] массив в модели Role, Permissions concern с константами
**Альтернативы:** Отдельная модель Permission с join-таблицей, enum ролей без гранулярности
**Причина:** Баланс гибкости и простоты — не нужна отдельная таблица, при этом полная кастомизация ролей
**Влияние:** RBAC, Pundit policies, preset roles при создании организации
