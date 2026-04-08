---
name: F1 Spec — Property CRUD
status: active
related_issue: "#10"
umbrella_issue: "#1"
brief: ./brief.md
feature: 01-property-crud
---

# Spec — Property CRUD

> Контракт реализации. Описывает **что** должно быть сделано, не **как**.
> «Как» — в `plan.md`.

## 1. Ссылка на источник

- Brief: [./brief.md](./brief.md)
- Issue: Arshev/apartus#10 (фича), Arshev/apartus#1 (зонтичный HW-1)
- План в `ai-docs/PLAN.md`: пункты `2.1.1`, `2.2.1`, `2.2.6` (частично).

## 2. Scope

### 2.1. Входит

- Доменная модель `Property`, принадлежащая ровно одной `Organization`.
- REST-ресурс `/api/v1/properties` с операциями `index`, `show`, `create`,
  `update`, `destroy`.
- Авторизация через систему permissions, уже существующую в проекте
  (`Permissions` concern, коды `properties.view` и `properties.manage`).
- Изоляция данных по организации текущего запроса (`Current.organization`).
- Покрытие сценариев request-спеками (см. §10).

### 2.2. Не входит

- Поле `branch_id` и связь Property↔Branch — F5.
- Модель `Unit` и nested-маршрут `/api/v1/properties/:id/units` — F2.
- `Amenity`, `UnitAmenity` — F3.
- Загрузка фотографий (Active Storage) — Phase 2.1.4.
- Поиск, сортировка, пагинация, фильтрация — отдельные задачи.
- Soft delete (Property удаляется физически).
- Frontend.
- Любые изменения схем других моделей.

## 3. Доменная модель

### 3.1. Сущность Property

| Атрибут | Тип | Обязательность | Ограничения |
|---|---|---|---|
| `id` | bigint | автогенерация | PK |
| `organization_id` | bigint | обязательное | FK на `organizations`, индекс, NOT NULL, ON DELETE CASCADE |
| `name` | string | обязательное | 1..255 символов, без ведущих/хвостовых пробелов |
| `address` | string | обязательное | 1..500 символов, без ведущих/хвостовых пробелов |
| `property_type` | integer (enum) | обязательное | одно из: `apartment`, `hotel`, `house`, `hostel` |
| `description` | text | опциональное | 0..5000 символов; допустимы значения `null` и `""` |
| `created_at` | datetime | автогенерация | — |
| `updated_at` | datetime | автогенерация | — |

### 3.2. Enum `property_type`

Значения и числовые коды (стабильны, новые значения добавляются только в
конец списка):

| Код в API (строка) | Числовое значение в БД |
|---|---|
| `apartment` | 0 |
| `hotel` | 1 |
| `house` | 2 |
| `hostel` | 3 |

В JSON-ответе и в JSON-запросе используется **строковое** представление.
Числовое значение — деталь хранения.

### 3.3. Ассоциации

- `Property belongs_to :organization`
- `Organization has_many :properties` (добавляется к существующей модели
  `Organization` без удаления других ассоциаций; при удалении организации
  её properties удаляются вместе с ней — `dependent: :destroy`).

### 3.4. Инварианты (всегда истинны)

1. У каждого `Property` ровно одна `organization_id`, которая никогда не
   `NULL`.
2. После создания `organization_id` **не может быть изменён** ни через API,
   ни через update модели — Property не «переезжает» между организациями.
3. `name`, `address`, `property_type` всегда заполнены.
4. `name` и `address` хранятся уже trimmed (без ведущих/хвостовых пробелов).
5. Property не виден за пределами своей организации — ни через `index`, ни
   через `show`, ни через `update`/`destroy`.

## 4. Авторизация

### 4.1. Аутентификация

Все эндпоинты требуют валидного access-токена (механизм Rails 8 + JWT,
уже работает в проекте). Без токена — `401 Unauthorized` (поведение
текущего `BaseController`).

### 4.2. Контекст организации

Все эндпоинты требуют установленного `Current.organization`, которое
проставляется существующим механизмом из заголовка `X-Organization-Id`.
F1 не меняет это поведение, но фиксирует его как часть контракта (чтобы
тесты F1 могли на него опираться):

| Ситуация | HTTP-код | Тело |
|---|---|---|
| Заголовок `X-Organization-Id` отсутствует | 422 | `{ "error": "Organization not selected" }` |
| Указан несуществующий `id` организации | 404 | `{ "error": "Organization not found" }` |
| Текущий пользователь не состоит в указанной организации | 403 | `{ "error": "Not a member of this organization" }` |

Эти коды одинаковы для всех пяти эндпоинтов F1 и проверяются как минимум
одним тестом каждый (см. AC11).

### 4.3. Permissions

Используются существующие коды из `Permissions::ALL_PERMISSIONS`:

| Действие | Требуемое разрешение |
|---|---|
| `index`  | `properties.view` |
| `show`   | `properties.view` |
| `create` | `properties.manage` |
| `update` | `properties.manage` |
| `destroy`| `properties.manage` |

Проверка — на уровне Pundit-политики, согласованно с тем, как это сделано
в `RolePolicy` (`Current.membership&.can?("...")`).

### 4.4. Поведение при отсутствии прав

- У пользователя есть `properties.view`, но нет `properties.manage`:
  - `index`, `show` → `200 OK`
  - `create`, `update`, `destroy` → `403 Forbidden`
- У пользователя нет ни `properties.view`, ни `properties.manage`:
  - все эндпоинты → `403 Forbidden`

### 4.5. Поведение при попытке доступа к чужому Property

Запрос `show`/`update`/`destroy` с `id` объекта, принадлежащего **другой**
организации, возвращает `404 Not Found` (а не `403`), чтобы не раскрывать
факт его существования. Это следствие scoping через
`Current.organization.properties.find(...)`.

## 5. HTTP API

Базовый префикс: `/api/v1`. Все запросы — JSON. Все ответы — JSON или пусто
(`204 No Content`).

### 5.1. `GET /api/v1/properties` — список

- **Auth:** требуется. **Permission:** `properties.view`.
- **Тело запроса:** отсутствует.
- **Параметры запроса:** отсутствуют (поиск/фильтры — вне scope F1).
- **Ответ `200 OK`:** JSON-массив объектов формата §6. Пустая организация
  возвращает `[]`. Сортировка по `id ASC` (детерминированная для тестов).
- **Ответ `401`:** нет токена.
- **Ответ `403`:** нет `properties.view`.

### 5.2. `GET /api/v1/properties/:id` — детали

- **Auth:** требуется. **Permission:** `properties.view`.
- **Тело запроса:** отсутствует.
- **Ответ `200 OK`:** один объект формата §6.
- **Ответ `401`:** нет токена.
- **Ответ `403`:** нет `properties.view`.
- **Ответ `404 Not Found`:** объект не существует **либо** принадлежит чужой
  организации.

### 5.3. `POST /api/v1/properties` — создание

- **Auth:** требуется. **Permission:** `properties.manage`.
- **Тело запроса:**

  ```json
  {
    "property": {
      "name": "Sea View Apartment",
      "address": "1 Beach Rd, Bali",
      "property_type": "apartment",
      "description": "Optional text"
    }
  }
  ```

- **Ответ `201 Created`:** созданный объект формата §6. `organization_id`
  устанавливается из `Current.organization` и **не принимается из тела**
  (попытка передать игнорируется).
- **Ответ `400 Bad Request`:** тело не содержит ключа `property`. Это
  стандартное Rails-поведение для `ActionController::ParameterMissing` в
  API-режиме (маппится через `config.action_dispatch.rescue_responses`).
- **Ответ `401`:** нет токена.
- **Ответ `403`:** нет `properties.manage`.
- **Ответ `422 Unprocessable Entity`:** валидация не прошла. Формат тела:

  ```json
  { "error": ["Name can't be blank", "Property type can't be blank"] }
  ```

### 5.4. `PATCH /api/v1/properties/:id` — обновление

- **Auth:** требуется. **Permission:** `properties.manage`.
- **Тело запроса:** как в `create`, любое подмножество разрешённых полей.
- **Поля, доступные для обновления:** `name`, `address`, `property_type`,
  `description`. Любое другое поле в теле игнорируется (включая
  `organization_id` — инвариант 3.4.2).
- **Ответ `200 OK`:** обновлённый объект формата §6.
- **Ответ `401`:** нет токена.
- **Ответ `403`:** нет `properties.manage`.
- **Ответ `404`:** объект не существует или принадлежит чужой организации.
- **Ответ `422`:** валидация не прошла, формат как в §5.3.

### 5.5. `DELETE /api/v1/properties/:id` — удаление

- **Auth:** требуется. **Permission:** `properties.manage`.
- **Тело запроса:** отсутствует.
- **Ответ `204 No Content`:** объект удалён.
- **Ответ `401`:** нет токена.
- **Ответ `403`:** нет `properties.manage`.
- **Ответ `404`:** объект не существует или принадлежит чужой организации.

## 6. Формат JSON-объекта Property

```json
{
  "id": 42,
  "organization_id": 7,
  "name": "Sea View Apartment",
  "address": "1 Beach Rd, Bali",
  "property_type": "apartment",
  "description": "Optional text",
  "created_at": "2026-04-08T12:34:56Z",
  "updated_at": "2026-04-08T12:34:56Z"
}
```

- Все ключи всегда присутствуют (нет «исчезающих» ключей).
- `description` может быть пустой строкой `""` или `null` — оба значения
  валидны (см. §3.1: поле опциональное).
- Тип timestamp — ISO8601 UTC (Rails-дефолт `as_json`).

## 7. Валидация (источник истины — модель Property)

| Поле | Правило | Сообщение (формат Rails по умолчанию) |
|---|---|---|
| `name` | presence | `"Name can't be blank"` |
| `name` | length 1..255 | `"Name is too long (maximum is 255 characters)"` |
| `address` | presence | `"Address can't be blank"` |
| `address` | length 1..500 | `"Address is too long (maximum is 500 characters)"` |
| `property_type` | presence | `"Property type can't be blank"` |
| `property_type` | inclusion в enum | (защита на уровне enum — невалидное значение из API → `422` через rescue от `ArgumentError`/`RecordInvalid`) |
| `organization` | presence | `"Organization must exist"` |
| `description` | length 0..5000 | `"Description is too long (maximum is 5000 characters)"` |

> Тексты сообщений валидации в таблице — ориентировочные (Rails-дефолт,
> могут быть изменены i18n). Тесты сравнивают по ключевому фрагменту
> (`include("can't be blank")`), а не по полному равенству строк. Это
> избавляет от ложных регрессий при добавлении локализации.

## 8. Состояния и переходы

Property — простая CRUD-сущность без stateful workflow. Жизненный цикл:

```
(не существует) --create--> (существует) --update*--> (существует) --destroy--> (не существует)
```

Состояний нет, FSM не требуется. Это явная фиксация: F1 не вводит статусы
типа `archived`/`published`. Если они понадобятся — отдельная фича.

## 9. Сценарии ошибок и edge cases

| # | Сценарий | Ожидаемый код | Ожидаемое тело |
|---|---|---|---|
| E1 | Запрос без access-токена | 401 | (формат как у существующих auth-эндпоинтов проекта) |
| E2 | Запрос без `X-Organization-Id` | 422 | `{ "error": "Organization not selected" }` (см. §4.2) |
| E3 | `properties.view` есть, `properties.manage` нет → POST | 403 | `{ "error": ... }` (формат Pundit-обработчика проекта) |
| E4 | Нет ни одного permission → GET index | 403 | как в E3 |
| E5 | `show` с `id` чужой организации | 404 | пусто или дефолтное Rails-тело |
| E6 | `show` с несуществующим `id` | 404 | как в E5 |
| E7 | `update` с `id` чужой организации | 404 | как в E5 |
| E8 | `destroy` с `id` чужой организации | 404 | как в E5 |
| E9 | `create` с пустым `name` | 422 | `{ "error": ["Name can't be blank"] }` |
| E10 | `create` с невалидным `property_type` (`"villa"`) | 422 | `{ "error": [...] }` |
| E11 | `create` без ключа `property` в теле | 400 | дефолтное Rails-тело для ParameterMissing |
| E12 | `create` с попыткой передать `organization_id` чужой организации | 201 | поле игнорируется, объект создаётся в `Current.organization` |
| E13 | `update` с попыткой сменить `organization_id` | 200 | поле игнорируется, `organization_id` неизменно |
| E14 | `index`, у организации 0 properties | 200 | `[]` |
| E15 | `index`, у организации N properties, у соседней M | 200 | возвращены ровно N (изоляция) |

## 10. Acceptance criteria

Фича считается выполненной, когда **все** утверждения ниже истинны и
проверены автоматическими тестами:

**AC1 — Happy path CRUD.**
Авторизованный пользователь с ролью `admin` (preset role с полным набором
permissions) проходит цикл: `POST` → объект появляется в `index` своей
организации → `show` возвращает те же данные → `PATCH` меняет `name` →
`destroy` → последующий `show` отдаёт `404`.

**AC2 — Изоляция организаций.**
Property, созданный пользователем `user_a` в организации `org_a`, не
виден в `index`, `show`, не обновляется и не удаляется через сессию
`user_b` (член `org_b`). `show`/`update`/`destroy` чужого id → `404`.

**AC3 — Read-only viewer.**
Пользователь с ролью `viewer` (только `properties.view`) получает `200`
на `index` и `show`, но `403` на `create`, `update`, `destroy`.

**AC4 — No-permission user.**
Пользователь, состоящий в организации, но без `properties.view` и
`properties.manage`, получает `403` на все эндпоинты.

**AC5 — Unauthenticated.**
Любой эндпоинт без access-токена → `401`.

**AC6 — Валидация на create.**
`POST` с пустым `name` → `422` и `error` содержит сообщение про `name`.
`POST` с `property_type: "villa"` → `422`.

**AC7 — Валидация на update.**
`PATCH` с пустым `name` → `422`, объект в БД не изменился.

**AC8 — Иммутабельность organization_id.**
`POST` или `PATCH` с явным `organization_id` другой организации в теле:
запрос успешен, но фактический `organization_id` остаётся равен
`Current.organization.id` (для `create` — он же и устанавливается).

**AC9 — Стабильный JSON-контракт.**
JSON-ответ ровно соответствует §6: набор ключей фиксирован, типы
соответствуют, `property_type` всегда строка.

**AC11 — Контекст организации.**
Запрос к любому из эндпоинтов F1 без заголовка `X-Organization-Id`
возвращает `422` с телом `{ "error": "Organization not selected" }`
(делегировано существующему `set_current_organization`, проверяется
хотя бы одним тестом, чтобы зафиксировать это как часть контракта F1).

**AC10 — Покрытие.**
После добавления тестов фактический backend line coverage не падает ниже
текущего `minimum_coverage` ratchet floor (на момент старта F1 — `38`).
Фактический процент после F1 фиксируется в `homeworks/hw-1/report.md` в
таблице «Coverage ratchet» и используется для подъёма порога до
`floor(actual) - 1` отдельным шагом плана.

## 11. Не-функциональные требования

- **Производительность:** не предъявляется (CRUD в рамках одной
  организации, ожидаемые объёмы — десятки/сотни записей; пагинация — не
  в этой фиче).
- **Совместимость:** существующие маршруты `/api/v1/...` и поведение
  `BaseController` не должны измениться.
- **Безопасность:** инвариант изоляции данных (см. §3.4.5) — критический.
  Любая регрессия, ведущая к утечке Property между организациями,
  считается блокирующим багом.

## 12. Зависимости и допущения

- Существует модель `Organization` с PK `id`. ✅ (см. `ai-docs/SCHEMA.md`)
- Существует механизм `Current.organization`/`Current.membership`. ✅
- Существует `Permissions` concern с кодами `properties.view` /
  `properties.manage`. ✅ (проверено: `app/models/concerns/permissions.rb`)
- Существует `Membership#can?(permission_code)` или эквивалент,
  используемый в `RolePolicy`. ✅
- Pundit подключён, есть `ApplicationPolicy`. ✅
- RSpec + FactoryBot подключены, есть пример request-спеки. ✅

## 13. Открытые вопросы

_(Будут добавлены по итогам ревью, если появятся.)_
