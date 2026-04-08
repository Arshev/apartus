---
name: F2 Spec — Unit CRUD
status: active
related_issue: "#11"
umbrella_issue: "#1"
brief: ./brief.md
feature: 02-unit-crud
---

# Spec — Unit CRUD

> Контракт реализации. Описывает **что** должно быть сделано, не **как**.
> «Как» — в `plan.md`.

## 1. Ссылка на источник

- Brief: [./brief.md](./brief.md)
- Issue: Arshev/apartus#11 (фича), Arshev/apartus#1 (зонтичный HW-1)
- План в `ai-docs/PLAN.md`: пункты `2.1.2`, `2.1.6`, `2.2.2`, `2.2.6` (вторая
  половина — UnitPolicy).
- Reference implementation: F1 Property CRUD
  ([./../01-property-crud/spec.md](../01-property-crud/spec.md)). F2 копирует
  форму F1 1:1, отличия фиксируются явно в каждой секции.

## 2. Scope

### 2.1. Входит

- Доменная модель `Unit`, принадлежащая ровно одному `Property` и через него —
  ровно одной `Organization`.
- REST-ресурс, вложенный в Property:
  `/api/v1/properties/:property_id/units` с операциями `index`, `show`,
  `create`, `update`, `destroy`.
- Авторизация через систему permissions, уже существующую в проекте
  (`Permissions` concern, коды `units.view` и `units.manage` — присутствуют
  в `ALL_PERMISSIONS`, проверено grounding'ом).
- Двухуровневая изоляция данных: по организации текущего запроса
  (`Current.organization`) и по родительскому Property из URL
  (`:property_id`).
- Покрытие сценариев request-спеками (см. §10).

### 2.2. Не входит

- `Amenity`, `UnitAmenity` — F3.
- Фотографии юнитов (Active Storage) — Phase 2.1.4.
- Workflow статусов (правила переходов между `available`/`maintenance`/
  `blocked`, side-effects при смене) — F2 позволяет менять статус любой
  допустимой строкой, но не вводит FSM. См. §8.
- Bulk-операции (массовое создание, копирование из другого Property) — вне
  scope.
- Поиск, сортировка, фильтрация, пагинация — вне scope.
- Soft delete (Unit удаляется физически).
- Назначение ответственных сотрудников (housekeeper, inspector) — Phase 8.
- Audit log изменений — не ведётся.
- Перенос юнита между Property — **явно запрещён** (§3.4.2), не «пока не
  поддерживается», а инвариант.
- Frontend.
- Любые изменения схем других моделей, кроме добавления `has_many :units` в
  `Property`.

## 3. Доменная модель

### 3.1. Сущность Unit

| Атрибут | Тип | Обязательность | Ограничения |
|---|---|---|---|
| `id` | bigint | автогенерация | PK |
| `property_id` | bigint | обязательное | FK на `properties`, индекс, NOT NULL, ON DELETE CASCADE |
| `name` | string | обязательное | 1..255 символов, без ведущих/хвостовых пробелов |
| `unit_type` | integer (enum) | обязательное | одно из: `room`, `apartment`, `bed`, `studio` (см. §3.2) |
| `capacity` | integer | обязательное | целое, `>= 1`, `<= 100` |
| `status` | integer (enum) | обязательное | одно из: `available`, `maintenance`, `blocked` (см. §3.2) |
| `created_at` | datetime | автогенерация | — |
| `updated_at` | datetime | автогенерация | — |

`organization_id` **не** хранится на Unit — принадлежность к организации
определяется через родительский Property (`unit.property.organization_id`).
Это сознательное решение: избегаем денормализации и невозможности
рассинхрона двух источников истины.

### 3.2. Enums

#### 3.2.1. `unit_type`

Значения и числовые коды (стабильны, новые значения добавляются только в
конец списка):

| Код в API (строка) | Числовое значение в БД |
|---|---|
| `room` | 0 |
| `apartment` | 1 |
| `bed` | 2 |
| `studio` | 3 |

В JSON — **строковое** представление. Числовое — деталь хранения.

`unit_type` — отдельный классификатор от `property_type` (F1 §3.2). Тип
Property описывает здание целиком (hotel/house/…), тип Unit — физическую
единицу сдачи. Смешение семантически некорректно; пересечение строковых
значений (например, `apartment` есть в обоих) — **совпадение имён**, не
общий классификатор.

#### 3.2.2. `status`

| Код в API (строка) | Числовое значение в БД |
|---|---|
| `available` | 0 |
| `maintenance` | 1 |
| `blocked` | 2 |

Значения — из `ai-docs/PLAN.md` 2.1.6. В JSON — строковое представление.

**F2 не вводит правил перехода между статусами**: менеджер с правом
`units.manage` может установить любое значение из списка в любой момент.
Workflow, side-effects (автозакрытие продаж, уведомления), история
переходов — отдельная фича за пределами HW-1.

### 3.3. Ассоциации

- `Unit belongs_to :property`
- `Property has_many :units, dependent: :destroy` (добавляется к существующей
  модели `Property` из F1 без удаления других ассоциаций; при удалении
  Property его юниты удаляются вместе с ним — `dependent: :destroy` на
  ORM-уровне и `ON DELETE CASCADE` на DB-уровне; два механизма
  согласованы).

### 3.4. Инварианты (всегда истинны)

1. У каждого `Unit` ровно один `property_id`, который никогда не `NULL`.
2. После создания `property_id` **не может быть изменён** ни через API, ни
   через update модели — Unit не «переезжает» между Property. Это инвариант
   предметной области, а не техническое ограничение: операция «перенос
   юнита» в реальной жизни моделируется как удаление старого и создание
   нового. Прямой аналог F1 §3.4.2 про `organization_id`.
3. `name`, `unit_type`, `capacity`, `status` всегда заполнены.
4. `name` хранится уже trimmed (без ведущих/хвостовых пробелов).
5. Unit не виден за пределами своей организации — ни через `index`, ни через
   `show`, ни через `update`/`destroy`. Унаследовано от F1 §3.4.5 через
   родительский Property.
6. Unit не виден и не доступен при запросе против **другого Property**, даже
   внутри той же организации. То есть `unit_a`, принадлежащий
   `property_a`, **не** возвращается и **не** модифицируется через эндпоинт
   с `:property_id = property_b.id`, даже если оба Property принадлежат
   одной организации и у пользователя есть полные права на оба. Это
   отдельный инвариант, не следствие §3.4.5.
7. Удаление Property каскадно удаляет все его юниты (FK `ON DELETE CASCADE`
   + `dependent: :destroy`). Удаление организации каскадно удаляет все её
   Property и, через них, все юниты (F1 §3.3 + инвариант 7 F2).

## 4. Авторизация

### 4.1. Аутентификация

Как в F1 §4.1: все эндпоинты требуют валидного access-токена. Без токена —
`401 Unauthorized`.

### 4.2. Контекст организации

Как в F1 §4.2: требуется заголовок `X-Organization-Id`, механизм — тот же
`set_current_organization`, коды ошибок идентичны (422 / 404 / 403). F2
не меняет это поведение и проверяет его как минимум одним тестом (см. §10
AC-контекст).

### 4.3. Permissions

Используются существующие коды из `Permissions::ALL_PERMISSIONS` (проверено:
`backend/app/models/concerns/permissions.rb:10-11`):

| Действие | Требуемое разрешение |
|---|---|
| `index`  | `units.view` |
| `show`   | `units.view` |
| `create` | `units.manage` |
| `update` | `units.manage` |
| `destroy`| `units.manage` |

Проверка — на уровне `UnitPolicy`, по форме `PropertyPolicy`
(`Current.membership&.can?("...")`).

### 4.4. Поведение при отсутствии прав

- `units.view` есть, `units.manage` нет:
  - `index`, `show` → `200 OK`
  - `create`, `update`, `destroy` → `403 Forbidden`
- Нет ни `units.view`, ни `units.manage`:
  - все эндпоинты → `403 Forbidden`

### 4.5. Поведение при попытке доступа к «чужому» юниту

Три сценария, каждый даёт `404 Not Found` (не `403`), чтобы не раскрывать
факт существования:

1. **Чужая организация.** Запрос на `unit_id`, принадлежащий Property
   другой организации (через любой `:property_id` в URL). Unit не виден
   ни под каким углом.
2. **Свой Property vs чужой Property в той же организации.** Запрос
   `GET/PATCH/DELETE /api/v1/properties/:property_id/units/:id`, где
   `:property_id` — Property A (в текущей org), `:id` — юнит Property B
   (тоже в текущей org). Ответ — `404`, даже если у пользователя есть
   `units.manage` на оба Property. Юнит существует, но не принадлежит
   указанному в URL родителю — с точки зрения URL-контракта его здесь нет.
3. **Несуществующий `:property_id`** (или принадлежащий чужой организации)
   — `404` на любой эндпоинт, без раскрытия факта существования Property.
   Согласовано с F1 §4.5.

Все три случая реализуются через scoping
`Current.organization.properties.find_by(id: params[:property_id])` →
`property.units.find_by(id: params[:id])` и не требуют отдельного
rescue-слоя.

### 4.6. Порядок обработки запроса

Порядок фиксирован и определяет разрешение коллизий «нет прав + чужой
ресурс». Без явной фиксации агент-реализатор может поменять шаги местами,
и поведение API на стыке `403` vs `404` станет недетерминированным.

1. `authenticate_user!` — нет токена → `401`.
2. `set_current_organization` — нет/чужой/несуществующий
   `X-Organization-Id` → `422`/`403`/`404` по F1 §4.2.
3. **Резолв родителя:**
   `Current.organization.properties.find_by(id: params[:property_id])`.
   Если `nil` → `404` **немедленно**, до Pundit.
4. **Pundit `authorize`** (class-level для `index`/`create`,
   instance-level для `show`/`update`/`destroy`). Нет прав → `403`.
5. Для `show`/`update`/`destroy`: `property.units.find_by(id: params[:id])`.
   Если `nil` → `404`.
6. Действие (`index` / `create` / `update` / `destroy`).
7. Для `create`/`update`: валидации модели. Провал → `422`.

**Следствие для коллизии «нет прав + чужой Property»:** пользователь без
`units.manage`, делающий `POST` / `PATCH` / `DELETE` на `:property_id`
чужой организации, получит **`404`**, а не `403`. Шаг 3 срабатывает раньше
шага 4. Это сознательное решение: инвариант «не раскрывать существование»
(§3.4.5, §4.5) сильнее, чем семантическая точность ответа «тебе нельзя».
Этот случай покрыт AC4 и считается частью security-контракта F2.

## 5. HTTP API

Базовый префикс: `/api/v1`. Ресурс вложен в Property:
`/api/v1/properties/:property_id/units`. Все запросы — JSON. Все ответы —
JSON или пусто (`204 No Content`).

### 5.1. `GET /api/v1/properties/:property_id/units` — список

- **Auth:** требуется. **Permission:** `units.view`.
- **Тело запроса:** отсутствует.
- **Параметры запроса:** отсутствуют (поиск/фильтры — вне scope F2).
- **Ответ `200 OK`:** JSON-массив объектов формата §6. Property без юнитов
  возвращает `[]`. Сортировка по `id ASC` (детерминированная для тестов).
- **Ответ `401`:** нет токена.
- **Ответ `403`:** нет `units.view`.
- **Ответ `404`:** `:property_id` не существует или принадлежит чужой
  организации (§4.5 п.3).

### 5.2. `GET /api/v1/properties/:property_id/units/:id` — детали

- **Auth:** требуется. **Permission:** `units.view`.
- **Тело запроса:** отсутствует.
- **Ответ `200 OK`:** один объект формата §6.
- **Ответ `401`:** нет токена.
- **Ответ `403`:** нет `units.view`.
- **Ответ `404 Not Found`:** объединяет три случая (§4.5): родительский
  Property не найден / принадлежит чужой организации; юнит не существует;
  юнит существует, но принадлежит другому Property (в т.ч. в той же
  организации).

### 5.3. `POST /api/v1/properties/:property_id/units` — создание

- **Auth:** требуется. **Permission:** `units.manage`.
- **Тело запроса:**

  ```json
  {
    "unit": {
      "name": "Room 101",
      "unit_type": "room",
      "capacity": 2,
      "status": "available"
    }
  }
  ```

- **Ответ `201 Created`:** созданный объект формата §6. `property_id`
  устанавливается из `:property_id` URL и **не принимается из тела**
  (попытка передать игнорируется). Это прямой аналог F1 AC8 про
  `organization_id`.
- **Ответ `400 Bad Request`:** тело не содержит ключа `unit` (стандартное
  Rails-поведение для `ActionController::ParameterMissing`).
- **Ответ `401`:** нет токена.
- **Ответ `403`:** нет `units.manage`.
- **Ответ `404`:** `:property_id` не существует / чужая организация.
- **Ответ `422 Unprocessable Entity`:** валидация не прошла. Формат тела —
  как в F1 §5.3:

  ```json
  { "error": ["Name can't be blank", "Capacity must be greater than or equal to 1"] }
  ```

### 5.4. `PATCH /api/v1/properties/:property_id/units/:id` — обновление

- **Auth:** требуется. **Permission:** `units.manage`.
- **Тело запроса:** как в `create`, любое подмножество разрешённых полей.
- **Поля, доступные для обновления:** `name`, `unit_type`, `capacity`,
  `status`. Любое другое поле в теле игнорируется (включая `property_id` —
  инвариант 3.4.2 — и любую попытку «переноса» юнита).
- **Ответ `200 OK`:** обновлённый объект формата §6.
- **Ответ `401`:** нет токена.
- **Ответ `403`:** нет `units.manage`.
- **Ответ `404`:** родитель/юнит не найдены или не принадлежат
  текущему scope (§4.5, три случая).
- **Ответ `422`:** валидация не прошла, формат как в §5.3. Отдельный
  сценарий — `PATCH` с невалидным `unit_type` или `status` (`"villa"`,
  `"archived"`): 422, **не** 500 с `ArgumentError`. Прямой follow-up из
  report.md F1 (enum без `validate: true` бросал `ArgumentError`).

### 5.5. `DELETE /api/v1/properties/:property_id/units/:id` — удаление

- **Auth:** требуется. **Permission:** `units.manage`.
- **Тело запроса:** отсутствует.
- **Ответ `204 No Content`:** объект удалён.
- **Ответ `401`:** нет токена.
- **Ответ `403`:** нет `units.manage`.
- **Ответ `404`:** родитель/юнит не найдены (§4.5).

## 6. Формат JSON-объекта Unit

```json
{
  "id": 17,
  "property_id": 42,
  "name": "Room 101",
  "unit_type": "room",
  "capacity": 2,
  "status": "available",
  "created_at": "2026-04-08T12:34:56Z",
  "updated_at": "2026-04-08T12:34:56Z"
}
```

- Все ключи всегда присутствуют (нет «исчезающих» ключей).
- `unit_type`, `status` — всегда строки (не числа).
- `capacity` — всегда integer.
- `organization_id` в JSON Unit **не возвращается** (см. §3.1): принадлежность
  к org выводится через `property_id`. Это сознательное отличие от F1, где
  `organization_id` был прямым полем.
- Тип timestamp — ISO8601 UTC (Rails-дефолт `as_json`).

## 7. Валидация (источник истины — модель Unit)

| Поле | Правило | Сообщение (формат Rails по умолчанию) |
|---|---|---|
| `name` | presence | `"Name can't be blank"` |
| `name` | length 1..255 | `"Name is too long (maximum is 255 characters)"` |
| `unit_type` | presence | `"Unit type can't be blank"` |
| `unit_type` | inclusion в enum (через `validate: true`) | невалидный input → `422`, **не** `ArgumentError` |
| `capacity` | presence | `"Capacity can't be blank"` |
| `capacity` | numericality: integer, `>= 1`, `<= 100` | `"Capacity must be greater than or equal to 1"` / `... less than or equal to 100"` |
| `status` | presence | `"Status can't be blank"` |
| `status` | inclusion в enum (через `validate: true`) | невалидный input → `422`, **не** `ArgumentError` |
| `property` | presence | `"Property must exist"` |

**Урок F1 (report.md § «Что пошло плохо»):** оба enum (`unit_type`, `status`)
определяются через Rails `enum` с опцией `validate: true`. Без этого флага
присваивание невалидной строки кидает `ArgumentError` и превращается в
`500 Internal Server Error`. В F2 это **обязательное** требование Spec,
а не рекомендация плана — и проверяется AC (§10).

Тексты сообщений валидации — ориентировочные (Rails-дефолт). Тесты
сравнивают по ключевому фрагменту (`include("can't be blank")`), а не по
полному равенству строк. Согласовано с F1 §7.

## 8. Состояния и переходы

Unit — CRUD-сущность с **атрибутом** `status`, но без stateful workflow.
Жизненный цикл:

```text
(не существует) --create--> (существует, status=X) --update*--> (существует, status=Y) --destroy--> (не существует)
```

`status` — обычное поле: любое значение из §3.2.2 можно установить в любой
момент через `PATCH`. FSM, side-effects, история переходов — **не** в
F2 (§2.2). Это явная фиксация, чтобы при реализации не возникло соблазна
запретить «нелогичные» переходы типа `blocked → available`.

## 9. Сценарии ошибок и edge cases

| # | Сценарий | Ожидаемый код | Ожидаемое тело |
|---|---|---|---|
| E1 | Запрос без access-токена | 401 | (формат как у существующих auth-эндпоинтов проекта) |
| E2 | Запрос без `X-Organization-Id` | 422 | `{ "error": "Organization not selected" }` (F1 §4.2) |
| E3 | `units.view` есть, `units.manage` нет → POST | 403 | формат Pundit-обработчика проекта |
| E4 | Нет ни одного permission → GET index | 403 | как в E3 |
| E5 | `show` юнита из чужой организации (через любой `:property_id`) | 404 | пусто / дефолт |
| E6 | `show` с несуществующим `:id` (родитель существует) | 404 | как в E5 |
| E7 | `show` с `:property_id` из чужой организации | 404 | как в E5 |
| E8 | `show` юнита A через `:property_id = B.id`, оба в своей org | 404 | как в E5 (инвариант §3.4.6) |
| E9 | `show` с несуществующим `:property_id` | 404 | как в E5 |
| E10 | `create` с пустым `name` | 422 | `{ "error": ["Name can't be blank"] }` |
| E11 | `create` с невалидным `unit_type` (`"villa"`) | 422 | `{ "error": [...] }`, **не** 500 |
| E12 | `create` с невалидным `status` (`"archived"`) | 422 | `{ "error": [...] }`, **не** 500 |
| E13 | `create` с `capacity = 0` | 422 | сообщение про `capacity` |
| E14 | `create` с `capacity = 101` | 422 | сообщение про `capacity` |
| E15 | `create` без ключа `unit` в теле | 400 | дефолтное Rails-тело для ParameterMissing |
| E15a | `create` с `:property_id` из чужой организации | 404 | родитель не найден в scope (§4.5.1) |
| E15b | `create` с несуществующим `:property_id` | 404 | как в E15a |
| E16 | `create` с попыткой передать `property_id` другого Property в теле | 201 | поле игнорируется, `property_id` из URL |
| E17 | `update` с попыткой сменить `property_id` (любой: чужой / другой своей org / той же org) | 200 | поле игнорируется, `property_id` неизменно |
| E18 | `update` с невалидным `unit_type` | 422 | **не** 500 (прямой follow-up F1) |
| E19 | `update` с невалидным `status` | 422 | **не** 500 (прямой follow-up F1) |
| E20 | `update` `:id` юнита из другого Property той же org | 404 | инвариант §3.4.6 |
| E21 | `destroy` `:id` юнита из другого Property той же org | 404 | инвариант §3.4.6 |
| E22 | `index`, у Property 0 юнитов | 200 | `[]` |
| E23 | `index`, у Property A — N юнитов, у Property B — M | 200 | ровно N (изоляция через родителя) |

> Каскадное удаление Property → Unit — не HTTP-сценарий; зафиксировано в
> инварианте §3.4.7 и покрыто AC12.

## 10. Acceptance criteria

Фича считается выполненной, когда **все** утверждения ниже истинны и
проверены автоматическими тестами:

**AC1 — Happy path CRUD.**
Авторизованный пользователь с ролью `admin` (preset role с полным набором
permissions) для существующего Property своей организации проходит цикл:
`POST` → юнит появляется в `index` этого Property → `show` возвращает те
же данные → `PATCH` меняет `name` → `destroy` → последующий `show` отдаёт
`404`.

**AC2 — Изоляция организаций.**
Unit, созданный в `org_a` (внутри `property_a`), не виден в `index`,
`show`, не обновляется и не удаляется через сессию пользователя `org_b` —
ни через `:property_id = property_a.id`, ни через любой другой
`:property_id`. Все операции возвращают `404`.

**AC3 — Изоляция Property внутри своей организации.**
Пользователь с `units.manage` на обе Property своей организации
(`property_a`, `property_b`), запрашивает юнит `unit_a` (принадлежит
`property_a`) через URL `/api/v1/properties/:property_b_id/units/:unit_a_id`.
Все операции (`show`, `update`, `destroy`) возвращают `404`. Инвариант
§3.4.6. **Это отдельный AC от AC2** — каждый покрывает свой слой изоляции.

**AC4 — Родительский Property из чужой организации.**
Запрос `index` / `show` / `create` через `:property_id`, указывающий на
Property другой организации, возвращает `404` (не 403, не 200 с утечкой).

**AC5 — Read-only viewer.**
Пользователь с ролью `viewer` (только `units.view`, без `units.manage`)
получает `200` на `index` и `show`, но `403` на `create`, `update`,
`destroy`. `viewer` — preset role, автоматически создаваемая в
`Organization#create_preset_roles` (проверено grounding'ом).

**AC6 — No-permission user.**
Пользователь, состоящий в организации, но без `units.view` и
`units.manage`, получает `403` на все эндпоинты.

**AC7 — Unauthenticated.**
Любой эндпоинт без access-токена → `401`.

**AC8 — Валидация на create.**
`POST` с пустым `name` → `422` с сообщением про `name`. `POST` с
`unit_type: "villa"` → `422`. `POST` с `status: "archived"` → `422`.
`POST` с `capacity: 0` → `422`. Все четыре — без `ArgumentError` / `500`.

**AC9 — Валидация на update (включая enum).**
`PATCH` с пустым `name` → `422`, объект в БД не изменился.
`PATCH` с `unit_type: "villa"` → `422`, не 500.
`PATCH` с `status: "archived"` → `422`, не 500.
**Это прямой follow-up из F1**: в F1 тест на PATCH с невалидным enum
отсутствовал, и это было зафиксировано как недочёт. В F2 он обязателен.

**AC10 — Иммутабельность `property_id`.**
Предусловие обоих подпунктов: `:property_id` в URL указывает на валидный
Property **текущей** организации (иначе раньше срабатывает §4.6 шаг 3 →
404).
- `POST` с явным `property_id` *другого* Property в теле (в той же или
  чужой организации): запрос успешен (201), фактический `property_id`
  юнита равен `:property_id` из URL.
- `PATCH` с явным `property_id` в теле: запрос успешен (200),
  `property_id` в БД не изменился.

**AC11 — Стабильный JSON-контракт.**
JSON-ответ ровно соответствует §6: набор ключей фиксирован,
`unit_type` и `status` — всегда строки, `capacity` — integer,
`organization_id` в ответе **отсутствует**.

**AC12 — Каскадное удаление через Property.**
Удаление Property каскадно удаляет все его юниты: после `Property#destroy`
соответствующие `Unit` записи отсутствуют в БД. Проверяется одной
model-спекой (не через HTTP API). Инвариант §3.4.7.

**AC13 — Контекст организации.**
Запрос к любому из эндпоинтов F2 без заголовка `X-Organization-Id`
возвращает `422` с телом `{ "error": "Organization not selected" }`
(делегировано существующему `set_current_organization`, проверяется
хотя бы одним тестом — согласованно с F1 AC11).

**AC14 — Покрытие.**
После добавления тестов фактический backend line coverage не падает ниже
текущего `minimum_coverage` ratchet floor (на момент старта F2 — `54`).
Фактический процент после F2 фиксируется в `homeworks/hw-1/report.md` в
таблице «Coverage ratchet» и используется для подъёма порога до
`floor(actual) - 1` отдельным шагом плана.

## 11. Не-функциональные требования

- **Производительность:** не предъявляется (CRUD в рамках одного Property,
  ожидаемые объёмы — десятки юнитов на Property; пагинация — не в этой
  фиче).
- **Совместимость:** существующие маршруты `/api/v1/...` и поведение
  `BaseController` не должны измениться. F1 `/api/v1/properties` не
  затрагивается (F2 добавляет **вложенный** ресурс, а не модифицирует
  плоский).
- **Безопасность:** инварианты изоляции (§3.4.5 и §3.4.6) — критические.
  Любая регрессия, ведущая к утечке юнита между организациями **или**
  между Property одной организации, считается блокирующим багом.

## 12. Зависимости и допущения

- Существует модель `Property` с PK `id` и scope'ом
  `Current.organization.properties`. ✅ (F1, `ai-docs/SCHEMA.md`)
- Существует механизм `Current.organization` / `Current.membership`. ✅ (F1)
- Существует `Permissions` concern с кодами `units.view` / `units.manage`.
  ✅ (проверено grounding'ом:
  `backend/app/models/concerns/permissions.rb:10-11`, преcеты `manager`
  и `viewer` уже включают соответствующие коды).
- Существует `rescue_from Pundit::NotAuthorizedError → 403` в
  `Api::V1::BaseController`. ✅ (F1 §4 реализации, hardening F1).
- Существует `Membership#can?(permission_code)`. ✅ (F1)
- Pundit подключён, есть `ApplicationPolicy`. ✅ (F1)
- RSpec + FactoryBot подключены, есть эталонная request-спека
  `spec/requests/api/v1/properties_spec.rb`. ✅ (F1)
- Factory `:property` существует в `spec/factories/properties.rb`. ✅ (F1)

## 13. Открытые вопросы

_Все открытые вопросы закрыты в процессе Spec-сессии. Зафиксированные
решения ниже — источник истины для Plan и Implement._

**D1. `unit_type` — значения.** `room / apartment / bed / studio` (см.
§3.2.1). Покрывают четыре типовых физических единицы сдачи для четырёх
`property_type` из F1 без навязывания связи «property_type ↔ unit_type»:
Spec §3.2.1 явно разводит классификаторы.

**D2. `capacity` — границы.** `integer, >= 1, <= 100` (см. §3.1, §7).
Нижняя — юнит без вместимости не имеет смысла. Верхняя — защита от
ошибки ввода; общая палата хостела на 100 кроватей — мыслимый максимум,
значения в сотнях и тысячах — опечатка.

**D3. `organization_id` в JSON Unit.** Не возвращается (см. §6).
Причина: поле не хранится на модели (§3.1), вывод через
`unit.property.organization_id` — денормализация в API, которая на
клиенте не требуется: клиент уже знает org из заголовка
`X-Organization-Id` и `property_id` из контекста запроса. Симметрия
JSON-контракта с моделью важнее клиентского удобства.
