---
name: F4 Spec — Branches (self-referential tree)
status: active
related_issue: "#4"
umbrella_issue: "#1"
brief: ./brief.md
feature: 04-branches
---

# Spec — Branches (self-referential tree)

> Контракт реализации. Описывает **что** должно быть сделано, не **как**.
> «Как» — в `plan.md`.

## 1. Ссылка на источник

- Brief: [./brief.md](./brief.md)
- Issue: Arshev/apartus#4 (фича), Arshev/apartus#1 (зонтичный HW-1)
- План в `ai-docs/PLAN.md`: пункты `1.4.1` (модель Branch), `1.4.2`
  (иерархия parent/children), `1.4.4` (CRUD API). Пункт `1.4.3`
  (scope видимости сотрудников) — **не** в F4, это Phase 1.3/F7+.
- Reference implementations: F1 Property CRUD, F2 Unit CRUD, F3
  Amenities. F4 — **первая tree-форма**, отличия от F1–F3 фиксируются
  явно в каждой секции.
- Совпадающие детали (JWT, `Current.organization`, `X-Organization-Id`,
  формат ошибок, стиль `if .save/.update`, reference `authorize` паттерн
  F1) — берём из F1/F2/F3 без переобсуждения.

## 2. Scope

### 2.1. Входит

- Доменная модель `Branch` — узел дерева подразделений внутри
  организации. Self-referential через `parent_branch_id`.
- REST-ресурс: `/api/v1/branches` с операциями `index`, `show`,
  `create`, `update`, `destroy`.
- Два новых permission-кода: `branches.view` и `branches.manage`
  (см. §4.3, §13 D7). Обновление preset-ролей.
- Валидации tree-инвариантов: запрет self-reference, запрет циклов
  при обновлении, restrict на удаление узла с детьми (409 Conflict).
- Cross-org изоляция parent_branch_id: невозможность указать parent
  из чужой организации — **критический security инвариант F4**.
- Покрытие сценариев request-спеками (см. §10).

### 2.2. Не входит

- **Связь `Branch ↔ Property`** — явно F5 scope. F4 Branch — самостоятельная
  сущность, без ссылок на Property.
- Scope видимости сотрудников по branches (Phase 1.3, F7+).
- Отчётность и аналитика по branches (Phase 6).
- Timezone, address, description, code/slug — минимальный набор полей
  F4 содержит только `name` и `parent_branch_id` (§13 D5).
- Ordering детей внутри одного родителя (детерминированный порядок
  по `id ASC`, но пользователь им не управляет).
- Отдельные эндпоинты `ancestors`/`descendants` — клиент строит из
  плоского списка (§13 D4).
- Вложенное дерево в JSON-ответе (`children: [...]`) — плоский массив
  (§13 D4).
- Soft delete — Branch удаляется физически, когда это разрешено §13 D3.
- Bulk-операции (перенос поддерева одним запросом).
- Audit log.
- Лимит глубины дерева — явно отсутствует (§13 D8).
- Frontend.
- Изменения моделей Property, Unit, Amenity, UnitAmenity, Membership,
  Role — кроме добавления `has_many :branches, dependent: :destroy` на
  `Organization` (§3.3).
- Любые изменения существующих API F1/F2/F3.

## 3. Доменная модель

### 3.1. Сущность Branch

| Атрибут | Тип | Обязательность | Ограничения |
|---|---|---|---|
| `id` | bigint | автогенерация | PK |
| `organization_id` | bigint | обязательное | FK на `organizations`, индекс, NOT NULL, ON DELETE CASCADE |
| `parent_branch_id` | bigint | опциональное | FK на `branches` (self), индекс, NULL = корневой узел, ON DELETE RESTRICT (DB-уровень §3.5.5) |
| `name` | string | обязательное | 1..100 символов, без ведущих/хвостовых пробелов |
| `created_at` | datetime | автогенерация | — |
| `updated_at` | datetime | автогенерация | — |

Никаких других полей. Timezone, address, description, code, slug —
явно отсутствуют (§13 D5).

### 3.2. Уникальность и нормализация имени

- `name` нормализуется через `strip` (как в F1/F2/F3).
- Уникальность: **case-insensitive внутри одного родителя в рамках
  одной организации** (§13 D6). Два «Москва» под разными корнями или
  в разных organizations — OK; два «Центр» под одним «Москва» — нет.
- Для корневых узлов (`parent_branch_id IS NULL`) — уникальность в
  рамках организации (два корневых «HQ» в одной org — нет).
- **Rails `uniqueness` валидация** (§7.1) корректно покрывает AC7
  включая nil-parent case (Rails сравнивает `nil == nil` в Ruby).
  Это основная защита на Rails-уровне.
- **DB-индекс** — защита от race conditions. Функциональный
  уникальный индекс на `(organization_id, parent_branch_id, LOWER(name))`.
  PostgreSQL трактует `NULL != NULL`, поэтому для защиты корневых
  узлов нужен либо **partial index** (два определения: `WHERE parent_branch_id IS NOT NULL` и `WHERE parent_branch_id IS NULL`),
  либо `COALESCE(parent_branch_id, 0)`. Конкретное решение — задача
  Plan.
- Нарушение → `422`, сообщение «Name has already been taken».

### 3.3. Ассоциации

- `Branch belongs_to :organization`
- `Branch belongs_to :parent_branch, class_name: "Branch", optional: true`
- `Branch has_many :children, class_name: "Branch", foreign_key: :parent_branch_id` (**без** `dependent:` — защита через `before_destroy`, см. §3.5.5)
- `Organization has_many :branches, dependent: :destroy`
  (добавляется к существующей модели без удаления других ассоциаций)

### 3.4. Self-reference нюансы

- **Модель не использует gem `ancestry` или аналоги.** Adjacency list
  реализуется вручную (§13 D1, DEC-014).
- **Публичные** методы `ancestors` и `descendants` на модели — **не**
  реализуются в F4. API не возвращает их (§6.1), клиент не вызывает их
  через endpoints (§13 D4). Если в будущем понадобятся (Phase 2.3 UI
  breadcrumbs) — отдельная фича.
- **Внутренний** обход вверх через `parent_branch.parent_branch...` —
  используется в private custom-валидации
  `parent_is_not_descendant` (§7.1). Это не публичный API и не тот
  же уровень абстракции, что `ancestors` метод — это однократный
  walk-up, не возвращающий коллекцию.

### 3.5. Инварианты (всегда истинны)

1. `Branch.organization_id` никогда не `NULL`.
2. После создания `organization_id` на Branch **не может быть изменён**
   (иммутабельность, аналог F1 §3.4.2, F2 §3.4.2, F3 §3.5.2). Через
   отсутствие `organization_id` в `permitted_params`.
3. `Branch.name` — непустой, trimmed, 1..100 символов.
4. Внутри одной организации под одним родителем не может существовать
   два Branch с case-insensitive равными именами (§3.2). Корневые
   узлы (`parent_branch_id IS NULL`) рассматриваются как имеющие
   общего «виртуального» родителя, уникальность в их рамках тоже per-org.
5. **Branch с хотя бы одним дочерним узлом не может быть удалён** →
   `409 Conflict`. Защита в два уровня:
   а) **`before_destroy` callback** на Rails-уровне (основная защита) —
   добавляет `errors[:base]` с точным сообщением «Branch has dependents
   and cannot be deleted» и `throw(:abort)`. Это **единственный**
   Rails-механизм; `dependent: :restrict_with_error` на `children`
   **не используется**, потому что он генерирует I18n-дефолтное
   сообщение, не совпадающее со Spec §5.5 (прямой урок F3 Plan
   review R1).
   б) **`ON DELETE RESTRICT`** на FK `parent_branch_id` на DB-уровне —
   вторая линия защиты от прямых SQL `DELETE` в обход Rails. Тестами
   F4 не покрывается (только ORM-путь, аналогично F3).
   При `branch.destroy` из контроллера ORM-уровень срабатывает **до**
   SQL: `before_destroy` возвращает `false`, `errors[:base]` заполнен,
   контроллер рендерит 409.
6. **Нет self-reference.** `branch.parent_branch_id != branch.id` —
   валидация модели, 422.
7. **Нет циклов в дереве.** При попытке `PATCH` branch с
   `parent_branch_id` ∈ его descendants — 422. Под «descendants»
   понимается транзитивное замыкание `children`: прямые дети, дети
   детей и т.д. Проверка — Ruby-обход вверх от нового parent'а.
8. **Cross-organization isolation критическая.** Невозможно создать
   или отредактировать Branch так, чтобы `parent_branch_id` указывал
   на Branch другой организации. Реализуется через scoping
   `Current.organization.branches.find_by(id: params[:parent_branch_id])` —
   если nil → валидация провалится как «parent must exist» → 422 (см.
   §5.3, §5.4). Это **блокирующий security инвариант** Brief.
9. **Referential integrity.** Для любого Branch в БД, если
   `parent_branch_id.present?`, то существует другой Branch с таким
   id, который принадлежит той же организации и не является самим
   собой. Это следствие §3.5.5 (restrict удаления родителя),
   §3.5.6–§3.5.7 (validation self/cycle) и §3.5.8 (cross-org isolation),
   но явно фиксируется как отдельный инвариант — любой state, при
   котором `parent_branch_id` указывает в пустоту, на self или в
   чужую организацию, — считается data corruption и не допускается
   через API F4.
10. При удалении Organization все её branches удаляются каскадно
   (`dependent: :destroy` + `ON DELETE CASCADE` на `organization_id`).
   **Поведение не определено в F4**: порядок destroy при каскаде не
   детерминирован, и `before_destroy` callback Branch (§3.5.5) может
   заблокировать удаление родителя, если Rails пытается удалить его
   раньше детей. Путь удаления Organization не тестируется в HW-1
   (вне scope), аналогично F3 §3.5.8.

## 4. Авторизация

### 4.1. Аутентификация

Как в F1/F2/F3: валидный access-токен. Без токена → `401`.

### 4.2. Контекст организации

Как в F1/F2/F3: `X-Organization-Id`, `set_current_organization`.
Ошибки (422/403/404) — идентичны.

### 4.3. Permissions — новые коды

F4 **добавляет** два новых кода в `Permissions::ALL_PERMISSIONS`:

- `branches.view`
- `branches.manage`

Обновление `Permissions::PRESET_ROLES`:

- `admin` — получает оба автоматически (через `ALL_PERMISSIONS`).
- `manager` — получает оба: `branches.manage`, `branches.view`.
  Аргумент: менеджер организации вправе менять оргструктуру.
- `viewer` — получает только `branches.view`.

**Ограничение F4** (аналогично F3 §4.3): существующие организации,
созданные до F4, имеют preset роли в БД с «старым» массивом
permissions. F4 **не** делает data migration для retroactive update.
Тесты используют свежие фабричные организации (§12 тестовый инвариант).

### 4.4. Permissions — матрица действий

| Действие | Endpoint | Разрешение |
|---|---|---|
| `index` | `GET /api/v1/branches` | `branches.view` |
| `show` | `GET /api/v1/branches/:id` | `branches.view` |
| `create` | `POST /api/v1/branches` | `branches.manage` |
| `update` | `PATCH /api/v1/branches/:id` | `branches.manage` |
| `destroy` | `DELETE /api/v1/branches/:id` | `branches.manage` |

**Independent permissions:** `branches.view` и `branches.manage` —
независимы (как F1/F2/F3). `.manage` не подразумевает `.view`.

### 4.5. Поведение при отсутствии прав

Как в F1/F2/F3: `403 Forbidden` через `rescue_from
Pundit::NotAuthorizedError` в `BaseController`.

### 4.6. Поведение при «чужом» ресурсе

Как в F1/F2/F3: чужая организация / несуществующий id → `404`. Через
`Current.organization.branches.find_by(id: ...)`.

**Порядок контроллера для `/branches` эндпоинтов** (`show`, `update`,
`destroy`): как в F1 `PropertiesController` — сначала `find_by` в
scope, `return if performed?` при `nil`, затем `authorize`, затем
действие. Для `index` и `create` — сначала `authorize Branch`
(class-form), затем действие.

### 4.7. Порядок обработки запроса (для `create`/`update`)

Для `POST /api/v1/branches` и `PATCH /api/v1/branches/:id` дополнительно
важен **порядок проверок parent_branch_id**, потому что он пользовательский
input:

1. Стандартные шаги (auth, org, find_by для update, authorize).
2. `permit` входных полей (`name`, `parent_branch_id`).
3. Если `parent_branch_id` передан и не `nil`:
   - резолв через `Current.organization.branches.find_by(id: ...)`.
     Если `nil` → **валидация модели провалится** как `parent_branch
     must exist` → `422`. Это применимо к обоим случаям: «не существует»
     и «чужая организация» (единое 422, не раскрывает существование).
4. Передача валидированных параметров в `new`/`update`.
5. Rails запускает валидации модели, включая custom
   `parent_branch_must_exist_in_org` (§7.1): если
   `parent_branch_id.present?` но `parent_branch.nil?` (scope вернул
   nil) → 422 «Parent branch must exist». **Критично:** контроллер
   должен присваивать parent как объект через scope. Альтернатива
   (`.new(parent_branch_id: raw_id)`) категорически запрещена —
   см. ANTI-PATTERN блок в §5.3.
   - Self-reference (`branch.id == parent_branch_id`) — отдельная
     валидация, 422.
   - Цикл (новый parent — descendant самого branch) — отдельная
     валидация, 422. Применяется только в `update`, т.к. у свежего
     branch ещё нет детей.
6. Если все валидации OK — запись сохраняется.

**Следствие:** нет специального кода 404 для «parent_branch_id
указывает на чужую организацию» — **единое 422** с сообщением
«Parent branch must exist». Это отличается от F3 §5.6 (где единый
код 404 для «amenity_id из тела не найден»), потому что parent_branch_id
— не отдельный URL-resource, а **поле модели**, которое проверяется
стандартной Rails-валидацией `belongs_to`. 422 консистентно со
стандартным Rails UX для невалидных ссылок, и не раскрывает
существования (текст одинаков для обоих случаев).

## 5. HTTP API

Базовый префикс: `/api/v1`. JSON in/out.

Во всех эндпоинтах `401` и `403` возвращаются по общим правилам
§4.1/§4.5 и в индивидуальных описаниях ниже не повторяются.

### 5.1. `GET /api/v1/branches` — список (плоский)

- **Auth.** Permission: `branches.view`.
- **Ответ `200 OK`:** JSON-массив объектов формата §6.1. Сортировка
  по `id ASC` (детерминированная). Плоский массив, **без** вложенного
  дерева. Клиент строит дерево из `parent_branch_id` сам (§13 D4).
- **N+1 инвариант:** endpoint не делает отдельного SQL на каждую
  запись. Для F4 достаточно одного `SELECT * FROM branches WHERE
  organization_id = ? ORDER BY id`, без eager loading parent/children
  (они не возвращаются в JSON — см. §6.1).
- Пустая организация → `[]`.

### 5.2. `GET /api/v1/branches/:id`

- **Auth.** Permission: `branches.view`.
- **Ответ `200 OK`:** объект формата §6.1.
- **Ответ `404`:** не существует или чужая организация.

### 5.3. `POST /api/v1/branches` — создать

- **Auth.** Permission: `branches.manage`.
- **Тело:**

  ```json
  { "branch": { "name": "Москва", "parent_branch_id": 17 } }
  ```

  `parent_branch_id` опционален (для корневых узлов — `null` или
  отсутствует).
- **⚠️ Поведение контроллера — SECURITY:** parent резолвится через
  scope, присваивается как объект, **не как integer id**. Полный
  шаблон кода + ANTI-PATTERN warning — **обязательно прочитать блок
  в конце §5.3 перед реализацией**. Без правильного паттерна AC5
  (блокирующий security инвариант Brief) будет нарушен.
- **Ответ `201 Created`:** объект формата §6.1.
- **Ответ `400`:** нет ключа `branch` в теле.
- **Ответ `422`:**
  - `name` пустой / >100 / дубликат per-parent;
  - `parent_branch_id` задан, но не найден в `Current.organization.branches`
    (включая случай «чужая организация»): `parent_branch must exist`;
  - `parent_branch_id == self.id` — невозможно на create (id ещё нет),
    но покрывается на update (§5.4).

**Реализация контроллера §5.3 и §5.4:**

```ruby
# ВЕРНО:
permitted = params.require(:branch).permit(:name, :parent_branch_id)
parent = nil
if permitted[:parent_branch_id].present?
  parent = Current.organization.branches.find_by(id: permitted[:parent_branch_id])
  # parent может быть nil — тогда custom-валидация §7.1 провалится → 422
end
branch = Current.organization.branches.new(name: permitted[:name], parent_branch: parent)
```

**⚠️ ANTI-PATTERN (security bug) — категорически запрещён, любая
альтернатива ему нарушает AC5:**

```ruby
# НЕВЕРНО — security bug: Rails резолвит parent через глобальный
# Branch.find без scope и находит чужой parent.
branch = Current.organization.branches.new(branch_params)
# где branch_params содержит parent_branch_id напрямую.
```

Rails `belongs_to :parent_branch, optional: true` найдёт чужой parent
по id без проверки organization → AC5 (cross-org isolation —
**блокирующий security инвариант Brief**) сломан. Любой код, который
передаёт `parent_branch_id` как integer в `.new`/`.update` в обход
scope, — запрещён. Единственный допустимый путь — через поиск в scope
и присваивание объекта на `parent_branch` association.

### 5.4. `PATCH /api/v1/branches/:id` — редактировать

- **Auth.** Permission: `branches.manage`.
- **Тело:** `{ "branch": { "name": "...", "parent_branch_id": ... } }` —
  любое подмножество. `parent_branch_id: null` — перемещение в корень.
- **Разрешённые поля:** `name`, `parent_branch_id`. `organization_id`
  игнорируется.
- **Поведение контроллера (§5.3 ANTI-PATTERN блок применим в полной
  мере):** controller differentiates three cases via
  `params[:branch].key?(:parent_branch_id)` — **техника различия
  "ключ отсутствует" vs "ключ передан как null"** (Plan выбирает
  конкретный способ):
  - **Ключ отсутствует** → parent не трогается; обновление только
    `name`, если оно передано.
  - **`parent_branch_id: null`** → явное перемещение в корень:
    `branch.parent_branch = nil`.
  - **`parent_branch_id: <integer>`** → резолв через
    `Current.organization.branches.find_by(id: ...)`; присваивание
    объекта (или nil) через `branch.parent_branch = parent`.
  - **Никогда** не передавать `parent_branch_id` напрямую в
    `update(branch_params)` — та же security проблема, что в §5.3
    ANTI-PATTERN.
- **Валидации (в дополнение к create §5.3):**
  - Self-reference: `parent_branch_id == self.id` → 422, сообщение
    «Parent branch cannot be self».
  - Цикл: `parent_branch_id` ∈ `self.descendants` → 422, сообщение
    «Parent branch cannot be a descendant».
- **Ответ `200 OK`:** объект формата §6.1.
- **Ответ `404`:** branch не найден в своей org.
- **Ответ `422`:** любая из валидаций выше.

### 5.5. `DELETE /api/v1/branches/:id` — удалить

- **Auth.** Permission: `branches.manage`.
- **Ответ `204 No Content`:** удалён, у него не было детей.
- **Ответ `404`:** не найден в своей org.
- **Ответ `409 Conflict`:** у branch есть хотя бы один дочерний узел.
  Тело: `{ "error": ["Branch has dependents and cannot be deleted"] }`
  (формат массива, консистентно с F1/F2/F3 и F3 §5.5 419 fix).
- **Поведение контроллера:** `if branch.destroy ... else render 409`
  (как F3 Amenity). `before_destroy` callback в модели добавляет
  ошибку в `errors[:base]` с точным сообщением и `throw(:abort)`.

## 6. JSON-контракт

### 6.1. Branch

```json
{
  "id": 17,
  "organization_id": 42,
  "parent_branch_id": null,
  "name": "Москва",
  "created_at": "2026-04-09T12:34:56Z",
  "updated_at": "2026-04-09T12:34:56Z"
}
```

- Все 6 ключей всегда присутствуют.
- `parent_branch_id` — `null` для корневых узлов, integer для
  дочерних.
- `name` — всегда строка.
- **Вложенные `children`, `parent_branch`, `ancestors`, `descendants`
  в JSON не возвращаются.** Клиент строит дерево из плоского списка
  по `parent_branch_id`.

## 7. Валидация

### 7.1. Branch

| Поле | Правило | Сообщение |
|---|---|---|
| `name` | presence | `"Name can't be blank"` |
| `name` | length 1..100 | `"Name is too long (maximum is 100 characters)"` |
| `name` | unique (case-insensitive, per (organization, parent)) | `"Name has already been taken"` |
| `organization` | presence | `"Organization must exist"` |
| `parent_branch` | custom: exists in scope | `"Parent branch must exist"` если `parent_branch_id.present?` но `parent_branch.nil?` |
| `parent_branch_id != id` | custom (self-reference) | `"Parent branch cannot be self"` |
| `parent_branch_id ∉ descendants` | custom (cycle, `on: :update`) | `"Parent branch cannot be a descendant"` |

**Важное про `belongs_to :parent_branch, optional: true`.** Флаг
`optional: true` нужен, чтобы корневые узлы (`parent_branch_id: nil`)
не падали на presence-валидации `belongs_to`. Но он **отключает и
проверку существования**: если `parent_branch_id` задан integer'ом,
а записи нет в scope — `belongs_to optional: true` считает это OK и
присваивает `parent_branch = nil`, а `parent_branch_id` остаётся
integer. Это data inconsistency и security дыра (§3.5.8).

Поэтому нужна **явная custom-валидация**:

```ruby
validate :parent_branch_must_exist_in_org

def parent_branch_must_exist_in_org
  return if parent_branch_id.blank?        # nil parent = корень, OK
  return if parent_branch.present?         # резолвлено контроллером через scope
  errors.add(:parent_branch, "must exist")
end
```

Контроллер (§5.3/§5.4) всегда присваивает `parent_branch` как объект
(результат `find_by` в scope) — если запись не найдена, `parent_branch`
будет `nil` при непустом `parent_branch_id`, и валидация сработает →
422 с «Parent branch must exist».

**Custom validations — реализация (для Spec → Plan handoff):**

- `validate :parent_is_not_self` — если `parent_branch_id.present? &&
  parent_branch_id == id` → `errors.add(:parent_branch, "cannot be
  self")`. Применяется на `:create` и `:update`.
- `validate :parent_is_not_descendant, on: :update` — обход вверх от
  `parent_branch` через `parent_branch`, проверка `!= self.id` на
  каждом шаге. Если достигли self → add error. Обход завершается
  либо при достижении self (цикл), либо при достижении корня
  (`parent_branch.nil?`). Глубина обхода ограничена фактической
  глубиной дерева.

**Rails `uniqueness` валидация для `name` (§3.2):**

```ruby
validates :name,
          presence: true,
          length: { maximum: 100 },
          uniqueness: { case_sensitive: false,
                        scope: [ :organization_id, :parent_branch_id ] }
```

Rails `uniqueness` корректно обрабатывает `nil` в scope — два
корневых «HQ» в одной org считаются дубликатами (nil == nil в Ruby).
Это покрывает AC7 пункт «два корневых в одной org → 422». DB-индекс
— дополнительная защита от race, решение Plan (§3.2).

Тексты сообщений — ориентировочные, тесты сверяют по ключевому
фрагменту.

## 8. Состояния и переходы

Branch — CRUD-сущность без состояний. Tree-структура динамическая:

```text
(не существует) → create → (существует как корень или child) →
update (rename / reparent / to-root) → destroy → (не существует)
```

`update` может изменить место в дереве: из корня в дочерний (задав
`parent_branch_id`), из дочернего в корень (`parent_branch_id: null`),
из одного поддерева в другое. Все перемещения проверяются на цикл
(§3.5.7).

## 9. Сценарии ошибок и edge cases

| # | Сценарий | Код | Тело |
|---|---|---|---|
| E1 | Без токена | 401 | дефолт |
| E2 | Без `X-Organization-Id` | 422 | `{"error":"Organization not selected"}` |
| E3 | `branches.view` без `branches.manage` → POST | 403 | — |
| E4 | Без прав → GET index | 403 | — |
| E5 | `show` branch чужой org | 404 | — |
| E6 | `show` несущ `:id` | 404 | — |
| E7 | `create` с пустым `name` | 422 | `{"error":["Name can't be blank"]}` |
| E8 | `create` с `name` > 100 | 422 | — |
| E9 | `create` с дубликатом name под тем же parent (case-insensitive) | 422 | `"Name has already been taken"` |
| E10 | `create` с дубликатом name в разных parents | 201 | OK (уникальность per-parent) |
| E11 | `create` двух корневых с одним именем в одной org | 422 | unique |
| E12 | `create` корневых с одним именем в разных orgs | 201 | OK |
| E13 | `create` без ключа `branch` | 400 | ParameterMissing |
| E14 | `create` с попыткой передать `organization_id` | 201 | игнорируется |
| E15 | `create` с `parent_branch_id` несущ | 422 | `"Parent branch must exist"` |
| E16 | `create` с `parent_branch_id` чужой org | 422 | `"Parent branch must exist"` (единое 422, не раскрывает) |
| E17 | `create` корневого (`parent_branch_id: null` или отсутствует) | 201 | OK |
| E18 | `update` с `parent_branch_id: null` (переместить в корень) | 200 | OK |
| E19 | `update` с `parent_branch_id = self.id` | 422 | `"Parent branch cannot be self"` |
| E20 | `update` с `parent_branch_id` из descendants (цикл) | 422 | `"Parent branch cannot be a descendant"` |
| E21 | `update` с `parent_branch_id` чужой org | 422 | `"Parent branch must exist"` |
| E22 | `update` — простое переименование (`{name: "New"}`), `parent_branch_id` **не передан** в теле | 200 | `parent_branch_id` в БД не изменён |
| E22b | `update` с пустым wrapper `{branch: {}}` | 400 | ParameterMissing (Rails `require` считает пустой хэш blank — урок F3 C3 implementation) |
| E22c | `update` без wrapper (`{something_else: {}}`) | 400 | ParameterMissing |
| E23 | `update` с попыткой сменить `organization_id` | 200 | игнорируется |
| E24 | `destroy` листового узла | 204 | — |
| E25 | `destroy` узла с хотя бы одним ребёнком | 409 | `{"error":["Branch has dependents and cannot be deleted"]}` |
| E26 | `destroy` несущ id | 404 | — |
| E27 | `destroy` branch чужой org | 404 | — |
| E28 | `index` в пустой org | 200 | `[]` |
| E29 | `index` не возвращает branches чужой org | 200 | только свои |

## 10. Acceptance criteria

**AC1 — Happy path CRUD.**
`manager`: `POST /branches {name:"HQ"}` → 201 (корневой) → `POST
/branches {name:"Москва", parent_branch_id: hq.id}` → 201 (дочерний)
→ `GET /branches` возвращает оба → `PATCH` переименовывает → 200 →
`DELETE` листа → 204.

**AC1b — Update без parent_branch_id сохраняет parent.**
`PATCH /branches/:id {name: "New"}` для branch с существующим parent →
200, `name` обновлён, `parent_branch_id` в БД не изменён. Тест
защищает от регрессии: контроллер не должен затирать parent при
отсутствии ключа в теле (§5.4 behavior).

**AC2a — Move child up by one level.**
Дерево HQ → Moscow → Tverskaya. `PATCH /branches/:Tverskaya.id
{parent_branch_id: HQ.id}` → 200, `Tverskaya.parent_branch_id == HQ.id`.

**AC2b — Move back down.**
После AC2a: `PATCH /branches/:Tverskaya.id {parent_branch_id:
Moscow.id}` → 200, обратная операция восстанавливает исходную структуру.

**AC2c — Root → child.**
Создать два корневых branch `A` и `C`. `PATCH /branches/:A.id
{parent_branch_id: C.id}` → 200, `A.parent_branch_id == C.id` (был
`nil`).

**AC2d — Child → root.**
Для branch с существующим parent: `PATCH {parent_branch_id: null}`
→ 200, `parent_branch_id == nil`.

**AC2e — Atomic update of `name` and `parent_branch_id`.**
Создать два корневых branch `P1` и `P2` и дочерний `X` под `P1` с
именем «Old». `PATCH /branches/:X.id {name: "New", parent_branch_id:
P2.id}` → 200, в ответе и в БД обновлены оба поля одновременно.

**AC3 — Self-reference запрещена.**
`PATCH /branches/:id {parent_branch_id: self.id}` → 422, тело содержит
«self». Существующий `parent_branch_id` не изменён.

**AC4 — Cycle запрещён.**
Три узла: A (корень), B (child of A), C (child of B). Попытка
`PATCH /branches/:A {parent_branch_id: C.id}` → 422, тело содержит
«descendant». `parent_branch_id` у A не изменён.

**AC5 — Cross-org isolation (критический security инвариант Brief).**
Все AC5a–AC5e объединены под одним ID, но каждый — отдельный `it`
в тесте. Разделение — семантическое (каждый — грань одного инварианта
«дерево не пересекает организации»), но тесты независимы.
Предусловие для всех: `foreign` — `Branch`, созданный в тесте для
**другой** организации (`other_org`), не просто несуществующий id.

**AC5a — Create с foreign parent → 422.**
`POST /branches {name: "X", parent_branch_id: foreign.id}` → 422 с
сообщением «Parent branch must exist» (единое с E15). Новый branch
не создан в БД.

**AC5b — Update parent на foreign → 422.**
`PATCH /branches/:mine.id {parent_branch_id: foreign.id}` → 422,
`parent_branch_id` у `mine` в БД не изменён.

**AC5c — Show foreign branch → 404.**
`GET /branches/:foreign.id` → 404.

**AC5d — Update foreign branch → 404.**
`PATCH /branches/:foreign.id {name: "Hacked"}` → 404, имя `foreign`
в БД не изменено.

**AC5e — Destroy foreign branch → 404.**
`DELETE /branches/:foreign.id` → 404, `foreign` в БД не удалён.

**AC6 — Restrict при удалении узла с детьми.**
Дерево A → B. `DELETE /branches/:A.id` → 409,
`{"error":["Branch has dependents and cannot be deleted"]}`. A остался
в БД, B остался. После `DELETE /branches/:B.id` → 204, затем
`DELETE /branches/:A.id` → 204.

**AC7a — Uniqueness case-insensitive под одним parent.**
Под `HQ` создать `Центр` → 201. Под тем же `HQ` создать `центр` →
422 с «Name has already been taken».

**AC7b — Одно имя разрешено под разными parent'ами.**
Под `HQ` уже есть `Центр`. Под другим узлом `Москва` создать `Центр`
→ 201 (не дубликат — разные parent'ы).

**AC7c — Два корневых с одним именем в одной org запрещены.**
Создать корневой `HQ` → 201. Создать второй корневой `HQ` в той же
org → 422, дубликат (Rails `uniqueness` с `scope:
[:organization_id, :parent_branch_id]` корректно обрабатывает
nil-parent).

**AC7d — Одно имя корневых в разных organizations разрешено.**
Создать корневой `HQ` в `org_a` → 201. Создать корневой `HQ` в
`org_b` → 201 (разные organizations).

**AC8 — Read-only viewer.**
`viewer` (только `branches.view`): `GET /branches` и `GET
/branches/:id` → 200. `POST`/`PATCH`/`DELETE` → 403.

**AC9 — No-permission user.**
Пользователь без `branches.view` и `branches.manage`: все эндпоинты
→ 403.

**AC10 — Unauthenticated.**
Любой эндпоинт без токена → 401.

**AC11 — `X-Organization-Id` отсутствует.**
Любой эндпоинт без заголовка → 422 с «Organization not selected».

**AC12 — Иммутабельность `organization_id`.**
`POST` и `PATCH` с `organization_id: other_org.id` в теле —
поле игнорируется, `organization_id` не меняется.

**AC13 — Стабильный JSON-контракт.**
Ответ ровно соответствует §6.1: набор ключей фиксирован, без
вложенных `children`/`parent_branch`/`ancestors`.

**AC14 — Independent permissions.**
Пользователь с `branches.manage` без `branches.view`: `POST /branches`
→ 201, `GET /branches/:id` → 403. (Согласованно с F1/F2/F3.)

**AC15 — `index` без N+1.**
Для F4 flat list без вложенного дерева (§5.1) N+1 структурно
невозможен: endpoint делает один `SELECT` без eager loading
ассоциаций. Явный тест реализуется через
`ActiveSupport::Notifications.subscribed` с event name
`"sql.active_record"` (строка, не символ) и фильтрацией по таблице
`branches`:

```ruby
branches_queries = 0
callback = lambda do |*, payload|
  branches_queries += 1 if payload[:sql].include?('FROM "branches"')
end
ActiveSupport::Notifications.subscribed(callback, "sql.active_record") do
  get "/api/v1/branches", headers: headers
end
expect(branches_queries).to eq(1)
```

Фильтр по подстроке `FROM "branches"` — PostgreSQL всегда экранирует
идентификаторы в double quotes, Rails нормализует SQL одинаково.
Auth-запросы идут к `users`/`memberships` и не попадают в счётчик.
SCHEMA-запросы не содержат `FROM "branches"` (они описывают таблицу
через `information_schema`), поэтому отдельный фильтр не нужен.

Создать в тесте ≥10 branches в дереве, проверить что ровно один
`SELECT * FROM branches`. Без новых гемов. Если реализация Plan
вводит eager loading parent/children (не нужно для §6.1 JSON) — тест
упадёт.

**AC16 — F1/F2/F3 не сломаны.**
Все существующие request specs F1/F2/F3 остаются зелёными без
изменений.

**AC17 — Покрытие.**
Фактический backend line coverage не падает ниже текущего `minimum_coverage`
ratchet floor (на момент старта F4 — 67).

## 11. Не-функциональные требования

- **Производительность:** десятки branches на организацию. `index`
  endpoint — один SQL (AC15). `update` с проверкой цикла — обход
  вверх, O(depth), что для ожидаемых размеров ≤ 10 уровней
  приемлемо без оптимизации.
- **Совместимость:** F1/F2/F3 API не меняются (AC16).
- **Безопасность:** cross-org isolation parent_branch_id —
  **блокирующий** инвариант Brief. Любая утечка parent_branch_id в
  чужую организацию = security bug, критичный для mergа.

## 12. Зависимости и допущения

- Существует `Current.organization` / `Current.membership`. ✅ F1.
- Существует `Permissions::ALL_PERMISSIONS` — F4 меняет эту константу,
  добавляя `branches.view` и `branches.manage`. Согласовано со
  Spec §4.3.
- Существует `Permissions::PRESET_ROLES` — F4 меняет `admin`/`manager`/
  `viewer`. Согласовано.
- Существует `Organization#create_preset_roles` callback. ✅ F1.
- `rescue_from Pundit::NotAuthorizedError → 403` в `BaseController`.
  ✅ F1.
- `Api::V1::BaseController` с `authenticate_user!` и
  `set_current_organization`. ✅ F1.
- RSpec, FactoryBot, `auth_headers` helper, factories `:user`,
  `:organization`, `:membership`. ✅ F1.
- **Factory `:branch` будет создана в F4** (в `spec/factories/`
  отсутствует, проверено grounding'ом).

**Тестовый инвариант (следствие §4.3).** Все тесты F4 создают фабричные
организации в каждом `let` через `create(:organization)`. Preset
роли получают актуальные permissions через `create_preset_roles`
callback. Тесты не используют seed-данные.

**Кастомные роли.** Для AC14 (`branches.manage` без `branches.view`)
создаётся кастомная роль через
`organization.roles.create!(code: "custom_X", permissions: %w[branches.manage])`
(аналогично F3).

## 13. Решения по открытым вопросам Brief

**D1 — Adjacency list, без гемов и closure table (Q1).**
Зафиксировано в `ai-docs/DECISIONS.md` как **DEC-014**. Один столбец
`parent_branch_id`, рекурсивные обходы вручную. Closure table и gem'ы
(`ancestry`, `closure_tree`) вне scope HW-1 по причинам: (а) сложность
без выгоды на десятках узлов; (б) CLAUDE.md запрещает новые gem'ы
без явного согласования; (в) adjacency list — Rails standard.

**D2 — Защита от циклов (Q2).**
Три уровня валидации:

- (1) `parent_branch_id != id` (self-reference) — простая проверка,
  `validate :parent_is_not_self`.
- (2) `parent_branch_id ∉ self.descendants` (цикл) — обход вверх от
  нового `parent_branch` через `parent_branch`, проверка
  `!= self.id`, `validate :parent_is_not_descendant, on: :update`.
- (3) DB-level — **не вводится** для циклов (требовал бы trigger),
  ORM-level достаточно для HW-1.

Обе валидации покрыты тестами AC3, AC4.

**D3 — Restrict при удалении узла с детьми (Q3).**
`before_destroy` callback с точным сообщением «Branch has dependents
and cannot be deleted», аналог F3 Amenity restrict fix (DEC-013
lessons). Причины:

- Консистентно с F3 restrict pattern (409 для «ресурс в
  использовании»).
- `dependent: :destroy` (cascade) риск — ошибочное удаление большого
  поддерева без возможности отката.
- Nullify / re-parent-to-grandparent требует отдельной логики и
  неожиданных side-effects, не стандартная семантика.

**D4 — Flat list, без nested tree и ancestors/descendants endpoints (Q4).**
`GET /branches` возвращает плоский массив, клиент строит дерево сам.
Никаких `GET /branches/:id/ancestors` или `GET /branches/:id/descendants`
в F4. Причины:

- Минимальный API для tree-формы.
- N+1 защита — один SQL запрос (AC15).
- UI frontend'ов в HW-1 нет, breadcrumb-сценарий не мотивирован.
- В будущем (Phase 2.3) можно добавить отдельной фичей.

**D5 — Минимальный набор полей (Q5).**
Только `name`, `parent_branch_id`, `organization_id`. Без
`code`/`slug`/`timezone`/`address`/`description`. Все они могут быть
добавлены позже nullable-колонками без breaking changes.

**D6 — Уникальность `name` per-parent (Q6).**
Case-insensitive unique на `(organization_id, parent_branch_id, LOWER(name))`.
Это соответствует естественной ментальной модели дерева: «путь»
должен быть уникальным. Корневые узлы с `parent_branch_id IS NULL`
тоже уникальны между собой per-org. Реализация — функциональный
частичный индекс (или COALESCE), решение Plan.

**D7 — Отдельные permission-коды (Q7).**
`branches.view` и `branches.manage` — отдельные коды в
`ALL_PERMISSIONS`, как F3. Причины:

- Консистентно с F3 (amenities.view/manage).
- Гранулярность — будущие роли могут иметь доступ к branches без
  доступа к organizations.manage.
- `organizations.manage` — широкий код, неуместно смешивать с
  branches (branch ≠ organization).
- Вариант «только owner» (проверка `role_enum == :owner` без
  permission) — отклонён: снижает гибкость, выбивается из F1/F2/F3
  permission-модели.

**D8 — Нет лимита глубины (Q8).**
Brief не требует лимита, ожидаемый размер — десятки узлов на
организацию, глубина — обычно 3–5. Лимит добавил бы магическое число
без явного use case. Если в будущем обнаружится злоупотребление —
добавить отдельной фичей. Проверка циклов (§3.5.7) защищает от
бесконечных деревьев естественным образом.

---

### F5 retrospective update (2026-04-09)

F5 расширяет F4 Branch модель двумя изменениями:

- `has_many :properties` добавлено в ассоциации (после
  `has_many :children`).
- `before_destroy :prevent_destroy_if_has_children` переименован
  в `prevent_destroy_if_has_dependents`. Условие расширено с
  `children.exists?` на `children.exists? || properties.exists?`.
  Сообщение `errors[:base]` унифицировано с «Branch has children
  and cannot be deleted» на **«Branch has dependents and cannot be
  deleted»** — единый текст для обоих restrict-случаев (дети
  branches **и** привязанные Property).

Все места в этом Spec'е, которые упоминали старое сообщение,
обновлены ретроспективно (§3.5.5, §5.5, §7.2, §9 E25, §10 AC6,
§13 D3). F4 AC6 теперь проверяет новое сообщение. F4
`BranchesController` не меняется — `errors.full_messages` рендерит
новый текст автоматически.

DB-level `ON DELETE RESTRICT` добавлен на `properties.branch_id`
в F5 миграции как вторая линия защиты (аналогично F4 self-FK
restrict).

Это изменение — часть SDD precedent DEC-015 «F5 owns retrospective
patches». См. F5 Spec §13 D5.
