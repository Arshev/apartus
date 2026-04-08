---
name: F2 Plan — Unit CRUD
status: active
related_issue: "#11"
umbrella_issue: "#1"
spec: ./spec.md
brief: ./brief.md
feature: 02-unit-crud
---

# Plan — Unit CRUD

> Пошаговый план реализации Spec [./spec.md](./spec.md). Форма плана
> повторяет F1 ([../01-property-crud/plan.md](../01-property-crud/plan.md))
> 1:1; отличия зафиксированы явно (nested route, §4.6 порядок шагов
> контроллера, оба enum через `validate: true`, model spec для AC12).

## 0. Группировка коммитов (3 импл-коммита + 1 docs)

| # | Группа | Файлы | Покрывает шаги |
|---|---|---|---|
| C1 | Migration + model + Property assoc | миграция, `app/models/unit.rb`, изменение `app/models/property.rb` | §1, §2 |
| C2 | Controller + policy + routes | `app/controllers/api/v1/units_controller.rb`, `app/policies/unit_policy.rb`, `config/routes.rb` | §3, §4, §5 |
| C3 | Factory + request spec + model spec | `spec/factories/units.rb`, `spec/requests/api/v1/units_spec.rb`, `spec/models/unit_spec.rb` (cascade AC12) | §6 |
| C4 | Coverage ratchet bump + docs sync | `backend/spec/spec_helper.rb`, `ai-docs/PLAN.md`, `ai-docs/SCHEMA.md`, `homeworks/hw-1/report.md`, опционально `ai-docs/DECISIONS.md`, `homeworks/hw-1/PROMPTS.md` | §7, §8 |

Перед каждым коммитом — `bundle exec rspec` и `bundle exec rubocop`
локально. Stage показывается пользователю, ждём подтверждения.

**⚠️ Риск ratchet в C2 (D1).** C2 добавляет ~80 строк непокрытого
controller+policy **без компенсирующих тестов** (тесты в C3). Если
добавление непокрытых строк уронит фактический line coverage ниже
текущего `minimum_coverage line: 54`, `rspec` упадёт на C2. Порядок
действий:

1. Перед `git commit` C2 прогнать `bundle exec rspec` локально.
2. Если зелёный — коммитить C2, затем C3.
3. Если красный из-за `minimum_coverage` — **склеить C2 и C3 в один
   коммит** (controller+policy+routes+factory+specs вместе). Это
   отступление от fine-grained принципа, но честнее, чем временно
   понижать ratchet.

**Порядок применения файлов внутри C2 (O1).** Изложение ниже идёт
§3 policy → §4 routes → §5 controller для читаемости. **Фактический
порядок применения файлов — неважен** (коммит атомарен), но если
между §4 и §5 случайно запустить `rspec` — будет `uninitialized
constant Api::V1::UnitsController`. Внутри C2 рекомендуется сначала
создать controller (§5) и policy (§3), затем routes (§4), затем
прогон.

**Важное отличие от F1:** `rescue_from Pundit::NotAuthorizedError → 403`
уже добавлен в `Api::V1::BaseController` в F1 — **в F2 не трогаем**.
UnitPolicy полагается на существующий rescue.

**Grounding, выполненный при написании Plan (фиксируется здесь, чтобы
реализатор не повторял):**

- `backend/config/routes.rb:18` — текущая строка `resources :properties,
  only: [ :index, :show, :create, :update, :destroy ]`, без блока.
  Меняется на форму с блоком (§4).
- `backend/app/models/property.rb` — содержит `belongs_to :organization`,
  enum, normalizes, validates, **нет ни одного `has_many`**. F2
  добавляет первый `has_many :units` (§2).
- `backend/spec/factories/` — `units.rb` **отсутствует** (есть только
  `memberships.rb`, `organizations.rb`, `properties.rb`, `roles.rb`,
  `users.rb`). §6.1 создаёт файл с нуля. (Handover ошибся, утверждая
  что factory уже есть — перепроверено, файла нет.)
- `backend/spec/support/auth_helper.rb` — существующий helper,
  используется в F1 specs; §6.2 опирается на него без изменений.
- `backend/config/application.rb:42` — `config.api_only = true`, значит
  `ActionController::ParameterMissing` рендерится как 400 из коробки
  без дополнительного `rescue_from` (§5 E15).
- `ai-docs/PLAN.md:72,76,79,83` — формулировки пунктов `2.1.2`,
  `2.1.6`, `2.2.2`, `2.2.6` проверены. `2.1.6` = «Enum-статусы юнитов:
  available, maintenance, blocked» — **без FSM**, значит `[x]` в C4
  законен (§8.1).
- `backend/app/controllers/api/v1/base_controller.rb:7` — `rescue_from
  Pundit::NotAuthorizedError, with: :forbidden` уже на месте с F1.
- `.github/workflows/ci.yml` — единственный CI-workflow; проектных
  чеков сверх `rspec`+`rubocop` нет (§0, §9).

---

## 1. Миграция `create_units`

**Файл (новый):** `backend/db/migrate/<timestamp>_create_units.rb`
(timestamp через `bin/rails g migration` или вручную `YYYYMMDDHHMMSS`).

**Содержимое:**

```ruby
class CreateUnits < ActiveRecord::Migration[8.1]
  def change
    create_table :units do |t|
      t.references :property, null: false, foreign_key: { on_delete: :cascade }
      t.string :name, null: false, limit: 255
      t.integer :unit_type, null: false
      t.integer :capacity, null: false
      t.integer :status, null: false

      t.timestamps
    end

    add_index :units, [ :property_id, :id ]
  end
end
```

**Обоснования (по пунктам Spec):**

- `t.references :property, null: false, foreign_key: { on_delete: :cascade }`
  реализует инвариант §3.4.1 (FK всегда NOT NULL) и инвариант §3.4.7
  (каскадное удаление на DB-уровне). Согласовано с `dependent: :destroy`
  в модели Property (§3.3 Spec, §2 плана).
- `organization_id` **намеренно отсутствует** (§3.1 Spec): единственный
  источник истины — `unit.property.organization_id`.
- `limit: 255` на `name` синхронен с валидацией модели §7 Spec и даёт
  защиту на DB-уровне.
- `unit_type`, `status` — `integer`, `null: false`: Rails enum хранит
  целое, строковая сериализация — §3.2 Spec.
- `capacity` — `integer`, `null: false`. Границы 1..100 — в модели (§7).
- Composite-индекс `[property_id, id]` — прямой аналог F1 `[organization_id, id]`,
  ускоряет `property.units.find_by(id: ...)` (стандартный scope+find).
- Не трогаем существующие миграции (CLAUDE.md constraint).

**Команды:**

```bash
cd backend
bin/rails g migration CreateUnits \
  property:references name:string unit_type:integer capacity:integer status:integer
# Привести к виду выше (null: false, limit, on_delete, индекс).
bin/rails db:migrate
bin/rails db:migrate RAILS_ENV=test
```

**Acceptance шага:**

- `db/schema.rb` обновлён, содержит таблицу `units` с указанными колонками,
  FK `on_delete: :cascade` и индексом `[property_id, id]`. Коммитится
  вместе с миграцией.
- `bin/rails db:migrate:status` показывает миграцию `up` в `development`
  и `test`.

---

## 2. Модель `Unit` + ассоциация в `Property`

**Файл (новый):** `backend/app/models/unit.rb`

```ruby
class Unit < ApplicationRecord
  belongs_to :property

  enum :unit_type, { room: 0, apartment: 1, bed: 2, studio: 3 }, validate: true
  enum :status,    { available: 0, maintenance: 1, blocked: 2 }, validate: true

  normalizes :name, with: ->(v) { v.to_s.strip }

  validates :name, presence: true, length: { maximum: 255 }
  validates :capacity,
            presence: true,
            numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 100 }
end
```

**Изменение существующего файла:** `backend/app/models/property.rb`

Текущее содержимое (grounding, §0): класс содержит `belongs_to
:organization`, enum, normalizes, validates — **ни одной `has_many`**.
F2 добавляет первую. Целевой вид начала класса:

```ruby
class Property < ApplicationRecord
  belongs_to :organization
  has_many :units, dependent: :destroy

  enum :property_type, { apartment: 0, hotel: 1, house: 2, hostel: 3 }, validate: true
  # ... остальное без изменений
end
```

**Обоснования (по пунктам Spec):**

- **Оба enum через `validate: true` — явное требование Spec §7 и AC8/AC9.**
  Без этого флага присваивание `"villa"` или `"archived"` кидает
  `ArgumentError` → 500. Это прямой follow-up из F1 report.md и
  обязательное требование, а не рекомендация. Проверяется тестами §6.2
  (AC8 E11/E12, AC9 E18/E19).
- `belongs_to :property` без `optional: true` → автоматическая валидация
  `"Property must exist"` → инвариант §3.4.1 и §7 Spec.
- `normalizes :name` — как в F1 Property, реализует §3.4.4 «name хранится
  trimmed».
- Инвариант §3.4.2 (иммутабельность `property_id`) реализуется на уровне
  контроллера через отсутствие `property_id` в `permitted_params` (§3),
  **не** в модели. Это прямой аналог F1 `organization_id` и согласуется
  с проектным стилем (see RolesController, PropertiesController).
- `numericality: { only_integer: true, ... 1..100 }` — §3.1, §7 Spec,
  D2 Spec.
- `has_many :units, dependent: :destroy` на Property — ORM-уровневый
  механизм каскада, работает вместе с DB `ON DELETE CASCADE` (§3.3 Spec,
  §1 плана). Два механизма согласованы (это не избыточность — ORM-каскад
  триггерит колбэки, DB-каскад гарантирует консистентность при прямых
  DELETE в обход Rails).

**Шаги:**

1. Создать `app/models/unit.rb` с содержимым выше.
2. Добавить `has_many :units, dependent: :destroy` в `app/models/property.rb`.
3. `bundle exec rubocop -A app/models/unit.rb app/models/property.rb`.

**Acceptance шага:**

- `bin/rails runner 'Unit.new.tap(&:valid?).errors.full_messages'` возвращает
  ошибки на `name`, `capacity`, `property` (enum-поля при `nil` тоже дают
  presence-ошибку через `validate: true`).
- `Unit.unit_types.keys == ["room", "apartment", "bed", "studio"]`.
- `Unit.statuses.keys == ["available", "maintenance", "blocked"]`.
- **Проверка `validate: true` для обоих enum автоматизирована в model
  spec §6.3** (O2): тест `it "does not raise ArgumentError on invalid
  enum assignment"` падает, если хотя бы один enum объявлен без
  `validate: true`. Ручная проверка перед C1 не требуется.

**Здесь делается коммит C1.**

---

## 3. Pundit policy `UnitPolicy`

**Файл (новый):** `backend/app/policies/unit_policy.rb`

```ruby
class UnitPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("units.view")
  end

  def show?
    Current.membership&.can?("units.view")
  end

  def create?
    Current.membership&.can?("units.manage")
  end

  def update?
    Current.membership&.can?("units.manage")
  end

  def destroy?
    Current.membership&.can?("units.manage")
  end
end
```

**Обоснования:**

- Форма точно повторяет `PropertyPolicy` — reference pattern (CLAUDE.md
  § Reference implementations).
- Коды `units.view` / `units.manage` существуют в
  `Permissions::ALL_PERMISSIONS` (Spec §4.3, grounding
  `backend/app/models/concerns/permissions.rb:10-11`).
- Pundit Scope не определяем — scoping через `property.units` в
  контроллере, как `Current.organization.properties` в F1.
- `rescue_from Pundit::NotAuthorizedError → 403` уже в `BaseController`
  (F1 hardening) — **не добавляем и не трогаем**.
- **UnitPolicy намеренно не обращается к `record`.** Все пять методов
  проверяют только `Current.membership&.can?(...)`. Это невидимый
  контракт с §5: контроллер использует class-level `authorize Unit`
  (не instance-level), чтобы выполнить авторизацию до `find_unit`
  согласно Spec §4.6. Record-level изоляция реализуется не на уровне
  policy, а через scope `property.units.find_by(id: ...)` в
  контроллере (§5). **Не добавлять проверки `record.property...` в
  UnitPolicy** — это сломает порядок §4.6 и сделает scope-изоляцию
  «наполовину работающей».

**Acceptance шага:**

- `rubocop` зелёный.
- `bin/rails runner 'UnitPolicy.new(nil, nil)'` грузится без ошибок.
- **Это слабая верификация** — класс без условной логики. **Реальная
  верификация permissions — через request spec §6.2 блоки AC5
  (viewer) и AC6 (no-permission)** (O4). Шаг формально проходит
  smoke-тестом, полная гарантия — в C3.

---

## 4. Routes

**Изменение существующего файла:** `backend/config/routes.rb`

Текущая строка (grounding §0, `routes.rb:18`):

```ruby
resources :properties, only: [ :index, :show, :create, :update, :destroy ]
```

Меняется на форму с блоком — existing маршруты Property сохраняются 1:1,
добавляется вложенный `resources :units`:

```ruby
resources :properties, only: [ :index, :show, :create, :update, :destroy ] do
  resources :units, only: [ :index, :show, :create, :update, :destroy ]
end
```

**Обоснования:**

- Spec §5 явно требует nested-маршрут `/api/v1/properties/:property_id/units`.
- `only:` ограничивает набор (no `new`/`edit` для API).
- Существующий `resources :properties` в F1 был без блока — меняем на
  форму с блоком. Это изменение одной строки (плюс `do ... end`),
  существующие маршруты Property сохраняются 1:1.
- Nested маршруты дадут `property_units_path(property)` и
  `/api/v1/properties/:property_id/units/:id` — ровно то, что требует
  Spec §5.

**Acceptance шага:**

- `bin/rails routes -g units` показывает 5 маршрутов units, вложенных в
  property.
- `bin/rails routes -g properties` показывает 5 маршрутов properties без
  изменений по сравнению с F1.

---

## 5. Контроллер `Api::V1::UnitsController`

**Файл (новый):** `backend/app/controllers/api/v1/units_controller.rb`

**Критический порядок шагов — Spec §4.6.** Порядок фиксирован и задаёт
семантику коллизии «нет прав + чужой ресурс» (тест AC4). Любая
перестановка шагов 3 (резолв родителя) и 4 (authorize) ломает
инвариант §3.4.5 / §4.5 / AC4 — resolve Property происходит **раньше**
Pundit, чтобы чужая org давала 404, а не 403.

```ruby
module Api
  module V1
    class UnitsController < BaseController
      def index
        property = find_property
        return if performed?

        authorize Unit
        units = property.units.order(:id)
        render json: units.map { |u| unit_json(u) }
      end

      def show
        property = find_property
        return if performed?

        authorize Unit
        unit = find_unit(property)
        return if performed?

        render json: unit_json(unit)
      end

      def create
        property = find_property
        return if performed?

        authorize Unit
        unit = property.units.new(unit_params)
        if unit.save
          render json: unit_json(unit), status: :created
        else
          render json: { error: unit.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        property = find_property
        return if performed?

        authorize Unit
        unit = find_unit(property)
        return if performed?

        if unit.update(unit_params)
          render json: unit_json(unit)
        else
          render json: { error: unit.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        property = find_property
        return if performed?

        authorize Unit
        unit = find_unit(property)
        return if performed?

        unit.destroy!
        head :no_content
      end

      private

      def find_property
        property = Current.organization.properties.find_by(id: params[:property_id])
        unless property
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        property
      end

      def find_unit(property)
        unit = property.units.find_by(id: params[:id])
        unless unit
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        unit
      end

      def unit_params
        params.require(:unit).permit(:name, :unit_type, :capacity, :status)
      end

      def unit_json(unit)
        {
          id: unit.id,
          property_id: unit.property_id,
          name: unit.name,
          unit_type: unit.unit_type,
          capacity: unit.capacity,
          status: unit.status,
          created_at: unit.created_at,
          updated_at: unit.updated_at
        }
      end
    end
  end
end
```

**Обоснования (по пунктам Spec):**

- **Порядок §4.6 в каждом экшене:** `find_property` (шаг 3) → `authorize`
  (шаг 4) → `find_unit` (шаг 5) → действие (шаг 6). `authenticate_user!`
  и `set_current_organization` (шаги 1–2) уже в `BaseController`.
- **Коллизия AC4 (нет прав + чужой `:property_id`):** `find_property`
  срабатывает раньше `authorize` → пользователь без `units.manage`,
  бьющийся в чужую org, получает 404 (не 403). Сознательно, инвариант
  «не раскрывать существование» сильнее семантической точности. Spec
  §4.6 «Следствие».
- **`property.units.find_by(id: params[:id])`** (а не `Unit.find_by`) —
  реализует §3.4.6 (изоляция между Property одной org) через scope.
  Запрос `unit_a` через `:property_id = property_b.id` даёт 404
  естественным образом, без отдельного rescue. Покрывает AC3, E8, E20,
  E21.
- **`unit_params` не разрешает `property_id`** → инвариант §3.4.2
  (иммутабельность), AC10 (E16, E17). Попытка передать `property_id` в
  теле игнорируется молча.
- **`property.units.new(unit_params)`** подставляет `property_id` из
  association → create всегда привязывает юнит к Property из URL, даже
  если в теле пришёл другой `property_id` (AC10 create).
- **`authorize Unit`** (class-level) во всех экшенах. Мы не используем
  instance-level `authorize unit` потому что все Pundit-методы проверяют
  только `Current.membership&.can?(...)` без обращения к `record` — и
  для `show`/`update`/`destroy` class-level даёт тот же результат, но
  позволяет выполнить `authorize` **до** `find_unit` (шаг 4 раньше
  шага 5 по §4.6). Если бы мы делали `authorize unit` instance-level,
  пришлось бы сначала загрузить юнит и сломать порядок §4.6.
- **`if .save` / `if .update`** единообразно — как в F1 (сознательное
  отклонение от RolesController с `rescue RecordInvalid`, чтобы F2–F5
  копировали один стиль).
- **`unit_json`** явно перечисляет поля → AC11 (стабильный контракт §6).
  `organization_id` **не возвращается** (§3.1 D3 Spec, AC11).
- **`unit_type` / `status` как строки** — Rails enum getter возвращает
  имя, не число (§3.2, §6, AC11).
- **`performed?`** защищает от двойного render после возврата из
  `find_property`/`find_unit`. Это **тот же паттерн, что в F1**
  `PropertiesController#find_property` — не новое решение, а дословная
  копия формы reference-реализации (CLAUDE.md § Reference
  implementations).
- **404 без глобального `rescue_from RecordNotFound`** — меньший blast
  radius, консистентно с F1.

**Acceptance шага:**

- `rubocop` зелёный.
- `bin/rails runner 'Api::V1::UnitsController'` грузится без ошибок.
- Поведенческая верификация — полный прогон §6.2 зелёный.

**Здесь делается коммит C2 (controller + policy + routes).** Если
сработал fallback §0 (ratchet падает без тестов) — C2 и C3 сливаются
в один коммит, включающий §6.1–§6.3.

---

## 6. Factory + Request spec + Model spec

### 6.1. Factory

**Файл (новый):** `backend/spec/factories/units.rb`

```ruby
FactoryBot.define do
  factory :unit do
    property
    sequence(:name) { |n| "Unit #{n}" }
    unit_type { :room }
    capacity { 2 }
    status { :available }
  end
end
```

**Обоснования:**

- `property` ассоциация автоматически создаёт связанный Property (и через
  него Organization), как `:property` factory использует `organization`
  (F1 `spec/factories/properties.rb`).
- `sequence(:name)` — уникальные имена при множественном создании.
- Дефолтные валидные значения enum, capacity в середине диапазона.
- **Grounding (§0): `backend/spec/factories/units.rb` отсутствует.**
  Файл создаётся с нуля. (Handover утверждал обратное — это ошибка
  handover, проверено листингом `spec/factories/`.)

**Acceptance шага (O3, F1 fix):**

- Factory проверяется **транзитивно** через model spec §6.3: он
  использует `create(:unit)` и `create(:property)`. Если
  `bundle exec rspec spec/models/unit_spec.rb` зелёный — factory
  работает и валидна. Отдельная `rails runner` проверка не нужна:
  FactoryBot загружается только в RSpec-окружении через
  `spec/support/factory_bot.rb`, в `rails runner` он недоступен.

### 6.2. Request spec

**Файл (новый):** `backend/spec/requests/api/v1/units_spec.rb`

Структура тестов (каждый `it` явно ссылается на AC/E из Spec для
обратной трассируемости):

```text
RSpec.describe "Api::V1::Units" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }
  let(:property) { create(:property, organization: organization) }

  # ----- AC7: Unauthenticated -----
  describe "without auth token" do
    it "returns 401 for index"         # AC7
    it "returns 401 for show"          # AC7
    it "returns 401 for create"        # AC7
    it "returns 401 for update"        # AC7
    it "returns 401 for destroy"       # AC7
  end

  # ----- AC13: missing X-Organization-Id -----
  describe "without X-Organization-Id" do
    it "returns 422 with 'Organization not selected' on GET index" # AC13, E2
  end

  # ----- AC1: Happy path CRUD as owner -----
  describe "GET /api/v1/properties/:property_id/units" do
    it "returns [] for property with no units"                       # AC1, E22
    it "returns units of the property sorted by id"                  # AC1
    it "returns only units of the requested property, not siblings"  # AC3, E23
  end

  describe "GET /api/v1/properties/:property_id/units/:id" do
    it "returns the unit as JSON with all keys and string enums"     # AC1, AC11
    it "does not include organization_id in JSON"                    # AC11, §6/D3
    it "returns 404 for non-existing :id"                            # E6
    it "returns 404 for unit of another property in same org"       # AC3, E8
  end

  describe "POST /api/v1/properties/:property_id/units" do
    it "creates a unit and returns 201"                              # AC1
    it "returns unit_type and status as strings"                     # AC11
    it "ignores property_id passed in body (uses URL)"               # AC10, E16
    it "trims leading/trailing whitespace in name"                   # P1, Spec §3.4.4
    it "accepts capacity = 1 (lower boundary)"                       # P2, Spec §7
    it "accepts capacity = 100 (upper boundary)"                     # P2, Spec §7
    it "returns 422 when name is blank"                              # AC8, E10
    it "returns 422 when unit_type is invalid, not 500"              # AC8, E11
    it "returns 422 when status is invalid, not 500"                 # AC8, E12
    it "returns 422 when capacity is 0"                              # AC8, E13
    it "returns 422 when capacity is 101"                            # AC8, E14
    it "returns 400 when 'unit' key is missing"                      # E15
  end

  describe "PATCH /api/v1/properties/:property_id/units/:id" do
    it "updates allowed attributes and returns 200"                  # AC1
    it "ignores property_id passed in body (immutable)"              # AC10, E17
    it "returns 422 when name is set to blank"                       # AC9
    it "returns 422 when unit_type is invalid, not 500"              # AC9, E18 (F1 follow-up)
    it "returns 422 when status is invalid, not 500"                 # AC9, E19 (F1 follow-up)
    it "returns 404 for unit of another property in same org"       # AC3, E20
  end

  describe "DELETE /api/v1/properties/:property_id/units/:id" do
    it "deletes the unit and returns 204"                            # AC1
    it "returns 404 for unit of another property in same org"       # AC3, E21
  end

  # ----- AC2: Organization isolation -----
  context "with another organization's property/unit" do
    let(:other_org) { create(:organization) }
    let(:other_property) { create(:property, organization: other_org) }
    let!(:other_unit) { create(:unit, property: other_property) }

    it "index through foreign :property_id returns 404"             # AC2, AC4
    it "show of foreign unit returns 404"                           # AC2, E5
    it "update of foreign unit returns 404"                         # AC2
    it "destroy of foreign unit returns 404"                        # AC2
  end

  # ----- AC4: Foreign :property_id (non-existing) -----
  describe "non-existing :property_id" do
    it "returns 404 on index"    # AC4, E9
    it "returns 404 on create"   # AC4, E15b
    it "returns 404 on show"     # AC4
  end

  # ----- AC5: Read-only viewer -----
  context "as a viewer (units.view only)" do
    let(:viewer_user) { create(:user) }
    let(:viewer_role) { organization.roles.find_by(code: "viewer") }
    let!(:viewer_membership) do
      create(:membership, user: viewer_user, organization: organization,
                          role: viewer_role, role_enum: :member)
    end
    let(:viewer_headers) { auth_headers(viewer_user, organization) }
    let!(:unit) { create(:unit, property: property) }

    it "allows index"                    # AC5
    it "allows show"                     # AC5
    it "forbids create with 403"         # AC5
    it "forbids update with 403"         # AC5
    it "forbids destroy with 403"        # AC5
  end

  # ----- AC6: No-permission user -----
  context "as a member without any unit permissions" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) do
      create(:membership, user: nopriv_user, organization: organization, role_enum: :member)
    end
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }
    let!(:unit) { create(:unit, property: property) }

    it "forbids index with 403"          # AC6
    it "forbids show with 403"           # AC6
    it "forbids create with 403"         # AC6
  end

  # ----- AC4 collision: no perms + foreign property → 404 (Spec §4.6) -----
  context "as no-permission user with foreign :property_id" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) do
      create(:membership, user: nopriv_user, organization: organization, role_enum: :member)
    end
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }
    let(:other_org) { create(:organization) }
    let(:foreign_property) { create(:property, organization: other_org) }

    it "POST returns 404 (not 403) — Spec §4.6 ordering" # AC4, §4.6 «Следствие»
  end
end
```

**Обоснования:**

- Каждый `it` явно ссылается на AC/E — обратная трассируемость Spec→Test.
- **Явно два раздельных контекста изоляции** (AC2 orgs, AC3 same-org
  Property siblings) — Spec §3.4.6 и §10 AC3 подчёркивают, что это
  разные инварианты.
- **AC4 collision** (no perms + foreign property → 404) — отдельный
  тестовый контекст, реализует §4.6 «Следствие» дословно. Без этого
  теста можно случайно поменять местами `authorize` и `find_property`,
  и получить 403 вместо 404, не заметив регрессии.
- **PATCH с невалидным enum (оба поля)** — отдельные тесты, прямой
  follow-up из report.md F1, обязательное требование §10 AC9 Spec.
- **`unit_type` и `status` как строки в JSON** — AC11, отдельный тест
  в describe POST + проверка в show.
- **`organization_id` отсутствует в JSON** — отдельный тест (D3 Spec).
- Используются существующие фабрики (`:user`, `:organization`,
  `:membership` с трейтами `:owner`, `:property` из F1) и
  `auth_headers` helper из `backend/spec/support/auth_helper.rb`
  (grounding §0; тот же helper используется в
  `spec/requests/api/v1/properties_spec.rb`).
- **E15 (missing `unit` key → 400):** Rails в API-mode
  (`config.api_only = true`, grounding §0) рендерит
  `ActionController::ParameterMissing` как 400 из коробки без
  дополнительного `rescue_from`. Транзитивно подтверждено F1 (E11
  аналогичен, F1 specs зелёные).
- Для AC5 — preset role `viewer` (автогенерируется в
  `Organization#create_preset_roles`), никакой новой фабрики.
- Для AC6 — `role_enum: :member` без `role:` → `can?` возвращает false
  для всех units.* permissions (см. `Membership#can?`).
- Total ожидаемое количество примеров: ~45. Даст значимый coverage bump.

### 6.3. Model spec (AC12 — каскадное удаление)

**Файл (новый):** `backend/spec/models/unit_spec.rb`

```ruby
require "rails_helper"

RSpec.describe Unit, type: :model do
  describe "cascade delete via Property" do
    it "destroys units when parent property is destroyed" do
      property = create(:property)
      unit1 = create(:unit, property: property)
      unit2 = create(:unit, property: property)

      expect { property.destroy }.to change(Unit, :count).by(-2)
      expect(Unit.where(id: [ unit1.id, unit2.id ])).to be_empty
    end
  end

  describe "enum validate: true (O2, F1 follow-up)" do
    it "does not raise ArgumentError on invalid unit_type" do
      unit = build(:unit, unit_type: "villa")
      expect { unit.valid? }.not_to raise_error
      expect(unit).not_to be_valid
      expect(unit.errors[:unit_type]).to be_present
    end

    it "does not raise ArgumentError on invalid status" do
      unit = build(:unit, status: "archived")
      expect { unit.valid? }.not_to raise_error
      expect(unit).not_to be_valid
      expect(unit.errors[:status]).to be_present
    end
  end
end
```

**Обоснования:**

- AC12 Spec явно требует модельный тест, **не** HTTP-тест: каскадное
  удаление — DB/ORM-инвариант, а не HTTP-контракт.
- Это единственный model-spec в F2; остальное покрыто request spec.
- **Важное ограничение покрытия:** тест идёт через ORM-путь
  (`property.destroy` → `dependent: :destroy`) и **не активирует**
  DB-level `ON DELETE CASCADE` — ORM удаляет детей сам, потом родителя.
  Если убрать `dependent: :destroy` — тест упадёт. Если убрать
  `ON DELETE CASCADE` из миграции — тест **пройдёт** (ORM каскадит за
  него). То есть model-spec покрывает только ORM-сторону.
- Это сознательный пропуск: DB-level cascade нужен как защита от
  прямых SQL `DELETE` в обход Rails, что вне scope HW-1 и не тестируется
  ни request-, ни model-спеками. **При рефакторинге не удалять ни
  `dependent: :destroy`, ни `ON DELETE CASCADE` без явной замены —
  оба механизма нужны, хоть тест и покрывает только один.**
- AC12 Spec §10 формулирует инвариант дословно как «после
  `Property#destroy`», то есть через ORM — тест ему соответствует.

**Acceptance шага:**

- `bundle exec rspec spec/requests/api/v1/units_spec.rb spec/models/unit_spec.rb`
  — все примеры зелёные.
- `bundle exec rspec` — общий suite зелёный (no regressions в F1 specs).
- `bundle exec rubocop` — зелёный.

**Здесь делается коммит C3.**

---

## 7. Coverage ratchet bump

**Изменение существующего файла:** `backend/spec/spec_helper.rb`

После прогона полного `bundle exec rspec` посмотреть `Line Coverage`,
посчитать `floor(actual) - 1`, обновить:

```ruby
minimum_coverage line: <new_floor>
```

**Обоснования:**

- Правило ratchet из `WORKING_AGREEMENTS.md` § Coverage ratchet.
- Буфер `-1` против флейков.
- Старт F2: 54 (после F1). Ожидаемое после F2: ~60–65% (≈45 новых
  тестов на ~90 строк controller+policy+model+factory), новый floor →
  59–64. Финальная цель HW-1 — 80.
- **AC14 Spec** явно требует, чтобы фактический покрытие не упало ниже
  текущего floor — это уже гарантирует `minimum_coverage` threshold
  (rspec упадёт на его нарушении).

**Acceptance шага:**

- `bundle exec rspec` зелёный с новым `minimum_coverage`.

---

## 8. Documentation sync

После того как реализация и тесты зелёные, обновить (всё в одном коммите
C4 вместе с ratchet bump §7):

### 8.1. `ai-docs/PLAN.md`

Формулировки пунктов проверены grounding'ом §0 — все четыре отмечаются
как `[x]` без оговорок:

- `2.1.2` «Модель Unit (name, unit_type, capacity, status, property_id)» —
  реализована дословно.
- `2.1.6` «Enum-статусы юнитов: available, maintenance, blocked» —
  формулировка **не подразумевает FSM**, значит `[x]` законен (Spec §8
  явно фиксирует отсутствие workflow, что согласовано с формулировкой
  пункта).
- `2.2.2` «CRUD `/api/v1/properties/:id/units`» — реализован (nested
  route использует `:property_id`, это та же фича).
- `2.2.6` «Pundit-политики для properties и units» — в F1 не отмечался,
  потому что покрыт наполовину; теперь обе политики есть → `[x]`.

Если в процессе реализации изменился scope — добавить новые пункты в
соответствующие фазы.

### 8.2. `ai-docs/SCHEMA.md`

В раздел **Phase 2: Properties & Units** после блока Property добавить
блок Unit:

```markdown
#### Unit

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| property_id | bigint | FK, not null, on_delete: cascade |
| name | string(255) | not null, normalized strip |
| unit_type | integer (enum) | not null |
| capacity | integer | not null, 1..100 |
| status | integer (enum) | not null |

**Associations:** belongs_to :property
**Enums:** unit_type: { room: 0, apartment: 1, bed: 2, studio: 3 } (validated via `validate: true`); status: { available: 0, maintenance: 1, blocked: 2 } (validated via `validate: true`)
**Validations:** name presence + length, capacity presence + numericality 1..100
**Indexes:** [property_id], [property_id, id]

> `organization_id` intentionally not stored on Unit — derived via `unit.property.organization_id`. See Spec F2 §3.1, D3.
```

В блоке **Property** добавить `has_many :units, dependent: :destroy` к
**Associations**.

### 8.3. `ai-docs/DECISIONS.md`

Опциональное **DEC-NNN**, если решим, что §4.6 порядок
(`find_property` до `authorize` → 404 для чужой org) — архитектурное
решение, а не «детали имплементации». Кандидат: «404 over 403 для
cross-org ресурсов, даже ценой семантической точности». Решение во
время C4. Дефолт — **не добавлять DEC**, упомянуть в report.md секции
«Что пошло хорошо».

### 8.4. `homeworks/hw-1/report.md`

- Заполнить блок «02 — Unit CRUD»: время Brief+Spec+Plan+Implement,
  итерации ревью (Brief TBD, Spec TBD, Plan TBD), что хорошо/плохо/что
  изменить в промптах.
- Обновить строку фичи `2` в сводной таблице.
- Добавить строку в таблицу «Coverage ratchet»: `После F2 | <new_floor> |
  <actual>% | bumped`.
- Отметить статус AC9 (PATCH invalid enum) — прямой follow-up из F1
  закрыт.

### 8.5. `CLAUDE.md`

**Не трогаем** — секция Reference implementations (HW-1) уже указывает
на F1. F2 копирует форму, не становится новым эталоном.

### 8.6. `homeworks/hw-1/PROMPTS.md`

Если по итогам ревью F2 Brief/Spec/Plan стало понятно, как улучшить
базовые промпты — сохранить v2-версии. Per handover: одного F2-кейса
недостаточно для обобщения; подождать F3 и искать паттерны семейства
«порядок проверок / инварианты иммутабельности / классификаторы». Если
F3 поймает что-то из того же семейства — формализовать. Дефолт для F2
C4 — **не обновлять PROMPTS.md**.

**Acceptance docs sync (O3):**

- `grep -n '2.1.2\|2.1.6\|2.2.2\|2.2.6' ai-docs/PLAN.md` — все четыре
  пункта с `[x]`.
- `grep -n '#### Unit' ai-docs/SCHEMA.md` — блок присутствует.
- `grep -n 'has_many :units' ai-docs/SCHEMA.md` — в блоке Property.
- `homeworks/hw-1/report.md` — строка F2 в сводной таблице и строка
  в таблице Coverage ratchet присутствуют.

**Здесь делается коммит C4.**

---

## 9. Verify (после всех коммитов)

```bash
cd backend
bundle exec rubocop
bundle exec rspec
```

Оба зелёные, line coverage ≥ новый ratchet floor.

```bash
git push origin hw-1
```

После пуша — проверить, что CI на ветке `hw-1` зелёный (Draft PR #6 —
контейнер, не трогаем).

Issue #11 — добавить один comment со ссылками brief/spec/plan после
того, как plan.md будет `active` (per handover).

---

## 10. Зависимости и предусловия

- Все предусловия Spec §12 проверены (Property, Current, Permissions,
  Pundit rescue, RSpec/FactoryBot, `:property` factory, `auth_headers`).
- **Никаких новых gems.**
- Никаких изменений существующих миграций, кроме новой `create_units`.
- Никаких изменений `BaseController` (rescue уже есть с F1).
- Никаких изменений `PropertiesController` / `PropertyPolicy` /
  properties_spec.rb (F1 код не трогаем).
- `.gitignore` не трогаем.

## 11. Что НЕ делать в F2

- Не вводить FSM для `status` (Spec §8) — любой переход допустим.
- Не добавлять `organization_id` на Unit (Spec §3.1, D3).
- Не добавлять перенос юнита между Property (Spec §3.4.2, §2.2).
- Не реализовывать bulk-операции, поиск, фильтры, пагинацию (Spec §2.2).
- Не трогать follow-ups #7/#8/#9 (вне scope F2).
- Не делать dead-code patch на `patch_target = property` в
  `properties_spec.rb` (отдельная задача).

## 12. Открытые вопросы

_(Будут добавлены по итогам ревью Plan.)_
