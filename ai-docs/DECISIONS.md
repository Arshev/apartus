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

## DEC-012: Class-level `authorize` in UnitsController (2026-04-08)

**Решение:** `UnitsController` вызывает `authorize Unit` (класс) во всех
экшенах, включая `show/update/destroy`, в отличие от эталона F1
`PropertiesController`, где `show/update/destroy` используют
`authorize property` (инстанс).

**Альтернативы:** Instance-level `authorize unit` в `show/update/destroy`,
как в F1.

**Причина:** Spec F2 §4.6 фиксирует порядок обработки запроса:
`find_property → authorize → find_unit`. Это нужно, чтобы коллизия
«нет прав + чужой `:property_id`» давала `404` (не `403`) — инвариант
«не раскрывать существование» сильнее семантической точности ответа.
Instance-level `authorize unit` потребовал бы загрузить юнит **до**
авторизации, что инвертирует порядок и ломает AC4 collision. Record-level
изоляция реализована не в policy, а через scope
`property.units.find_by(id: ...)` в контроллере, что согласовано с
F1 паттерном `Current.organization.properties.find_by(...)`.

**Следствие:** `UnitPolicy` намеренно не обращается к `record`. Добавление
проверок на `record.property...` в будущем сломает §4.6 ordering и
сделает scope-изоляцию наполовину работающей. Не добавлять без
пересмотра §4.6.

**Влияние:** HW-1 F2, потенциально F3–F5, если они введут nested ресурсы
с тем же паттерном.

## DEC-015: Cross-cutting features own retrospective spec patches (2026-04-09)

**Решение:** Когда фича меняет контракт ранее зафиксированной
активной фичи (JSON, сообщения ошибок, public API) — **новая фича
владеет patchем**: ретроспективно обновляет текст старого Spec-документа
и помечает изменение в своём C-блоке docs sync.

**Альтернатива:** новая фича `owns override`, старый Spec остаётся
как был, читатель должен знать цепочку F1 + F5 override.

**Причина выбора:**

- Чистота актуального состояния важнее исторической immutability.
  Читатель старого Spec'а видит актуальный контракт без
  необходимости искать override в новых фичах и накладывать diff в
  голове.
- Консистентно с `ai-docs/SCHEMA.md` и `ai-docs/PLAN.md`, которые
  редактируются непрерывно по мере роста кода.
- Альтернатива `owns override` создаёт разветвлённую ответственность:
  каждый новый читатель Spec'а должен знать, какие override-фичи
  существуют. Это не масштабируется.

**Процедура:**

1. Новая фича явно перечисляет затрагиваемые Spec'и в своём §13.
2. C-блок docs sync включает patch файлов старых Spec'ов.
3. Патч сопровождается inline-нотой в старом Spec'е
   `F<N> retrospective update (<date>): ...`.

**Влияние:** HW-1 F5 применяет первым (изменения F1 JSON-контракта
и F4 `before_destroy` сообщения). HW-2+ следуют.

## DEC-014: Adjacency list for Branch tree (2026-04-09)

**Решение:** Branch-дерево реализовано через adjacency list — один
столбец `parent_branch_id` (self-referential FK). Иерархия обходится
Ruby-кодом в custom-валидациях (cycle check) или PostgreSQL
`WITH RECURSIVE` по мере необходимости.

**Альтернативы:**

- Closure table (`branch_ancestries` join с depth).
- Gem `ancestry` / `closure_tree`.

**Причина выбора:**

- Adjacency list — Rails standard для tree-structures, минимум
  кода, без новых зависимостей.
- Ожидаемый размер дерева на организацию — десятки узлов, глубина
  3–5 уровней. На этом масштабе разница в производительности
  несущественна.
- CLAUDE.md запрещает новые gem'ы без явного согласования, поэтому
  `ancestry`/`closure_tree` вне scope HW-1.
- Closure table удваивает сложность writes (каждое перемещение
  пересчитывает поддерево), что не оправдано для HW-1 объёмов.
- Custom-валидации F4 (`parent_is_not_self`, `parent_is_not_descendant`
  через upward walk, `parent_branch_must_exist_in_org`,
  `before_destroy`) реализуются в adjacency list elegantly.

**Влияние:** HW-1 F4 реализация. При росте до тысяч узлов на
организацию — может понадобиться пересмотр в пользу closure table,
но это отдельная фича за пределами HW-1.

## DEC-013: has_many :through for Unit <-> Amenity (2026-04-08)

**Решение:** M:N связь Unit ↔ Amenity реализована через явную
join-модель `UnitAmenity` и `has_many :through :unit_amenities`.

**Альтернативы:** `has_and_belongs_to_many` (HABTM).

**Причина выбора:**

- HABTM устарел для нового кода в Rails 8; current best practice —
  `has_many :through`.
- `UnitAmenity` как полноценный ActiveRecord позволяет:
  - явные валидации (`uniqueness [unit_id, amenity_id]`);
  - callbacks и observers при необходимости;
  - прямой доступ к join-атрибутам (сейчас только timestamps, в
    будущем — `attached_at`, `source`, `confidence`);
  - возможность для `Amenity` модели добавить `before_destroy`
    callback с кастомным сообщением для инварианта §3.5.6 F3 Spec,
    что невозможно в HABTM (нет модели для callback'ов).

**Влияние:** HW-1 F3 реализация; паттерн для всех будущих M:N в
проекте.

## DEC-011: Permissions as text array on Role (2026-03-27)

**Решение:** Разрешения хранятся как text[] массив в модели Role, Permissions concern с константами
**Альтернативы:** Отдельная модель Permission с join-таблицей, enum ролей без гранулярности
**Причина:** Баланс гибкости и простоты — не нужна отдельная таблица, при этом полная кастомизация ролей
**Влияние:** RBAC, Pundit policies, preset roles при создании организации
