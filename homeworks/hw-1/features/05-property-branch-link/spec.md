---
name: F5 Spec — Property ↔ Branch link
status: active
related_issue: "#5"
umbrella_issue: "#1"
brief: ./brief.md
feature: 05-property-branch-link
---

# Spec — Property ↔ Branch link

> Контракт реализации. Описывает **что** должно быть сделано, не **как**.
> «Как» — в `plan.md`.
> F5 — горизонтальная фича: меняет существующие F1 и F4 контракты
> вместо введения новой сущности. Отличия от F1–F4 зафиксированы
> явно.

## 1. Ссылка на источник

- Brief: [./brief.md](./brief.md)
- Issue: Arshev/apartus#5, Arshev/apartus#1 (зонтик).
- Reference implementations: F1 Property (меняется), F4 Branch
  (меняется), F2/F3 (не затрагиваются).
- Совпадающие детали (JWT, `Current.organization`,
  `X-Organization-Id`, формат ошибок, `if .save/.update`) — берём
  без переобсуждения.

## 2. Scope

### 2.1. Входит

- Добавление колонки `branch_id` на таблицу `properties` (nullable,
  self-referential только нет — FK на `branches`).
- Обновление модели `Property`: `belongs_to :branch, optional: true`
  и custom validation `branch_must_exist_in_org` (defense-in-depth
  per §13 D4).
- Обновление `PropertiesController`: `branch_id` в `permit`,
  pre-save scope resolve с `:not_in_scope` sentinel (прямой перенос
  F4 security pattern), явное 422 для cross-org случаев.
- Обновление `Property` JSON-ответа: добавление ключа `branch_id`
  (null или integer). **F1 AC9 обновляется ретроспективно** (см.
  §13 D2).
- Обновление модели `Branch`: `has_many :properties` +
  расширение `before_destroy` callback проверкой `properties.exists?`
  с единым сообщением restrict.
- Обновление F1 request specs (`properties_spec.rb`) для нового
  ключа JSON и новых тестов на branch_id.
- Обновление F4 request specs (`branches_spec.rb`) для нового
  restrict сценария (branch с properties → 409).
- Coverage ratchet bump до `floor(actual) - 1` с target 80 (финал
  HW-1). Если F5 implementation alone не достигает 80 — добавление
  тестов на hw-0 код по явной процедуре §13 D8 (с конкретными
  порогами и приоритетами hw-0 файлов).

### 2.2. Не входит

- **Endpoint `GET /api/v1/branches/:id/properties`** — Phase 2.2.5.
- **Фильтрация `GET /api/v1/properties?branch_id=N`** — Phase 2.2.5.
- **`Unit.branch_id`** — транзитивно через Property (Brief §5).
- **Bulk перемещение** Property между branches.
- **History / audit log** изменений branch_id.
- **Data migration существующих Property** — все получают `null`.
- **Новый permission-код** — используется существующий
  `properties.manage` (§13 D3).
- **Новая сущность** — F5 не вводит ни одной новой модели или
  таблицы.
- **Frontend.**
- Любые изменения F2 Unit, F3 Amenity/UnitAmenity, Organization
  (кроме transitive через F4 Branch, которое не трогается), Role,
  Membership.

## 3. Доменная модель

### 3.1. Изменения сущности Property

Добавляется одна колонка:

| Атрибут | Тип | Обязательность | Ограничения |
|---|---|---|---|
| `branch_id` | bigint | опционально (nullable) | FK на `branches`, индекс, `ON DELETE RESTRICT` (DB-уровень §3.2.3), по умолчанию `null` |

Все существующие поля (`organization_id`, `name`, `address`,
`property_type`, `description`) — без изменений.

### 3.2. Инварианты F5 (дополняют F1 §3.4)

1. `Property.branch_id` может быть `NULL` (опциональная связь,
   Brief critical invariant).
2. Если `Property.branch_id` задан, то:
   а) Branch существует в БД;
   б) Branch принадлежит **той же** организации, что Property
   (`property.organization_id == branch.organization_id`);
   в) Branch не удалён (защита от race — `ON DELETE RESTRICT`).
3. **Cross-org isolation (Brief blocking).** Через API F5 невозможно
   создать или отредактировать `Property` так, чтобы `branch_id`
   указывал на Branch другой организации. Реализация — pre-save
   scope resolve в контроллере (§5.3, §5.4).
4. **Restrict при удалении Branch с привязанными Properties.**
   Попытка `DELETE /api/v1/branches/:id`, когда `branch.properties.exists?`,
   → `409 Conflict`. Реализация — расширение F4 `before_destroy`
   callback. Консистентно с F4 existing restrict на `children` и
   F3 Amenity restrict.
5. Иммутабельность `organization_id` у Property сохраняется (F1
   §3.4.2) и является **предусловием** инварианта 2.b: пока
   `organization_id` у Property не меняется, выполняется
   `property.organization_id == property.branch.organization_id`.
   Инвариант 2.b защищён через API F5 (§4.2 security invariant) и
   через F1 иммутабельность. **F5 не защищает от прямого SQL
   `UPDATE properties SET organization_id = ...`** — такой путь
   вне scope HW-1 и потенциально нарушает 2.b (property в новой
   org ссылается на branch старой org). В F5 не тестируется.

### 3.3. Изменения ассоциаций

**Property:**

```ruby
belongs_to :branch, optional: true
```

**Branch:** добавляется

```ruby
has_many :properties
```

**Organization:** `has_many :branches` (уже есть с F4), `has_many
:properties` (уже есть с F1) — транзитивно связь Org→Branch→Properties
согласована, но **не** вводится `has_many :properties_in_branches`
или аналогов.

## 4. Авторизация

### 4.1. Permissions (§13 D3)

Новых permission-кодов **не** вводится. Все операции над `branch_id`
Property покрываются существующими кодами:

- `properties.manage` — установка и изменение `branch_id` через
  `POST`/`PATCH /api/v1/properties`. Менеджер, который редактирует
  объект, может также менять его филиал.
- `properties.view` — чтение `branch_id` в `GET
  /api/v1/properties[/:id]`.
- `branches.manage` — не нужен для установки `branch_id` (§13 D3).

Preset-роли (`admin`, `manager`, `viewer`) — **не** меняются.

### 4.2. Security invariant (Brief blocking)

**Cross-org isolation** реализуется в `PropertiesController` через
тот же pattern, что F4 `BranchesController#resolve_parent_or_error`:

1. `permit` → `branch_id`.
2. Если `branch_id.present?` → `Current.organization.branches.find_by(id: branch_id)`.
3. Если `nil` → **не** полагаться на `belongs_to :branch, optional:
   true` (молча резолвит глобально, F4 lesson), а возвращать `422`
   прямо из контроллера с сообщением «Branch must exist».
4. Если `Branch` найден — присваивать объект на `property.branch`
   (ассоциация), не integer `branch_id`.

Это **обязательно**; альтернатива (`property.update(branch_id: ...)`)
нарушает security инвариант.

**Координация сообщения «Branch must exist».** Сообщение генерируется
из двух независимых путей:

- **Controller-level (основной):** при неудачном resolve в
  §5.1/§5.2 контроллер рендерит `{"error":["Branch must exist"]}`
  напрямую (hard-coded в контроллере, до save).
- **Model-level (defense-in-depth):** custom validation §7.1
  вызывает `errors.add(:branch, "must exist")`; `full_messages`
  превращает это в `"Branch must exist"`.

Оба пути дают **идентичную** строку. Это сознательная координация
(§13 D2 — owns F5). Если Plan меняет формулировку в одном месте,
обязан обновить и второе, плюс все тесты, которые сверяют тело
ответа.

## 5. HTTP API — изменения

F5 **не вводит новых эндпоинтов**. Изменяются существующие
`/api/v1/properties` и поведение `DELETE /api/v1/branches/:id`.

### 5.1. `POST /api/v1/properties` (изменение F1)

- **Permission:** `properties.manage` (как в F1).
- **Тело:** расширено опциональным полем:

  ```json
  {
    "property": {
      "name": "Sea View Apartment",
      "address": "1 Beach Rd, Bali",
      "property_type": "apartment",
      "description": "Nice place",
      "branch_id": 17
    }
  }
  ```

  `branch_id` опционален. Отсутствие ключа или `null` → Property
  создаётся без привязки к branch.
- **Ответ `201 Created`:** объект формата §6.1 (с `branch_id`).
- **Ответ `422`:**
  - все существующие F1 случаи (пустой name, address и т.д.);
  - **новый случай**: `branch_id.present?` и резолв через scope
    вернул `nil` (чужая org или несуществующий id). Тело:
    `{"error":["Branch must exist"]}`. Единое 422 для обоих
    случаев, не раскрывает существование. Координация этой строки
    между controller и model — §4.2 «Координация сообщения».

### 5.2. `PATCH /api/v1/properties/:id` (изменение F1)

- **Permission:** `properties.manage`.
- **Тело:** расширено `branch_id` с тремя случаями (F4 pattern):
  - ключ **отсутствует** → `branch_id` не трогается;
  - `branch_id: null` → отвязка от филиала (set to nil);
  - `branch_id: <integer>` → резолв через scope, привязка.
- Различие «отсутствует vs null» реализуется через
  `params[:property].key?(:branch_id)` (F4 pattern, Plan уровень).
- **Ответ `200 OK`:** объект формата §6.1.
- **Ответ `422`:** новый случай — `branch_id` не резолвится в
  scope → `{"error":["Branch must exist"]}`.

### 5.3. `GET /api/v1/properties` и `/api/v1/properties/:id` (изменение F1)

- **Permission:** `properties.view` (как в F1).
- **Ответ `200 OK`:** объект/массив объектов формата §6.1 с
  **новым ключом** `branch_id`.
- Все существующие F1 поведения (404 для чужих, index пустой и т.д.)
  сохраняются.

### 5.4. `DELETE /api/v1/branches/:id` (изменение F4)

- **Permission:** `branches.manage` (как в F4).
- **Ответ `409 Conflict`:** **новый случай** — у branch есть хотя
  бы один привязанный Property. Тело:
  `{"error":["Branch has dependents and cannot be deleted"]}` —
  **единое сообщение** для обоих случаев (дети branches **и**
  привязанные properties). Spec выбирает единое сообщение, чтобы
  не раскрывать пользователю конкретную причину restrict.
- **Поведение F4 на branch с children** сохраняется: тот же 409
  с тем же сообщением (F5 меняет формулировку F4 с «Branch has
  children and cannot be deleted» на «Branch has dependents and
  cannot be deleted»). **Это ретроспективное изменение F4 Spec §5.5
  и AC6 сообщения** — см. §13 D2.

## 6. JSON-контракт

### 6.1. Property (обновление F1 §6)

```json
{
  "id": 42,
  "organization_id": 7,
  "branch_id": 17,
  "name": "Sea View Apartment",
  "address": "1 Beach Rd, Bali",
  "property_type": "apartment",
  "description": "Nice place",
  "created_at": "2026-04-09T12:34:56Z",
  "updated_at": "2026-04-09T12:34:56Z"
}
```

**Новый ключ:** `branch_id` (nullable integer). Все остальные ключи
— без изменений.

**F1 AC9 обновляется ретроспективно** (§13 D2). Полный набор
ожидаемых ключей после F5:

```text
[id, organization_id, branch_id, name, address, property_type,
 description, created_at, updated_at]
```

## 7. Валидация

### 7.1. Property (дополнение F1)

| Поле | Правило | Сообщение |
|---|---|---|
| `branch` | optional (belongs_to nil OK) | — (см. ниже) |
| `branch` | custom: exists in scope | `"Branch must exist"` |

**Custom validation `branch_must_exist_in_org`** (real
defense-in-depth, §13 D4):

```ruby
validate :branch_must_exist_in_org

def branch_must_exist_in_org
  return if branch_id.blank?
  return if branch.present? && branch.organization_id == organization_id

  errors.add(:branch, "must exist")
end
```

**Важное отличие от наивной проверки `branch.present?`.** Rails
`belongs_to :branch, optional: true` при чтении `branch` ищет запись
глобально через `Branch.find(branch_id)`. Если передать
`branch_id` из чужой организации напрямую через
`property.update(branch_id: <foreign_id>)` (обход контроллера),
`branch.present?` вернёт `true` — foreign Branch найден глобально,
и валидация пропустит обход. **Единственная реальная защита** —
сравнение `branch.organization_id == organization_id` внутри
валидации.

Это **прямой урок F5 implementation pattern**, применимый и к F4
(где `parent_branch_must_exist_in_org` имеет ту же слабость — в
HW-1 не эксплуатируется, т.к. F4 controller закрывает путь, но
формально не defense-in-depth). F5 не исправляет F4 ретроспективно
— это отдельный вопрос, который Spec намеренно оставляет для
потенциального hotfix после HW-1. **Для F5 модели проверка
organization match обязательна**, тестируется AC12.

Контроллер (§4.2) всё равно остаётся первой линией защиты —
`:not_in_scope` sentinel возвращает 422 до запуска валидации. Но
если кто-то обойдёт контроллер через `property.update(branch_id:
<foreign>)` — валидация модели поймает именно потому, что
сравнивает `organization_id`.

### 7.2. Branch (дополнение F4)

Изменение F4 `before_destroy` callback: проверка расширяется на
`properties.exists?`, сообщение меняется на единое «Branch has
dependents and cannot be deleted».

```ruby
def prevent_destroy_if_has_dependents
  return unless children.exists? || properties.exists?

  errors.add(:base, "Branch has dependents and cannot be deleted")
  throw(:abort)
end
```

Метод переименовывается с `prevent_destroy_if_has_children` на
`prevent_destroy_if_has_dependents` для ясности. F4 тесты на
«Branch has children and cannot be deleted» обновляются на новое
сообщение — **это ретроспективное изменение F4**, прямой аналог
F1 JSON contract patch.

## 8. Состояния и переходы

Property branch_id переходит:

```text
(Property created с null) → PATCH → (branch привязан) → PATCH → (отвязан)
(Property created с branch_id) → PATCH → (сменён branch) → PATCH → ...
```

Никаких состояний, обычное CRUD-поле с ограничениями scope.

## 9. Сценарии ошибок и edge cases

| # | Сценарий | Код | Тело |
|---|---|---|---|
| E1 | `POST /properties` без `branch_id` | 201 | `branch_id: null` в ответе |
| E2 | `POST /properties` с `branch_id: null` | 201 | как E1 |
| E3 | `POST /properties` с валидным `branch_id` свой org | 201 | `branch_id: <integer>` в ответе, Property привязан |
| E4 | `POST /properties` с `branch_id` несущ id | 422 | `{"error":["Branch must exist"]}` |
| E5 | `POST /properties` с `branch_id` из чужой org | 422 | единое с E4 (не раскрывает) |
| E6 | `PATCH /properties/:id` без `branch_id` в теле | 200 | `branch_id` не трогается |
| E7 | `PATCH /properties/:id {branch_id: null}` | 200 | отвязка (set to nil) |
| E8 | `PATCH /properties/:id` с новым валидным `branch_id` | 200 | привязка/смена |
| E9 | `PATCH /properties/:id` с `branch_id` несущ | 422 | `{"error":["Branch must exist"]}` |
| E10 | `PATCH /properties/:id` с `branch_id` чужой org | 422 | как E9 |
| E11 | `GET /properties` — массив содержит `branch_id` у всех | 200 | ключ присутствует, null или integer |
| E12 | `GET /properties/:id` — объект содержит `branch_id` | 200 | ключ в ответе |
| E13 | `GET /properties` — F1 не сломан, все F1 тесты зелёные | 200 | — |
| E14 | `DELETE /branches/:id` — branch без children и properties | 204 | — |
| E15 | `DELETE /branches/:id` — branch с children (F4 existing) | 409 | **новое сообщение**: `{"error":["Branch has dependents and cannot be deleted"]}` |
| E16 | `DELETE /branches/:id` — branch с привязанными properties (F5 new) | 409 | единое сообщение с E15 |
| E17 | `DELETE /branches/:id` — branch с children **и** properties | 409 | единое сообщение |
| E18 | Попытка обхода через `Property.update(branch_id: <foreign>)` напрямую из Rails console | 422 | custom validation ловит (defense-in-depth) |

## 10. Acceptance criteria

**AC1 — Happy path F5 create.**
`manager`: `POST /api/v1/properties {name:"X", address:"Y",
property_type:"apartment", branch_id: hq.id}` где `hq` — branch
своей org → 201, ответ содержит `branch_id == hq.id`.

**AC2 — Happy path F5 update.**
`PATCH /api/v1/properties/:id {branch_id: moscow.id}` → 200,
`property.branch_id` обновлён в БД и в ответе.

**AC3 — Unlink.**
Для Property с существующим `branch_id`:
`PATCH {branch_id: null}` → 200, `branch_id == nil` в БД и ответе.

**AC4 — Branch_id не трогается, если ключ отсутствует в теле.**
Два подпункта:

- **AC4a:** Property с `branch_id = 17`. `PATCH {name: "New"}` →
  200, `branch_id` в БД всё ещё `17` (F4 pattern для
  parent_branch_id).
- **AC4b:** Property с `branch_id = null`. `PATCH {name: "New"}`
  → 200, `branch_id` остаётся `null` (не меняется). Guard от
  регрессии «случайно приравнять nil → 0».

**AC5 — Cross-org security create (critical invariant Brief).**
`POST /properties {name: "X", branch_id: foreign_branch.id}` где
`foreign_branch` — branch **другой** организации → **422** с
`{"error":["Branch must exist"]}`. Property **не** создан в БД.

**AC6 — Cross-org security update (critical invariant Brief).**
Предусловие: Property `mine` с existing `branch_id = a.id` (где `a`
— свой branch). `PATCH /properties/:mine.id {branch_id:
foreign_branch.id}` → **422**, `mine.branch_id` в БД всё ещё
`a.id` (не foreign, не nil, не изменён).

**AC7 — F1 JSON contract updated.**
`GET /api/v1/properties/:id` возвращает объект с ключом
`branch_id` (null или integer) в дополнение к существующим F1 §6
ключам. Полный набор ключей:
`[id, organization_id, branch_id, name, address, property_type,
 description, created_at, updated_at]`.

**AC8 — Invalid branch_id несущ.**
`POST /properties {name:"X", branch_id: 999999}` → 422 с
`{"error":["Branch must exist"]}`.

**AC9 — DELETE branch с properties → 409 (Spec F5 §5.4 new).**
Branch `moscow` с привязанным Property `p1`. `DELETE
/branches/:moscow.id` → 409,
`{"error":["Branch has dependents and cannot be deleted"]}`.
`moscow` и `p1` оба остались в БД.

**AC10 — DELETE branch с children сохраняет 409 (F4 regression с новым сообщением).**
Дерево A → B. `DELETE /branches/:A.id` → 409 с новым сообщением
«Branch has dependents and cannot be deleted». Это **ретроспективное
изменение F4 AC6** (было «Branch has children and cannot be
deleted»), см. §13 D2.

**AC11 — DELETE branch с children **и** properties → 409 (single message).**
Branch `A` с child `B` и привязанным Property `p1`. `DELETE
/branches/:A.id` → 409 с тем же единым сообщением. Оба restrict
условия активны одновременно, но клиент видит один общий ответ.

**AC12 — defense-in-depth custom validation (real cross-org).**
Model spec для **двух** отдельных сценариев:

- **AC12a — non-existing branch_id:**
  `property.update(branch_id: 999_999)` → `false`,
  `property.errors[:branch]` содержит «must exist». Простой случай.
- **AC12b — cross-org branch_id (реальная защита):**
  Создать Property `p1` в `org_a` и Branch `foreign` в `org_b`.
  Напрямую в Ruby: `p1.update(branch_id: foreign.id)`. Result:
  `false`, `property.errors[:branch]` содержит «must exist». При
  этом `p1.branch` внутри валидации — **не nil** (Rails нашёл
  foreign глобально), но валидация сравнивает
  `branch.organization_id != p1.organization_id` и добавляет ошибку.
  Этот тест реально проверяет, что custom validation защищает от
  cross-org обхода контроллера, а не только от «branch_id указывает
  в пустоту».

**AC13 — F1/F2/F3/F4 regression guard (Brief blocking).**
Все существующие тесты F1 (`properties_spec.rb`), F2
(`units_spec.rb`), F3 (`amenities_spec.rb`, `unit_amenities_spec.rb`),
F4 (`branches_spec.rb`, `branch_spec.rb`) остаются зелёными после
F5 implementation. **Ожидаемые изменения** в существующих файлах
(перечислены явно, чтобы Plan знал, что именно модифицируется):

- **F1 `spec/requests/api/v1/properties_spec.rb`** — тест «returns
  JSON with exactly the documented set of keys» обновляется: в
  `expected_keys` добавляется `"branch_id"`. Другие F1 тесты — без
  изменений.
- **F4 `spec/requests/api/v1/branches_spec.rb`** — тест AC6
  «returns 409 with exact Spec §5.5 message when children exist»
  обновляется: literal сообщение меняется на «Branch has
  dependents and cannot be deleted».
- **F4 `spec/models/branch_spec.rb`** — `describe
  "before_destroy :prevent_destroy_if_has_children"` переименовывается
  в `describe "before_destroy :prevent_destroy_if_has_dependents"`
  (метод переименован в §7.2). Тест «populates errors[:base] with
  exact Spec §5.5 message» обновляется на новое сообщение.

Все остальные существующие тесты F1/F2/F3/F4 — **без изменений**,
0 failures.

**AC14 — Coverage.**
После F5 implementation (возможно + hw-0 tests), фактический line
coverage `>= 80%`. Ratchet floor поднимается до `floor(actual) - 1`
(ожидаемо 79). Это **финальная цель HW-1**.

**AC15 — Nullable optional.**
Property может существовать без Branch (`branch_id: null`). F1
CRUD работает ровно как раньше для любого Property без branch_id
в теле — никакой data migration не требуется. Существующие Property
в тестах (создаваемые через `create(:property)`) получают
`branch_id: nil` без ошибок.

## 11. Не-функциональные требования

- **Производительность:** `GET /properties` — один SQL без eager
  load branch (ключ — скалярный integer, не ассоциация в JSON).
  Никаких N+1.
- **Совместимость:** F2, F3 **не** меняются. F1 и F4 меняются
  явно и ретроспективно (§13 D2).
- **Безопасность:** cross-org isolation parent_branch_id в F4 и
  branch_id в F5 — два инстанса одного security pattern. F5
  переиспользует F4 урок без регрессий.

## 12. Зависимости и допущения

- Существует `Current.organization` / `Current.membership`. ✅ F1.
- Существует F1 `Property` модель и `PropertiesController`. ✅.
- Существует F4 `Branch` модель с `before_destroy` callback и
  `has_many :children`. ✅.
- Существует `Organization has_many :branches` + `has_many :properties`.
  ✅ F1, F4.
- F4 `BranchesController` существует и использует `:not_in_scope`
  pattern для `parent_branch_id` — F5 применяет тот же pattern для
  `branch_id` в `PropertiesController` (копия, без общего helper'а).
- RSpec, FactoryBot, `auth_headers`, factories `:property`, `:branch`,
  `:user`, `:organization`, `:membership`. ✅.

**Тестовый инвариант** (F3/F4 pattern): все тесты F5 создают фабричные
организации через `create(:organization)` в каждом `let`. Существующие
factory `:property` **не** получает default `branch_id` — Property
создаётся без привязки, AC15 инвариант.

## 13. Решения по открытым вопросам Brief

**D1 — Restrict при удалении Branch с properties (Q1).**
Вариант (а) restrict. 409 Conflict с единым сообщением «Branch has
dependents and cannot be deleted». Консистентно с F4 existing
restrict на children, с F3 Amenity restrict, и с Brief
рекомендацией. Реализация — расширение F4 `before_destroy`
callback. DB-level `ON DELETE RESTRICT` на `properties.branch_id`
— вторая линия (§13 D7).

**D2 — F5 owns изменения F1 и F4 spec'ов ретроспективно (Q2 +
Brief Q5/Q6).**
F5 — первая cross-cutting фича, и Spec выбирает модель (а):
ретроспективный patch F1 и F4 Spec'ов. Обоснование:

- Чистота актуального состояния важнее исторической immutability
  (по аналогии с `PLAN.md` markers и `SCHEMA.md` updates).
- Альтернатива (b: F5 owns override) потребовала бы читать F1 spec
  вместе с F5 spec, что менее дружелюбно для новых разработчиков.
- Разделение уровней: **C2 implementation** обновляет **код**
  существующих тестов F1/F4 (чтобы suite оставался зелёным между
  коммитами); **C4 docs sync** обновляет **текст** F1 Spec (§6
  JSON, AC9) и F4 Spec (§5.5 сообщение, AC6) вместе с PLAN.md,
  SCHEMA.md, report.md.

Это архитектурное решение, которое применяется и к будущим
cross-cutting фичам HW-2+. Фиксируется в `ai-docs/DECISIONS.md`
как **DEC-015** (опционально — Spec решает при С4).

**D3 — Permission `properties.manage` (Q3).**
Установка и изменение `branch_id` покрывается `properties.manage`.
Новый permission-код **не** вводится. Менеджер, редактирующий
объект, естественно меняет его филиал. Консистентно с минимализмом
F1–F4.

**D4 — Defense-in-depth custom validation (Q4).**
Да, `branch_must_exist_in_org` на модели Property, как аналог F4
`parent_branch_must_exist_in_org`. Защита от обхода контроллера.
Защищает AC12.

**D5 — F5 обновляет F4 модель (Q5, Q6 Brief — констатации).**
F5 **обязана** изменить F4 `Branch` модель:

- Добавить `has_many :properties`.
- Расширить `before_destroy` callback: `children.exists? ||
  properties.exists?`, с единым сообщением.
- Переименовать метод `prevent_destroy_if_has_children` →
  `prevent_destroy_if_has_dependents`.

**F4 `BranchesController` НЕ меняется.** Контроллер уже корректно
рендерит `branch.errors.full_messages` в 409 ответ (через `if
branch.destroy ... else render ... :conflict`), и новое сообщение
приходит через `errors[:base]` как раньше — только текст другой.
Изменения F5 в F4 ограничены одним файлом: `app/models/branch.rb`.

Это единственный случай в HW-1, когда одна фича меняет модель
другой. F4 regression tests обновляются **в C2 implementation фазе**
одновременно с F5 model changes — тот же коммит, чтобы suite
оставался зелёным между коммитами. Обновления F4 **Spec-документа**
(§5.5 текст, AC6) — отдельно, в C4 docs sync фазе.

**D6 — Index branch_id default (Q8 Brief — констатация).**
`add_reference :properties, :branch, foreign_key: true, null:
true` — Rails создаёт обычный индекс на `branch_id` по умолчанию,
чего достаточно для `branch.properties.exists?` lookup в
`before_destroy`. Specific indexing decision — в Plan.

**D7 — `on_delete: :restrict` на DB-уровне (Q7).**
FK `properties.branch_id` → `branches.id` с `on_delete: :restrict`.
Согласованно с F4 self-FK и F3 Amenity RESTRICT. Две линии защиты:
ORM `before_destroy` (основная, даёт 409 с понятным сообщением)
и DB RESTRICT (от прямых SQL).

**D8 — Coverage процедура (Brief coverage target).**
Spec фиксирует процедуру:

1. Реализовать F5 полностью (C1–C4).
2. Прогнать `rspec`, записать actual coverage.
3. Если `actual >= 80` → bump ratchet в C4 до `floor(actual) - 1`.
4. Если `actual < 79` → добавить тесты hw-0 кода в отдельный шаг
   (C5 или в составе C4). Приоритет: `auth/sessions_controller`,
   `auth/registrations_controller`, `members_controller`,
   `roles_controller`. Объём — минимум для 80%.
5. Если `79 <= actual < 80` → пограничный, добавить минимум тестов
   для перехода порога.

Target — HW-1 final AC14.
