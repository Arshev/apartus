---
name: F3 Spec — Amenities (M:N with Unit)
status: active
related_issue: "#3"
umbrella_issue: "#1"
brief: ./brief.md
feature: 03-amenities
---

# Spec — Amenities (M:N with Unit)

> Контракт реализации. Описывает **что** должно быть сделано, не **как**.
> «Как» — в `plan.md`.

## 1. Ссылка на источник

- Brief: [./brief.md](./brief.md)
- Issue: Arshev/apartus#3 (фича), Arshev/apartus#1 (зонтичный HW-1)
- План в `ai-docs/PLAN.md`: пункты `2.1.3` (модель Amenity + join-таблица
  UnitAmenity) и `2.2.3` (управление amenities).
- Reference implementations: F1 Property CRUD и F2 Unit CRUD. Форма F3
  отличается от F1/F2: не один ресурс, а **два связанных** (Amenity и
  UnitAmenity) и операции **attach/detach** в дополнение к CRUD.
  Совпадающие детали (JWT, `Current.organization`, `X-Organization-Id`,
  формат ошибок, стиль `if .save/.update`) — берём из F1/F2 без
  переобсуждения.

## 2. Scope

### 2.1. Входит

- Доменная модель `Amenity` — каталог удобств **в рамках одной
  организации** (per-org справочник, см. §13 D1).
- Доменная модель `UnitAmenity` — явная join-модель связи
  Unit ↔ Amenity (см. §13 D7, DEC-NNN).
- REST-ресурс каталога: `/api/v1/amenities` с операциями `index`,
  `show`, `create`, `update`, `destroy`.
- REST-подресурс привязок: `/api/v1/units/:unit_id/amenities` с
  операциями `index`, `create` (attach), `destroy` (detach).
- Два новых permission-кода: `amenities.view` и `amenities.manage`
  (см. §4 и §13 D4a). Новый permission-код для привязки **не вводится**
  — привязка покрывается `units.manage` (§13 D4b).
- Обновление preset-ролей (`admin`, `manager`, `viewer`) — включение
  новых кодов.
- Запрет удаления Amenity, у которого есть хотя бы одна привязка
  (restrict, §13 D3).
- Покрытие сценариев request-спеками (см. §10).

### 2.2. Не входит

- Иконки amenities (Active Storage) — Phase 2.1.4.
- Локализация названий amenities (мультиязычность справочника).
- Категоризация / группировка amenities.
- Публичный (без авторизации) эндпоинт для гостя — Phase 9 booking
  widget.
- Импорт / маппинг на внешние каталоги (Booking, Airbnb) — Phase 10
  channel manager.
- Поиск / фильтрация юнитов по amenities — Phase 2.2.5.
- Bulk-операции («привязать один amenity ко многим юнитам одним
  запросом», «заменить всю коллекцию amenities юнита одним `PATCH`»).
  Replace-all коллекции юнита (см. §13 D5) — **явно не в scope**.
- Soft delete amenities (Amenity удаляется физически, когда это
  разрешено §13 D3).
- Audit log изменений и привязок.
- Frontend.
- Любые изменения моделей Property, Unit, Organization, Role,
  Membership, кроме `has_many :amenities, through: :unit_amenities`
  на Unit (§3.3).
- Включение списка amenities в JSON-ответ `GET /api/v1/properties/:property_id/units/:id`
  из F2. **F2 AC11 не меняется** — §13 D6.

## 3. Доменная модель

### 3.1. Сущность Amenity

| Атрибут | Тип | Обязательность | Ограничения |
|---|---|---|---|
| `id` | bigint | автогенерация | PK |
| `organization_id` | bigint | обязательное | FK на `organizations`, индекс, NOT NULL, ON DELETE CASCADE |
| `name` | string | обязательное | 1..100 символов, без ведущих/хвостовых пробелов, уникален внутри организации (§3.2) |
| `created_at` | datetime | автогенерация | — |
| `updated_at` | datetime | автогенерация | — |

**Иконка, описание, категория, ключ/код, локализация — отсутствуют**
(см. §2.2 и §13 D-open).

### 3.2. Уникальность и нормализация имени

- `name` нормализуется: `strip` (как в F1/F2 `normalizes :name`).
  Регистр и внутренние пробелы **сохраняются** в хранилище.
- Уникальность — **case-insensitive** внутри организации: `"Wi-Fi"` и
  `"wi-fi"` и `"WIFI"` — одно и то же (см. §13 D2). Реализуется
  составным уникальным индексом на нижнем регистре нормализованного
  `name` и `organization_id`.
- Нарушение уникальности — `422 Unprocessable Entity`, сообщение
  «Name has already been taken».

### 3.3. Сущность UnitAmenity (join-модель)

| Атрибут | Тип | Обязательность | Ограничения |
|---|---|---|---|
| `id` | bigint | автогенерация | PK |
| `unit_id` | bigint | обязательное | FK, NOT NULL, ON DELETE CASCADE |
| `amenity_id` | bigint | обязательное | FK, NOT NULL, ON DELETE **RESTRICT** |
| `created_at` | datetime | автогенерация | — |
| `updated_at` | datetime | автогенерация | — |

- Пара `(unit_id, amenity_id)` — уникальна (составной unique index).
  Повторная привязка того же amenity к тому же юниту → `422` с
  сообщением «Amenity has already been attached» (см. §7).
- `ON DELETE RESTRICT` на `amenity_id` — прямой механизм реализации
  инварианта §3.4.6: Amenity, на который есть ссылки, нельзя удалить.
- `ON DELETE CASCADE` на `unit_id` — при удалении юнита все его
  привязки удаляются (инвариант §3.4.5).

### 3.4. Ассоциации

- `Amenity belongs_to :organization`
- `Organization has_many :amenities, dependent: :destroy`
  (добавляется к существующей модели без удаления других ассоциаций)
- `UnitAmenity belongs_to :unit`
- `UnitAmenity belongs_to :amenity`
- `Unit has_many :unit_amenities, dependent: :destroy`
- `Unit has_many :amenities, through: :unit_amenities`
- `Amenity has_many :unit_amenities, dependent: :restrict_with_error`
- `Amenity has_many :units, through: :unit_amenities`

### 3.5. Инварианты (всегда истинны)

1. `Amenity.organization_id` никогда не `NULL`.
2. После создания `organization_id` на Amenity **не может быть изменён**
   (иммутабельность, аналог F1 §3.4.2 и F2 §3.4.2). Реализация — через
   отсутствие `organization_id` в `permitted_params`.
3. `Amenity.name` — непустой, trimmed, в пределах 1..100 символов.
4. Внутри одной организации не может существовать два Amenity с
   case-insensitive равными нормализованными именами (§3.2).
5. Amenity не виден за пределами своей организации — ни через `index`,
   ни через `show`, ни через `update`/`destroy`. Унаследовано от F1/F2.
6. **Amenity, у которого есть хотя бы одна привязка** `UnitAmenity` —
   **не может быть удалён**: попытка → `409 Conflict`. Инвариант
   реализуется двумя механизмами:
   а) `dependent: :restrict_with_error` на ассоциации (ORM-уровень) —
   **основная защита** при штатном `amenity.destroy` через Rails;
   б) `ON DELETE RESTRICT` на FK `amenity_id` в `unit_amenities`
   (DB-уровень) — защита от прямых SQL `DELETE` в обход Rails.
   При вызове `amenity.destroy` из контроллера ORM-уровень срабатывает
   **до** SQL: возвращает `false` и заполняет `errors[:base]`, до DB
   даже не доходит. DB-уровень тестами F3 не покрывается (как и в F2
   cascade) — при рефакторинге не удалять ни один из двух механизмов
   без явной замены.
7. При удалении Unit все его `UnitAmenity`-привязки удаляются
   каскадно (`ON DELETE CASCADE` + `dependent: :destroy`). Это согласовано
   с F2 §3.4.7.
8. При удалении Organization её amenities удаляются каскадно через
   `dependent: :destroy` + `ON DELETE CASCADE`. Поведение при наличии
   привязок **не определено** в F3: cascade по пути
   `organizations → properties → units → unit_amenities` (F2 §3.4.7)
   может сработать раньше `RESTRICT` на `amenity_id`, оставив удаление
   проходящим; реальный порядок зависит от плана PostgreSQL. Удаление
   Organization не тестируется в HW-1 (вне scope), и F3 не гарантирует
   никакого конкретного поведения для этого пути. Если в будущем
   потребуется явная семантика — это отдельная фича.
9. Нельзя привязать Amenity одной организации к Unit другой
   организации. Реализуется на уровне API сценария create-UnitAmenity:
   `:unit_id` резолвится через `Current.organization.units`, `amenity_id`
   из тела резолвится через `Current.organization.amenities` — обе
   проверки обязательны, нарушение любой → `404` (см. §5.6).

## 4. Авторизация

### 4.1. Аутентификация

Как в F1/F2: валидный access-токен. Без токена → `401`.

### 4.2. Контекст организации

Как в F1/F2: `X-Organization-Id`, `set_current_organization`. Ошибки
(422/403/404) — идентичны F1/F2.

### 4.3. Permissions — новые коды

F3 **добавляет** два новых кода в `Permissions::ALL_PERMISSIONS`:

- `amenities.view`
- `amenities.manage`

Обновление preset-ролей (`Permissions::PRESET_ROLES`):

- `admin` — получает оба кода автоматически (у admin полный список
  `ALL_PERMISSIONS`, изменение в `ALL_PERMISSIONS` его покрывает).
- `manager` — получает оба кода: `amenities.view` и `amenities.manage`
  (менеджер управляет и юнитами, и справочником удобств своей
  организации).
- `viewer` — получает только `amenities.view`.

**Важно:** существующие организации, созданные до F3, имеют записи
`Role` в БД с `permissions` = массив кодов, зафиксированный на момент
создания организации. Добавление кодов в `PRESET_ROLES` **не
обновляет** уже существующие `Role`-записи автоматически. В HW-1 F3
это не исправляется отдельной миграцией данных: тесты используют
свежесозданные организации, для которых preset-роли создаются через
`Organization#create_preset_roles` с актуальным списком. Это явное
ограничение F3, зафиксировано здесь и в `report.md`.

### 4.4. Permissions — матрица действий

| Действие | Endpoint | Требуемое разрешение |
|---|---|---|
| `index` каталога amenities | `GET /api/v1/amenities` | `amenities.view` |
| `show` amenity | `GET /api/v1/amenities/:id` | `amenities.view` |
| `create` amenity | `POST /api/v1/amenities` | `amenities.manage` |
| `update` amenity | `PATCH /api/v1/amenities/:id` | `amenities.manage` |
| `destroy` amenity | `DELETE /api/v1/amenities/:id` | `amenities.manage` |
| `index` привязок юнита | `GET /api/v1/units/:unit_id/amenities` | `units.view` И `amenities.view` |
| `create` привязки (attach) | `POST /api/v1/units/:unit_id/amenities` | `units.manage` |
| `destroy` привязки (detach) | `DELETE /api/v1/units/:unit_id/amenities/:amenity_id` | `units.manage` |

**Обоснование выбора:** привязка — это модификация юнита (меняются его
характеристики), поэтому покрывается `units.manage`, а не отдельным
permission. Просмотр привязок требует **и** `units.view` **и**
`amenities.view` — пользователь должен иметь право видеть оба объекта,
которые связываются. См. §13 D4b.

**Independent permissions:** `amenities.view` и `amenities.manage` —
независимые коды, как в F1/F2. `amenities.manage` **не** подразумевает
`amenities.view`. Теоретически возможен пользователь с `.manage` без
`.view`: `POST /amenities` проходит (201), но `GET /amenities/:id`
вернёт 403. Это согласовано с F1/F2 и не рассматривается как UX-баг.

**Реализация проверки и имя policy.** Для nested эндпоинтов
`/units/:unit_id/amenities` создаётся **`UnitAmenityPolicy`** (имя
закреплено, чтобы Plan и реализатор не выбирали). Контроллер вызывает
Pundit в **symbol-form**: `authorize :unit_amenity, :index?`
(`:create?`, `:destroy?` соответственно). Это сознательное отклонение
от F1/F2 class-form `authorize Unit`: у «привязки» нет естественного
модельного класса, подходящего для class-level вызова до `find_unit`
(шаг 4 §4.7). `UnitAmenityPolicy#index?` проверяет **оба** `can?`:
`Current.membership&.can?("units.view") && Current.membership&.can?("amenities.view")`.
`create?` и `destroy?` проверяют только `Current.membership&.can?("units.manage")`.

### 4.5. Поведение при отсутствии прав

Единообразно с F1/F2: нет прав → `403 Forbidden`. Ответ рендерится
через `rescue_from Pundit::NotAuthorizedError` в `BaseController`
(уже добавлен в F1).

### 4.6. Поведение при «чужом» ресурсе

Единообразно с F1/F2: чужая организация / несуществующий id → `404`,
а не `403`, чтобы не раскрывать факт существования. Реализация через
`Current.organization.amenities.find_by(id: ...)` и
`Current.organization.units.find_by(id: ...)`.

**Порядок контроллера для плоских `/amenities` эндпоинтов** (`show`,
`update`, `destroy`): как в F1 `PropertiesController` — сначала
`find_by` в scope организации, `return if performed?` при `nil`
(рендерится 404), затем `authorize amenity` (instance-level), затем
действие. Этот порядок гарантирует, что чужой `:id` даёт 404 (не 403)
даже для пользователя без прав. Для `index` и `create` — сначала
`authorize Amenity` (class-form, настоящий модельный класс), затем
действие, как в F1. Для плоских эндпоинтов symbol-form **не**
используется (она нужна только для nested `/units/:unit_id/amenities`,
где нет естественного модельного класса, см. §4.4). Nested эндпоинты —
см. §4.7.

Для `/api/v1/units/:unit_id/amenities`:

1. `authenticate_user!` — нет токена → `401`.
2. `set_current_organization` — нет/чужой `X-Organization-Id` →
   `422`/`403`/`404`.
3. **Резолв родителя:** `Current.organization.units.find_by(id: params[:unit_id])`.
   Если `nil` → `404` **немедленно**, до Pundit.
4. **Pundit `authorize`** в **symbol-form**:
   `authorize :unit_amenity, :index?` (или `:create?` / `:destroy?`).
   См. §4.4 «Реализация проверки и имя policy». Нет прав → `403`.
5. Для `create` (attach):
   - Сначала `params.require(:unit_amenity)` — если ключа нет,
     `ParameterMissing` → `400`.
   - Затем `.permit(:amenity_id)` и резолв:
     `Current.organization.amenities.find_by(id: params[:unit_amenity][:amenity_id])`.
     Не найден → `404` (см. §5.6, единое 404 для URL- и body-путей).
   - Если `amenity_id` в permitted-параметрах отсутствует (wrapper
     есть, поле нет) — `find_by(id: nil)` → `nil` → `404` (единое
     тело с E20/E21, без различения между «поле отсутствует» и
     «amenity не найден»). См. E22b в §9.
6. Для `destroy` (detach): из URL Rails передаёт параметр как
   `params[:id]` (в nested resource route `:id` семантически равен
   `amenity_id`). Резолв:
   `unit.unit_amenities.find_by(amenity_id: params[:id])`. Не найден →
   `404` (единое тело, см. §5.8).
7. Действие и рендер.

Этот порядок — прямой аналог F2 §4.6 и закрывает ту же коллизию
«нет прав + чужой `:unit_id`» → `404`, а не `403`.

## 5. HTTP API

Базовый префикс: `/api/v1`. JSON in/out.

### 5.1. `GET /api/v1/amenities` — список каталога

- **Auth.** Permission: `amenities.view`.
- **Ответ `200 OK`:** JSON-массив объектов формата §6.1. Сортировка
  по `id ASC`. Пустой каталог → `[]`.
- **Ответ `401`/`403`:** как выше.

Во всех эндпоинтах §5.2–§5.8 коды `401 Unauthorized` и `403 Forbidden`
возвращаются по общим правилам §4.1 и §4.5 и в индивидуальных
описаниях ниже **не повторяются** ради краткости.

### 5.2. `GET /api/v1/amenities/:id`

- **Auth.** Permission: `amenities.view`.
- **Ответ `200 OK`:** объект формата §6.1.
- **Ответ `404`:** не существует / чужая организация.

### 5.3. `POST /api/v1/amenities` — создать

- **Auth.** Permission: `amenities.manage`.
- **Тело:** `{ "amenity": { "name": "Wi-Fi" } }`.
- **Ответ `201 Created`:** объект формата §6.1. `organization_id`
  ставится из `Current.organization` и **не принимается из тела**.
- **Ответ `400`:** нет ключа `amenity` (ParameterMissing).
- **Ответ `422`:** валидация (пустой name, слишком длинный, дубликат
  case-insensitive).

### 5.4. `PATCH /api/v1/amenities/:id` — редактировать

- **Auth.** Permission: `amenities.manage`.
- **Тело:** любое подмножество разрешённых полей (на момент F3 —
  только `name`).
- **Разрешённые поля:** `name`. `organization_id` игнорируется (инвариант
  §3.5.2).
- **Ответ `200 OK`:** обновлённый объект формата §6.1.
- **Ответ `400`:** нет ключа `amenity` (ParameterMissing).
- **Ответ `404`:** не найден в своей org.
- **Ответ `422`:** валидация.

### 5.5. `DELETE /api/v1/amenities/:id` — удалить

- **Auth.** Permission: `amenities.manage`.
- **Ответ `204 No Content`:** amenity удалён, у него не было ни одной
  привязки.
- **Ответ `404`:** не найден в своей org.
- **Ответ `409 Conflict`:** у amenity есть хотя бы одна привязка.
  Тело: `{ "error": ["Amenity is in use and cannot be deleted"] }`
  (формат массива — консистентно с F1/F2 §5.3 ошибками валидации).
  Это **новый** код статуса для HW-1 (в F1/F2 его не было), явно
  зафиксировано здесь.
- **Поведение контроллера:** вызывается `amenity.destroy` (без `!`).
  Если возвращается `false` — значит сработал
  `restrict_with_error` — контроллер рендерит 409 с телом из
  `amenity.errors.full_messages`. Исключения (`InvalidForeignKey`,
  `RecordNotDestroyed`) штатным путём не возникают и не ловятся.

### 5.6. `POST /api/v1/units/:unit_id/amenities` — attach

- **Auth.** Permission: `units.manage` (см. §4.4, §13 D4b).
- **Тело:** `{ "unit_amenity": { "amenity_id": 17 } }` — **с
  wrapper-ключом** для консистентности с F1/F2 (`{"property": {...}}`,
  `{"unit": {...}}`). Контроллер использует
  `params.require(:unit_amenity).permit(:amenity_id)`.
- **Ответ `201 Created`:** объект формата §6.2 (описание привязки).
- **Ответ `400`:** нет ключа `unit_amenity` в теле (ParameterMissing).
- **Ответ `404`:** один из двух случаев (единое тело, без различения):
  - `:unit_id` в URL не существует или принадлежит чужой организации;
  - `amenity_id` в теле не существует в `Current.organization.amenities`
    (включая случай «amenity чужой организации»).
  Единое 404 согласовано с F1/F2 паттерном «не раскрывать
  существование», независимо от того, пришёл ли идентификатор из URL
  или из тела.
- **Ответ `422`:** пара `(unit_id, amenity_id)` уже существует
  (повторная привязка): `{ "error": ["Amenity has already been attached"] }`.

### 5.7. `GET /api/v1/units/:unit_id/amenities` — список привязок юнита

- **Auth.** Permissions: `units.view` И `amenities.view`.
- **Ответ `200 OK`:** JSON-массив объектов формата §6.1 (сами amenities,
  не записи join-таблицы). Сортировка по `amenity.id ASC`
  (детерминированная для тестов). Пустой список → `[]`.
- **Ответ `404`:** `:unit_id` не существует / чужая организация.

### 5.8. `DELETE /api/v1/units/:unit_id/amenities/:id` — detach

Параметр URL семантически представляет `amenity_id` (ID амёнити, не
ID записи UnitAmenity), но в Rails routes nested resource он будет
называться `:id`. В тексте ниже используется `:amenity_id` для
ясности; в реализации `params[:id]`.

- **Auth.** Permission: `units.manage`.
- **Ответ `204 No Content`:** привязка удалена.
- **Ответ `404`:** любой из случаев (единое тело, без различения):
  - `:unit_id` не существует / чужая организация;
  - нет записи `UnitAmenity` с парой `(unit_id, params[:id])` —
    amenity никогда не привязывался, был уже отвязан, или вообще
    не существует в этой организации.

## 6. JSON-контракты

### 6.1. Amenity

```json
{
  "id": 17,
  "organization_id": 42,
  "name": "Wi-Fi",
  "created_at": "2026-04-08T12:34:56Z",
  "updated_at": "2026-04-08T12:34:56Z"
}
```

- Все ключи всегда присутствуют.
- `name` возвращается в **исходном регистре** (нормализация меняет
  только whitespace, не регистр).
- `organization_id` возвращается (в отличие от Unit §F2 §6, где он
  выведен через property) — amenity принадлежит организации напрямую,
  поле хранится на модели. Согласованность с F1 Property §6.

### 6.2. UnitAmenity (ответ на attach)

```json
{
  "id": 5,
  "unit_id": 123,
  "amenity_id": 17,
  "created_at": "2026-04-08T12:34:56Z",
  "updated_at": "2026-04-08T12:34:56Z"
}
```

- Включает оба timestamp, как стандартный Rails-ответ с `t.timestamps`
  в миграции — консистентно с F1/F2. Отсутствие семантической
  изменяемости записи не повод отклоняться от стандартного контракта.
- Без вложенного Amenity (если клиенту нужна полная информация —
  отдельный `GET /amenities/:id`).

### 6.3. F2 Unit JSON — **не меняется**

`GET /api/v1/properties/:property_id/units/:id` возвращает тот же набор
ключей, что и в F2 §6. **amenities в это тело не включаются** — см.
§13 D6 и §2.2. AC11 F2 продолжает действовать без изменений; F3 не
должен сломать ни один тест из `properties_spec.rb` или `units_spec.rb`.

## 7. Валидация

### 7.1. Amenity

| Поле | Правило | Сообщение |
|---|---|---|
| `name` | presence | `"Name can't be blank"` |
| `name` | length 1..100 | `"Name is too long (maximum is 100 characters)"` |
| `name` | unique (case-insensitive, per organization) | `"Name has already been taken"` |
| `organization` | presence | `"Organization must exist"` |

### 7.2. UnitAmenity

| Поле | Правило | Сообщение |
|---|---|---|
| `unit` | presence | `"Unit must exist"` |
| `amenity` | presence | `"Amenity must exist"` |
| `(unit_id, amenity_id)` | unique | `"Amenity has already been attached"` |

Текст сообщений — ориентировочные Rails-дефолты; тесты сверяют по
ключевому фрагменту.

## 8. Состояния и переходы

Amenity и UnitAmenity — CRUD-сущности без состояний. Жизненный цикл:

```text
Amenity:  (не существует) → create → (существует) → update/destroy → (не существует)
UnitAmenity: (не существует) → create (attach) → (существует) → destroy (detach) → (не существует)
```

UnitAmenity **не редактируется** — нет `PATCH`. Если нужна «замена»
(другой amenity) — detach + attach.

## 9. Сценарии ошибок и edge cases

| # | Сценарий | Код | Тело |
|---|---|---|---|
| E1 | Без токена | 401 | дефолт |
| E2 | Без `X-Organization-Id` | 422 | `{"error":"Organization not selected"}` |
| E3 | `amenities.view` без `amenities.manage` → POST amenity | 403 | Pundit |
| E4 | Без прав → GET index amenities | 403 | Pundit |
| E5 | `show` amenity чужой org | 404 | дефолт |
| E6 | `show` несущ `:id` amenity | 404 | дефолт |
| E7 | `create` amenity с пустым `name` | 422 | `{"error":["Name can't be blank"]}` |
| E8 | `create` amenity с `name` > 100 символов | 422 | длина |
| E9 | `create` amenity с дубликатом (case-insensitive) | 422 | `"Name has already been taken"` |
| E10 | `create` без ключа `amenity` в теле | 400 | ParameterMissing |
| E11 | `create` с попыткой передать `organization_id` | 201 | поле игнорируется |
| E12 | `update` amenity с попыткой сменить `organization_id` | 200 | поле игнорируется |
| E13 | `update` amenity с дубликатом name в своей org | 422 | unique |
| E14 | `update` amenity с тем же name (self) | 200 | OK (не считается дубликатом) |
| E15 | `destroy` amenity без привязок | 204 | — |
| E16 | `destroy` amenity с ≥1 привязкой | 409 | `{"error":["Amenity is in use and cannot be deleted"]}` |
| E17 | `destroy` несущ amenity | 404 | — |
| E18 | `attach` с несущ `:unit_id` | 404 | — |
| E19 | `attach` с `:unit_id` чужой org | 404 | — |
| E20 | `attach` с несущ `amenity_id` в теле | 404 | — |
| E21 | `attach` с `amenity_id` чужой org в теле | 404 | — (единое 404, §5.6) |
| E22 | `attach` без ключа `unit_amenity` в теле | 400 | ParameterMissing |
| E22b | `attach` с `{"unit_amenity": {}}` (wrapper есть, `amenity_id` нет) | 404 | — (единое 404 с E20/E21, §5.6) |
| E23 | `attach` дубликата `(unit_id, amenity_id)` | 422 | `"Amenity has already been attached"` |
| E24 | `index` привязок с несущ `:unit_id` | 404 | — |
| E25 | `index` привязок у юнита без привязок | 200 | `[]` |
| E26 | `index` привязок с `units.view` но без `amenities.view` | 403 | — |
| E27 | `detach` пары, которой нет в БД: amenity существует в org, но не привязан к этому юниту | 404 | — |
| E27b | `detach` несуществующего `:amenity_id` | 404 | — |
| E28 | `detach` `:amenity_id` чужой организации (если unit свой) | 404 | запись не существует |
| E29 | no-perm user + foreign `:unit_id` → `attach` | 404 | §4.7 коллизия |
| E30 | `destroy` Unit каскадно удаляет все UnitAmenity этого юнита | — | инвариант §3.5.7, model spec |

## 10. Acceptance criteria

**Нотация тел запросов в AC ниже.** Краткая форма `POST /amenities
{name:"X"}` — shorthand для литерального тела `{"amenity": {"name":
"X"}}` (wrapper-ключ, §5.3). Краткая форма `POST /units/:u/amenities
{amenity_id: N}` — shorthand для `{"unit_amenity": {"amenity_id": N}}`
(§5.6). Literal-нотация используется только там, где важен точный
формат wrapper-а (AC2, E22b). Тесты реализуют литеральные тела.

**AC1 — Happy path каталог.**
`manager` в своей организации: `POST /amenities {name:"Wi-Fi"}` → 201 →
виден в `GET /amenities` → `PATCH` меняет name → 200 → `DELETE` →
204 → последующий `show` → 404.

**AC2 — Happy path привязки.**
Предусловие: amenity `wifi` в своей org, unit `u1` в своей org.
`POST /units/:u1_id/amenities` с телом
`{"unit_amenity": {"amenity_id": wifi.id}}` → 201 → `GET
/units/:u1_id/amenities` содержит wifi → `DELETE
/units/:u1_id/amenities/:wifi.id` → 204 → последующий `GET` пустой.

**AC3 — Изоляция организаций (catalog).**
Amenity `org_a` не виден в org_b — ни в index, ни в show, ни через
update/destroy. Все ответы 404.

**AC4 — Изоляция организаций (linking).**
Попытка привязать amenity `org_a` к юниту `org_a` из сессии `org_b`:
`:unit_id` → 404 (чужой юнит не виден).
Попытка привязать amenity `org_a` к юниту `org_b` из сессии `org_b`:
`amenity_id` в теле → 404 (amenity не в scope текущей org, §5.6).

**AC5 — Удаление amenity в использовании.**
Amenity `wifi` привязан к `u1`. `DELETE /amenities/:wifi.id` → 409,
amenity в БД остаётся, привязка в БД остаётся.
После `DELETE /units/:u1_id/amenities/:wifi.id` → 204, затем
`DELETE /amenities/:wifi.id` → 204.

**AC6 — Case-insensitive уникальность.**
`POST /amenities {name:"Wi-Fi"}` → 201.
`POST /amenities {name:"wi-fi"}` → 422 (дубликат).
`POST /amenities {name:"WIFI"}` → 422 (дубликат).
`POST /amenities {name:"  Wi-Fi  "}` → 422 (после strip — дубликат).

**AC7 — Read-only viewer.**
`viewer` (только `.view` permissions): `GET /amenities` → 200;
`POST/PATCH/DELETE /amenities` → 403;
`GET /units/:u1_id/amenities` → 200;
`POST /units/:u1_id/amenities` → 403; `DELETE .../amenities/:id` → 403.

**AC8 — No-permission user.**
Пользователь без `amenities.view` и `amenities.manage`: все эндпоинты
`/amenities` → 403.
**Дополнительно (симметрично):**

- Пользователь c `units.manage` и `units.view`, но **без**
  `amenities.view`: `GET /units/:u1_id/amenities` → 403.
- Пользователь c `amenities.view`, но **без** `units.view` и без
  `units.manage`: `GET /units/:u1_id/amenities` → 403.

Оба случая проверяют правило §4.4 «оба разрешения обязательны».

**AC9 — Unauthenticated.**
Любой эндпоинт F3 без токена → 401.

**AC10 — `X-Organization-Id` отсутствует.**
Любой эндпоинт F3 без заголовка → 422, `{"error":"Organization not selected"}`.

**AC11 — Иммутабельность `organization_id`.**
`POST /amenities` с `organization_id: other_org.id` в теле → 201,
фактический `organization_id` равен `Current.organization.id`.
`PATCH /amenities/:id` с `organization_id: other_org.id` → 200,
`organization_id` в БД не изменён.

**AC12 — Стабильный JSON-контракт Amenity.**
Ответ формата §6.1: фиксированный набор ключей, `name` как строка,
`organization_id` как integer.

**AC13 — Стабильный JSON-контракт UnitAmenity.**
Ответ формата §6.2 на attach: фиксированный набор ключей (id, unit_id,
amenity_id, created_at).

**AC14 — F2 AC11 не сломан (позитивный тест).**
`GET /api/v1/properties/:property_id/units/:id` возвращает **ровно тот
же набор ключей**, что до F3 (F2 §6), без `amenities`. Проверяется
**позитивным тестом в F3 request spec**: создаётся юнит, к нему
прикрепляются 2 amenity через `POST /units/:u1/amenities`, затем
делается `GET /api/v1/properties/:property_id/units/:u1.id` и
явно проверяется `expect(response.parsed_body).not_to have_key("amenities")`.
Дополнительно: все существующие тесты F2 `units_spec.rb` остаются
зелёными без изменений — это необходимое условие, но не достаточное.

**AC15 — Каскадное удаление Unit → UnitAmenity.**
Model spec: unit имеет 2 привязки, `unit.destroy` → обе записи
UnitAmenity удаляются, сам amenity — нет. Инвариант §3.5.7.

**AC16 — RESTRICT на amenity не даёт удалить amenity в использовании
через ORM.**
Model spec: amenity с привязкой, `amenity.destroy` → false, amenity
жив, `amenity.errors[:base]` содержит сообщение restrict. Инвариант
§3.5.6.

**AC17 — §4.7 коллизия.**
Пользователь без permissions, бьющийся в чужой `:unit_id` через
`POST /units/:foreign_unit_id/amenities` → 404 (не 403). Прямой аналог
F2 AC4 collision.

**AC18 — Покрытие.**
Фактический backend line coverage не падает ниже текущего
`minimum_coverage` ratchet floor (на момент старта F3 — 60).

## 11. Не-функциональные требования

- **Производительность:** десятки amenities на организацию, десятки
  привязок на юнит. Пагинация не требуется.
- **Совместимость:** F1 и F2 API не меняются. F2 AC11 (JSON-контракт
  Unit) — явный инвариант, проверяемый тестами (AC14).
- **Безопасность:** изоляция организаций критична (§3.5.5). Любая
  утечка amenity / привязки между организациями — блокирующий баг.

## 12. Зависимости и допущения

- Существует модель `Unit` в scope `Current.organization.units`.
  ✅ F2.
- Существует `Current.organization` / `Current.membership`. ✅ F1.
- Существует `Permissions::ALL_PERMISSIONS` (конкретная константа-массив
  в `backend/app/models/concerns/permissions.rb`). ✅ F3 **меняет**
  этот список — единственное изменение в общем коде permissions,
  согласованное, см. §4.3.
- Существует `Permissions::PRESET_ROLES`. ✅ F3 меняет его списки
  `admin`/`manager`/`viewer`, см. §4.3.
- Существует `Organization#create_preset_roles` callback, вызываемый
  `after_create`. ✅ F1.
- Существует `rescue_from Pundit::NotAuthorizedError → 403`. ✅ F1.
- Существует `Api::V1::BaseController` с `authenticate_user!` и
  `set_current_organization`. ✅ F1.
- RSpec, FactoryBot, `auth_headers` helper, factories `:user`,
  `:organization`, `:membership`, `:property`, `:unit`. ✅ F1, F2.

**Тестовый инвариант (следствие §4.3).** Все тесты F3 создают
фабричные организации в каждом `let`/`let!` через `create(:organization)`
и полагаются на `Organization#create_preset_roles` callback для
получения актуальных permissions (включая новые `amenities.*` коды).
Тесты **не** используют seed-данные и **не** переиспользуют
организации между примерами. Это гарантирует, что новые permission-коды
доступны в преcет-ролях тестовой организации, и защищает от того,
что F3 не делает отдельную data migration для существующих orgs
(§4.3).

**Кастомные роли для AC8 дополнительных сценариев.** AC8 требует
пользователей с нестандартными наборами permissions (`units.manage +
units.view` без `amenities.view`; только `amenities.view` без `units.*`).
Ни одна preset-роль этому не соответствует. Такие пользователи
конструируются явным созданием `Role` в тестовой организации:
`organization.roles.create!(code: "custom_units_only", name: "...", permissions: %w[units.view units.manage])`
и привязкой membership к этой роли. Это ожидаемый паттерн для
purpose-built тестов, не отклонение от §12.

## 13. Решения по открытым вопросам Brief

**D1 — per-org каталог (Q1, вариант «б»).**
Per-org. Аргументы: (1) согласованность с многоарендностью проекта —
все остальные ресурсы per-org; (2) разные организации имеют разные
наборы удобств (хостел и бутик-отель); (3) меньше магии в схеме
(`organization_id` NOT NULL, стандартный scoping через
`Current.organization.amenities`); (4) миграционная стоимость (а)
и (в) вариантов выше: seed-данные, nullable FK, составные уникальные
индексы на частичных NULL, merge-логика в index. Для HW-1 — per-org.
Гибридный вариант — Phase 12+.

**D2 — case-insensitive уникальность (Q2).**
Нормализация: `strip` (как F1/F2 `normalizes :name`). Регистр и
внутренние пробелы сохраняются в хранилище. Уникальность —
case-insensitive в пределах organization, через функциональный
уникальный индекс на `LOWER(name)` вместе с `organization_id`.
Обоснование: менеджер не должен иметь двух «одинаковых» удобств,
отличающихся только регистром — это визуально неразличимо в UI и
семантически одно и то же. `squeeze` внутренних пробелов **не**
применяется — это over-engineering для HW-1 и отклонение от F1/F2
паттерна нормализации.

**D3 — RESTRICT на удаление (Q3).**
`DELETE /amenities/:id` запрещён, если у amenity есть хотя бы одна
привязка → `409 Conflict`. Реализация на двух уровнях:
`dependent: :restrict_with_error` в ассоциации (ORM) и `ON DELETE
RESTRICT` на FK `amenity_id` в `unit_amenities` (DB). Причины: (1)
каскад молча удалил бы пользовательские данные; (2) soft delete в
проекте не используется по DEC; (3) явная ошибка менеджеру («сначала
отвяжи от юнитов») — стандартное UX для справочников.

**D4a — отдельный permission `amenities.manage` (Q4a).**
Да, отдельный код в `ALL_PERMISSIONS`. Обоснование: управление
справочником — отдельная ответственность; роль «редактор контента»
в будущем может иметь `amenities.manage` без `units.manage`. Также
добавляется `amenities.view`. Preset-роли обновляются (§4.3).

**D4b — привязка покрывается `units.manage` (Q4b).**
Да, привязка — это модификация юнита, покрывается существующим
`units.manage`. Отдельный `amenities.link` **не вводится**:
(1) избыточная гранулярность для HW-1; (2) семантически «изменить,
какие amenities есть у юнита» — это «изменить юнит»; (3) меньше
permissions — проще онбординг менеджера. Просмотр привязок требует
**оба** `units.view` и `amenities.view` (§4.4) — пользователь должен
иметь право видеть оба связываемых ресурса.

**D5 — REST subresources без replace-all (Q5, вариант «а»).**
Attach: `POST /units/:unit_id/amenities` с телом
`{"unit_amenity": {"amenity_id": N}}`. Detach:
`DELETE /units/:unit_id/amenities/:amenity_id`. Replace-all
(`PATCH /units/:id {amenity_ids: [...]}`) — **не** вводится в F3.
Причины: (1) replace-all требует сложной семантики diff (что считать
«новой» привязкой, что «удалённой»), идемпотентности; (2) не
вписывается в форму F1/F2 reference pattern; (3) для UI будущего
frontend'а достаточно последовательности attach/detach с optimistic
updates. Если окажется нужно — можно добавить в Phase 2.3.5 отдельно.

**D6 — отдельный subresource для attached amenities, F2 JSON не
меняется (Q6, вариант «отдельный подресурс»).**
`GET /units/:unit_id/amenities` — отдельный эндпоинт, возвращает
список Amenity. F2 `GET /properties/:property_id/units/:id`
**не включает** amenities в ответ. Причины:
(1) F2 AC11 фиксирует набор ключей как стабильный; включение
amenities — формальное изменение контракта, которое уронит все
существующие F2-тесты и потребует их переписать — это blast radius,
непропорциональный выгоде; (2) отдельный эндпоинт даёт клиенту
контроль («мне нужен только юнит, без amenities» — одна сетевая
операция); (3) F3 таким образом остаётся **аддитивной** фичей, не
регрессивной. AC14 явно фиксирует это как обязательное требование.

**D7 — `has_many :through` + явная `UnitAmenity` (Q7).**
Да, `has_many :through :unit_amenities`, явная модель `UnitAmenity`.
HABTM не рассматривается (устарел для нового кода, не даёт доступа
к join-атрибутам, не поддерживает callbacks). Зафиксировано в
`ai-docs/DECISIONS.md` как **DEC-013** (обязательный шаг per
Issue #3). Плюс: `UnitAmenity` — полноценный ActiveRecord со своими
валидациями (`unique (unit_id, amenity_id)`), что невозможно в HABTM.

**D8 — нет min/max на количество amenities у юнита (Q8).**
В HW-1 не вводится ни нижняя граница (юнит может существовать без
amenities), ни верхняя (никто не пишет 1000 amenities — это не
реалистичная ошибка ввода). Если в будущем обнаружится злоупотребление
— добавить верхнюю границу в отдельной фиче.

**D-open — поля Amenity (не из Brief, зафиксировано в Spec).**
Amenity в F3 имеет **только** поле `name` (плюс служебные id,
organization_id, timestamps). Решено не вводить:

- `description` — свободный текст, не нужен для фильтрации;
- `icon` / `code` — требует связки с Phase 2.1.4 (storage) или
  системным каталогом;
- `category` — иерархия, требует отдельного справочника категорий.

Все эти поля могут быть добавлены в будущем без breaking changes
(новые nullable колонки).
